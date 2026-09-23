<?php
declare(strict_types=1);

final class ElaraDeployException extends RuntimeException
{
    public int $httpStatus;

    public function __construct(string $message, int $httpStatus = 500, ?Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
        $this->httpStatus = $httpStatus;
    }
}

final class ElaraDeployRuntime
{
    public const OWNER = 'Mohadesehjohari';
    public const REPO = 'elaraspace';
    public const BRANCH = 'main';
    public const FIREBASE_PROJECT_ID = 'elara-ab1aa';
    public const FIREBASE_WEB_API_KEY = 'AIzaSyBpCsIvc3A8sLrdvUiaGDQjMH6qE9lUTGo';
    public const VERSION = 1;

    private array $config;
    private string $home;
    private string $serverRoot;
    private string $documentRoot;
    /** @var resource|null */
    private $lockHandle = null;

    public function __construct(array $config, ?string $home = null)
    {
        $this->home = self::resolveHome($home);
        $this->config = $config;
        $this->serverRoot = $this->normalizeAbsolute((string)($config['server_root'] ?? ($this->home . '/elara-deploy')));
        $this->documentRoot = $this->normalizeAbsolute((string)($config['document_root'] ?? ($this->home . '/public_html')));

        if ($this->isWithin($this->serverRoot, $this->documentRoot) || $this->isWithin($this->documentRoot, $this->serverRoot)) {
            throw new ElaraDeployException('مسیر server_root و document_root باید جدا از هم باشند.', 500);
        }
        $this->ensureDir($this->serverRoot, 0700);
        foreach (['state', 'staging', 'backups', 'logs', 'runtime'] as $dir) {
            $this->ensureDir($this->serverRoot . '/' . $dir, 0700);
        }
        $this->ensureDir($this->documentRoot, 0755);
    }

    public static function resolveHome(?string $preferred = null): string
    {
        $candidates = [$preferred, getenv('HOME') ?: null, $_SERVER['HOME'] ?? null];
        if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) {
            $pw = @posix_getpwuid(posix_geteuid());
            if (is_array($pw) && isset($pw['dir'])) {
                $candidates[] = $pw['dir'];
            }
        }
        foreach ($candidates as $candidate) {
            if (is_string($candidate) && $candidate !== '' && str_starts_with($candidate, '/')) {
                return rtrim($candidate, '/');
            }
        }
        throw new ElaraDeployException('مسیر HOME سرور قابل تشخیص نیست.', 500);
    }

    public static function bearerFromServer(array $server): string
    {
        $header = trim((string)($server['HTTP_AUTHORIZATION'] ?? $server['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
        if (!preg_match('/^Bearer\s+([^\s]+)$/i', $header, $match)) {
            throw new ElaraDeployException('احراز هویت لازم است.', 401);
        }
        $token = trim($match[1]);
        if (strlen($token) < 100 || strlen($token) > 10000) {
            throw new ElaraDeployException('توکن احراز هویت معتبر نیست.', 401);
        }
        return $token;
    }

    public static function assertDeployRole(array $admin): void
    {
        $enabled = ($admin['enabled'] ?? false) === true;
        $role = (string)($admin['role'] ?? '');
        if (!$enabled || !in_array($role, ['owner', 'admin'], true)) {
            throw new ElaraDeployException('این نقش اجازهٔ انتشار Production را ندارد.', 403);
        }
    }

    public function handle(string $action, string $method, string $idToken, array $body = []): array
    {
        $admin = $this->authenticateAdmin($idToken);
        self::assertDeployRole($admin);

        return match ($action) {
            'status' => $this->requireMethod($method, ['GET'], fn() => $this->status()),
            'check' => $this->requireMethod($method, ['POST'], fn() => $this->checkUpdate()),
            'deploy' => $this->requireMethod($method, ['POST'], fn() => $this->deployFromGitHub($admin)),
            'rollback' => $this->requireMethod($method, ['POST'], fn() => $this->rollback($admin)),
            'maintenance' => $this->requireMethod($method, ['POST'], fn() => $this->manualMaintenance($admin, $body)),
            default => throw new ElaraDeployException('عملیات Deployment شناخته‌شده نیست.', 404),
        };
    }

    public function authenticateAdmin(string $idToken): array
    {
        $lookup = $this->httpJson(
            'POST',
            'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . rawurlencode(self::FIREBASE_WEB_API_KEY),
            ['Content-Type: application/json'],
            ['idToken' => $idToken],
            15
        );
        $user = $lookup['users'][0] ?? null;
        if (!is_array($user) || empty($user['localId'])) {
            throw new ElaraDeployException('Firebase ID token معتبر نیست.', 401);
        }
        if (($user['emailVerified'] ?? false) !== true) {
            throw new ElaraDeployException('ایمیل مدیر باید تأیید شده باشد.', 403);
        }
        $uid = (string)$user['localId'];
        if (!preg_match('/^[A-Za-z0-9_-]{6,128}$/', $uid)) {
            throw new ElaraDeployException('شناسهٔ کاربر معتبر نیست.', 401);
        }

        $url = 'https://firestore.googleapis.com/v1/projects/' . rawurlencode(self::FIREBASE_PROJECT_ID)
            . '/databases/(default)/documents/admins/' . rawurlencode($uid);
        $doc = $this->httpJson('GET', $url, ['Authorization: Bearer ' . $idToken], null, 15);
        $fields = is_array($doc['fields'] ?? null) ? $doc['fields'] : [];
        $admin = [
            'uid' => $uid,
            'email' => (string)($user['email'] ?? ''),
            'enabled' => ($fields['enabled']['booleanValue'] ?? false) === true,
            'role' => (string)($fields['role']['stringValue'] ?? ''),
        ];
        self::assertDeployRole($admin);
        return $admin;
    }

    public function status(): array
    {
        $state = $this->readState();
        $state['maintenance_enabled'] = is_file($this->maintenanceFlagPath());
        $state['audit'] = $this->readAuditTail(12);
        $state['repo'] = self::OWNER . '/' . self::REPO;
        $state['branch'] = self::BRANCH;
        $state['runtime_version'] = self::VERSION;
        return $state;
    }

    public function checkUpdate(): array
    {
        $latest = $this->resolveLatestSha();
        $state = $this->readState();
        $state['latest_sha'] = $latest;
        $state['last_check_at'] = gmdate('c');
        $state['status'] = (($state['current_sha'] ?? '') === $latest) ? 'up_to_date' : 'update_available';
        $state['phase'] = 'idle';
        $this->writeState($state);
        return $this->status();
    }

    public function deployFromGitHub(array $admin): array
    {
        $this->acquireLock();
        $started = gmdate('c');
        $state = $this->readState();
        $fromSha = (string)($state['current_sha'] ?? '');
        $latest = '';
        $sourceRoot = null;
        $delegated = false;
        try {
            $this->updatePhase('resolving_latest', 'updating');
            $latest = $this->resolveLatestSha();
            if ($fromSha !== '' && hash_equals($fromSha, $latest)) {
                $state['latest_sha'] = $latest;
                $state['status'] = 'up_to_date';
                $state['phase'] = 'idle';
                $state['last_check_at'] = gmdate('c');
                $this->writeState($state);
                return $this->status();
            }

            $this->setMaintenance(true, 'Elara در حال به‌روزرسانی است. لطفاً چند لحظه بعد دوباره تلاش کنید.');
            $this->updatePhase('downloading_exact_sha', 'updating', ['latest_sha' => $latest]);
            $sourceRoot = $this->downloadGithubSource($latest);
            $delegated = true;
            $result = $this->performDeploy($sourceRoot, $latest, $admin, 'github_archive', $started, $fromSha);
            return $result;
        } catch (Throwable $error) {
            if (!$delegated) {
                $failed = $this->readState();
                $failed['status'] = 'failed';
                $failed['phase'] = 'failed';
                $failed['error'] = $this->safeError($error);
                $failed['rollback_status'] = 'not_started';
                if ($latest !== '') {
                    $failed['latest_sha'] = $latest;
                }
                $this->writeState($failed);
                $this->appendAudit([
                    'adminUid' => (string)$admin['uid'],
                    'role' => (string)$admin['role'],
                    'action' => 'deploy',
                    'sourceMode' => 'github_archive',
                    'fromSHA' => $fromSha !== '' ? $fromSha : null,
                    'toSHA' => $latest !== '' ? $latest : null,
                    'startedAt' => $started,
                    'finishedAt' => gmdate('c'),
                    'status' => 'failed',
                    'rollbackStatus' => 'not_started',
                    'error' => $this->safeError($error),
                ]);
                // Maintenance intentionally remains enabled if the update could not even be staged.
            }
            if ($error instanceof ElaraDeployException) {
                throw $error;
            }
            throw new ElaraDeployException('Deployment ناموفق شد: ' . $this->safeError($error), 500, $error);
        } finally {
            if (is_string($sourceRoot) && str_starts_with($sourceRoot, $this->serverRoot . '/staging/')) {
                $this->removeTree(dirname($sourceRoot));
            }
            $this->releaseLock();
        }
    }

    public function deployLocalSource(string $sourceRoot, string $sha, array $actor = ['uid' => 'cpanel', 'role' => 'server']): array
    {
        if (!preg_match('/^[0-9a-f]{40}$/i', $sha)) {
            throw new ElaraDeployException('SHA محلی معتبر نیست.', 400);
        }
        $sourceRoot = $this->normalizeAbsolute($sourceRoot);
        $this->acquireLock();
        $started = gmdate('c');
        $state = $this->readState();
        $fromSha = (string)($state['current_sha'] ?? '');
        try {
            $this->setMaintenance(true, 'Elara در حال نصب یا به‌روزرسانی است. لطفاً چند لحظه بعد دوباره تلاش کنید.');
            return $this->performDeploy($sourceRoot, strtolower($sha), $actor, 'cpanel_git', $started, $fromSha);
        } finally {
            $this->releaseLock();
        }
    }

    public function rollback(array $admin): array
    {
        $this->acquireLock();
        $started = gmdate('c');
        $state = $this->readState();
        $fromSha = (string)($state['current_sha'] ?? '');
        $backup = (string)($state['previous_backup'] ?? '');
        if ($backup === '' || !is_dir($backup)) {
            $this->releaseLock();
            throw new ElaraDeployException('نسخهٔ قبلی قابل Rollback پیدا نشد.', 409);
        }

        $rollbackBackup = null;
        try {
            $this->setMaintenance(true, 'Elara در حال بازگردانی نسخهٔ قبلی است. لطفاً چند لحظه بعد دوباره تلاش کنید.');
            $this->updatePhase('rollback_backup_current', 'updating');
            $currentManaged = $this->stateManagedPaths($state);
            $rollbackBackup = $this->backupCurrent($currentManaged, $fromSha);

            $this->updatePhase('rollback_restore', 'updating');
            $meta = $this->restoreBackup($backup, $currentManaged);
            $restoredSha = (string)($meta['sha'] ?? '');
            $restoredManaged = is_array($meta['managed_paths'] ?? null) ? $meta['managed_paths'] : [];
            $this->validateLiveRequired();

            $state = $this->readState();
            $state['current_sha'] = $restoredSha;
            $state['last_deploy_at'] = gmdate('c');
            $state['status'] = 'rolled_back';
            $state['phase'] = 'idle';
            $state['error'] = null;
            $state['rollback_status'] = 'success';
            $state['previous_backup'] = $rollbackBackup;
            $state['managed_paths'] = array_values($restoredManaged);
            $this->writeState($state);
            $this->setMaintenance(false, '');
            $this->appendAudit([
                'adminUid' => (string)$admin['uid'],
                'role' => (string)$admin['role'],
                'action' => 'rollback',
                'fromSHA' => $fromSha,
                'toSHA' => $restoredSha,
                'startedAt' => $started,
                'finishedAt' => gmdate('c'),
                'status' => 'success',
                'rollbackStatus' => 'success',
            ]);
            return $this->status();
        } catch (Throwable $error) {
            $state = $this->readState();
            $state['status'] = 'failed';
            $state['phase'] = 'rollback_failed';
            $state['error'] = $this->safeError($error);
            $state['rollback_status'] = 'failed';
            $this->writeState($state);
            $this->appendAudit([
                'adminUid' => (string)$admin['uid'],
                'role' => (string)$admin['role'],
                'action' => 'rollback',
                'fromSHA' => $fromSha,
                'toSHA' => null,
                'startedAt' => $started,
                'finishedAt' => gmdate('c'),
                'status' => 'failed',
                'rollbackStatus' => 'failed',
                'error' => $this->safeError($error),
            ]);
            throw $error instanceof ElaraDeployException ? $error : new ElaraDeployException('Rollback ناموفق شد.', 500, $error);
        } finally {
            $this->releaseLock();
        }
    }

    public function manualMaintenance(array $admin, array $body): array
    {
        $enabled = ($body['enabled'] ?? false) === true;
        $message = trim((string)($body['message'] ?? ''));
        if ($message === '') {
            $message = 'Elara در حال به‌روزرسانی است. لطفاً چند لحظه بعد دوباره تلاش کنید.';
        }
        $message = function_exists('mb_substr') ? mb_substr($message, 0, 240) : substr($message, 0, 960);
        $this->setMaintenance($enabled, $message);
        $this->appendAudit([
            'adminUid' => (string)$admin['uid'],
            'role' => (string)$admin['role'],
            'action' => 'maintenance',
            'fromSHA' => $this->readState()['current_sha'] ?? null,
            'toSHA' => null,
            'startedAt' => gmdate('c'),
            'finishedAt' => gmdate('c'),
            'status' => $enabled ? 'enabled' : 'disabled',
            'rollbackStatus' => 'not_applicable',
        ]);
        return $this->status();
    }

    public function acquireLock(): void
    {
        if (is_resource($this->lockHandle)) {
            throw new ElaraDeployException('Deployment lock از قبل در همین پردازش فعال است.', 409);
        }
        $path = $this->serverRoot . '/state/deploy.lock';
        $handle = @fopen($path, 'c+');
        if (!is_resource($handle)) {
            throw new ElaraDeployException('ساخت deployment lock ممکن نیست.', 500);
        }
        if (!@flock($handle, LOCK_EX | LOCK_NB)) {
            fclose($handle);
            throw new ElaraDeployException('یک Update دیگر در حال اجراست.', 409);
        }
        ftruncate($handle, 0);
        fwrite($handle, json_encode(['pid' => getmypid(), 'startedAt' => gmdate('c')], JSON_UNESCAPED_SLASHES));
        fflush($handle);
        $this->lockHandle = $handle;
    }

    public function releaseLock(): void
    {
        if (!is_resource($this->lockHandle)) {
            return;
        }
        @flock($this->lockHandle, LOCK_UN);
        @fclose($this->lockHandle);
        $this->lockHandle = null;
    }

    public function loadManifest(string $sourceRoot): array
    {
        $path = rtrim($sourceRoot, '/') . '/deploy/production-manifest.json';
        if (!is_file($path)) {
            throw new ElaraDeployException('Production manifest در سورس پیدا نشد.', 422);
        }
        $json = file_get_contents($path);
        $manifest = json_decode((string)$json, true);
        if (!is_array($manifest)) {
            throw new ElaraDeployException('Production manifest JSON معتبر نیست.', 422);
        }
        if (($manifest['schema'] ?? null) !== 1
            || ($manifest['owner'] ?? '') !== self::OWNER
            || ($manifest['repo'] ?? '') !== self::REPO
            || ($manifest['branch'] ?? '') !== self::BRANCH) {
            throw new ElaraDeployException('Production manifest با مخزن canonical تطابق ندارد.', 422);
        }
        $files = $manifest['files'] ?? null;
        if (!is_array($files) || count($files) < 1) {
            throw new ElaraDeployException('Production manifest فایل قابل Deploy ندارد.', 422);
        }
        $clean = [];
        foreach ($files as $file) {
            $relative = $this->safeRelative((string)$file);
            $this->assertProductionPathAllowed($relative);
            if (isset($clean[$relative])) {
                throw new ElaraDeployException('مسیر تکراری در Production manifest: ' . $relative, 422);
            }
            $source = rtrim($sourceRoot, '/') . '/' . $relative;
            if (!is_file($source) || is_link($source)) {
                throw new ElaraDeployException('فایل Production موجود یا امن نیست: ' . $relative, 422);
            }
            $clean[$relative] = true;
        }
        $required = $manifest['required'] ?? [];
        if (!is_array($required)) {
            throw new ElaraDeployException('فهرست required در manifest معتبر نیست.', 422);
        }
        foreach ($required as $requiredFile) {
            $requiredFile = $this->safeRelative((string)$requiredFile);
            if (!isset($clean[$requiredFile])) {
                throw new ElaraDeployException('فایل required در allowlist نیست: ' . $requiredFile, 422);
            }
        }
        $manifest['files'] = array_keys($clean);
        $manifest['required'] = array_values(array_map(fn($x) => $this->safeRelative((string)$x), $required));
        return $manifest;
    }

    private function performDeploy(string $sourceRoot, string $toSha, array $actor, string $sourceMode, string $started, string $fromSha): array
    {
        $backup = null;
        $stage = null;
        $newManaged = [];
        $previousManaged = [];
        $changedProduction = false;
        $rollbackStatus = 'not_needed';
        try {
            $this->updatePhase('staging', 'updating', ['latest_sha' => $toSha]);
            [$stage, $manifest] = $this->prepareStaging($sourceRoot);
            $newManaged = $manifest['files'];
            $state = $this->readState();
            $previousManaged = $this->stateManagedPaths($state);
            if (!$previousManaged) {
                $previousManaged = $newManaged;
            }

            $this->updatePhase('validating_staging', 'updating');
            $this->validateStage($stage, $manifest);
            $this->installRuntimeFromSource($sourceRoot);

            $this->updatePhase('backup_current', 'updating');
            $backup = $this->backupCurrent($previousManaged, $fromSha);

            $this->updatePhase('deploying_manifest', 'updating');
            $this->deployFiles($stage, $newManaged);
            $changedProduction = true;
            $this->removeStaleManaged($previousManaged, $newManaged);

            $this->updatePhase('health_check', 'updating');
            $this->healthCheck($stage, $manifest);

            $state = $this->readState();
            $state['current_sha'] = $toSha;
            $state['latest_sha'] = $toSha;
            $state['last_deploy_at'] = gmdate('c');
            $state['last_check_at'] = gmdate('c');
            $state['status'] = 'up_to_date';
            $state['phase'] = 'idle';
            $state['error'] = null;
            $state['rollback_status'] = 'not_needed';
            $state['previous_backup'] = $backup;
            $state['managed_paths'] = array_values($newManaged);
            $state['source_mode'] = $sourceMode;
            $this->writeState($state);
            $this->setMaintenance(false, '');

            $this->appendAudit([
                'adminUid' => (string)($actor['uid'] ?? 'server'),
                'role' => (string)($actor['role'] ?? 'server'),
                'action' => 'deploy',
                'sourceMode' => $sourceMode,
                'fromSHA' => $fromSha !== '' ? $fromSha : null,
                'toSHA' => $toSha,
                'startedAt' => $started,
                'finishedAt' => gmdate('c'),
                'status' => 'success',
                'rollbackStatus' => 'not_needed',
            ]);
            return $this->status();
        } catch (Throwable $error) {
            if ($changedProduction && is_string($backup) && is_dir($backup)) {
                try {
                    $this->updatePhase('rollback_after_failure', 'updating');
                    $meta = $this->restoreBackup($backup, $newManaged);
                    $rollbackStatus = 'success';
                    $this->validateLiveRequired();
                    $this->setMaintenance(false, '');
                    $restoredSha = (string)($meta['sha'] ?? $fromSha);
                    $restoredManaged = is_array($meta['managed_paths'] ?? null) ? $meta['managed_paths'] : $previousManaged;
                    $failedState = $this->readState();
                    $failedState['current_sha'] = $restoredSha;
                    $failedState['managed_paths'] = $restoredManaged;
                } catch (Throwable $rollbackError) {
                    $rollbackStatus = 'failed';
                    $failedState = $this->readState();
                    $failedState['rollback_error'] = $this->safeError($rollbackError);
                    // Maintenance intentionally remains enabled when rollback fails.
                }
            } else {
                $rollbackStatus = 'not_needed';
                $this->setMaintenance(false, '');
                $failedState = $this->readState();
            }
            $failedState['status'] = 'failed';
            $failedState['phase'] = 'failed';
            $failedState['error'] = $this->safeError($error);
            $failedState['rollback_status'] = $rollbackStatus;
            $failedState['latest_sha'] = $toSha;
            $this->writeState($failedState);
            $this->appendAudit([
                'adminUid' => (string)($actor['uid'] ?? 'server'),
                'role' => (string)($actor['role'] ?? 'server'),
                'action' => 'deploy',
                'sourceMode' => $sourceMode,
                'fromSHA' => $fromSha !== '' ? $fromSha : null,
                'toSHA' => $toSha,
                'startedAt' => $started,
                'finishedAt' => gmdate('c'),
                'status' => 'failed',
                'rollbackStatus' => $rollbackStatus,
                'error' => $this->safeError($error),
            ]);
            if ($error instanceof ElaraDeployException) {
                throw $error;
            }
            throw new ElaraDeployException('Deployment ناموفق شد: ' . $this->safeError($error), 500, $error);
        } finally {
            if (is_string($stage) && str_starts_with($stage, $this->serverRoot . '/staging/')) {
                $this->removeTree(dirname($stage));
            }
        }
    }

    private function prepareStaging(string $sourceRoot): array
    {
        $manifest = $this->loadManifest($sourceRoot);
        $base = $this->serverRoot . '/staging/release-' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(4));
        $release = $base . '/release';
        $this->ensureDir($release, 0700);
        foreach ($manifest['files'] as $relative) {
            $src = rtrim($sourceRoot, '/') . '/' . $relative;
            $dst = $release . '/' . $relative;
            $this->copyFile($src, $dst, 0600);
        }
        return [$release, $manifest];
    }

    private function validateStage(string $stage, array $manifest): void
    {
        foreach ($manifest['required'] as $relative) {
            $path = $stage . '/' . $relative;
            if (!is_file($path) || filesize($path) < 1) {
                throw new ElaraDeployException('فایل required در staging معتبر نیست: ' . $relative, 422);
            }
        }
        foreach ($manifest['files'] as $relative) {
            $path = $stage . '/' . $relative;
            if (!is_file($path) || is_link($path)) {
                throw new ElaraDeployException('فایل staging امن نیست: ' . $relative, 422);
            }
        }
    }

    private function deployFiles(string $stage, array $paths): void
    {
        foreach ($paths as $relative) {
            $source = $stage . '/' . $relative;
            $destination = $this->documentRoot . '/' . $relative;
            $dir = dirname($destination);
            $this->ensureDir($dir, 0755);
            $tmp = $dir . '/.elara-tmp-' . bin2hex(random_bytes(6));
            if (!@copy($source, $tmp)) {
                @unlink($tmp);
                throw new ElaraDeployException('کپی فایل Production ناموفق بود: ' . $relative, 500);
            }
            @chmod($tmp, str_ends_with($relative, '.php') ? 0640 : 0644);
            if (!@rename($tmp, $destination)) {
                @unlink($tmp);
                throw new ElaraDeployException('جایگزینی اتمیک فایل ناموفق بود: ' . $relative, 500);
            }
        }
    }

    private function removeStaleManaged(array $previous, array $next): void
    {
        $keep = array_fill_keys($next, true);
        foreach ($previous as $relative) {
            $relative = $this->safeRelative((string)$relative);
            if (isset($keep[$relative])) {
                continue;
            }
            $path = $this->documentRoot . '/' . $relative;
            if (is_file($path) && !is_link($path)) {
                @unlink($path);
            }
        }
    }

    private function healthCheck(string $stage, array $manifest): void
    {
        foreach ($manifest['required'] as $relative) {
            $live = $this->documentRoot . '/' . $relative;
            if (!is_file($live) || filesize($live) < 1) {
                throw new ElaraDeployException('Health check فایل required ناموفق بود: ' . $relative, 500);
            }
        }
        foreach ($manifest['files'] as $relative) {
            $stageFile = $stage . '/' . $relative;
            $liveFile = $this->documentRoot . '/' . $relative;
            if (!is_file($liveFile) || !hash_equals((string)hash_file('sha256', $stageFile), (string)hash_file('sha256', $liveFile))) {
                throw new ElaraDeployException('Health check checksum ناموفق بود: ' . $relative, 500);
            }
        }
    }

    private function validateLiveRequired(): void
    {
        foreach (['index.html', '.htaccess', 'maintenance.html', 'admin/index.html', 'admin/admin.js', 'admin/deploy.php'] as $relative) {
            $path = $this->documentRoot . '/' . $relative;
            if (!is_file($path) || filesize($path) < 1) {
                throw new ElaraDeployException('نسخهٔ بازگردانی‌شده فایل required ندارد: ' . $relative, 500);
            }
        }
    }

    private function backupCurrent(array $managed, string $sha): string
    {
        $name = gmdate('YmdHis') . '-' . ($sha !== '' ? substr($sha, 0, 12) : 'untracked') . '-' . bin2hex(random_bytes(3));
        $dir = $this->serverRoot . '/backups/' . $name;
        $filesDir = $dir . '/files';
        $this->ensureDir($filesDir, 0700);
        $backed = [];
        foreach (array_values(array_unique($managed)) as $relative) {
            $relative = $this->safeRelative((string)$relative);
            $source = $this->documentRoot . '/' . $relative;
            if (is_file($source) && !is_link($source)) {
                $this->copyFile($source, $filesDir . '/' . $relative, 0600);
                $backed[] = $relative;
            }
        }
        $meta = [
            'sha' => $sha,
            'created_at' => gmdate('c'),
            'managed_paths' => array_values(array_unique($managed)),
            'backed_paths' => $backed,
        ];
        $this->atomicWrite($dir . '/backup.json', json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), 0600);
        return $dir;
    }

    private function restoreBackup(string $backupDir, array $currentManaged): array
    {
        $backupDir = $this->normalizeAbsolute($backupDir);
        if (!$this->isWithin($backupDir, $this->serverRoot . '/backups')) {
            throw new ElaraDeployException('Backup path خارج از محدودهٔ مجاز است.', 500);
        }
        $metaPath = $backupDir . '/backup.json';
        if (!is_file($metaPath)) {
            throw new ElaraDeployException('Backup metadata پیدا نشد.', 500);
        }
        $meta = json_decode((string)file_get_contents($metaPath), true);
        if (!is_array($meta)) {
            throw new ElaraDeployException('Backup metadata معتبر نیست.', 500);
        }
        $backed = is_array($meta['backed_paths'] ?? null) ? $meta['backed_paths'] : [];
        $backedSet = [];
        foreach ($backed as $relative) {
            $relative = $this->safeRelative((string)$relative);
            $source = $backupDir . '/files/' . $relative;
            if (!is_file($source) || is_link($source)) {
                throw new ElaraDeployException('Backup file پیدا نشد: ' . $relative, 500);
            }
            $destination = $this->documentRoot . '/' . $relative;
            $dir = dirname($destination);
            $this->ensureDir($dir, 0755);
            $tmp = $dir . '/.elara-rollback-' . bin2hex(random_bytes(6));
            if (!@copy($source, $tmp) || !@rename($tmp, $destination)) {
                @unlink($tmp);
                throw new ElaraDeployException('Rollback copy ناموفق بود: ' . $relative, 500);
            }
            @chmod($destination, str_ends_with($relative, '.php') ? 0640 : 0644);
            $backedSet[$relative] = true;
        }
        foreach ($currentManaged as $relative) {
            $relative = $this->safeRelative((string)$relative);
            if (isset($backedSet[$relative])) {
                continue;
            }
            $path = $this->documentRoot . '/' . $relative;
            if (is_file($path) && !is_link($path)) {
                @unlink($path);
            }
        }
        return $meta;
    }

    private function setMaintenance(bool $enabled, string $message): void
    {
        $flag = $this->maintenanceFlagPath();
        if ($enabled) {
            $payload = ['enabled' => true, 'message' => $message, 'updatedAt' => gmdate('c')];
            $this->atomicWrite($flag, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 0640);
            $this->writeMaintenancePage($message);
        } else {
            if (is_file($flag)) {
                @unlink($flag);
            }
        }
        $state = $this->readState();
        $state['maintenance_enabled'] = $enabled;
        $state['maintenance_message'] = $enabled ? $message : '';
        $this->writeState($state);
    }

    private function writeMaintenancePage(string $message): void
    {
        $safe = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $html = '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="30"><title>Elara · در حال به‌روزرسانی</title><style>html{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 75% 0,#241b4a 0,transparent 35%),#07111f;color:#f4f0ff;font-family:Tahoma,Arial,sans-serif;padding:24px}.card{width:min(560px,100%);padding:30px;border:1px solid #59699a;border-radius:22px;background:#101d35;box-shadow:0 22px 60px #0008;text-align:center}.mark{font-size:2rem;color:#a98cff}.kicker{color:#b9a8ff;letter-spacing:.12em;font-size:.75rem}h1{font-size:1.45rem;margin:10px 0}p{color:#c8d0e3;line-height:2;margin:0}.hint{margin-top:18px;font-size:.78rem;color:#8998b7}</style></head><body><main class="card"><div class="mark">✦</div><div class="kicker">ELARA SPACE</div><h1>در حال به‌روزرسانی</h1><p>' . $safe . '</p><div class="hint">این صفحه هر ۳۰ ثانیه دوباره بررسی می‌شود.</div></main></body></html>';
        $this->atomicWrite($this->documentRoot . '/maintenance.html', $html, 0644);
    }

    private function maintenanceFlagPath(): string
    {
        return $this->documentRoot . '/.elara-maintenance';
    }

    private function resolveLatestSha(): string
    {
        $url = 'https://api.github.com/repos/' . rawurlencode(self::OWNER) . '/' . rawurlencode(self::REPO) . '/branches/' . rawurlencode(self::BRANCH);
        $headers = ['Accept: application/vnd.github+json', 'X-GitHub-Api-Version: 2022-11-28'];
        $token = trim((string)($this->config['github_token'] ?? ''));
        if ($token !== '') {
            $headers[] = 'Authorization: Bearer ' . $token;
        }
        $data = $this->httpJson('GET', $url, $headers, null, 20);
        $sha = strtolower((string)($data['commit']['sha'] ?? ''));
        if (!preg_match('/^[0-9a-f]{40}$/', $sha)) {
            throw new ElaraDeployException('GitHub latest main SHA معتبر نیست.', 502);
        }
        return $sha;
    }

    private function downloadGithubSource(string $sha): string
    {
        if (!preg_match('/^[0-9a-f]{40}$/', $sha)) {
            throw new ElaraDeployException('SHA دانلود معتبر نیست.', 400);
        }
        if (!class_exists('ZipArchive')) {
            throw new ElaraDeployException('PHP ZipArchive روی هاست فعال نیست؛ برای One-Click Update باید php-zip فعال باشد.', 500);
        }
        $base = $this->serverRoot . '/staging/download-' . substr($sha, 0, 12) . '-' . bin2hex(random_bytes(4));
        $this->ensureDir($base, 0700);
        $archive = $base . '/release.zip';
        $url = 'https://api.github.com/repos/' . rawurlencode(self::OWNER) . '/' . rawurlencode(self::REPO) . '/zipball/' . $sha;
        $token = trim((string)($this->config['github_token'] ?? ''));
        $this->downloadGithubFile($url, $archive, $token !== '' ? $token : null);

        $zip = new ZipArchive();
        if ($zip->open($archive) !== true) {
            throw new ElaraDeployException('Archive دانلودشده باز نمی‌شود.', 502);
        }
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = (string)$zip->getNameIndex($i);
            if ($name === '' || str_starts_with($name, '/') || str_contains($name, '../') || str_contains($name, " ")) {
                $zip->close();
                throw new ElaraDeployException('Archive شامل مسیر ناامن است.', 502);
            }
        }
        $extract = $base . '/extracted';
        $this->ensureDir($extract, 0700);
        if (!$zip->extractTo($extract)) {
            $zip->close();
            throw new ElaraDeployException('Extract کردن GitHub archive ناموفق بود.', 502);
        }
        $zip->close();

        $entries = array_values(array_filter(scandir($extract) ?: [], fn($x) => $x !== '.' && $x !== '..'));
        foreach ($entries as $entry) {
            $candidate = $extract . '/' . $entry;
            if (is_dir($candidate) && is_file($candidate . '/deploy/production-manifest.json')) {
                return $candidate;
            }
        }
        throw new ElaraDeployException('ریشهٔ Elara در GitHub archive پیدا نشد.', 502);
    }

    private function downloadGithubFile(string $url, string $destination, ?string $token): void
    {
        $first = $this->downloadOnce($url, $destination, $token);
        if (in_array($first['status'], [301, 302, 303, 307, 308], true)) {
            @unlink($destination);
            $location = (string)($first['location'] ?? '');
            $parts = parse_url($location);
            $host = strtolower((string)($parts['host'] ?? ''));
            $scheme = strtolower((string)($parts['scheme'] ?? ''));
            if ($scheme !== 'https' || !in_array($host, ['codeload.github.com', 'github.com', 'api.github.com'], true)) {
                throw new ElaraDeployException('GitHub archive redirect به مقصد غیرمجاز رفت.', 502);
            }
            $second = $this->downloadOnce($location, $destination, $token);
            if ($second['status'] !== 200) {
                @unlink($destination);
                throw new ElaraDeployException('دانلود GitHub archive ناموفق بود. HTTP ' . $second['status'], 502);
            }
            return;
        }
        if ($first['status'] !== 200) {
            @unlink($destination);
            throw new ElaraDeployException('دانلود GitHub archive ناموفق بود. HTTP ' . $first['status'], 502);
        }
    }

    private function downloadOnce(string $url, string $destination, ?string $token): array
    {
        if (!function_exists('curl_init')) {
            throw new ElaraDeployException('PHP cURL برای Deployment لازم است.', 500);
        }
        $file = @fopen($destination, 'wb');
        if (!is_resource($file)) {
            throw new ElaraDeployException('ساخت فایل staging برای دانلود ممکن نیست.', 500);
        }
        $location = null;
        $ch = curl_init($url);
        $headers = ['Accept: application/vnd.github+json', 'User-Agent: ElaraDeploy/' . self::VERSION];
        if ($token !== null && $token !== '') {
            $headers[] = 'Authorization: Bearer ' . $token;
        }
        curl_setopt_array($ch, [
            CURLOPT_FILE => $file,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 90,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$location): int {
                if (stripos($line, 'Location:') === 0) {
                    $location = trim(substr($line, 9));
                }
                return strlen($line);
            },
        ]);
        $ok = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        fclose($file);
        if ($ok === false) {
            @unlink($destination);
            throw new ElaraDeployException('خطای شبکه هنگام دانلود GitHub archive: ' . $error, 502);
        }
        return ['status' => $status, 'location' => $location];
    }

    private function installRuntimeFromSource(string $sourceRoot): void
    {
        $source = rtrim($sourceRoot, '/') . '/deploy/server/ElaraDeployRuntime.php';
        if (!is_file($source) || is_link($source)) {
            throw new ElaraDeployException('Server runtime در سورس پیدا نشد.', 422);
        }
        $destination = $this->serverRoot . '/runtime/ElaraDeployRuntime.php';
        $this->copyFile($source, $destination, 0600, true);
    }

    private function stateManagedPaths(array $state): array
    {
        $paths = is_array($state['managed_paths'] ?? null) ? $state['managed_paths'] : [];
        $out = [];
        foreach ($paths as $path) {
            try {
                $out[] = $this->safeRelative((string)$path);
            } catch (Throwable) {
                // Ignore corrupt legacy state entries; never delete them.
            }
        }
        return array_values(array_unique($out));
    }

    private function updatePhase(string $phase, string $status, array $extra = []): void
    {
        $state = array_merge($this->readState(), $extra);
        $state['phase'] = $phase;
        $state['status'] = $status;
        $state['updated_at'] = gmdate('c');
        $this->writeState($state);
    }

    private function readState(): array
    {
        $path = $this->serverRoot . '/state/deployment.json';
        if (!is_file($path)) {
            return [
                'current_sha' => null,
                'latest_sha' => null,
                'last_deploy_at' => null,
                'last_check_at' => null,
                'status' => 'not_installed',
                'phase' => 'idle',
                'error' => null,
                'rollback_status' => null,
                'previous_backup' => null,
                'managed_paths' => [],
            ];
        }
        $state = json_decode((string)file_get_contents($path), true);
        return is_array($state) ? $state : [];
    }

    private function writeState(array $state): void
    {
        $state['updated_at'] = gmdate('c');
        $this->atomicWrite(
            $this->serverRoot . '/state/deployment.json',
            json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            0600
        );
    }

    private function appendAudit(array $event): void
    {
        $event['runtimeVersion'] = self::VERSION;
        $path = $this->serverRoot . '/logs/audit.ndjson';
        $line = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "
";
        $handle = @fopen($path, 'ab');
        if (!is_resource($handle)) {
            return;
        }
        if (@flock($handle, LOCK_EX)) {
            fwrite($handle, $line);
            fflush($handle);
            flock($handle, LOCK_UN);
        }
        fclose($handle);
        @chmod($path, 0600);
    }

    private function readAuditTail(int $limit): array
    {
        $path = $this->serverRoot . '/logs/audit.ndjson';
        if (!is_file($path)) {
            return [];
        }
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $lines = array_slice($lines, -max(1, min(50, $limit)));
        $out = [];
        foreach ($lines as $line) {
            $row = json_decode($line, true);
            if (is_array($row)) {
                $out[] = $row;
            }
        }
        return array_reverse($out);
    }

    private function httpJson(string $method, string $url, array $headers = [], ?array $body = null, int $timeout = 15): array
    {
        if (!function_exists('curl_init')) {
            throw new ElaraDeployException('PHP cURL روی سرور فعال نیست.', 500);
        }
        $ch = curl_init($url);
        $headers[] = 'User-Agent: ElaraDeploy/' . self::VERSION;
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => $method,
        ];
        if ($body !== null) {
            $options[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }
        curl_setopt_array($ch, $options);
        $response = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($response === false) {
            throw new ElaraDeployException('خطای شبکهٔ Backend: ' . $error, 502);
        }
        $decoded = json_decode((string)$response, true);
        if ($status < 200 || $status >= 300) {
            if (in_array($status, [401, 403], true)) {
                throw new ElaraDeployException('احراز هویت یا مجوز Backend رد شد.', $status);
            }
            throw new ElaraDeployException('سرویس upstream پاسخ ناموفق داد. HTTP ' . $status, 502);
        }
        if (!is_array($decoded)) {
            throw new ElaraDeployException('پاسخ JSON سرویس upstream معتبر نیست.', 502);
        }
        return $decoded;
    }

    private function assertProductionPathAllowed(string $relative): void
    {
        $forbiddenPrefixes = ['.git/', '.github/', 'tests/', 'docs/', 'deploy/', 'backups/', 'logs/'];
        foreach ($forbiddenPrefixes as $prefix) {
            if (str_starts_with($relative, $prefix)) {
                throw new ElaraDeployException('مسیر توسعه‌ای در Production manifest ممنوع است: ' . $relative, 422);
            }
        }
        if ($relative === 'firestore.rules' || preg_match('/(?:^|\/)\.env(?:\.|$)/i', $relative)) {
            throw new ElaraDeployException('فایل محرمانه/توسعه‌ای در Production manifest ممنوع است.', 422);
        }
        if (preg_match('/\.(?:md|rules|map|pem|key|p12|pfx|log|sql|bak)$/i', $relative)) {
            throw new ElaraDeployException('پسوند توسعه‌ای/محرمانه در Production manifest ممنوع است: ' . $relative, 422);
        }
    }

    private function safeRelative(string $path): string
    {
        $path = str_replace('\\', '/', trim($path));
        $path = preg_replace('#/+#', '/', $path) ?? '';
        if ($path === '' || str_starts_with($path, '/') || str_contains($path, " ")) {
            throw new ElaraDeployException('مسیر نسبی معتبر نیست.', 422);
        }
        $parts = explode('/', $path);
        foreach ($parts as $part) {
            if ($part === '' || $part === '.' || $part === '..') {
                throw new ElaraDeployException('Path traversal در مسیر Production مجاز نیست.', 422);
            }
        }
        if (!preg_match('/^[A-Za-z0-9._\/-]+$/', $path)) {
            throw new ElaraDeployException('کاراکتر نامعتبر در مسیر Production: ' . $path, 422);
        }
        return $path;
    }

    private function normalizeAbsolute(string $path): string
    {
        $path = trim(str_replace('\\', '/', $path));
        if (!str_starts_with($path, '/')) {
            throw new ElaraDeployException('مسیر سرور باید absolute باشد.', 500);
        }
        $parts = [];
        foreach (explode('/', $path) as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                throw new ElaraDeployException('.. در مسیر سرور مجاز نیست.', 500);
            }
            $parts[] = $part;
        }
        return '/' . implode('/', $parts);
    }

    private function isWithin(string $path, string $base): bool
    {
        $path = rtrim($path, '/');
        $base = rtrim($base, '/');
        return $path === $base || str_starts_with($path, $base . '/');
    }

    private function ensureDir(string $path, int $mode): void
    {
        if (!is_dir($path) && !@mkdir($path, $mode, true) && !is_dir($path)) {
            throw new ElaraDeployException('ساخت پوشهٔ سرور ناموفق بود.', 500);
        }
        @chmod($path, $mode);
    }

    private function copyFile(string $source, string $destination, int $mode, bool $atomic = false): void
    {
        if (!is_file($source) || is_link($source)) {
            throw new ElaraDeployException('Source file امن نیست: ' . basename($source), 500);
        }
        $this->ensureDir(dirname($destination), 0700);
        if ($atomic) {
            $tmp = dirname($destination) . '/.elara-copy-' . bin2hex(random_bytes(5));
            if (!@copy($source, $tmp) || !@rename($tmp, $destination)) {
                @unlink($tmp);
                throw new ElaraDeployException('کپی امن فایل server-only ناموفق بود.', 500);
            }
        } elseif (!@copy($source, $destination)) {
            throw new ElaraDeployException('کپی فایل staging/backup ناموفق بود.', 500);
        }
        @chmod($destination, $mode);
    }

    private function atomicWrite(string $path, string $content, int $mode): void
    {
        $this->ensureDir(dirname($path), 0700);
        $tmp = dirname($path) . '/.elara-write-' . bin2hex(random_bytes(6));
        if (@file_put_contents($tmp, $content, LOCK_EX) === false) {
            @unlink($tmp);
            throw new ElaraDeployException('نوشتن state/config سرور ناموفق بود.', 500);
        }
        @chmod($tmp, $mode);
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new ElaraDeployException('جایگزینی امن state/config ناموفق بود.', 500);
        }
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path) || is_link($path)) {
            return;
        }
        if (!str_starts_with($this->normalizeAbsolute($path), $this->serverRoot . '/staging/')) {
            return;
        }
        $items = scandir($path) ?: [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $full = $path . '/' . $item;
            if (is_dir($full) && !is_link($full)) {
                $this->removeTree($full);
            } else {
                @unlink($full);
            }
        }
        @rmdir($path);
    }

    private function safeError(Throwable $error): string
    {
        $message = trim($error->getMessage());
        $message = str_replace([$this->home, $this->serverRoot, $this->documentRoot], ['[HOME]', '[SERVER_ROOT]', '[DOCUMENT_ROOT]'], $message);
        $message = $message !== '' ? $message : 'خطای ناشناخته';
        return function_exists('mb_substr') ? mb_substr($message, 0, 600) : substr($message, 0, 2400);
    }

    private function requireMethod(string $method, array $allowed, callable $callback): array
    {
        if (!in_array(strtoupper($method), $allowed, true)) {
            throw new ElaraDeployException('HTTP method برای این عملیات مجاز نیست.', 405);
        }
        return $callback();
    }
}

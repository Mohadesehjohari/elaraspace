<?php
declare(strict_types=1);

require_once __DIR__ . '/../deploy/server/ElaraDeployRuntime.php';

function ok(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('FAIL: ' . $message);
    }
}
function expectStatus(callable $fn, int $status, string $message): void
{
    try {
        $fn();
    } catch (ElaraDeployException $error) {
        ok($error->httpStatus === $status, $message . ' (wrong status)');
        return;
    }
    throw new RuntimeException('FAIL: ' . $message . ' (no exception)');
}
function makeSource(string $root, string $label): void
{
    @mkdir($root . '/admin', 0777, true);
    @mkdir($root . '/deploy/server', 0777, true);
    $files = [
        '.htaccess' => "Options -Indexes\n# {$label}\n",
        'maintenance.html' => "<!doctype html><title>{$label}</title>",
        'index.html' => "<!doctype html><title>{$label}</title><p>{$label}</p>",
        'admin/index.html' => "<!doctype html><title>Admin {$label}</title>",
        'admin/admin.js' => "console.log('{$label}');\n",
        'admin/deploy.php' => "<?php echo 'gateway {$label}';\n",
    ];
    foreach ($files as $path => $content) {
        $target = $root . '/' . $path;
        @mkdir(dirname($target), 0777, true);
        file_put_contents($target, $content);
    }
    copy(__DIR__ . '/../deploy/server/ElaraDeployRuntime.php', $root . '/deploy/server/ElaraDeployRuntime.php');
    $manifest = [
        'schema' => 1,
        'owner' => 'Mohadesehjohari',
        'repo' => 'elaraspace',
        'branch' => 'main',
        'required' => array_keys($files),
        'files' => array_keys($files),
    ];
    file_put_contents($root . '/deploy/production-manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}
function rmTree(string $path): void
{
    if (!is_dir($path)) return;
    foreach (scandir($path) ?: [] as $item) {
        if ($item === '.' || $item === '..') continue;
        $full = $path . '/' . $item;
        if (is_dir($full) && !is_link($full)) rmTree($full); else @unlink($full);
    }
    @rmdir($path);
}

expectStatus(fn() => ElaraDeployRuntime::bearerFromServer([]), 401, 'unauthenticated endpoint contract');
expectStatus(fn() => ElaraDeployRuntime::assertDeployRole(['enabled' => true, 'role' => 'moderator']), 403, 'moderator cannot deploy');
ElaraDeployRuntime::assertDeployRole(['enabled' => true, 'role' => 'admin']);
ElaraDeployRuntime::assertDeployRole(['enabled' => true, 'role' => 'owner']);

$base = sys_get_temp_dir() . '/elara-deploy-test-' . bin2hex(random_bytes(5));
$home = $base . '/home';
$docroot = $home . '/public_html';
$serverRoot = $home . '/elara-deploy';
$source1 = $base . '/source-v1';
$source2 = $base . '/source-v2';
@mkdir($home, 0777, true);
makeSource($source1, 'release-one');
makeSource($source2, 'release-two');
$config = ['document_root' => $docroot, 'server_root' => $serverRoot, 'github_token' => null];
$runtime = new ElaraDeployRuntime($config, $home);

$runtime->acquireLock();
$runtime2 = new ElaraDeployRuntime($config, $home);
expectStatus(fn() => $runtime2->acquireLock(), 409, 'concurrent deploy lock');
$runtime->releaseLock();

$sha1 = str_repeat('a', 40);
$sha2 = str_repeat('b', 40);
$result1 = $runtime->deployLocalSource($source1, $sha1);
ok(($result1['current_sha'] ?? '') === $sha1, 'first deploy records SHA');
ok(!is_file($docroot . '/.elara-maintenance'), 'maintenance disabled after successful deploy');
ok(str_contains((string)file_get_contents($docroot . '/index.html'), 'release-one'), 'first release live');

$result2 = $runtime->deployLocalSource($source2, $sha2);
ok(($result2['current_sha'] ?? '') === $sha2, 'second deploy records SHA');
ok(is_dir((string)($result2['previous_backup'] ?? '')), 'previous successful release backup exists');
ok(str_contains((string)file_get_contents($docroot . '/index.html'), 'release-two'), 'second release live');

$rolled = $runtime->rollback(['uid' => 'test-owner', 'role' => 'owner', 'enabled' => true]);
ok(($rolled['current_sha'] ?? '') === $sha1, 'rollback restores previous SHA');
ok(str_contains((string)file_get_contents($docroot . '/index.html'), 'release-one'), 'rollback restores previous files');
ok(!is_file($docroot . '/.elara-maintenance'), 'maintenance disabled after successful rollback');

$bad = $base . '/bad-source';
makeSource($bad, 'bad');
$manifestPath = $bad . '/deploy/production-manifest.json';
$badManifest = json_decode((string)file_get_contents($manifestPath), true);
$badManifest['files'][] = 'docs/secret.md';
@mkdir($bad . '/docs', 0777, true);
file_put_contents($bad . '/docs/secret.md', 'no');
file_put_contents($manifestPath, json_encode($badManifest));
expectStatus(fn() => $runtime->loadManifest($bad), 422, 'manifest rejects docs');

rmTree($base);
echo "PASS: auth role, deployment lock, staging deploy, maintenance, backup and rollback contracts.\n";

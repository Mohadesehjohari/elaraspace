<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

function elara_json_error(string $message, int $status): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$authorization = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
if (!preg_match('/^Bearer\\s+([^\\s]+)$/i', $authorization, $match)) {
    elara_json_error('احراز هویت لازم است.', 401);
}
$idToken = trim($match[1]);
if (strlen($idToken) < 100 || strlen($idToken) > 10000) {
    elara_json_error('توکن احراز هویت معتبر نیست.', 401);
}

$homeCandidates = [getenv('HOME') ?: null, $_SERVER['HOME'] ?? null];
if (function_exists('posix_geteuid') && function_exists('posix_getpwuid')) {
    $pw = @posix_getpwuid(posix_geteuid());
    if (is_array($pw) && isset($pw['dir'])) {
        $homeCandidates[] = $pw['dir'];
    }
}
$home = '';
foreach ($homeCandidates as $candidate) {
    if (is_string($candidate) && $candidate !== '' && str_starts_with($candidate, '/')) {
        $home = rtrim($candidate, '/');
        break;
    }
}
if ($home === '') {
    elara_json_error('HOME سرور برای Deployment قابل تشخیص نیست.', 503);
}

$serverRoot = $home . '/elara-deploy';
$configPath = $serverRoot . '/config.php';
$runtimePath = $serverRoot . '/runtime/ElaraDeployRuntime.php';
if (!is_file($configPath) || !is_file($runtimePath)) {
    elara_json_error('Deployment runtime نصب نشده است. ابتدا نصب cPanel را اجرا کن.', 503);
}

$config = require $configPath;
if (!is_array($config)) {
    elara_json_error('Server-only deployment config معتبر نیست.', 503);
}
require_once $runtimePath;

$action = trim((string)($_GET['action'] ?? 'status'));
if (!in_array($action, ['status', 'check', 'deploy', 'rollback', 'maintenance'], true)) {
    elara_json_error('عملیات Deployment مجاز نیست.', 404);
}
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$body = [];
if ($method === 'POST') {
    $raw = (string)file_get_contents('php://input');
    if ($raw !== '') {
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            elara_json_error('JSON درخواست معتبر نیست.', 400);
        }
        $body = $decoded;
    }
}

try {
    $runtime = new ElaraDeployRuntime($config, $home);
    $result = $runtime->handle($action, $method, $idToken, $body);
    echo json_encode(['ok' => true, 'data' => $result], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (ElaraDeployException $error) {
    elara_json_error($error->getMessage(), $error->httpStatus);
} catch (Throwable $error) {
    error_log('Elara deploy endpoint: ' . $error->getMessage());
    elara_json_error('خطای داخلی Deployment رخ داد. جزئیات در log سرور ثبت شد.', 500);
}

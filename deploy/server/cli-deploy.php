<?php
declare(strict_types=1);

require_once __DIR__ . '/ElaraDeployRuntime.php';

function argValue(array $argv, string $name): ?string
{
    $prefix = '--' . $name . '=';
    foreach ($argv as $arg) {
        if (str_starts_with($arg, $prefix)) {
            return substr($arg, strlen($prefix));
        }
    }
    return null;
}

try {
    $home = ElaraDeployRuntime::resolveHome();
    $serverRoot = $home . '/elara-deploy';
    if (!is_dir($serverRoot) && !mkdir($serverRoot, 0700, true) && !is_dir($serverRoot)) {
        throw new RuntimeException('Cannot create server deployment directory.');
    }
    $configPath = $serverRoot . '/config.php';
    if (!is_file($configPath)) {
        $documentRoot = getenv('ELARA_DOCUMENT_ROOT') ?: ($home . '/public_html');
        $config = [
            'document_root' => $documentRoot,
            'server_root' => $serverRoot,
            'github_token' => null,
        ];
        $content = "<?php\nreturn " . var_export($config, true) . ";\n";
        if (file_put_contents($configPath, $content, LOCK_EX) === false) {
            throw new RuntimeException('Cannot create server-only config.php.');
        }
        @chmod($configPath, 0600);
        fwrite(STDOUT, "Created server-only config: {$configPath}\n");
    }
    $config = require $configPath;
    if (!is_array($config)) {
        throw new RuntimeException('Server-only config.php must return an array.');
    }
    $source = argValue($argv, 'source');
    $sha = argValue($argv, 'sha');
    if ($source === null || $sha === null) {
        throw new InvalidArgumentException('Usage: php cli-deploy.php --source=/path/to/repo --sha=<40-hex-sha>');
    }
    $runtime = new ElaraDeployRuntime($config, $home);
    $result = $runtime->deployLocalSource($source, strtolower($sha), ['uid' => 'cpanel', 'role' => 'server']);
    fwrite(STDOUT, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
} catch (Throwable $error) {
    fwrite(STDERR, 'Elara cPanel deployment failed: ' . $error->getMessage() . "\n");
    exit(1);
}

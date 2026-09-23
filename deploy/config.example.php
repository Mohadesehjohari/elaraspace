<?php
// نمونهٔ بدون Secret. فایل واقعی باید در $HOME/elara-deploy/config.php و خارج public_html باشد.
return [
    'document_root' => '/home/CPANEL_USERNAME/public_html',
    'server_root' => '/home/CPANEL_USERNAME/elara-deploy',

    // Repo فعلاً Public است و این مقدار باید null بماند.
    // اگر Repo بعداً Private شد، credential فقط همین فایل server-only قرار می‌گیرد.
    'github_token' => null,
];

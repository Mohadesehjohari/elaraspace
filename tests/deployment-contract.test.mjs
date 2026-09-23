import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(read('deploy/production-manifest.json'));
const gateway=read('admin/deploy.php');
const runtime=read('deploy/server/ElaraDeployRuntime.php');
const adminJs=read('admin/admin.js');
const adminHtml=read('admin/index.html');
const htaccess=read('.htaccess');
const cpanel=read('.cpanel.yml');
const install=read('deploy/cpanel-deploy.sh');
const maintenance=read('maintenance.html');

assert.equal(manifest.owner,'Mohadesehjohari');
assert.equal(manifest.repo,'elaraspace');
assert.equal(manifest.branch,'main');
assert.equal(manifest.schema,1);
assert.ok(Array.isArray(manifest.files)&&manifest.files.length>20,'production manifest must be explicit');
for(const required of ['index.html','styles.css','app.js','boot.js','cloud.js','admin/index.html','admin/admin.js','admin/deploy.php','.htaccess','maintenance.html']){
  assert.ok(manifest.files.includes(required),'manifest missing '+required);
  assert.ok(manifest.required.includes(required),'required missing '+required);
}
for(const path of manifest.files){
  assert.doesNotMatch(path,/^(?:\.git|\.github|tests|docs|deploy|backups|logs)(?:\/|$)/,'forbidden production path '+path);
  assert.notEqual(path,'firestore.rules');
  assert.doesNotMatch(path,/\.(?:md|rules|map|pem|key|p12|pfx|log|sql|bak)$/i,'forbidden production extension '+path);
}
assert.equal(new Set(manifest.files).size,manifest.files.length,'manifest contains duplicate paths');

for(const source of [adminJs,adminHtml]){
  for(const secret of ['CPANEL_API_TOKEN','CPANEL_PASSWORD','SSH_PRIVATE_KEY','FIREBASE_SERVICE_ACCOUNT','GITHUB_PRIVATE_TOKEN']){
    assert.ok(!source.includes(secret),'frontend references server secret '+secret);
  }
}
assert.match(gateway,/^<\?php/m);
assert.match(gateway,/HTTP_AUTHORIZATION/);
assert.ok(gateway.includes('Bearer\\\\s+'),'gateway must require Bearer auth');
assert.match(runtime,/public const OWNER = 'Mohadesehjohari'/);
assert.match(runtime,/public const REPO = 'elaraspace'/);
assert.match(runtime,/public const BRANCH = 'main'/);
assert.match(runtime,/\['owner', 'admin'\]/);
assert.match(runtime,/LOCK_EX \| LOCK_NB/);
assert.match(runtime,/setMaintenance\(true/);
assert.match(runtime,/backupCurrent/);
assert.match(runtime,/restoreBackup/);
assert.match(runtime,/downloadGithubSource\(\$latest\)/);
assert.match(runtime,/zipball\/.*\$sha/);
assert.match(runtime,/previous_backup/);
assert.doesNotMatch(runtime,/\$_(?:GET|POST|REQUEST)\[[^\]]*(?:command|cmd|shell)/i);
assert.match(adminJs,/getIdToken\(/);
assert.match(adminJs,/Authorization/);
assert.match(adminHtml,/بررسی آپدیت/);
assert.match(adminHtml,/اعمال آپدیت/);
assert.match(adminHtml,/Rollback/);
assert.match(htaccess,/Options -Indexes/);
assert.match(htaccess,/\.elara-maintenance/);
assert.match(htaccess,/R=503/);
assert.match(htaccess,/ErrorDocument 503 \/maintenance\.html/);
assert.match(cpanel,/deploy\/cpanel-deploy\.sh/);
assert.match(install,/git -C "\$REPO_ROOT" rev-parse --verify HEAD/);
assert.match(maintenance,/dir="rtl"/);
assert.match(maintenance,/در حال به‌روزرسانی/);
console.log('PASS: cPanel manifest, server auth, maintenance, lock, rollback and secret-boundary contracts.');

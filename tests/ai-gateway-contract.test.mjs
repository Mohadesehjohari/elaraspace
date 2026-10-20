import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const runtime=readFileSync('deploy/server/ElaraAiRuntime.php','utf8');
const admin=readFileSync('admin/index.html','utf8');
const client=readFileSync('freedom-ai.js','utf8');
const manifest=JSON.parse(readFileSync('deploy/production-manifest.json','utf8'));
for(const token of ['aes-256-gcm','ai-master.key','x-goog-api-key','priority + least-used + retryable failover','systemPrompt'])assert.ok(runtime.toLowerCase().includes(token.toLowerCase()),'AI runtime contract missing '+token);
assert.ok(runtime.includes('do not falsely claim that Elara trained or owns the base model'),'AI provenance policy must avoid false first-party model claims');
const stripped=runtime.replace(/FIREBASE_WEB_API_KEY\s*=\s*'[^']+';/g,'');
assert.equal(/AIza[0-9A-Za-z_-]{20,}/.test(stripped),false,'No Gemini secret may be committed in runtime');
assert.ok(admin.includes('ai-key-token')&&admin.includes('ai-model-technical')&&admin.includes('ai-default-model'),'Admin AI key/model controls missing');
// Naming Google's Gemini in user-facing privacy consent is expected and transparent.
// Block direct provider requests and embedded provider keys in browser JavaScript instead.
assert.ok(client.includes("fetch(aiEndpoint()") &&
  !/generativelanguage\.googleapis\.com|x-goog-api-key|AIza[0-9A-Za-z_-]{20,}/i.test(client),
  'User Freedom AI client must use the secure gateway, never expose direct provider endpoints or keys');
assert.ok(client.includes("ELARA_AI_API_URL"),'GitHub Pages user AI gateway configuration missing');
assert.ok(admin.includes("ai-key-token"),'Admin Token UI must remain functional');
for(const path of ['ai.php','admin/ai.php','freedom-ai.js','freedom-refinement-v2.css','ai-gateway-config.js'])assert.ok(manifest.required.includes(path)&&manifest.files.includes(path),'Production manifest missing '+path);
console.log('PASS: secure AI gateway/admin contract, server-only secrets, display/technical model separation and provenance policy');

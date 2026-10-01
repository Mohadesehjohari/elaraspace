import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'https://mohadesehjohari.github.io/elaraspace';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/?boot-smoke='+Date.now()+'#home',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:12000});
await page.waitForFunction(()=>document.body.classList.contains('cloud-ready')||document.querySelector('[data-elara-account-gate-ready]'),null,{timeout:12000});
const state=await page.evaluate(()=>({
  ready:document.body.classList.contains('cloud-ready'),
  offline:document.body.classList.contains('cloud-offline'),
  gate:document.querySelector('[data-elara-account-gate-ready]')?.getAttribute('data-elara-account-gate-ready')||null,
  boot:document.documentElement.hasAttribute('data-elara-booting'),
  shell:!!document.querySelector('.shell'),
  hash:location.hash
}));
assert.equal(state.boot,false,'boot splash did not release');
assert.equal(state.shell,true,'application shell missing');
assert.ok(state.ready||state.gate,'neither usable shell nor account gate became ready: '+JSON.stringify(state));
assert.deepEqual(errors,[],'runtime page errors: '+errors.join(' | '));
console.log('PRODUCTION_BOOT_PASS '+JSON.stringify(state));
await browser.close();

import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
for(const width of [390,1440]){
 const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 const page=await ctx.newPage();
 const cloud="window.ElaraAccount={user:null,profile:{name:'QA',username:'qa',xp:0,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
 const social="window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true};window.dispatchEvent(new Event('elara:social-updated'));";
 await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloud}));
 await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.addInitScript(()=>{localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:0,tasks:[],habits:[],goals:[],books:[],words:[],focusSessions:[]}));localStorage.setItem('elara_fox_options_v1',JSON.stringify({visible:true,celebrations:true}))});
 await page.goto((process.env.ELARA_TEST_URL||'http://127.0.0.1:4173')+'/#home',{waitUntil:'domcontentloaded',timeout:40000});
 await page.waitForFunction(()=>!!window.ElaraFoxRewards&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
 const loaded=await page.evaluate(async()=>{const i=new Image();i.src='assets/ui/fox-celebrate.webp';await i.decode();return i.naturalWidth});assert.ok(loaded>100);
 assert.equal(await page.locator('.elara-fox-companion').count(),0,'No permanent fox on Home');
 for(const route of ['language','exercise','words']){
  await page.evaluate(r=>window.ElaraOpen(r,{history:'push'}),route);
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.elara-fox-companion').count(),0,'No permanent fox on '+route);
 }
 await page.evaluate(()=>window.ElaraOpen('settings',{history:'push'}));
 await page.waitForSelector('#elara-fox-settings [data-fox-preview]');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).xp);
 await page.locator('[data-fox-preview]').click();await page.locator('[data-elara-reward-modal]').waitFor();
 const rect=await page.locator('.elara-fox-dialog').boundingBox();assert.ok(rect&&rect.width<=width-14);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[data-elara-reward-modal]'));
 // Visual-only preview may animate but must not put anything in the reward vault.
 assert.equal(await page.evaluate(()=>window.ElaraFoxClaim.read().totalStars),0);
 assert.equal(await page.locator('[data-fox-prize-setting="sound"]').isChecked(),false,'reward sound is opt-in');
 await page.evaluate(()=>window.ElaraFoxRewards.show('qa-achievement:'+Date.now(),{
  kind:'mission',image:'celebrate',title:'QA achievement',description:'Confirmed XP',
  rewardXp:20,stars:2,primary:'Keep going'
 }));
 await page.locator('[data-elara-reward-modal] .elara-fox-prize-card').waitFor();
 const pendingBefore=await page.evaluate(()=>window.ElaraFoxClaim.read());
 assert.equal(pendingBefore.pending.length,1);
 await page.locator('[data-elara-reward-modal] .elara-fox-action.primary').click();
 await page.locator('.is-fox-prize-collected').waitFor();
 const collected=await page.evaluate(()=>window.ElaraFoxClaim.read());
 assert.equal(collected.totalStars,2,'collect must persist stars');
 assert.equal(collected.pending.length,0,'claimed item removed from pending');
 await page.locator('[data-elara-reward-modal] .elara-fox-action.primary').click();
 await page.waitForFunction(()=>!document.querySelector('[data-elara-reward-modal]'));
 await page.evaluate(()=>window.ElaraFoxRewards.show('qa-later:'+Date.now(),{
  kind:'goal',image:'goals',title:'QA uncollected reward',stars:1
 }));
 await page.locator('[data-elara-reward-modal]').waitFor();
 await page.locator('.elara-fox-close').click();
 await page.waitForFunction(()=>!document.querySelector('[data-elara-reward-modal]'));
 assert.equal(await page.evaluate(()=>window.ElaraFoxClaim.read().pending.length),1,'dismissed reward remains saved');
 await page.evaluate(()=>window.ElaraFoxRewards.refresh());
 await page.locator('#elara-fox-prize-vault [data-fox-claim-pending]').click();
 await page.locator('[data-elara-reward-modal] .elara-fox-action.primary').click();
 assert.equal(await page.evaluate(()=>window.ElaraFoxClaim.read().totalStars),3,'claim from vault works');
 await page.keyboard.press('Escape');
 await page.locator('[data-fox-setting="celebrations"]').uncheck();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('elara:leitner-review-committed',{detail:{wasDue:true,dueBefore:1,dueRemaining:0,wordId:'test-'+Math.random(),xpAwarded:0}})));
 await page.waitForTimeout(100);assert.equal(await page.locator('[data-elara-reward-modal]').count(),0);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).xp);assert.equal(before,after);
 await ctx.close();
}
await browser.close();console.log('FOX_BROWSER_PASS');

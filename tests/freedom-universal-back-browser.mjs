import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base = process.env.ELARA_TEST_URL || 'http://127.0.0.1:4173';
const cloud = "window.ElaraAccount={user:{uid:'freedom-back-qa',emailVerified:true},profile:{uid:'freedom-back-qa'}};document.body.classList.add('cloud-ready');document.body.classList.remove('cloud-locked');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social = "window.ElaraSocial={me:{uid:'freedom-back-qa'},friends:[],requests:[],activities:[],refresh:async()=>{}};";

const browser = await chromium.launch({headless:true});
try {
  for (const width of [375, 768, 1440]) {
    const page = await browser.newPage({viewport:{width,height:900}});
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/cloud.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:cloud}));
    await page.route('**/elara-social.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:social}));
    await page.goto(base+'/?freedom-back-test='+width+'#freedom',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(
      () => window.ElaraFreedomUniversalBack &&
        window.ElaraFreedomEnhancements?.__r31 &&
        window.ElaraFreedomR30 && window.ElaraFreedomR31 &&
        !document.documentElement.hasAttribute('data-elara-booting'),
      null,{timeout:55000}
    );
    const action = page.locator('#freedom-universal-back');

    // Reflection is the reported broken view. Notes, four R30 pages and
    // the other three R31 pages must all have an actionable fixed back.
    const kinds = ['reflection','notes','ideas','inspiration','vision','diary','art','experiences','gallery'];
    for (const kind of kinds) {
      await page.evaluate(x=>window.ElaraFreedomEnhancements.open(x),kind);
      await page.waitForSelector('#panel-freedom > .freedom-subpage-shell[data-freedom-view="'+kind+'"]',{timeout:12000});
      const native = page.locator('#panel-freedom > .freedom-subpage-shell .freedom-back-toolbar > button');
      await native.waitFor({state:'visible',timeout:7000});
      assert.equal(await native.count(),1,width+' '+kind+' has an embedded Back control');
      assert.match(await native.innerText(),/بازگشت به آزادی/);
      await action.waitFor({state:'visible',timeout:7000});
      const hit = await action.evaluate(btn=>{
        const box=btn.getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height/2;
        return {
          viewport:box.left>=0&&box.right<=innerWidth+1&&box.top>=0&&box.bottom<=innerHeight+1,
          clickable:document.elementFromPoint(cx,cy)?.closest('#freedom-universal-back')===btn,
          hasText:btn.textContent.includes('بازگشت به آزادی'),
        };
      });
      assert.ok(hit.viewport,width+' '+kind+' button in viewport '+JSON.stringify(hit));
      assert.ok(hit.clickable,width+' '+kind+' button is not covered by toolbar or banner '+JSON.stringify(hit));
      assert.ok(hit.hasText,width+' '+kind+' readable Back label');
      if (kind === 'reflection' || kind === 'experiences' || kind === 'notes') {
        await native.click({timeout:10000});
      } else {
        await action.click({timeout:10000});
      }
      await page.waitForFunction(()=>!document.querySelector('#panel-freedom > .freedom-subpage-shell'),null,{timeout:12000});
      await action.waitFor({state:'hidden',timeout:7000});
      assert.equal(await page.evaluate(()=>location.hash),'#freedom',kind+' returns to Freedom');
    }
    await page.evaluate(()=>window.ElaraOpen('tasks'));
    await action.waitFor({state:'hidden',timeout:7000});
    assert.deepEqual(errors,[],width+' no JS errors');
    console.log('FREEDOM_UNIVERSAL_BACK_PASS '+width);
    await page.close();
  }
} finally {await browser.close();}

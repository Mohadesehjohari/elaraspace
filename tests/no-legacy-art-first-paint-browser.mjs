import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try {
  for(const width of [390,768,1440]) {
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage();
    const oldRequests=[];
    page.on('request',request=>{
      if(/\/assets\/ui\/hero-landscape\.webp(?:\?|$)/i.test(request.url())) oldRequests.push(request.url());
    });
    await page.goto(base+'/?no-legacy-art='+width+'#home',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>!!window.ElaraReferenceHome && !!window.ElaraOwnerHomeArtwork &&
      !document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:12000});
    await page.waitForFunction(()=>!!document.querySelector('#ref-quick-access .ref-quick-icon--reference') &&
      !!document.querySelector('#panel-home .owner-home-hero-image'),null,{timeout:12000});
    const first=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll('#ref-quick-access .ref-quick-card')];
      const art=document.querySelector('#panel-home .owner-home-hero-image');
      const title=document.querySelector('#panel-home .owner-home-tasks>header h2');
      const hero=document.querySelector('#panel-home .owner-home-hero');
      return {
        route:location.hash,
        count:cards.length,
        exactFinalIcons:cards.every(card=>!!card.querySelector(':scope > span.ref-quick-icon--reference > svg')),
        oldBadges:document.querySelectorAll('#ref-quick-access .ref-quick-card > img.ref-quick-icon').length,
        obsoleteHeadingIcons:document.querySelectorAll('#panel-home .ref-tasks-heading-art,#panel-home .ref-habits-heading-art,#panel-home .ref-ranking-heading-art').length,
        hero:art?.getAttribute('src')||'',
        heroBackground:hero?getComputedStyle(hero).backgroundImage:'',
        title:title?.textContent?.trim()||'',
        skeleton:getComputedStyle(document.getElementById('elara-boot-screen')).display
      };
    });
    assert.equal(first.route,'#home');
    assert.equal(first.count,6,'All quick access destinations must remain functional');
    assert.equal(first.exactFinalIcons,true,'New vector icons must be created immediately, not swapped into old WebPs');
    assert.equal(first.oldBadges,0,'Deprecated WebP badges were inserted into DOM');
    assert.equal(first.obsoleteHeadingIcons,0,'Hidden legacy heading icons still occupy network requests');
    assert.ok(first.hero.endsWith('/homebanner1.webp'),'Wrong Home hero image '+first.hero);
    assert.ok(!first.heroBackground.includes('hero-landscape.webp'),'Old CSS Home banner still exists');
    assert.equal(first.skeleton,'none');
    await page.waitForFunction(()=>window.__elaraBootStage==='secondary',null,{timeout:35000});
    assert.deepEqual(oldRequests,[],'A retired landscape banner was requested');
    // Signed-out test sessions can have the genuine Firebase gate over the buttons.
    // Verify the real canonical router instead of bypassing account security with CSS.
    await page.evaluate(()=>window.ElaraOpen('books',{history:'replace'}));
    await page.waitForFunction(()=>location.hash==='#books' && !!document.querySelector('#panel-books #lib01-overview'),null,{timeout:15000});
    assert.equal(await page.locator('#panel-books .elara-global-hero').count(),1,'New Library banner lost');
    console.log('NO_LEGACY_ART_PASS '+JSON.stringify({width,quickIcons:first.count,hero:first.hero,retiredRequests:oldRequests.length}));
    await context.close();
  }
} finally {await browser.close()}
console.log('NO_LEGACY_ART_ALL_PASS');

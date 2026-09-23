import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const out='browser-artifacts';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const primary=['exercise','language','tasks','home','ranking','books','freedom'];

async function ready(page){
  await page.goto('http://127.0.0.1:4173/#home',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.ElaraNavigation&&typeof window.ElaraOpen==='function'&&document.querySelector('.sidebar .navigation'),null,{timeout:20000});
  await page.addStyleTag({content:
    '#cloud-layer{display:none!important}'+
    'body:not(.cloud-ready) .shell,body.cloud-locked .shell,body:not(.cloud-ready) .bottom-nav{visibility:visible!important}'+
    '*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'
  });
  await page.evaluate(()=>{
    document.body.classList.add('cloud-ready');
    document.body.classList.remove('cloud-locked');
    const layer=document.getElementById('cloud-layer');
    if(layer){layer.hidden=true;layer.setAttribute('hidden','')}
    window.ElaraNavigation.render();
    window.ElaraNavigation.active();
  });
  await page.waitForTimeout(300);
}
async function isVisible(locator){
  const box=await locator.boundingBox();
  return !!box&&box.width>0&&box.height>0;
}

const desktop=await browser.newPage({viewport:{width:1440,height:1000}});
await ready(desktop);
assert.equal(await desktop.locator('.sidebar .navigation').getAttribute('data-elara-nav-owner'),'canonical');
assert.deepEqual(
  await desktop.locator('.sidebar .elara-sidebar-primary [data-elara-tab]').evaluateAll(nodes=>nodes.map(n=>n.dataset.elaraTab)),
  primary
);
for(const route of primary)assert.equal(await isVisible(desktop.locator('.sidebar .elara-sidebar-primary [data-elara-tab="'+route+'"]')),true,'desktop route hidden: '+route);
assert.equal(await isVisible(desktop.locator('.sidebar .elara-sidebar-secondary [data-elara-tab="reports"]')),true,'Reports secondary hidden');
assert.equal(await desktop.locator('.sidebar [data-elara-tab="home"]').getAttribute('aria-current'),'page');
await desktop.screenshot({path:out+'/01-desktop-1440-sidebar-home.png'});

await desktop.locator('.sidebar [data-elara-tab="books"]').click();
await desktop.waitForFunction(()=>location.hash==='#books');
assert.equal(await desktop.locator('.sidebar [data-elara-tab="books"]').getAttribute('aria-current'),'page');
assert.notEqual(await desktop.locator('.sidebar [data-elara-tab="home"]').getAttribute('aria-current'),'page');
await desktop.screenshot({path:out+'/02-desktop-1440-library-active.png'});

const mobile=await browser.newPage({viewport:{width:390,height:844}});
await ready(mobile);
assert.equal(await mobile.locator('.sidebar').evaluate(el=>getComputedStyle(el).display),'none');
assert.deepEqual(
  await mobile.locator('.bottom-nav [data-elara-tab]').evaluateAll(nodes=>nodes.map(n=>n.dataset.elaraTab)),
  primary
);
for(const route of primary)assert.equal(await isVisible(mobile.locator('.bottom-nav [data-elara-tab="'+route+'"]')),true,'mobile route hidden: '+route);
assert.equal(await mobile.locator('.bottom-nav [data-elara-tab="home"]').getAttribute('aria-current'),'page');
await mobile.screenshot({path:out+'/03-mobile-390-bottom-nav.png'});

await ready(desktop);
await desktop.locator('#elara-account-menu-trigger').click();
await desktop.waitForFunction(()=>!document.querySelector('.elara-private-drawer')?.classList.contains('hidden'));
assert.equal(await isVisible(desktop.locator('.elara-private-drawer-panel')),true);
await desktop.screenshot({path:out+'/04-desktop-drawer-open.png'});

await desktop.locator('.elara-private-drawer [data-approved-wardrobe]').first().click();
await desktop.waitForFunction(()=>{const x=document.querySelector('.approved-wardrobe');return x&&!x.hidden},{timeout:10000});
assert.equal(await desktop.locator('.elara-private-drawer').evaluate(el=>!el.classList.contains('hidden')),true,'Drawer closed behind Wardrobe');
await desktop.screenshot({path:out+'/05-desktop-drawer-plus-wardrobe.png'});
await desktop.locator('.approved-wardrobe-window [data-close-wardrobe]').click();
await desktop.waitForFunction(()=>document.querySelector('.approved-wardrobe')?.hidden===true);
assert.equal(await desktop.locator('.elara-private-drawer').evaluate(el=>!el.classList.contains('hidden')),true,'Drawer did not survive popup close');
await desktop.screenshot({path:out+'/06-desktop-drawer-after-popup-close.png'});

await browser.close();
console.log('PASS: Chromium desktop/mobile navigation and Drawer popup-state screenshots created.');

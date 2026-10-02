import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173',browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:null,profile:{name:'Order QA',username:'order_qa',xp:20,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true,groups:{list:async()=>[]},dm:{list:async()=>[]}};window.dispatchEvent(new Event('elara:social-updated'));";
function seed(){localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,theme:'dark',tasks:[],books:[],words:[],folders:[],tags:[],taskLists:[],taskCompletionHistory:[],missionRewardClaims:[],habits:[{id:'h1',title:'اول',days:[]},{id:'h2',title:'دوم',days:[]},{id:'h3',title:'سوم',days:[]}],goals:[{id:'g1',title:'هدف اول',horizon:'short',steps:[]},{id:'g2',title:'هدف دوم',horizon:'short',steps:[]},{id:'g3',title:'هدف سوم',horizon:'short',steps:[]}] }));localStorage.setItem('elara_locale_v1','fa')}
async function wire(page){await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));await page.addInitScript(seed)}
async function open(width,height,touch=false){const ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});const page=await ctx.newPage();await wire(page);await page.goto(base+'/?entity-reorder='+Date.now()+'#habits',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ElaraEntityReorder&&!document.documentElement.hasAttribute('data-elara-booting'));await page.evaluate(()=>window.ElaraOpen?.('habits'));await page.waitForSelector('#habit-list [data-entity-kind="habit"]');return{page,ctx}}
{
 const {page,ctx}=await open(1440,1000,false);
 const ids=kind=>page.locator((kind==='habit'?'#habit-list':'#goal-list')+'>[data-entity-kind="'+kind+'"]').evaluateAll(r=>r.map(x=>x.dataset.entityId));
 assert.deepEqual(await ids('habit'),['h1','h2','h3']);
 const a=await page.locator('[data-entity-drag="habit"][data-entity-id="h1"]').boundingBox(),c=await page.locator('[data-entity-kind="habit"][data-entity-id="h3"]').boundingBox();assert.ok(a&&c);
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(c.x+c.width/2,c.y+c.height*.8,{steps:8});await page.mouse.up();await page.waitForTimeout(120);
 assert.deepEqual(await ids('habit'),['h2','h3','h1'],'habit pointer reorder failed');
 let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')));assert.ok(s.habits.find(x=>x.id==='h1').manualOrder>s.habits.find(x=>x.id==='h3').manualOrder);
 await page.evaluate(()=>window.ElaraOpen?.('goals'));await page.waitForSelector('#goal-list [data-entity-kind="goal"]');
 const h=page.locator('[data-entity-drag="goal"][data-entity-id="g3"]');await h.focus();await page.keyboard.down('Alt');await page.keyboard.press('ArrowUp');await page.keyboard.up('Alt');await page.waitForTimeout(120);
 assert.deepEqual((await ids('goal')).slice(0,3),['g1','g3','g2'],'goal keyboard reorder failed');
 await ctx.close()
}
{
 const {page,ctx}=await open(390,844,true);await page.evaluate(()=>window.ElaraOpen?.('goals'));await page.waitForSelector('[data-entity-drag="goal"][data-entity-id="g1"]');
 const handle=page.locator('[data-entity-drag="goal"][data-entity-id="g1"]'),target=page.locator('[data-entity-kind="goal"][data-entity-id="g3"]'),hb=await handle.boundingBox(),tb=await target.boundingBox();assert.ok(hb&&tb);
 await handle.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:51,isPrimary:true,clientX:hb.x+10,clientY:hb.y+10});
 await page.dispatchEvent('body','pointermove',{pointerType:'touch',pointerId:51,isPrimary:true,clientX:tb.x+30,clientY:tb.y+tb.height*.8});
 await page.dispatchEvent('body','pointerup',{pointerType:'touch',pointerId:51,isPrimary:true,clientX:tb.x+30,clientY:tb.y+tb.height*.8});await page.waitForTimeout(150);
 const order=await page.locator('#goal-list>[data-entity-kind="goal"]').evaluateAll(r=>r.map(x=>x.dataset.entityId));assert.ok(order.indexOf('g1')>order.indexOf('g3'),'mobile goal touch reorder failed: '+order.join(','));
 const m=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(m.sw<=m.w+1,'mobile entity reorder overflow '+JSON.stringify(m));await ctx.close()
}
await browser.close();console.log('ENTITY_REORDER_PASS habit-pointer goal-keyboard goal-touch 390/1440');
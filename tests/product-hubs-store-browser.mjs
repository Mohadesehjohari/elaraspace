import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const cloudStub="window.ElaraAccount={user:{uid:'me',email:'me@example.test',emailVerified:true},profile:{uid:'me',name:'من',username:'me_user',xp:12000,profilePublic:true},logout:async()=>{},sendPasswordReset:async()=>{}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const socialStub="const me={uid:'me',name:'من',username:'me_user',xp:12000,profilePublic:true};\nconst friend={uid:'f1',name:'سینا',username:'sina',xp:800,profilePublic:true};\nwindow.ElaraSocial={me,friends:[friend],requests:[],activities:[],blocked:[],profileView:null,refresh:async()=>{},blockUser:async()=>true,unblockUser:async()=>true,openSelfProfile(){},openProfile(){}};\nwindow.ElaraSocial.dm={list:async()=>[{id:'f1__me',other:'f1',person:friend,lastText:'سلام',updatedAt:Date.now()}],messages:async()=>[],listen:()=>()=>{},send:async()=>true};\nwindow.ElaraSocial.groups={list:async()=>[],members:async()=>[],messages:async()=>[],listen:()=>()=>{},create:async()=>'',send:async()=>true,leave:async()=>true};\nwindow.ElaraSocial.clubs={list:async()=>[],invites:async()=>[],members:async()=>[],posts:async()=>[]};\nwindow.dispatchEvent(new Event('elara:social-updated'));";
const seed=()=>localStorage.setItem('elara_space_v1',JSON.stringify({xp:12000,tasks:[],habits:[],goals:[],books:[{id:'b1',title:'کتاب واقعی من',shelf:'reading',currentPage:12,totalPages:100,readingLogs:[]}],bookShelves:['شب'],bookClips:[{id:'c1',bookId:'b1',text:'یادداشت خودم',visibility:'private',createdAt:Date.now()}],words:[]}));
async function open(width,height){
 const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.addInitScript(seed);
 await page.goto(base+'/?product-hubs='+Date.now()+'#books',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraFeatureHubs&&window.ElaraStore&&window.ElaraProfileRelations&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:25000});
 return{context,page}
}
async function run(width,height){
 const {context,page}=await open(width,height);
 const isMobile=width<=700;
 const freedomTiles=async(selector,label)=>{
  const boxes=await page.locator(selector).evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect(),img=x.querySelector('.feature-launcher-art,img')?.getBoundingClientRect();return{y:r.y,h:r.height,radius:getComputedStyle(x).borderRadius,imgH:img?.height||0}}));
  assert.ok(boxes.length>0,width+': '+label+' tiles missing');
  assert.equal(boxes.every(x=>x.h>=(isMobile?120:140)&&x.h<=(isMobile?145:160)&&x.imgH>=(isMobile?65:80)),true,width+': '+label+' tiles drifted from Freedom sizing '+JSON.stringify(boxes));
  assert.equal(Math.max(...boxes.slice(0,Math.min(4,boxes.length)).map(x=>x.y))-Math.min(...boxes.slice(0,Math.min(4,boxes.length)).map(x=>x.y))<=2,true,width+': '+label+' first visual row is not horizontal '+JSON.stringify(boxes));
 };
 assert.equal(await page.locator('#panel-books .feature-hub-launchers[data-hub-kind="library"] .feature-launcher-card').count(),4,width+': Library must be a four-launcher hub');
 await freedomTiles('#panel-books .feature-hub-launchers[data-hub-kind="library"] .feature-launcher-card','Library');
 assert.equal(await page.locator('#panel-library-clips #library-clips').count(),1,width+': clips must live on dedicated route');
 await page.locator('#panel-books [data-feature-route="library-clips"]').click();await page.waitForSelector('#panel-library-clips:not(.hidden) #library-clips');
 assert.equal(await page.locator('#panel-library-clips').isVisible(),true,width+': Book Clips deep route missing');
 await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));await page.waitForSelector('#panel-language:not(.hidden)');
 assert.equal(await page.locator('#panel-language .feature-hub-launchers[data-hub-kind="language"] .feature-launcher-card').count(),4,width+': Language hub launcher count');
 await freedomTiles('#panel-language .feature-hub-launchers[data-hub-kind="language"] .feature-launcher-card','Language');
 assert.equal(await page.locator('#panel-language-books [data-language-block="books"]').count(),1,width+': language books not extracted');
 await page.evaluate(()=>ElaraOpen('exercise',{history:'replace'}));await page.waitForSelector('#panel-exercise:not(.hidden)');
 assert.equal(await page.locator('#panel-exercise .feature-hub-launchers[data-hub-kind="wellness"] .feature-launcher-card').count(),6,width+': Wellness hub launcher count');
 await freedomTiles('#panel-exercise .feature-hub-launchers[data-hub-kind="wellness"] .feature-launcher-card','Wellness');
 assert.equal(await page.locator('#panel-wellness-water .wellness-water').count(),1,width+': water tracker not extracted');
 assert.equal(await page.locator('#panel-wellness-weight #wellness-weight').count(),1,width+': weight route missing');
 await page.evaluate(()=>ElaraOpen('focus',{history:'replace'}));await page.waitForSelector('#panel-focus:not(.hidden)');
 assert.equal(await page.locator('#panel-focus .feature-hub-launchers[data-hub-kind="focus"] .feature-launcher-card').count(),4,width+': Focus hub launcher count');
 await freedomTiles('#panel-focus .feature-hub-launchers[data-hub-kind="focus"] .feature-launcher-card','Focus');
 assert.equal(await page.locator('#panel-focus-pomodoro .focus-card').count(),1,width+': Pomodoro must live on dedicated route');
 assert.equal(await page.locator('#panel-books .focus-card').count(),0,width+': Pomodoro leaked back into Library');
 await page.evaluate(()=>ElaraOpen('reports',{history:'replace'}));await page.waitForSelector('#panel-reports:not(.hidden)');
 assert.equal(await page.locator('#panel-reports .feature-hub-launchers[data-hub-kind="reports"] .feature-launcher-card').count(),4,width+': Reports hub launcher count');
 await freedomTiles('#panel-reports .feature-hub-launchers[data-hub-kind="reports"] .feature-launcher-card','Reports');
 assert.equal(await page.locator('#panel-reports-productivity #elara-reports-page').count(),1,width+': full report not extracted');

 await page.evaluate(()=>ElaraOpen('social',{history:'replace'}));await page.waitForSelector('#elara-social-page:not(.hidden) .social-tabs');
 const socialTiles=page.locator('#elara-social-page .social-tabs [role="tab"]');
 assert.equal(await socialTiles.count(),6,width+': Friends hub tab count');
 const socialBoxes=await socialTiles.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect(),img=x.querySelector('img')?.getBoundingClientRect(),label=x.querySelector('.social-tab-label')?.getBoundingClientRect();return{h:r.height,imgH:img?.height||0,labelY:label?.y||0,y:r.y}}));
 assert.equal(socialBoxes.every(x=>x.h>=(isMobile?120:140)&&x.imgH>=(isMobile?65:80)&&x.labelY>x.y+x.h*.68),true,width+': Friends tabs are not Freedom-style artwork tiles '+JSON.stringify(socialBoxes));

 await page.evaluate(()=>ElaraOpen('store',{history:'replace'}));await page.waitForSelector('#panel-store:not(.hidden) .store-tabs');
 assert.equal(await page.locator('#panel-store [data-store-category]').count(),12,width+': Store categories incomplete');
 assert.equal(await page.locator('#panel-store [data-store-category="status"]').count(),1,width+': Status cosmetics category missing');
 assert.equal(await page.locator('#panel-store [data-store-category="page"]').count(),1,width+': Page cosmetics category missing');
 await page.locator('[data-store-category="themes"]').click();assert.ok(await page.locator('#panel-store .store-product').count()>=10,width+': real theme previews missing');
 await page.locator('[data-store-category="tokens"]').click();assert.match(await page.locator('#panel-store .store-gated-hero').innerText(),/— TOKEN/,width+': token balance must not be fabricated');
 await page.locator('[data-store-category="banners"]').click();await page.locator('#panel-store [data-store-equip="banner"]').first().click();assert.ok(await page.evaluate(()=>!!ElaraProfileSystem.readWardrobe().banner),width+': Store banner equip did not reach wardrobe source of truth');

 await page.evaluate(()=>ElaraPrivateDrawer.open('settings'));await page.waitForSelector('.elara-private-drawer:not(.hidden) [data-drawer-section="settings"]:not(.hidden)');
 assert.equal(await page.locator('.drawer-menu [data-drawer-nav="notifications"]').count(),0,width+': notifications must stay out of Profile settings');
 assert.equal(await page.locator('.drawer-menu [data-drawer-nav="privacy"],.drawer-menu [data-drawer-nav="language"],.drawer-menu [data-drawer-nav="calendar"],.drawer-menu [data-drawer-nav="help"],.drawer-menu [data-drawer-nav="security"]').count(),0,width+': account settings must stay behind the profile gear');
 assert.equal(await page.locator('.drawer-menu [data-drawer-nav="blocked"]').count(),1,width+': blocked accounts destination missing');
 for(const route of ['security','privacy','blocked','language','calendar','help','appearance','folders'])assert.equal(await page.locator('[data-drawer-section="settings"] [data-drawer-nav="'+route+'"]').count(),1,width+': dedicated Profile Settings missing '+route);
 assert.equal(await page.locator('.drawer-profile-head .drawer-settings-gear').count(),1,width+': compact profile gear missing');
 await page.evaluate(()=>ElaraPrivateDrawer.open('home'));await page.waitForTimeout(60);
 assert.equal(await page.locator('.drawer-mobile-reports').isVisible(),isMobile,width+': Reports shortcut mobile visibility mismatch');
 await page.evaluate(()=>ElaraPrivateDrawer.open('account'));await page.waitForTimeout(80);
 const xpOrder=await page.locator('#drawer-account-area .elara-profile-composition').first().evaluate(root=>{const track=root.querySelector('.elara-profile-xp-track'),row=root.querySelector('.elara-profile-xp-row'),a=track.getBoundingClientRect(),b=row.getBoundingClientRect();return{trackTop:a.top,rowTop:b.top}});
 assert.ok(xpOrder.trackTop<=xpOrder.rowTop,width+': XP text must render below progress track');

 if(isMobile){
  const nav=page.locator('.bottom-nav [data-elara-nav-kind]');assert.equal(await nav.count(),10,'mobile nav must expose Page and Blog directly');
  assert.equal(await page.locator('.bottom-nav [data-elara-tab="page"]').count(),1,'Page mobile destination missing');
  assert.equal(await page.locator('.bottom-nav [data-elara-tab="blog"]').count(),1,'Blog mobile destination missing');
  assert.equal(await page.locator('.bottom-nav [data-menu-toggle],.bottom-nav .more-menu-trigger').count(),0,'ellipsis/overflow must not return');
 }
 const overflow=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));
 assert.ok(overflow.sw<=overflow.w+2,width+': product hubs introduced horizontal overflow '+JSON.stringify(overflow));
 await context.close();
}
await run(390,844);await run(1440,1000);
await browser.close();
console.log('PRODUCT_HUBS_STORE_PASS library language wellness focus reports store profile-settings mobile-nav 390/1440');
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
  assert.equal(boxes.every(x=>x.h>=(isMobile?160:188)&&x.h<=(isMobile?184:210)&&x.imgH>=(isMobile?100:125)),true,width+': '+label+' tiles drifted from large Freedom sizing '+JSON.stringify(boxes));
  const rowSize=isMobile?2:Math.min(4,boxes.length);
  assert.equal(Math.max(...boxes.slice(0,rowSize).map(x=>x.y))-Math.min(...boxes.slice(0,rowSize).map(x=>x.y))<=2,true,width+': '+label+' first visual row is not aligned '+JSON.stringify(boxes));
 };
 assert.equal(await page.locator('#panel-books .feature-hub-launchers[data-hub-kind="library"] .feature-launcher-card').count(),4,width+': Library must be a four-launcher hub');
 assert.equal(await page.locator('#panel-books>.feature-hub-preview').count(),0,width+': Library main hub must not duplicate reading/report content outside its dedicated route');
 await freedomTiles('#panel-books .feature-hub-launchers[data-hub-kind="library"] .feature-launcher-card','Library');
 assert.equal(await page.locator('#panel-books>.feature-section-tasks[data-section-task-shelf="book"]').count(),1,width+': Library section task shelf missing');
 assert.equal(await page.locator('#panel-library-clips #library-clips').count(),1,width+': clips must live on dedicated route');
 await page.locator('#panel-books [data-feature-route="library-clips"]').click();await page.waitForSelector('#panel-library-clips:not(.hidden) #library-clips');
 assert.equal(await page.locator('#panel-library-clips').isVisible(),true,width+': Book Clips deep route missing');
 await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));await page.waitForSelector('#panel-language:not(.hidden)');
 assert.equal(await page.locator('#panel-language .feature-hub-launchers[data-hub-kind="language"] .feature-launcher-card').count(),4,width+': Language hub launcher count');
 await freedomTiles('#panel-language .feature-hub-launchers[data-hub-kind="language"] .feature-launcher-card','Language');
 assert.equal(await page.locator('#panel-language>.feature-section-tasks[data-section-task-shelf="language"]').count(),1,width+': Language section task shelf missing');
 await page.locator('#panel-language [data-section-task-add="language"]').click();await page.waitForSelector('#task-form:not([hidden])');
 await page.locator('#task-title').fill('تمرین زبان از بخش اصلی');await page.locator('#task-daily-target').fill('2');\n await page.evaluate(()=>{ElaraDialog.prompt=async()=> 'تمرین'});await page.locator('#task-form [data-phase2-create="tag"]').click();await page.waitForFunction(()=>document.getElementById('task-tag')?.value==='تمرین');\n await page.locator('#task-submit').click();
 try{
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('elara_space_v1')||'{}').tasks?.some(t=>t.text==='تمرین زبان از بخش اصلی'&&t.sourceGroup==='language'&&t.dailyTarget===2));
 }catch(error){
  const diagnostic=await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('elara_space_v1')||'{}'),form=document.getElementById('task-form');return{tasks:(state.tasks||[]).map(t=>({text:t.text,sourceGroup:t.sourceGroup,dailyTarget:t.dailyTarget,date:t.date})),form:{hidden:!!form?.hidden,composer:form?.dataset?.elaraTaskComposer||'',title:document.getElementById('task-title')?.value||'',dailyTarget:document.getElementById('task-daily-target')?.value||'',due:document.getElementById('task-due')?.value||''},panel:location.hash}});console.error('SECTION_TASK_DIAGNOSTIC '+width+' '+JSON.stringify(diagnostic));throw error;
 }
 await page.waitForSelector('#panel-language [data-section-task-id]');
 const sectionTaskId=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_space_v1')).tasks.find(t=>t.text==='تمرین زبان از بخش اصلی').id);
 await page.evaluate(()=>ElaraOpen('home',{history:'replace'}));await page.waitForSelector('#panel-home:not(.hidden)');assert.equal(await page.locator('[data-ref-task="'+sectionTaskId+'"]').count(),1,width+': section-created Language Task did not reach Home');
 await page.evaluate(()=>ElaraOpen('language',{history:'replace'}));await page.waitForSelector('#panel-language:not(.hidden)');
 assert.equal(await page.locator('#panel-language-books [data-language-block="books"]').count(),1,width+': language books not extracted');
 await page.evaluate(()=>ElaraOpen('exercise',{history:'replace'}));await page.waitForSelector('#panel-exercise:not(.hidden)');
 assert.equal(await page.locator('#panel-exercise .feature-hub-launchers[data-hub-kind="wellness"] .feature-launcher-card').count(),6,width+': Wellness hub launcher count');
 await freedomTiles('#panel-exercise .feature-hub-launchers[data-hub-kind="wellness"] .feature-launcher-card','Wellness');
 assert.equal(await page.locator('#panel-exercise>.feature-section-tasks[data-section-task-shelf="exercise"]').count(),1,width+': Wellness section task shelf missing');
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
 const socialBoxes=await socialTiles.evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect(),img=x.querySelector('img')?.getBoundingClientRect(),label=x.querySelector('.social-tab-label')?.getBoundingClientRect(),s=getComputedStyle(x);return{h:r.height,imgH:img?.height||0,labelY:label?.y||0,y:r.y,border:parseFloat(s.borderTopWidth),bg:s.backgroundColor,bgi:s.backgroundImage}}));
 assert.equal(socialBoxes.every(x=>x.h>=(isMobile?79.5:89.5)&&x.h<=(isMobile?94.5:106.5)&&x.imgH>=(isMobile?40:48)&&x.labelY>x.y+x.h*.65&&x.border===0&&(x.bg==='rgba(0, 0, 0, 0)'||x.bg==='transparent')&&x.bgi==='none'),true,width+': Friends tabs must be compact transparent icon controls '+JSON.stringify(socialBoxes));

 await page.evaluate(()=>ElaraOpen('store',{history:'replace'}));await page.waitForSelector('#panel-store:not(.hidden) .store-tabs');
 assert.equal(await page.locator('#panel-store [data-store-category]').count(),12,width+': Store categories incomplete');
 assert.equal(await page.locator('#panel-store [data-store-category="status"]').count(),1,width+': Status cosmetics category missing');
 assert.equal(await page.locator('#panel-store [data-store-category="page"]').count(),1,width+': Page cosmetics category missing');
 await page.locator('[data-store-category="themes"]').click();assert.ok(await page.locator('#panel-store .store-product').count()>=10,width+': real theme previews missing');
 assert.equal(await page.locator('#panel-store [data-store-theme]').count(),0,width+': Store theme must equip directly instead of redirecting to Appearance');
 await page.locator('#panel-store [data-store-equip="profileTheme"]').first().click();
 const themeState=await page.evaluate(()=>{ElaraProfileSystem.writeWardrobe({nameFont:'classic'});const w=ElaraProfileSystem.readWardrobe(),v=ElaraProfileSystem.viewModel(ElaraSocial.me,{self:true}),host=document.createElement('div');host.innerHTML=ElaraProfileSystem.composition(v);const root=host.firstElementChild;document.body.append(root);const name=root.querySelector('.elara-display-name'),out={theme:w.profileTheme,dataTheme:root.dataset.profileTheme,style:root.getAttribute('style'),nameFont:getComputedStyle(name).fontFamily};root.remove();return out});
 assert.ok(themeState.theme&&themeState.dataTheme===themeState.theme,width+': Store profile theme did not persist into profile composition '+JSON.stringify(themeState));
 assert.match(themeState.style,/theme_.*\.webp|city_theme\.webp/,width+': equipped profile theme asset missing from profile composition');
 assert.match(themeState.nameFont,/Georgia|Times/i,width+': equipped profile name font is not applied');
 await page.locator('[data-store-category="tokens"]').click();assert.match(await page.locator('#panel-store .store-gated-hero').innerText(),/— TOKEN/,width+': token balance must not be fabricated');
 await page.locator('[data-store-category="banners"]').click();await page.locator('#panel-store [data-store-equip="banner"]').first().click();
 const bannerState=await page.evaluate(()=>{const w=ElaraProfileSystem.readWardrobe(),v=ElaraProfileSystem.viewModel(ElaraSocial.me,{self:true}),html=ElaraProfileSystem.composition(v);return{banner:w.banner,html}});
 assert.ok(!!bannerState.banner,width+': Store banner equip did not reach wardrobe source of truth');assert.match(bannerState.html,/assets\/ui\/banner[1-4]\.webp/,width+': equipped banner did not reach profile composition');

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
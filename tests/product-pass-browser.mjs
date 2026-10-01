import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const sha=process.env.GITHUB_SHA||'local',base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173',out=`browser-artifacts/${sha}`;
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[],failures=[];
const mobileWidths=[320,375,390,430],desktopWidths=[1440,1648,1920],all=[...mobileWidths,...desktopWidths];
const routes=['home','tasks','language','books','social','exercise','freedom','settings'];
const fa=/[\u0600-\u06ff]/;
const clamp=(min,n,max)=>Math.max(min,Math.min(max,n));
const check=async(name,fn)=>{try{await fn();results.push({name,status:'PASS'})}catch(error){results.push({name,status:'FAIL',error:error.message});failures.push({name,error:error.stack||String(error)})}};
function seed(){
 const now=new Date(),date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:820,
  tasks:[{id:'pp-t1',text:'مطالعه فصل ۳ کتاب',date,priority:'1',completed:false,recurrenceRule:null},{id:'pp-t2',text:'ورزش ۳۰ دقیقه',date,priority:'2',completed:true,doneAt:date,xpAwarded:true,recurrenceRule:{frequency:'weekly',interval:1,weekdays:[now.getDay()],startDate:date,endDate:null}}],
  habits:[{id:'pp-h1',title:'مطالعه کتاب',days:[]},{id:'pp-h2',title:'ورزش و حرکت',days:[date]}],
  goals:[{id:'pp-g1',title:'یادگیری زبان',steps:[{id:'pp-gs1',text:'تمرین امروز',done:false}]}],
  books:[{id:'pp-book',title:'شازده کوچولو',shelf:'reading',totalPages:200,currentPage:40,readingLogs:[],startedAt:Date.now()-86400000,lastReadAt:null,finishedAt:null}],
  words:[],folders:[],tags:[],taskLists:[]
 }));
 localStorage.setItem('elara_preferences_v2',JSON.stringify({mode:'dark',color:'violet',style:'default',language:'fa'}));
 localStorage.setItem('elara_locale_v1','fa');
 localStorage.setItem('elara_language_books_v1_guest',JSON.stringify([{title:'Legacy language book',shelf:'reading',currentPage:0}]));
}
const cloudStub=`window.ElaraAccount={user:null,profile:null};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`window.ElaraSocial={me:null,friends:[],requests:[],activities:[],error:'',refresh:async()=>{},saveProfileValues:async values=>({profile:values,warnings:[]}),activityVisibility(){const u=this.me?.uid;if(!u)return 'private';return localStorage.getItem('elara_activity_visibility_'+u)||(localStorage.getItem('elara_share_activity_'+u)==='yes'?'friends':'private')},publishActivity:async function(type,detail){const visibility=this.activityVisibility();if(visibility==='private')return false;(window.__published||(window.__published=[])).push({type,detail:{...detail,visibility}});return true},openSelfProfile(){},openProfile(){}};window.dispatchEvent(new Event('elara:social-updated'));`;
async function wire(page){
 const missing=[],errors=[],unhandled=[],badConsole=[];
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 page.on('response',r=>{if(r.status()===404)missing.push(r.url())});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))badConsole.push(m.text())});
 await page.addInitScript(seed);
 return{missing,errors,unhandled,badConsole};
}
async function boot(page,route='home'){
 await page.goto(base+'/#'+route,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting')&&document.querySelector('.workspace'),null,{timeout:10000});
 await page.waitForTimeout(350);
}
async function openRoute(page,route){
 await page.evaluate(r=>window.ElaraOpen?.(r,{history:'replace'}),route);await page.waitForTimeout(180);
}
async function screenshot(page,name,full=false){await page.screenshot({path:`${out}/${name}.png`,fullPage:full})}
const rect=async(page,sel)=>{const r=await page.locator(sel).first().boundingBox();assert.ok(r,`missing rect ${sel}`);return r};
const noOverflow=async page=>{const m=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,w:innerWidth}));assert.ok(m.sw<=m.w+1,JSON.stringify(m))};

for(const width of all){
 const mobile=width<701,height=mobile?844:(width===1648?928:1000);
 const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await context.newPage(),net=await wire(page);
 try{
  await boot(page,'home');
  await check(`${width}: shell/topbar/nav boot`,async()=>{
   assert.equal(await page.locator('.workspace').isVisible(),true);
   assert.equal(await page.locator('.topbar').isVisible(),true);
   if(mobile){assert.equal(await page.locator('.bottom-nav').isVisible(),true);assert.equal(await page.locator('.bottom-nav>[data-elara-nav-kind]').count(),8);assert.deepEqual(await page.locator('.bottom-nav>[data-elara-nav-kind]').evaluateAll(xs=>xs.map(x=>x.dataset.elaraTab)),['exercise','language','tasks','social','home','ranking','books','freedom'])}
   assert.equal(await page.locator('#cloud-layer:not([hidden])').count(),0);
   await noOverflow(page);
  });

  if(mobile)await check(`${width}: direct route mobile boot matrix`,async()=>{
   for(const route of routes){
    await page.goto(base+'/#'+route,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:10000});await page.waitForTimeout(180);
    assert.equal(await page.locator('.topbar').isVisible(),true,route+' topbar');
    assert.equal(await page.locator('.bottom-nav').isVisible(),true,route+' bottom nav');
    assert.equal(await page.locator('.bottom-nav>[data-elara-nav-kind]').count(),8,route+' nav count');
    assert.equal(await page.locator('#cloud-layer:not([hidden])').count(),0,route+' permanent cloud layer');
    await noOverflow(page);
   }
  });

  await openRoute(page,'tasks');
  await check(`${width}: Tasks reference geometry and circle`,async()=>{
   const hero=await rect(page,'#astra-task-hero'),row=await rect(page,'#task-list>.item'),content=await rect(page,'#panel-tasks'),cta=await rect(page,'#elara-task-add-main'),cb=await rect(page,'#task-list>.item .check-button');
   assert.ok(Math.abs(cb.width-cb.height)<=1,`ellipse ${cb.width}x${cb.height}`);
   const ref=mobile?{hero:Math.round(clamp(116,width*.364,156)),row:Math.round(clamp(88,width*.238,104)),content:width-24,ctaW:width-160,ctaH:46,cb:34}:{hero:Math.round(clamp(202,height*.223,218)),row:Math.round(clamp(70,height*.0765,76)),content:Math.round(width-clamp(190,width*.1244,208)-2*clamp(16,width*.012,20)),ctaW:220,ctaH:52,cb:42};
   const near=(a,b,t,l)=>assert.ok(Math.abs(a-b)<=t,`${l} ${a} vs ${b}`);
   near(hero.height,ref.hero,mobile?6:8,'hero');near(row.height,ref.row,mobile?6:8,'row');near(content.width,ref.content,mobile?6:8,'content');near(cta.width,ref.ctaW,8,'cta width');near(cta.height,ref.ctaH,5,'cta height');near(cb.width,ref.cb,3,'checkbox');
   if(!mobile){const repeat=page.locator('.astra-repeat-meta').first();assert.equal(await repeat.count()>0,true);const rr=await repeat.boundingBox();assert.ok(rr&&rr.height<=24,'repeat metadata enlarged row')}
   const kebab=page.locator('.astra-task-more').first(),summary=kebab.locator('summary');assert.equal(await summary.isVisible(),true,'task three-dot must stay visible');await summary.click();await page.waitForTimeout(30);assert.equal(await kebab.locator('.item-actions').isVisible(),true,'task actions popup must be visible');const layer=await kebab.evaluate(el=>({detail:Number(getComputedStyle(el).zIndex)||0,row:Number(getComputedStyle(el.closest('.item')).zIndex)||0}));assert.ok(layer.detail>=500&&layer.row>=500,'task actions must float above neighboring cards');await summary.click();
   await noOverflow(page);
  });

  await openRoute(page,'home');
  await check(`${width}: Home reference grid/internal scroll/wellness`,async()=>{
   const t=await rect(page,'.ref-tasks'),h=await rect(page,'.ref-habits'),w=await rect(page,'.ref-wellness-card'),m=await rect(page,'.ref-missions'),g=await rect(page,'.ref-goals'),r=await rect(page,'.ref-ranks'),a=await rect(page,'.ref-activity');
   assert.ok(Math.abs(t.y-h.y)<=2);
   if(mobile){assert.ok(w.width>t.width*1.7);assert.ok(Math.abs(m.y-g.y)<=2);assert.ok(r.y>m.y);assert.ok(a.width>w.width*.9)}
   else{assert.ok(Math.abs(t.y-w.y)<=2);assert.ok(Math.abs(m.y-r.y)<=2)}
   assert.equal(await page.locator('.ref-habit-semantic-art').count(),0);
   assert.equal(await page.locator('.ref-wellness-card .ref-wellness-banner').isVisible(),true);
   for(const sel of ['#elara-home-tasks','#elara-home-habits','#elara-home-missions','.ref-goals-scroll','#elara-home-ranks','#elara-home-activity']){
    const d=await page.locator(sel).first().evaluate(el=>({dir:getComputedStyle(el).direction,overflow:getComputedStyle(el).overflowY,scrollbar:getComputedStyle(el).scrollbarWidth}));
    assert.equal(d.dir,'ltr',sel+' scrollbar edge');assert.ok(['auto','scroll'].includes(d.overflow),sel+' overflow');
   }
   await noOverflow(page);
  });

  await check(`${width}: Friends Activity fixed geometry under growth`,async()=>{
   const before=await rect(page,'.ref-activity');
   await page.evaluate(()=>{ElaraSocial.activities=Array.from({length:30},(_,i)=>({id:'a'+i,type:i%2?'reading':'task',visibility:'friends',pagesRead:12,person:{uid:'f'+i,name:'Friend '+i},ms:Date.now()-i*1000}));ElaraSocialView.render()});await page.waitForTimeout(120);
   const after=await rect(page,'.ref-activity'),body=page.locator('#elara-home-activity');assert.ok(Math.abs(before.height-after.height)<=2);const sm=await body.evaluate(el=>({s:el.scrollHeight,c:el.clientHeight}));assert.ok(sm.s>sm.c,'Friends Activity did not internal-scroll');
  });

  await openRoute(page,'social');
  await check(`${width}: Ranking responsive reference structure`,async()=>{
   assert.equal(await page.locator('#elara-social-page .social-page-head').isVisible(),true);
   assert.equal(await page.locator('#elara-social-page .social-tabs [data-social-view="ranking"]').isVisible(),true);
   const grid=await rect(page,'#elara-social-page .social-reference-grid'),panel=await rect(page,'#elara-social-page'),podium=await rect(page,'#elara-social-page .social-top-three'),mine=await rect(page,'#elara-social-page .social-my-rank-card');
   assert.ok(grid.width>=panel.width*.9);
   if(mobile){assert.ok(podium.width>=grid.width*.95);assert.ok(mine.width>=grid.width*.95)}else{assert.ok(podium.width>mine.width*1.45);assert.ok(Math.abs(podium.y-mine.y)<=4)}
   const sections=await page.locator('#elara-social-page .social-section').count();assert.ok(sections>=7);
   await noOverflow(page);
  });

  await check(`${width}: friend search/invite/decline actions`,async()=>{
   await page.evaluate(()=>{ElaraSocial.me={uid:'me',name:'Aren',username:'aren',xp:820};ElaraSocial.requests=[{id:'r1',from:'f1',to:'me',status:'pending',person:{uid:'f1',name:'Nika',username:'nika',xp:100}}];ElaraSocial.friends=[];ElaraSocialView.render()});
   await page.locator('#elara-social-page [data-social-view="friends"]').click();await page.waitForTimeout(60);
   const input=await rect(page,'#elara-social-page #elara-add-friend-name'),invite=await rect(page,'#elara-social-page .social-invite>.invite'),lookup=await rect(page,'#elara-social-page [data-profile-lookup]');
   assert.ok(input.height>=44&&invite.height>=48&&lookup.height>=48);
   if(!mobile)assert.ok(Math.abs(input.height-invite.height)<=8);
   const decline=page.locator('#elara-social-page [data-friend-action="decline"]').first();assert.equal(await decline.isVisible(),true);const bg=await decline.evaluate(el=>getComputedStyle(el).backgroundImage+' '+getComputedStyle(el).backgroundColor);assert.match(bg,/123|7b1534|69, 11, 34|linear-gradient/i);
  });

  await openRoute(page,'exercise');
  await check(`${width}: Exercise reuses profile sex`,async()=>{
   assert.equal(await page.locator('#wellness-gender').count(),0);
   assert.equal(await page.locator('[data-wellness-profile]').count()>0,true);
   await page.evaluate(()=>ElaraProfileSystem.writePrivate({sex:'male'}));await page.waitForTimeout(50);assert.equal(await page.locator('#wellness-cycle').isVisible(),false);
  });

  await openRoute(page,'language');
  await check(`${width}: language book delete and reading are interactive`,async()=>{
   const row=page.locator('.pass3-language-book').filter({hasText:'Legacy language book'}).first();assert.equal(await row.count(),1,'legacy language book must render');
   const read=row.locator('[data-language-reading]'),del=row.locator('[data-language-book-delete]');assert.equal(await read.isDisabled(),false,'language reading button is locked');assert.equal(await del.isDisabled(),false,'language delete button is locked');
   await read.click();await page.waitForTimeout(40);assert.equal(await page.locator('#elara-dialog-root:not(.hidden) input[name=total]').count(),1,'legacy language book should ask for total pages instead of staying disabled');await page.evaluate(()=>ElaraDialog.close());await page.waitForTimeout(20);
   await del.click();await page.waitForTimeout(40);assert.equal(await page.locator('.pass3-language-book').filter({hasText:'Legacy language book'}).count(),0,'language book delete did not remove the row');
  });

  await openRoute(page,'books');
  await check(`${width}: reading report notification/privacy`,async()=>{
   await page.evaluate(()=>{ElaraSocial.me={uid:'reader-qa',name:'Reader',username:'reader',xp:10};localStorage.setItem('elara_activity_visibility_reader-qa','friends')});
   await page.locator('[data-reading-report]').click();await page.locator('[data-reading-report-book="pp-book"]').click();await page.waitForTimeout(40);
   await page.locator('.library-log-form [name=pages]').fill('24');await page.locator('.library-log-form [type=submit]').click();await page.waitForTimeout(80);
   const data=await page.evaluate(()=>{const b=JSON.parse(localStorage.getItem('elara_space_v1')).books.find(x=>x.id==='pp-book');return{book:b,notifs:JSON.parse(localStorage.getItem('elara_notifications_v1')||'[]'),published:window.__published||[]}});assert.equal(data.book.currentPage,64);assert.equal(data.book.readingLogs.at(-1).pagesRead,24);assert.ok(data.notifs.some(x=>x.type==='reading'));assert.ok(data.published.some(x=>x.type==='reading'&&x.detail.visibility==='friends'));
  });

  await check(`${width}: Bell opens notifications not Settings`,async()=>{
   await openRoute(page,'home');const bell=page.locator('#ref-header-notifications').first();await bell.click();assert.equal(await page.locator('#elara-notification-popover').isVisible(),true);assert.equal(await page.locator('.elara-private-drawer:not(.hidden)').count(),0);await page.keyboard.press('Escape');
  });

  await check(`${width}: profile upload/shape/font and Settings modal`,async()=>{
   await page.evaluate(()=>{window.ElaraAccount={user:{uid:'profile-qa',photoURL:''},profile:{uid:'profile-qa',name:'Aren',username:'aren',xp:820}};ElaraSocial.me={uid:'profile-qa',name:'Aren',username:'aren',xp:820,profilePublic:true};ElaraSocial.saveProfileValues=async values=>({profile:values,warnings:[]});ElaraPrivateDrawer.open('account')});await page.waitForTimeout(80);
   const panel=await rect(page,'.elara-private-drawer-panel');if(mobile)assert.ok(panel.width>=width*.75&&panel.width<=width*.9);else assert.ok(panel.width>=width*.58&&panel.width<=width*.7);
   await page.evaluate(()=>ElaraProfileSystem.openEditor());await page.waitForTimeout(40);
   assert.equal(await page.locator('#elara-central-profile-form .pass4-profile-edit-actions-top [type=submit]').isVisible(),true,'profile Save must be visible immediately');
   const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP8z/D/PwMDAwMDEwMDAwAANQUD/TehZAAAAABJRU5ErkJggg==','base64');
   await page.locator('#elara-central-profile-form input[type=file]').setInputFiles({name:'profile.png',mimeType:'image/png',buffer:png});await page.waitForTimeout(100);
   await page.locator('#elara-central-profile-form [name=shape]').selectOption('square');await page.locator('#elara-central-profile-form [name=nameFont]').selectOption('classic');await page.locator('#elara-central-profile-form [name=sex]').selectOption('male');await page.locator('#elara-central-profile-form [type=submit]').click();await page.waitForTimeout(100);
   const stored=await page.evaluate(()=>({w:ElaraProfileSystem.readWardrobe(),p:ElaraProfileSystem.readPrivate(),circle:ElaraProfileSystem.avatarPath('female',1,'circle'),square:ElaraProfileSystem.avatarPath('female',1,'square'),frameCircle:ElaraProfileSystem.frameVariantPath('bronze','circle'),frameSquare:ElaraProfileSystem.frameVariantPath('bronze','square')}));assert.equal(stored.w.shape,'square');assert.equal(stored.w.nameFont,'classic');assert.equal(stored.w.photoMode,'upload');assert.match(stored.w.photoSquare,/^data:image\/webp/);assert.equal(stored.p.sex,'male');assert.match(stored.circle,/\.png$/);assert.match(stored.square,/\.png$/);assert.notEqual(stored.circle,stored.square);assert.notEqual(stored.frameCircle,stored.frameSquare);
   await page.evaluate(()=>ElaraPrivateDrawer.open('home'));await page.waitForTimeout(30);await page.locator('.drawer-menu [data-approved-wardrobe]').click();await page.waitForTimeout(50);assert.equal(await page.locator('.approved-wardrobe').isVisible(),true,'wardrobe button must open a popup above Settings');assert.equal(await page.locator('[data-wardrobe-shape="square"][aria-pressed="true"]').count(),1);
   await page.evaluate(()=>ElaraWardrobeUI.close());await page.waitForTimeout(30);
   for(const section of ['account','privacy','folders','notifications','appearance','language','help','calendar']){
    await page.evaluate(section=>ElaraPrivateDrawer.open(section),section);await page.waitForTimeout(45);
    assert.equal(await page.locator('.elara-private-drawer:not(.hidden) .elara-private-drawer-panel>[data-drawer-section="'+section+'"]:not(.hidden)').count(),1,section+' must open inside the Settings modal');
    if(mobile){assert.equal(await page.locator('.elara-private-drawer-panel').getAttribute('data-mobile-section'),section);assert.equal(await page.locator('.drawer-menu').isVisible(),false,section+' should open as its own mobile subpage')}
    assert.equal(await page.locator('#main [data-drawer-section="'+section+'"]').count(),0,section+' leaked inline under the page');
   }
   assert.equal(await page.locator('#main .drawer-account-area').count(),0,'Settings section leaked inline into page');
   await page.keyboard.press('Escape').catch(()=>{});
  });

  await check(`${width}: English presentation no mixed system labels`,async()=>{
   await page.evaluate(()=>ElaraI18n.set('en'));await page.waitForTimeout(80);
   const selectors=['button:not([data-open-profile])','label','h1','h2','h3','summary','option','[role="tab"]','input[placeholder]'];
   for(const route of routes){await openRoute(page,route);await page.waitForTimeout(45);const bad=await page.evaluate((selectors)=>{const rx=/[\u0600-\u06ff]/;return [...document.querySelectorAll(selectors.join(','))].filter(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width&&r.height&&cs.display!=='none'&&cs.visibility!=='hidden'}).map(el=>(el.getAttribute('placeholder')||el.textContent||'').trim()).filter(t=>rx.test(t)).slice(0,8)},selectors);assert.deepEqual(bad,[],route+' has Persian system controls: '+bad.join(' | '))}
   await page.evaluate(()=>ElaraPrivateDrawer.open('language'));await page.waitForTimeout(50);const settingsText=await page.locator('.drawer-menu').innerText();assert.equal(fa.test(settingsText),false,'settings menu still Persian');
   await page.evaluate(()=>ElaraI18n.set('fa'));
  });

  await check(`${width}: Dark/Light scrollbar theme`,async()=>{
   await openRoute(page,'home');const dark=await page.locator('#elara-home-activity').evaluate(el=>getComputedStyle(el).scrollbarColor);assert.ok(dark&&dark!=='auto');
   await page.evaluate(()=>document.body.classList.add('light'));const light=await page.locator('#elara-home-activity').evaluate(el=>getComputedStyle(el).scrollbarColor);assert.notEqual(light,dark);await page.evaluate(()=>document.body.classList.remove('light'));
  });

  if(width===390||width===1648){
   await openRoute(page,'home');await screenshot(page,`product-home-${width}`,false);
   await openRoute(page,'tasks');await screenshot(page,`product-tasks-${width}`,false);
   await page.evaluate(()=>{ElaraSocial.me={uid:'me',name:'آرن',username:'aren',xp:1420,avatarGroup:'female',avatarLevel:1,profileShape:'circle'};ElaraSocial.friends=[{uid:'kian',name:'کیان',username:'kian',xp:1280,avatarGroup:'male',avatarLevel:1,profileShape:'circle'},{uid:'mahsa',name:'مهسا',username:'mahsa',xp:946,avatarGroup:'female',avatarLevel:2,profileShape:'circle'},{uid:'sina',name:'سینا',username:'sina',xp:892,avatarGroup:'male',avatarLevel:2,profileShape:'circle'},{uid:'narges',name:'نرگس',username:'narges',xp:860,avatarGroup:'female',avatarLevel:3,profileShape:'circle'}];ElaraSocial.requests=[{id:'visual-r1',from:'mahsa',to:'me',status:'pending',person:{uid:'mahsa',name:'مهسا',username:'mahsa',xp:946,avatarGroup:'female',avatarLevel:2,profileShape:'circle'}}];ElaraSocial.activities=[];ElaraSocialView.render()});await openRoute(page,'social');await screenshot(page,`product-ranking-${width}`,false);
   await page.evaluate(()=>ElaraPrivateDrawer.open('account'));await page.waitForTimeout(80);await screenshot(page,`product-settings-${width}`,false);await page.evaluate(()=>ElaraPrivateDrawer.close());
  }
  await check(`${width}: no 404/page errors/fatal console`,async()=>{assert.deepEqual(net.missing,[]);assert.deepEqual(net.errors,[]);assert.deepEqual(net.badConsole,[])});
 }catch(error){failures.push({name:`${width}: fatal startup`,error:error.stack||String(error)});await screenshot(page,`product-error-${width}`,true).catch(()=>{})}
 await context.close();
}

// Degraded boot: an optional feature/module failure must never leave the shell hidden.
await check('mobile degraded boot watchdog/release',async()=>{
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await c.newPage();await p.addInitScript(seed);
 await p.route('**/approved-seasonal.js*',r=>r.abort());await p.route('**/cloud.js*',r=>r.abort());await p.route('**/elara-social.js*',r=>r.abort());
 await p.goto(base+'/#home',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:10000});
 assert.equal(await p.locator('.workspace').isVisible(),true);assert.equal(await p.locator('#cloud-layer:not([hidden])').count(),0);await c.close();
});

await browser.close();
writeFileSync(`${out}/product-pass.json`,JSON.stringify({sha,results,failures},null,2));
console.log(JSON.stringify({sha,passed:results.filter(x=>x.status==='PASS').length,failed:failures.length,failures},null,2));
if(failures.length)process.exitCode=1;

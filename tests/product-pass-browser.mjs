import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const sha=process.env.GITHUB_SHA||'local',base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173',out=`browser-artifacts/${sha}`;
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[],failures=[];
const mobileWidths=[390],desktopWidths=[1440],all=[...mobileWidths,...desktopWidths]; // exhaustive viewport geometry lives in artwork-home-browser-acceptance + P0 nav matrix
const routes=['home','tasks','language','books','social','exercise','freedom','settings'];
const fa=/[\u0600-\u06ff]/;
const clamp=(min,n,max)=>Math.max(min,Math.min(max,n));
const check=async(name,fn)=>{const started=Date.now();console.log('[PRODUCT-CHECK] '+name+' start');try{await fn();results.push({name,status:'PASS'});console.log('[PRODUCT-CHECK] '+name+' PASS '+(Date.now()-started)+'ms')}catch(error){results.push({name,status:'FAIL',error:error.message});failures.push({name,error:error.stack||String(error)});console.log('[PRODUCT-CHECK] '+name+' FAIL '+(Date.now()-started)+'ms '+error.message)}};
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
 if(localStorage.getItem('elara_language_books_v2_migrated_guest')!=='1')localStorage.setItem('elara_language_books_v1_guest',JSON.stringify([{title:'Legacy language book',shelf:'reading',currentPage:0}]));
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
 const page=await context.newPage(),net=await wire(page);page.setDefaultTimeout(3000);page.setDefaultNavigationTimeout(15000);console.log('[PRODUCT] width '+width+' start');
 try{
  await boot(page,'home');
  if(width===390){
   await check('390: no-hash defaults to Home and deep links survive',async()=>{
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:10000});await page.waitForTimeout(160);
    assert.equal(await page.evaluate(()=>location.hash),'#home');assert.equal(await page.locator('#panel-home:not(.hidden)').count(),1,'no-hash did not render Home');
    assert.equal(await page.locator('#panel-tasks:not(.hidden)').count(),0,'legacy Tasks panel leaked on default Home');
    await page.goto(base+'/#tasks',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:10000});await page.waitForTimeout(160);
    assert.equal(await page.locator('#panel-tasks:not(.hidden)').count(),1,'deep-link #tasks was overridden');
    await boot(page,'home');
   });
  }
  await check(`${width}: shell/topbar/nav boot`,async()=>{
   assert.equal(await page.locator('.workspace').isVisible(),true);
   assert.equal(await page.locator('.topbar').isVisible(),true);
   if(mobile){
    assert.equal(await page.locator('.bottom-nav').isVisible(),true);
    assert.equal(await page.locator('.bottom-nav>[data-elara-nav-kind]').count(),8);
    assert.deepEqual(await page.locator('.bottom-nav>[data-elara-nav-kind]').evaluateAll(xs=>xs.map(x=>x.dataset.elaraTab)),['exercise','language','tasks','social','home','ranking','books','freedom']);
    const navBoxes=await page.locator('.bottom-nav>[data-elara-nav-kind]').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return{route:x.dataset.elaraTab,left:r.left,right:r.right,center:r.left+r.width/2}}));
    const centers=navBoxes.map(x=>x.center).sort((a,b)=>a-b),gaps=centers.slice(1).map((x,i)=>x-centers[i]),spread=Math.max(...gaps)-Math.min(...gaps);
    assert.ok(spread<=3,'mobile nav spacing is uneven: '+JSON.stringify(gaps));
    const home=navBoxes.find(x=>x.route==='home');assert.ok(home&&Math.abs(home.center-width/2)<=2,'Home is not on the geometric viewport center: '+JSON.stringify(home));
    assert.equal(navBoxes.every(x=>x.left>=-1&&x.right<=width+1),true,'mobile nav clips a destination: '+JSON.stringify(navBoxes));
   }
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

  if(width===390||width===1440)await check(`${width}: uploaded Language/Library/Ranking banners render`,async()=>{
   await openRoute(page,'language');assert.match(await page.locator('.elara-language-hero').evaluate(el=>getComputedStyle(el).backgroundImage),/language_banner\.webp/);
   const languageArt=await page.locator('.pass3-language-stat-art').evaluateAll(xs=>xs.map(x=>({src:x.getAttribute('src'),ok:x.complete&&x.naturalWidth>0})));assert.equal(languageArt.length,4,'Leitner reference now has four live stat artworks');assert.equal(languageArt.every(x=>x.ok),true,'uploaded Language artwork failed to decode: '+JSON.stringify(languageArt));
   await openRoute(page,'books');assert.match(await page.locator('.library-hero').evaluate(el=>getComputedStyle(el).backgroundImage),/librairy_banner\.webp/);
   await openRoute(page,'ranking');assert.match(await page.locator('#panel-ranking>h1').evaluate(el=>getComputedStyle(el).backgroundImage),/ranking_banner\.webp/);
   await openRoute(page,'home');
  });

  await openRoute(page,'tasks');
  await check(`${width}: Tasks reference geometry and circle`,async()=>{
   const hero=await rect(page,'#astra-task-hero'),row=await rect(page,'#task-list>.item'),content=await rect(page,'#panel-tasks'),cta=await rect(page,'#elara-task-add-main'),cb=await rect(page,'#task-list>.item .check-button');
   assert.ok(Math.abs(cb.width-cb.height)<=1,`ellipse ${cb.width}x${cb.height}`);
   const ref=mobile?{hero:Math.round(clamp(116,width*.364,156)),row:Math.round(clamp(88,width*.238,104)),content:width-24,ctaW:width-160,ctaH:46,cb:34}:{hero:Math.round(clamp(202,height*.223,218)),row:Math.round(clamp(70,height*.0765,76)),content:Math.round(width-clamp(190,width*.1244,208)-2*clamp(16,width*.012,20)),ctaW:220,ctaH:52,cb:42};
   const near=(a,b,t,l)=>assert.ok(Math.abs(a-b)<=t,`${l} ${a} vs ${b}`);
   near(hero.height,ref.hero,mobile?6:8,'hero');near(row.height,ref.row,mobile?6:8,'row');near(content.width,ref.content,mobile?6:8,'content');near(cta.width,ref.ctaW,8,'cta width');near(cta.height,ref.ctaH,5,'cta height');near(cb.width,ref.cb,3,'checkbox');
   if(!mobile){const repeat=page.locator('.astra-repeat-meta').first();assert.equal(await repeat.count()>0,true);const rr=await repeat.boundingBox();assert.ok(rr&&rr.height<=24,'repeat metadata enlarged row')}
   const kebab=page.locator('.astra-task-more').first(),summary=kebab.locator('summary');assert.equal(await summary.isVisible(),true,'task three-dot must stay visible');assert.match((await summary.innerText()).trim(),/⋮/,'task three-dot glyph missing');const kb=await summary.boundingBox();assert.ok(kb&&kb.width>=34&&kb.height>=38,'task three-dot hit target is too small');await summary.click();await page.waitForTimeout(30);const actions=kebab.locator('.item-actions');assert.equal(await actions.isVisible(),true,'task actions popup must be visible');const layer=await kebab.evaluate(el=>({detail:Number(getComputedStyle(el).zIndex)||0,row:Number(getComputedStyle(el.closest('.item')).zIndex)||0}));assert.ok(layer.detail>0&&layer.row>0,'task actions must establish an explicit stacking context');const ab=await actions.boundingBox();assert.ok(ab,'task actions have no box');const topmost=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('.item-actions')?.classList.contains('item-actions')||false,{x:ab.x+Math.min(ab.width/2,40),y:ab.y+Math.min(ab.height/2,24)});assert.equal(topmost,true,'task actions are visually under another card');await summary.click();
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

  await openRoute(page,'ranking');
  await check(`${width}: Ranking responsive reference structure`,async()=>{
   assert.equal(await page.locator('#elara-ranking-page .social-page-head').isVisible(),true);
   assert.match(await page.locator('#elara-ranking-page .social-page-head').evaluate(el=>getComputedStyle(el).backgroundImage),/ranking_banner\.webp/,'Ranking reference banner is not active');
   assert.equal(await page.locator('#elara-ranking-page .social-tabs [data-social-view="ranking"]').isVisible(),true);
   const grid=await rect(page,'#elara-ranking-page .social-reference-grid'),panel=await rect(page,'#elara-ranking-page'),podium=await rect(page,'#elara-ranking-page .social-top-three'),mine=await rect(page,'#elara-ranking-page .social-my-rank-card');
   assert.ok(grid.width>=panel.width*.9);
   if(mobile){const layout=await page.evaluate(()=>{const grid=document.querySelector('#elara-ranking-page .social-reference-grid'),podium=document.querySelector('#elara-ranking-page .social-top-three'),mine=document.querySelector('#elara-ranking-page .social-my-rank-card');return{columns:getComputedStyle(grid).gridTemplateColumns.trim().split(/\\s+/).filter(Boolean).length,podiumStart:getComputedStyle(podium).gridColumnStart,mineStart:getComputedStyle(mine).gridColumnStart}});assert.equal(layout.columns,1,'mobile ranking grid must collapse to one column');assert.equal(layout.podiumStart,'1','mobile podium must own the single grid column');assert.equal(layout.mineStart,'1','mobile rank card must own the single grid column');assert.ok(mine.y>=podium.y+podium.height-4,'mobile ranking cards are not stacked')}else{assert.ok(podium.width>mine.width*1.45);assert.ok(Math.abs(podium.y-mine.y)<=4)}
   const sections=await page.locator('#elara-ranking-page .social-section').count();assert.ok(sections>=7);
   await noOverflow(page);
  });

  await openRoute(page,'social');
  await check(`${width}: friend search/invite/decline actions`,async()=>{
   await page.evaluate(()=>{ElaraSocial.me={uid:'me',name:'Aren',username:'aren',xp:820};ElaraSocial.requests=[{id:'r1',from:'f1',to:'me',status:'pending',person:{uid:'f1',name:'Nika',username:'nika',xp:100}}];ElaraSocial.friends=[];ElaraSocialView.render()});
   assert.equal(await page.locator('#elara-social-page [data-social-view="ranking"]').count(),0,'Dedicated Friends page must not duplicate the Ranking tab');assert.match(await page.locator('#elara-social-page .social-page-head h1').innerText(),/دوستان/,'Dedicated Friends page heading mismatch');
   await page.locator('#elara-social-page [data-social-view="friends"]').click();await page.waitForTimeout(60);
   const input=await rect(page,'#elara-social-page #elara-add-friend-name'),invite=await rect(page,'#elara-social-page .social-invite>.invite'),lookup=await rect(page,'#elara-social-page [data-profile-lookup]');
   assert.ok(input.height>=44&&invite.height>=48&&lookup.height>=48);
   if(!mobile)assert.ok(Math.abs(input.height-invite.height)<=8);
   await page.locator('#elara-social-page [data-social-view="requests"]').click();await page.waitForSelector('#elara-social-page [data-friend-action="decline"]');
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
   await read.click();await page.waitForTimeout(40);assert.equal(await page.locator('#elara-dialog-root:not(.hidden) input[name=total]').count(),1,'legacy language book should ask for total pages instead of staying disabled');
   await page.locator('#elara-dialog-root:not(.hidden) input[name=total]').fill('120');await page.locator('#elara-dialog-root:not(.hidden) input[name=current]').fill('5');await page.locator('#elara-dialog-root:not(.hidden) .elara-dialog-actions .primary-button').click();await page.waitForTimeout(60);
   const report=page.locator('#elara-dialog-root:not(.hidden) .library-log-form');assert.equal(await report.isVisible(),true,'language reading report did not open after page setup');await report.locator('[name=mode]').selectOption('count');await report.locator('[name=pages]').fill('7');await page.locator('#elara-dialog-root:not(.hidden) .elara-dialog-actions .primary-button').click();await page.waitForTimeout(70);
   const updated=page.locator('.pass3-language-book').filter({hasText:'Legacy language book'}).first();assert.match(await updated.innerText(),/12|۱۲/,'language reading report did not update current page');
   await updated.locator('[data-language-book-delete]').click();await page.waitForTimeout(40);assert.equal(await page.locator('.pass3-language-book').filter({hasText:'Legacy language book'}).count(),0,'language book delete did not remove the row');
   await page.locator('#language-book-form [name=title]').fill('Browser language add');await page.locator('#language-book-form').evaluate(form=>form.requestSubmit());await page.waitForTimeout(40);
   const addDialog=page.locator('#elara-dialog-root:not(.hidden) .language-book-add-dialog');assert.equal(await addDialog.isVisible(),true,'language book add dialog did not open');
   await addDialog.locator('[name=total]').fill('180');await addDialog.locator('[name=current]').fill('12');await addDialog.locator('[type=submit]').click();await page.waitForTimeout(70);
   let added=page.locator('.pass3-language-book').filter({hasText:'Browser language add'}).first();assert.equal(await added.isVisible(),true,'new language book did not enter the books section');assert.match(await added.innerText(),/12|۱۲/,'new language book current page was not persisted');
   await page.evaluate(()=>{window.ElaraAccount={user:{uid:'language-owner-qa'},profile:null};window.dispatchEvent(new Event('elara:account-ready'))});await page.waitForTimeout(80);
   added=page.locator('.pass3-language-book').filter({hasText:'Browser language add'}).first();assert.equal(await added.isVisible(),true,'canonical language book vanished when account became ready');
   const canonical=await page.evaluate(()=>({rows:JSON.parse(localStorage.getItem('elara_language_books_v2')||'[]'),guest:localStorage.getItem('elara_language_books_v1_guest'),owned:localStorage.getItem('elara_language_books_v1_language-owner-qa')}));
   assert.ok(canonical.rows.some(x=>x.title==='Browser language add'),'canonical v2 source lost the added language book');assert.equal(canonical.rows.some(x=>Object.hasOwn(x,'ownerUid')),false,'canonical v2 must not contain owner shadow copies');assert.equal(canonical.guest,null,'legacy guest key should be removed after one-time migration');assert.equal(canonical.owned,null,'authenticated v1 shadow key must not be created');
   for(const sel of ['[data-language-reading]','[data-language-book-delete]']){const b=added.locator(sel),box=await b.boundingBox();assert.ok(box,sel+' missing box');const hit=await page.evaluate(({x,y,sel})=>document.elementFromPoint(x,y)?.closest(sel)?.matches(sel)||false,{x:box.x+box.width/2,y:box.y+box.height/2,sel});assert.equal(hit,true,sel+' is covered by another layer')}
   await added.locator('[data-language-book-delete]').click();await page.waitForTimeout(35);assert.equal(await page.locator('.pass3-language-book').filter({hasText:'Browser language add'}).count(),0,'newly added language book could not be deleted from canonical v2');
   await page.evaluate(()=>{window.ElaraAccount={user:null,profile:null}});
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

  await check(`${width}: popup stays centered and closeable`,async()=>{
   await page.evaluate(()=>{const content=document.createElement('div');content.innerHTML='<label>QA<input name="qa-popup-input"></label>';ElaraDialog.open({title:'QA popup stability',content,actions:[{label:'بستن',value:false}]})});await page.waitForTimeout(35);
   let panel=page.locator('#elara-dialog-root:not(.hidden) .elara-dialog-panel').last(),close=panel.locator('.elara-dialog-close'),back=panel.locator('.elara-dialog-back');assert.equal(await close.isVisible(),true,'popup close button missing');assert.equal(await back.isVisible(),true,'popup back button missing');
   const first=await panel.boundingBox(),focus=await panel.evaluate(el=>document.activeElement===el);assert.equal(focus,true,'popup content stole initial focus');
   await page.waitForTimeout(180);const second=await panel.boundingBox();assert.ok(first&&second&&Math.abs(first.y-second.y)<=2,'popup jumped vertically after open: '+JSON.stringify({first,second}));
   const vh=await page.evaluate(()=>innerHeight),center=second.y+second.height/2;assert.ok(Math.abs(center-vh/2)<=Math.max(12,vh*.05),'popup is not centered in viewport');
   await page.evaluate(()=>{void ElaraDialog.open({title:'Nested QA popup',message:'child'})});await page.waitForTimeout(30);
   assert.equal(await page.locator('#elara-dialog-root .elara-dialog-layer').count(),2,'nested popup replaced its parent instead of stacking');
   const layers=page.locator('#elara-dialog-root .elara-dialog-layer'),parentZ=Number(await layers.nth(0).evaluate(el=>getComputedStyle(el).zIndex)),childZ=Number(await layers.nth(1).evaluate(el=>getComputedStyle(el).zIndex));assert.ok(childZ>parentZ,'nested popup is not above parent');
   panel=page.locator('#elara-dialog-root .elara-dialog-panel').last();assert.equal(await panel.locator('.elara-dialog-back').isVisible(),true,'nested popup back button missing');await panel.locator('.elara-dialog-back').click();await page.waitForTimeout(20);
   assert.equal(await page.locator('#elara-dialog-root .elara-dialog-layer').count(),1,'Back did not return to parent popup');assert.equal(await page.locator('#elara-dialog-root .elara-dialog-panel').first().isVisible(),true,'parent popup did not remain visible');
   await page.locator('#elara-dialog-root .elara-dialog-panel').first().locator('.elara-dialog-close').click();await page.waitForTimeout(20);assert.equal(await page.locator('#elara-dialog-root:not(.hidden)').count(),0,'popup close button did not close');
  });

  await check(`${width}: profile upload/shape/font and Settings modal`,async()=>{
   await page.evaluate(()=>{window.ElaraAccount={user:{uid:'profile-qa',photoURL:''},profile:{uid:'profile-qa',name:'Aren',username:'aren',xp:820}};ElaraSocial.me={uid:'profile-qa',name:'Aren',username:'aren',xp:820,profilePublic:true};ElaraSocial.saveProfileValues=async values=>({profile:values,warnings:[]});ElaraPrivateDrawer.open('account')});await page.waitForTimeout(80);
   const panel=await rect(page,'.elara-private-drawer-panel');if(mobile){assert.ok(panel.width>=width*.9&&panel.width<=width*.98);const vp=await page.evaluate(()=>({w:innerWidth,h:innerHeight}));assert.ok(Math.abs(panel.x+panel.width/2-vp.w/2)<=3&&Math.abs(panel.y+panel.height/2-vp.h/2)<=Math.max(10,vp.h*.03),'Settings panel is not centered: '+JSON.stringify({panel,vp}))}else{assert.ok(panel.width>=760&&panel.width<=800,'desktop Settings workspace must stay near the canonical 780px width: '+panel.width);const columns=await page.locator('.elara-private-drawer-panel').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\\s+/).filter(Boolean).length);assert.equal(columns,2,'desktop Settings must keep menu + content columns')}
   await page.evaluate(()=>{void ElaraProfileSystem.openEditor()});await page.waitForTimeout(40);
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
    if(mobile){assert.equal(await page.locator('.elara-private-drawer-panel').getAttribute('data-mobile-section'),section);assert.equal(await page.locator('.drawer-menu').isVisible(),false,section+' should open as its own mobile subpage');const box=await page.locator('.elara-private-drawer-panel').boundingBox(),vh=await page.evaluate(()=>innerHeight);assert.ok(box&&Math.abs((box.y+box.height/2)-vh/2)<=Math.max(12,vh*.05),section+' settings panel is not vertically centered')}
    assert.equal(await page.locator('#main [data-drawer-section="'+section+'"]').count(),0,section+' leaked inline under the page');
   }
   assert.equal(await page.locator('#main .drawer-account-area').count(),0,'Settings section leaked inline into page');
   await page.keyboard.press('Escape').catch(()=>{});
  });

  await check(`${width}: English presentation no mixed system labels`,async()=>{
   await page.evaluate(()=>ElaraI18n.set('en'));await page.waitForTimeout(80);
   const selectors=['button:not([data-open-profile]):not([data-elara-ugc])','label:not([data-elara-ugc])','h1:not([data-elara-ugc])','h2:not([data-elara-ugc])','h3:not([data-elara-ugc])','summary','option','[role="tab"]','input[placeholder]:not([data-elara-ugc])'];
   for(const route of routes){await openRoute(page,route);await page.waitForTimeout(45);const bad=await page.evaluate((selectors)=>{const rx=/[\u0600-\u06ff]/;return [...document.querySelectorAll(selectors.join(','))].filter(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width&&r.height&&cs.display!=='none'&&cs.visibility!=='hidden'}).map(el=>{const placeholder=el.getAttribute('placeholder');if(placeholder)return placeholder.trim();const clone=el.cloneNode(true);clone.querySelectorAll?.('[data-elara-ugc],[data-elara-i18n="off"]').forEach(x=>x.remove());return(clone.textContent||'').trim()}).filter(t=>rx.test(t)).slice(0,8)},selectors);assert.deepEqual(bad,[],route+' has Persian system controls: '+bad.join(' | '))}
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
 console.log('[PRODUCT] width '+width+' done');await context.close();
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

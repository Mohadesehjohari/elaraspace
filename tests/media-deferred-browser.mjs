import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const file=async name=>fs.readFile(new URL('../'+name,import.meta.url),'utf8');
const browser=await chromium.launch({headless:true}),errors=[],requests=[];
const monitor=p=>{
 p.on('pageerror',e=>errors.push(e.message));
 p.on('request',r=>{if(/firebase-storage|firebasestorage|storage\.googleapis/i.test(r.url()))requests.push(r.url())});
};
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});monitor(page);
 await page.setContent('<main id="elara-page-view"></main><div id="toast"></div>');
 const firebaseStub=[
 "window.__mediaWrites=[];",
 "const getApps=()=>[{}],getAuth=()=>({currentUser:{uid:'owner',emailVerified:true}}),getFirestore=()=>({});",
 "let sequence=0;",
 "const collection=(_,name)=>({name}),query=(...a)=>a,where=(...a)=>a;",
 "const doc=(a,id)=>({collection:a.name||'',id:id||'document_'+(++sequence)});",
 "const getDocs=async()=>[],getDoc=async()=>({exists:()=>false});",
 "const setDoc=async(ref,data)=>window.__mediaWrites.push({ref,data}),updateDoc=async()=>{},deleteDoc=async()=>{};",
 "const serverTimestamp=()=>({stamp:true}),Timestamp={now:()=>({}),fromMillis:n=>({toMillis:()=>n})};",
 "window.ElaraAccount={user:{uid:'owner'},profile:{name:'Owner'}};",
 "window.ElaraSocial={me:{uid:'owner'},friends:[]};"
 ].join('\n');
 const service=(await file('elara-page.js')).replace(/^import .*;\r?\n/gm,'');
 assert.doesNotMatch(service,/getStorage\s*\(|uploadBytes\s*\(/);
 await page.addScriptTag({content:firebaseStub+'\n'+service});
 await page.addScriptTag({content:await file('page-view.js')});
 const v=await page.evaluate(async()=>{
  window.ElaraPageView.render();
  const inputs=[...document.querySelectorAll('[data-page-media-input]')];
  const notices=[...document.querySelectorAll('.page-media-deferred')].map(x=>x.textContent);
  const img=new File(['pixels'],'image.png',{type:'image/png'});
  const bad=[];
  for(const op of [()=>window.ElaraPage.createPost('caption','friends',img),()=>window.ElaraPage.createStory('caption','friends',img)]){
   try{await op();bad.push('unexpected-accept')}catch(e){bad.push(e.message)}
  }
  await window.ElaraPage.createPost('Text post works','friends');
  await window.ElaraPage.createStory('Text story works','friends');
  return {inputs:inputs.length,disabled:inputs.every(x=>x.disabled),notices,bad,writes:window.__mediaWrites,
   overflow:document.documentElement.scrollWidth>innerWidth+2};
 });
 assert.equal(v.inputs,2);
 assert.equal(v.disabled,true);
 assert.ok(v.notices.length===2&&v.notices.every(x=>x.includes('فاز بعد')));
 assert.ok(v.bad.every(x=>x.includes('فاز بعد')));
 assert.equal(v.writes.length,2);
 assert.ok(v.writes.every(x=>!x.data.mediaPath&&!x.data.mediaType));
 assert.equal(v.overflow,false);
 await page.close();

 const club=await browser.newPage({viewport:{width:390,height:844}});monitor(club);
 await club.setContent('<main id="elara-social-page"><button data-social-view="clubs" aria-selected="true"></button><div class="social-reference-grid"></div></main><div id="toast" class="hidden"></div>');
 await club.evaluate(()=>{
  const clubs=[];window.__clubCalls=[];
  window.ElaraLevels={level:()=>10,threshold:()=>350};
  window.ElaraSocial={me:{uid:'owner',name:'Owner',xp:820},friends:[],clubs:{
   postKinds:['mission','poll'],list:async()=>clubs,invites:async()=>[],discover:async()=>[],
   create:async spec=>{window.__clubCalls.push(spec);clubs.push({id:'club_media_off',owner:'owner',role:'owner',title:spec.title,
    kind:spec.kind,visibility:spec.visibility,membershipMode:spec.membershipMode,restDay:Number(spec.restDay)||0,
    memberCount:1,memberLimit:Number(spec.memberLimit)||50,avatarPath:'',bannerPath:'',status:'active'});return 'club_media_off'},
   members:async()=>[{uid:'owner',role:'owner',person:{uid:'owner',name:'Owner'}}],
   posts:async()=>[],contribution:async()=>[],dailyReport:async()=>({posts:0,restDay:false}),joinRequests:async()=>[]
  }};
  window.ElaraDialog={open:async arg=>{
   if(arg.content?.classList?.contains('social-club-create')){arg.content.querySelector('[name=title]').value='No media club';return true}
   window.__clubDialogHTML=arg.content?.innerHTML||'';return false
  },confirm:async()=>false};
 });
 await club.addScriptTag({content:await file('social-clubs-ui.js')});
 const enabled=await club.evaluate(async()=>{
  await window.ElaraSocialClubsUI.mount();
  const enabled=document.querySelector('[data-club-create]')?.disabled===false;
  await window.ElaraSocialClubsUI.createClub();
  return {enabled,created:window.__clubCalls};
 });
 assert.ok(enabled.enabled,'Club creation enabled');
 assert.equal(enabled.created.length,1);
 assert.equal(enabled.created[0].title,'No media club');
 assert.ok(!Object.hasOwn(enabled.created[0],'avatarPath')&&!Object.hasOwn(enabled.created[0],'bannerPath'));
 await club.evaluate(()=>window.ElaraSocialClubsUI.openClub('club_media_off'));
 const rendered=await club.evaluate(()=>({html:window.__clubDialogHTML||'',overflow:document.documentElement.scrollWidth>innerWidth+2}));
 assert.ok(rendered.html.includes('social-club-media-deferred'));
 assert.ok(rendered.html.includes('آواتار')&&rendered.html.includes('بنر'));
 assert.ok(!rendered.html.includes('data-club-media='));
 assert.ok(rendered.html.includes('data-club-save-settings'));
 assert.ok(rendered.html.includes('data-club-create-post'));
 assert.equal(rendered.overflow,false);
 await club.close();

 const media=await browser.newPage();monitor(media);await media.setContent('<div></div>');
 await media.addScriptTag({content:await file('elara-club-media.js')});
 const m=await media.evaluate(async()=>{
  let error='';try{await window.ElaraClubMedia.upload('club','avatar',new Blob(['x']))}catch(e){error=e.message}
  return {enabled:window.ElaraClubMedia.enabled,error,url:await window.ElaraClubMedia.read('fake')}
 });
 assert.equal(m.enabled,false);assert.match(m.error,/فاز بعد/);assert.equal(m.url,'');await media.close();
 assert.deepEqual(requests,[],'Firebase Storage network must never be called');
 assert.deepEqual(errors,[],'No critical startup/UI exceptions');
 console.log('MEDIA_DEFERRED_BROWSER_PASS text_posts=2 club_create=1 owner_settings=1 uploads_disabled=1 storage_requests=0 startup_errors=0');
}finally{await browser.close()}

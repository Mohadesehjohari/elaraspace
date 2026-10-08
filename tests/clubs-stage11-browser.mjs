import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub=`window.ElaraAccount={user:null,profile:{name:'Club QA',username:'club_qa',bio:'',xp:820,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`
const clubState={
 clubs:[{id:'c1',owner:'A',title:'کتاب‌بازهای شب',kind:'reading',visibility:'private',membershipMode:'invite',assistant1:'',assistant2:'',restDay:5,bio:'',rulesText:'',language:'fa',memberLimit:50,memberCount:2,status:'active',role:'owner',updatedAt:1}],
 members:{c1:[{uid:'A',role:'owner',person:{uid:'A',name:'آرین'}},{uid:'B',role:'member',person:{uid:'B',name:'کیان'}}]},
 posts:{c1:[]},
 invites:[{clubId:'c9',to:'A',status:'pending',club:{id:'c9',title:'باشگاه تمرکز',kind:'focus',visibility:'private',membershipMode:'invite',memberLimit:50,memberCount:1,status:'active'}}],
 sent:[],votes:[]
};
window.__clubState=clubState;
window.ElaraSocial={me:{uid:'A',name:'آرین',username:'aren',xp:820},friends:[{uid:'B',name:'کیان',username:'kian',xp:600},{uid:'C',name:'مهسا',username:'mahsa',xp:500}],requests:[],activities:[],error:'',refresh:async()=>{},saveProfileValues:async values=>({profile:values,warnings:[]}),publishActivity:async()=>true,openSelfProfile(){},openProfile(){}};
window.ElaraSocial.clubs={
 kinds:['reading','fitness','focus','general'],
 list:async()=>clubState.clubs.map(x=>({...x})),
 discover:async()=>[],
 contribution:async id=>(clubState.members[id]||[]).map(x=>({uid:x.uid,person:{...x.person},events:0,posts:0,votes:0})),
 dailyReport:async()=>({date:'2026-10-08',restDay:false,posts:0,contribution:[]}),
 joinRequests:async()=>[],
 settings:async()=>true,
 requestJoin:async()=>true,
 members:async id=>(clubState.members[id]||[]).map(x=>({...x,person:{...x.person}})),
 posts:async id=>(clubState.posts[id]||[]).map(x=>({...x,options:[...(x.options||[])]})),
 invites:async()=>clubState.invites.map(x=>({...x,club:{...x.club}})),
 create:async spec=>{const id='c'+(clubState.clubs.length+1);clubState.clubs.push({id,owner:'A',assistant1:'',assistant2:'',role:'owner',membershipMode:'invite',memberLimit:50,memberCount:1,status:'active',updatedAt:Date.now(),...spec});clubState.members[id]=[{uid:'A',role:'owner',person:{uid:'A',name:'آرین'}}];clubState.posts[id]=[];return id},
 invite:async(id,to)=>{clubState.sent.push({id,to});return to},
 decideJoin:async()=>true,
 decideInvite:async(inv,status)=>{clubState.invites=clubState.invites.filter(x=>x.clubId!==inv.clubId);if(status==='accepted'){clubState.clubs.push({...inv.club,owner:'Z',role:'member',assistant1:'',assistant2:'',restDay:0,memberLimit:inv.club.memberLimit||50,memberCount:inv.club.memberCount||1,status:'active',updatedAt:Date.now()});clubState.members[inv.clubId]=[{uid:'A',role:'member',person:{uid:'A',name:'آرین'}}];clubState.posts[inv.clubId]=[]}return true},
 setAssistant:async(id,uid,on)=>{const m=clubState.members[id].find(x=>x.uid===uid);m.role=on?'assistant':'member';const c=clubState.clubs.find(x=>x.id===id);c.assistant1=on?uid:'';return true},
 createPost:async(id,spec)=>{const post={id:'p'+(clubState.posts[id].length+1),uid:'A',domain:clubState.clubs.find(x=>x.id===id).kind,ms:Date.now(),...spec};clubState.posts[id].unshift(post);return post.id},
 vote:async(id,pid,option)=>{clubState.votes.push({id,pid,option});return true},
 transfer:async()=>true,kick:async()=>true,ban:async()=>true,confirmBook:async()=>true,leave:async()=>true,close:async()=>true
};
window.dispatchEvent(new Event('elara:social-updated'));
`;
function seed(){localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:820,theme:'dark',tasks:[],habits:[],goals:[],books:[],words:[],folders:[],tags:[],taskLists:[],focusSessions:[],taskCompletionHistory:[],missionRewardClaims:[]}))}
async function wire(page){await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));await page.addInitScript(seed)}
async function open(width,height){const page=await browser.newPage({viewport:{width,height}});await wire(page);await page.goto(base+'/?clubs-stage11='+Date.now()+'#social',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForFunction(()=>window.ElaraSocialClubsUI&&window.ElaraSocial?.clubs&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});const tab=page.locator('[data-social-route="social"][data-social-view="clubs"]');if(await tab.count())await tab.click();await page.waitForSelector('.social-clubs-section');return page}

const page=await open(390,844);
const clubGate=await page.evaluate(()=>({socialXp:window.ElaraSocial?.me?.xp,accountXp:window.ElaraAccount?.profile?.xp,localXp:JSON.parse(localStorage.getItem('elara_space_v1')||'{}')?.xp,registry:!!window.ElaraLevels,registryLevel:window.ElaraLevels?.level?.(820),uiXp:window.ElaraSocialClubsUI?.xpValue?.(),uiLevel:window.ElaraSocialClubsUI?.level?.(),allowed:window.ElaraSocialClubsUI?.canCreateClub?.(),disabled:document.querySelector('[data-club-create]')?.disabled}));
console.log('CLUB_GATE '+JSON.stringify(clubGate));
assert.equal(clubGate.allowed,true,'Level 12 challenge gate diagnostics: '+JSON.stringify(clubGate));
assert.equal(await page.locator('[data-club-create]').isEnabled(),true,'Level 12 user should be able to create a club: '+JSON.stringify(clubGate));
assert.match(await page.locator('.social-clubs-section').innerText(),/کتاب‌بازهای شب/);
assert.match(await page.locator('.social-club-invites').innerText(),/باشگاه تمرکز/);

await page.locator('[data-club-open="c1"]').click();
await page.waitForSelector('.social-club-dashboard');
assert.match(await page.locator('.social-club-dashboard').innerText(),/تنظیمات صاحب باشگاه/);
await page.locator('[data-club-assistant="B"]').click();
await page.waitForFunction(()=>window.__clubState.members.c1.find(x=>x.uid==='B').role==='assistant');
assert.equal(await page.locator('[data-club-assistant="B"]').getAttribute('data-enabled'),'0');

await page.locator('.social-club-invite-tool select').selectOption('C');
await page.locator('[data-club-send-invite]').click();
await page.waitForFunction(()=>window.__clubState.sent.some(x=>x.to==='C'));

await page.locator('[name=postKind]').selectOption('mission');
await page.locator('[name=cadence]').selectOption('weekly');
await page.locator('[name=postTitle]').fill('۳۰ صفحه این هفته');
await page.locator('[name=postBody]').fill('آروم ولی پیوسته جلو می‌ریم 🔥');
await page.locator('[data-club-create-post]').click();
await page.waitForFunction(()=>window.__clubState.posts.c1.some(x=>x.kind==='mission'&&x.cadence==='weekly'));

await page.locator('[name=postKind]').selectOption('poll');
await page.locator('[name=postTitle]').fill('کتاب بعدی؟');
await page.locator('[name=options]').fill('Dune | 1984 | Sapiens');
await page.locator('[data-club-create-post]').click();
await page.waitForFunction(()=>window.__clubState.posts.c1.some(x=>x.kind==='poll'&&x.options.length===3));
await page.locator('[data-club-vote="Dune"]').click();
await page.waitForFunction(()=>window.__clubState.votes.some(x=>x.option==='Dune'));
await page.getByRole('button',{name:'بستن'}).last().click();

await page.locator('[data-club-invite-action="accepted"]').click();
await page.waitForFunction(()=>window.__clubState.invites.length===0&&window.__clubState.clubs.some(x=>x.id==='c9'&&x.role==='member'));

await page.locator('[data-club-create]').click();
await page.locator('.social-club-create input[name=title]').fill('تمرکز عمیق');
await page.locator('.social-club-create select[name=kind]').selectOption('focus');
await page.getByRole('button',{name:'ساختن'}).click();
await page.waitForFunction(()=>window.__clubState.clubs.some(x=>x.title==='تمرکز عمیق'&&x.kind==='focus'));
const created=await page.evaluate(()=>window.__clubState.clubs.find(x=>x.title==='تمرکز عمیق'));assert.equal(created.role,'owner');
await page.getByRole('button',{name:'بستن'}).last().click().catch(()=>{});

const m=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(m.scroll<=m.w+2,'390 club horizontal overflow '+JSON.stringify(m));
await page.screenshot({path:'browser-artifacts/clubs-stage11-390.png',fullPage:true});await page.close();

const desktop=await open(1440,1000);const dm=await desktop.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dm.scroll<=dm.w+2,'1440 club horizontal overflow '+JSON.stringify(dm));await desktop.screenshot({path:'browser-artifacts/clubs-stage11-1440.png',fullPage:true});await desktop.close();
await browser.close();
console.log('CLUBS_STAGE11_PASS level6 owner assistant invite mission poll vote 390/1440');

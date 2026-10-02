import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloudStub=`window.ElaraAccount={user:null,profile:{name:'Focus QA',username:'focus_qa',bio:'',xp:20,profilePublic:true}};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));`;
const socialStub=`window.ElaraSocial={me:null,friends:[],requests:[],activities:[],refresh:async()=>{}};window.dispatchEvent(new Event('elara:social-updated'));`;
const audioStub=`
class FakeParam{constructor(){this.value=0}setValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}}
class FakeNode{constructor(){this.gain=new FakeParam();this.frequency=new FakeParam()}connect(){return this}disconnect(){}start(){}stop(){}}
class FakeBuffer{constructor(len){this.data=new Float32Array(len)}getChannelData(){return this.data}}
class FakeAudioContext{constructor(){this.state='running';this.sampleRate=8000;this.currentTime=0;this.destination={}}createGain(){return new FakeNode()}createBuffer(_c,len){return new FakeBuffer(len)}createBufferSource(){return new FakeNode()}createBiquadFilter(){return new FakeNode()}createOscillator(){return new FakeNode()}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}}
window.AudioContext=FakeAudioContext;window.webkitAudioContext=FakeAudioContext;`;
function seed(){localStorage.setItem('elara_space_v1',JSON.stringify({version:1,xp:20,theme:'dark',tasks:[],habits:[],goals:[],books:[],words:[],focusSessions:[],taskCompletionHistory:[],missionRewardClaims:[]}));localStorage.removeItem('elara_focus_ambience_v1')}
async function run(width,height){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloudStub}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:socialStub}));
 await page.addInitScript(seed);await page.addInitScript(audioStub);
 await page.goto(base+'/?focus-stage13='+Date.now()+'#books',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.ElaraFocusAmbience&&document.querySelector('#panel-books #focus-ambience')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:20000});
 await page.locator('#focus-ambience').waitFor({state:'visible',timeout:10000});
 assert.equal(await page.locator('[data-ambience-mode]').count(),4,width+': ambience modes missing');
 await page.locator('[data-ambience-mode="forest"]').click();
 await page.locator('[data-ambience-volume]').fill('55');
 let cfg=await page.evaluate(()=>JSON.parse(localStorage.getItem('elara_focus_ambience_v1')));
 assert.equal(cfg.mode,'forest');assert.equal(cfg.volume,55);
 await page.locator('[data-ambience-play]').click();
 await page.waitForFunction(()=>document.getElementById('focus-ambience')?.dataset.playing==='true');
 assert.equal(await page.locator('[data-ambience-play]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-ambience-play]').click();
 await page.waitForFunction(()=>document.getElementById('focus-ambience')?.dataset.playing==='false');
 const motion=await page.locator('.focus-garden .flower').first().evaluate(el=>getComputedStyle(el).animationName);assert.equal(motion,'none',width+': reduced motion did not disable garden animation');
 await page.evaluate(()=>window.ElaraI18n.set('en'));await page.waitForTimeout(100);
 assert.match(await page.locator('#focus-ambience').innerText(),/Pomodoro ambience/i,width+': focus ambience did not localize');
 const m=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));assert.ok(m.sw<=m.w+1,width+': focus ambience horizontal overflow '+JSON.stringify(m));
 await page.screenshot({path:'browser-artifacts/focus-ambience-'+width+'.png',fullPage:true});
 await context.close();
}
await run(390,844);await run(1440,1000);
await browser.close();
console.log('FOCUS_AMBIENCE_PASS modes persistence play-stop i18n reduced-motion 390/1440');

import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const url=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  await page.goto(url+'/?audio-mixer-test='+width+'#home',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!window.ElaraAudio,{timeout:30000});
  await page.waitForSelector('#panel-settings [data-elara-audio-host]',{state:'attached',timeout:30000});
  // Only expose the canonical Settings tab without requiring a personal account
  // in this local acceptance test. Do not change product code or sound logic.
  await page.addStyleTag({content:'#cloud-layer{display:none!important}body:not(.cloud-ready) .shell,body.cloud-locked .shell{visibility:visible!important}'});
  await page.evaluate(()=>{
   document.body.classList.add('cloud-ready');
   document.body.classList.remove('cloud-locked');
   const tab=document.querySelector('#panel-settings');
   tab?.classList.remove('hidden');
   if(tab)tab.hidden=false;
  });
  const root=page.locator('#panel-settings [data-elara-audio-host]');
  const rows=await root.locator('input[data-audio-volume]').count();
  assert.equal(rows,8,'master plus seven working sound channels at '+width);
  for(const key of ['master','music','ambient','focus','profile','ui','rewards','timer']){
   assert.equal(await root.locator('input[data-audio-volume="'+key+'"]').count(),1,key+' slider absent');
  }
  for(const key of ['music','ambient','focus','profile','ui','rewards','timer']){
   assert.equal(await root.locator('[data-audio-mute="'+key+'"]').count(),1,key+' mute button absent');
  }
  // Create a real HTMLAudioElement: profile previews must honor global and
  // channel controls independently of any Web Audio oscillator playback.
  await page.evaluate(()=>{
   const a=document.createElement('audio');
   a.id='test-profile-song';
   a.dataset.elaraAudioChannel='profile';
   document.body.append(a);
   window.ElaraAudio.applyMedia(a);
  });
  await root.locator('input[data-audio-volume="master"]').evaluate(el=>{
   el.value='50';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await root.locator('input[data-audio-volume="profile"]').evaluate(el=>{
   el.value='40';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await root.locator('input[data-audio-volume="focus"]').evaluate(el=>{
   el.value='30';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  let state=await page.evaluate(()=>{
   const a=document.getElementById('test-profile-song');
   return {volume:a.volume,muted:a.muted,focus:window.ElaraAudio.volumeFor('focus'),master:window.ElaraAudio.read().master};
  });
  assert.ok(Math.abs(state.volume-.2)<.001,'profile song volume should be 50% master x 40% channel');
  assert.equal(state.muted,false);
  assert.ok(Math.abs(state.focus-.15)<.001,'focus room should scale with master slider');
  assert.equal(state.master,50);
  await root.locator('[data-audio-mute="profile"]').click();
  assert.equal(await page.evaluate(()=>document.getElementById('test-profile-song').muted),true,'profile mute must silence native audio');
  await root.locator('[data-audio-master]').click();
  assert.equal(await page.evaluate(()=>window.ElaraAudio.volumeFor('focus')),0,'master mute must cover focus room');
  await root.locator('[data-audio-master]').click();
  await root.locator('[data-audio-mute="profile"]').click();
  // Assert saved preferences persist after a real browser navigation/reload.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.ElaraAudio && !!document.querySelector('#panel-settings [data-elara-audio-host]'),{timeout:30000});
  state=await page.evaluate(()=>window.ElaraAudio.read());
  assert.equal(state.master,50);
  assert.equal(state.volume.profile,40);
  assert.equal(state.volume.focus,30);
  assert.equal(state.enabled,true);
  assert.equal(state.mute.profile,false);
  // Profile drawer dynamically rerenders its settings. Re-mount is idempotent.
  await page.evaluate(()=>{
   const host=document.getElementById('drawer-settings-area');
   if(!host)return;
   host.innerHTML='<div class="test-settings-placeholder">Profile settings</div>';
   window.ElaraAudio.mount();
   window.ElaraAudio.mount();
  });
  const drawer=page.locator('#drawer-settings-area [data-elara-audio-host]');
  if(await page.locator('#drawer-settings-area').count())assert.equal(await drawer.count(),1,'profile drawer mixer must be mounted exactly once');
  await context.close();
 }
 console.log('ELARA_AUDIO_SETTINGS_BROWSER_PASS at 390px and 1440px');
}finally{await browser.close()}

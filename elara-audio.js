/* Elara unified sound system: generated, royalty-free Web Audio sounds; no character voice. */
(()=>{'use strict';
if(window.ElaraAudio)return;
const KEY='elara_audio_v1';
const channels={music:32,ambient:40,focus:42,profile:65,ui:18,rewards:48,timer:42};
const scenes={rain:['باران طبیعی','Real rain'],forest:['صبح جنگل','Forest morning'],ocean:['امواج دریا','Ocean waves'],fire:['شومینه واقعی','Real fireplace'],wind:['نسیم جنگل','Forest breeze'],library:['کتابخانه آرام · باران پشت پنجره','Quiet library · window rain']};
// Public-domain field recordings from Wikimedia Commons (credits in docs/AUDIO-SOURCES.md).
const FIELD_ROOT='https://commons.wikimedia.org/wiki/Special:Redirect/file/';
const fieldClips={rain:'Rain.ogg',forest:'Birdsong_mild_sunny_day.ogg',ocean:'Waves.ogg',fire:'Dry_grass_burning_in_open_fireplace.ogg',wind:'20090610_0_ambience.ogg',library:'Rain.ogg'};
const tr=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const limit=v=>Math.max(0,Math.min(100,Number(v)||0));
const defaults={enabled:true,master:75,volume:{...channels},mute:{},scene:'rain',ambiencePlaying:false,musicPlaying:false};
function read(){try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');return {...defaults,...s,volume:{...channels,...(s.volume||{})},mute:{...(s.mute||{})},ambiencePlaying:false,musicPlaying:false}}catch{return {...defaults,volume:{...channels},mute:{},ambiencePlaying:false,musicPlaying:false}}}
let state=read(),ctx=null,bus={},ambientNodes=[],musicNodes=[],loopTimer=null,sceneTimer=null,fieldAudio=null,lastUi=0,lastReward=0,lastGoal=0,chimeIndex=0;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{};window.dispatchEvent(new CustomEvent('elara:audio-settings-changed',{detail:{...state}}))}
function context(){if(!ctx||ctx.state==='closed'){const A=window.AudioContext||window.webkitAudioContext;if(!A)throw Error('Web Audio unavailable');ctx=new A();const master=ctx.createGain();master.connect(ctx.destination);bus.master=master;for(const key of Object.keys(channels)){const gain=ctx.createGain();gain.connect(master);bus[key]=gain}sync()}return ctx}
function volumeFor(key){if(!Object.prototype.hasOwnProperty.call(channels,key))return 0;return state.enabled&&!state.mute[key]?limit(state.master)/100*limit(state.volume[key])/100:0}
function syncMedia(){
 if(fieldAudio)applyMedia(fieldAudio);
 // Profile-song players are native HTML audio, NOT part of this WebAudio graph.
 // Apply the same master + profile sliders whenever their elements appear or play.
 document.querySelectorAll('audio').forEach(media=>applyMedia(media));
}
function applyMedia(media){
 if(!media||String(media.tagName).toUpperCase()!=='AUDIO')return;
 const key=Object.prototype.hasOwnProperty.call(channels,media.dataset?.elaraAudioChannel)?media.dataset.elaraAudioChannel:'profile';
 const gain=Number(media.dataset?.elaraAudioGain);const level=volumeFor(key)*(Number.isFinite(gain)?Math.max(0,Math.min(1,gain)):1);
 if(Math.abs(media.volume-level)>.002)media.volume=level;
 media.muted=level===0;
}
function sync(){if(ctx){bus.master.gain.setTargetAtTime(state.enabled?limit(state.master)/100:0,ctx.currentTime,.015);for(const key of Object.keys(channels))bus[key].gain.setTargetAtTime(state.mute[key]?0:limit(state.volume[key])/100,ctx.currentTime,.015)}syncMedia()}
function set(partial){state={...state,...partial,volume:{...state.volume,...(partial.volume||{})},mute:{...state.mute,...(partial.mute||{})}};persist();sync();render();return state}
function stopNodes(nodes){for(const node of nodes.splice(0)){try{node.stop?.()}catch{}try{node.disconnect?.()}catch{}}}
function noise(seconds=3){const c=context(),buf=c.createBuffer(1,Math.floor(c.sampleRate*seconds),c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return buf}
function layer(out,{low=100,high=5000,level=.1,type='brown'}={}){const c=context(),source=c.createBufferSource(),hp=c.createBiquadFilter(),lp=c.createBiquadFilter(),g=c.createGain();source.buffer=noise();source.loop=true;hp.type='highpass';hp.frequency.value=low;lp.type='lowpass';lp.frequency.value=high;g.gain.value=level;source.connect(hp);hp.connect(lp);lp.connect(g);g.connect(out);source.start();return[source,hp,lp,g]}
function tone(out,freq,level=.04){const c=context(),osc=c.createOscillator(),g=c.createGain();osc.type='sine';osc.frequency.value=freq;g.gain.value=level;osc.connect(g);g.connect(out);osc.start();return[osc,g]}
// Warm, non-repeating synthesized feedback. The musical notes are scheduled
// synchronously on the click gesture, so no delayed completion feedback.
function strike(channel,freq,at,length,amp=.04,shape='sine'){
 if(!volumeFor(channel))return;
 const c=context(),o=c.createOscillator(),g=c.createGain();
 o.type=shape;o.frequency.setValueAtTime(freq,at);
 const attack=Math.min(.025,length*.14),decay=Math.max(.07,length-attack);
 g.gain.setValueAtTime(.0001,at);
 g.gain.exponentialRampToValueAtTime(Math.max(.0002,amp),at+attack);
 g.gain.exponentialRampToValueAtTime(.0001,at+attack+decay);
 o.connect(g);g.connect(bus[channel]);o.start(at);o.stop(at+length+.03);
 o.onended=()=>{o.disconnect();g.disconnect()};
}
const melodies={
 goal:[[392,493.88,587.33],[349.23,440,523.25],[440,523.25,659.25],[369.99,493.88,587.33]],
 complete:[[349.23,523.25],[392,587.33],[440,659.25]],
 habit:[[329.63,440],[349.23,493.88],[392,523.25]],
 book:[[261.63,392],[293.66,440],[329.63,493.88]],
 rewards:[[261.63,329.63,392,523.25],[293.66,369.99,440,587.33],[329.63,392,493.88,659.25]],
 level:[[220,329.63,440,523.25,659.25],[246.94,369.99,493.88,587.33,739.99]]
};
function cue(type='ui'){
 const now=performance.now();
 if(type==='ui'&&now-lastUi<150)return;
 if(type==='goal'&&now-lastGoal<55)return;
 if(type!=='ui'&&type!=='goal'&&type!=='undo'&&now-lastReward<300)return;
 if(type==='ui')lastUi=now;else if(type==='goal')lastGoal=now;else lastReward=now;
 const channel=type==='ui'||type==='undo'||type==='book'?'ui':type==='timer'||type==='warning'?'timer':'rewards';
 if(!volumeFor(channel))return;
 const c=context();if(c.state==='suspended')void c.resume();
 const time=c.currentTime+.002;
 if(type==='ui'||type==='undo'){
  const freq=type==='undo'?290:[310,330,349.23,369.99][chimeIndex++%4];
  strike('ui',freq,time,.047,.017);return;
 }
 if(type==='warning'||type==='timer'){
  const f=type==='warning'?277.18:349.23;
  strike('timer',f,time,.17,.045);strike('timer',f*.75,time+.19,.15,.032);return;
 }
 const opts=melodies[type==='mission'?'rewards':type]||melodies.complete;
 const notes=opts[chimeIndex++%opts.length];
 const rich=type==='rewards'||type==='mission'||type==='level';
 const gap=rich?.155:type==='goal'?.088:.115;
 notes.forEach((f,i)=>{
  const at=time+i*gap,amp=rich?.045:type==='goal'?.038:.028;
  strike(channel,f,at,rich?.78:type==='goal'?.37:.30,amp,'sine');
  if(rich)strike(channel,f/2,at+.016,.88,.017,'triangle');
 });
 if(rich){
  // A subtle resolved chord tail (no harsh beep or repetitive canned sample).
  const root=notes.at(-1);
  strike(channel,root*.75,time+notes.length*gap,.84,.013);
 }
}
function silenceField(){
 if(fieldAudio){fieldAudio.onended=null;fieldAudio.onerror=null;fieldAudio.pause();fieldAudio.removeAttribute('src');fieldAudio=null}
}
function stopAmbient(){silenceField();stopNodes(ambientNodes);clearInterval(sceneTimer);sceneTimer=null;state.ambiencePlaying=false;persist();render()}
function sceneNoise(){stopNodes(ambientNodes);clearInterval(sceneTimer);sceneTimer=null;const c=context(),out=bus.ambient;if(state.scene==='rain'){ambientNodes.push(...layer(out,{low:350,high:6500,level:.22}),...layer(out,{low:35,high:1000,level:.07}))}
else if(state.scene==='ocean'){ambientNodes.push(...layer(out,{low:65,high:1900,level:.22}));const gain=ambientNodes[ambientNodes.length-1];if(gain?.gain){gain.gain.setValueAtTime(.08,c.currentTime);for(let i=1;i<=20;i++)gain.gain.linearRampToValueAtTime(i%2?.23:.08,c.currentTime+i*2.8)}}
else if(state.scene==='forest'){ambientNodes.push(...layer(out,{low:120,high:1600,level:.06}));sceneTimer=setInterval(()=>{if(state.ambiencePlaying)pingBird()},2400)}
else if(state.scene==='fire'){ambientNodes.push(...layer(out,{low:90,high:2100,level:.13}));sceneTimer=setInterval(()=>{if(state.ambiencePlaying)crackle()},730)}
else if(state.scene==='wind'){ambientNodes.push(...layer(out,{low:40,high:650,level:.12}))}
else{ambientNodes.push(...layer(out,{low:65,high:620,level:.012}))}}
function transient(freq,duration,amp){if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(bus.ambient);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect()}}
function pingBird(){if(Math.random()>.75){transient(1000+Math.random()*480,.14,.035);setTimeout(()=>{if(state.ambiencePlaying)transient(1280,.12,.025)},110)}}
function crackle(){if(Math.random()>.45)transient(90+Math.random()*170,.025,.06)}
async function playAmbient(scene){
 if(scene&&scenes[scene])state.scene=scene;
 // Stop the previous recording before starting a new scene.
 silenceField();stopNodes(ambientNodes);clearInterval(sceneTimer);sceneTimer=null;
 const chosen=state.scene;
 state.ambiencePlaying=true;persist();render();
 const filename=fieldClips[chosen];
 if(filename&&typeof Audio!=='undefined'){
  try{
   const clip=new Audio(FIELD_ROOT+encodeURIComponent(filename));
   clip.loop=true;clip.preload='auto';clip.dataset.elaraAudioChannel='ambient';
   clip.dataset.elaraAudioGain=chosen==='fire'?'0.24':chosen==='library'?'0.27':'0.34';
   clip.onerror=()=>{if(fieldAudio===clip){silenceField();sceneNoise()}};
   fieldAudio=clip;applyMedia(clip);
   await clip.play();
   if(fieldAudio!==clip){clip.pause();return}
   return;
  }catch(error){
   if(fieldAudio) silenceField();
   if(!state.ambiencePlaying)return;
   // A quiet built-in fallback keeps ambience usable when Commons is blocked/offline.
   console.warn('Natural ambient recording unavailable; using soft fallback',error?.message||error);
  }
 }
 if(state.ambiencePlaying)sceneNoise();
}
function stopMusic(){clearInterval(loopTimer);loopTimer=null;stopNodes(musicNodes);state.musicPlaying=false;persist();render()}
const chords=[
 [174.61,220,261.63],[146.83,196,246.94],[164.81,207.65,261.63],[196,246.94,293.66],
 [174.61,261.63,329.63],[130.81,196,261.63],[164.81,220,293.66],[146.83,220,277.18]
];let chordStep=0;
function musicChord(){
 if(!ctx||!state.musicPlaying)return;
 const old=musicNodes;musicNodes=[];
 // Crossfade rather than stopping oscillators abruptly; longer progression
 // with gentle harmonic variety doesn't sound like a repetitive electronic beep.
 for(let i=1;i<old.length;i+=2)old[i]?.gain?.setTargetAtTime(.0001,ctx.currentTime,.42);
 if(old.length)setTimeout(()=>stopNodes(old),1800);
 const notes=chords[chordStep++%chords.length];
 for(const f of notes){
  const pair=tone(bus.music,f,.0001);
  pair[1].gain.setTargetAtTime(.018+Math.random()*.005,ctx.currentTime,.55);
  musicNodes.push(...pair);
 }
}
async function playMusic(){const c=context();await c.resume();state.musicPlaying=true;musicChord();clearInterval(loopTimer);loopTimer=setInterval(musicChord,8000);persist();render()}
function stopAll(){stopAmbient();stopMusic()}
function render(){
 document.querySelectorAll('[data-elara-audio-host]').forEach(host=>{
  const toggle=host.querySelector('[data-audio-master]');
  if(toggle){toggle.textContent=state.enabled?tr('🔊 قطع همه صداها','🔊 Mute all sounds'):tr('🔇 فعال‌کردن همه صداها','🔇 Enable all sounds');toggle.setAttribute('aria-pressed',String(!state.enabled))}
  host.querySelectorAll('[data-audio-volume]').forEach(el=>{
   const key=el.dataset.audioVolume,value=key==='master'?state.master:state.volume[key];
   if(document.activeElement!==el)el.value=value;
   const label=host.querySelector('[data-audio-readout="'+key+'"]');
   if(label)label.textContent=value+'%';
   el.setAttribute('aria-valuetext',value+tr(' درصد',' percent'))
  });
  host.querySelectorAll('[data-audio-mute]').forEach(el=>{
   const key=el.dataset.audioMute;
   el.textContent=state.mute[key]?'🔇':'🔊';
   el.setAttribute('aria-pressed',String(!!state.mute[key]));
   el.setAttribute('aria-label',(state.mute[key]?tr('وصل ','Unmute '):tr('قطع ','Mute '))+el.dataset.audioLabel)
  });
  const ambient=host.querySelector('[data-audio-ambient-play]');
  if(ambient){ambient.textContent=state.ambiencePlaying?tr('⏹ توقف محیط','⏹ Stop ambience'):tr('▶ پخش محیط','▶ Play ambience');ambient.setAttribute('aria-pressed',String(state.ambiencePlaying))}
  const music=host.querySelector('[data-audio-music-play]');
  if(music){music.textContent=state.musicPlaying?tr('⏹ توقف موسیقی','⏹ Stop music'):tr('▶ پخش موسیقی','▶ Play music');music.setAttribute('aria-pressed',String(state.musicPlaying))}
  const select=host.querySelector('[data-audio-scene]');if(select)select.value=state.scene
 })
}
function markup(){
 const names={
  music:[tr('موسیقی پس‌زمینه سایت','Website background music'),tr('موسیقی آرامِ سایت؛ فقط پس از پخش دستی شروع می‌شود.','The site ambient score; starts on your click.')],
  ambient:[tr('صداهای محیطی سایت','Website ambient scenes'),tr('باران، جنگل، دریا و صداهای محیطی دیگر','Rain, forest, ocean and other ambience')],
  focus:[tr('صدای اتاق تمرکز','Focus room sounds'),tr('صدای باران، جنگل یا موسیقیِ داخل تمرکز؛ مستقل از محیط سایت','Rain, forest or focus tone inside your focus room')],
  profile:[tr('آهنگ پروفایل و پیش‌نمایش‌ها','Profile songs and previews'),tr('فایل‌های آهنگ و Apple Preview که خودت پخش می‌کنی','Music files and Apple Previews you choose to play')],
  ui:[tr('کلیک دکمه‌ها','Button clicks'),tr('لمس‌های کوتاه و ملایم رابط کاربری','Soft interface taps')],
  rewards:[tr('پاداش، XP و مأموریت‌ها','Rewards, XP and missions'),tr('صدای موفقیت و تکمیل کارها','Completion and success cues')],
  timer:[tr('تایمر و هشدارها','Timer and alerts'),tr('افکت شروع، توقف و هشدار تایمر','Timer controls and alert cues')]
 };
 const slider=(key,value)=>'<div class="elara-audio-row"><div class="elara-audio-row-label"><label for="elara-audio-'+key+'">'+(key==='master'?tr('بلندی صدای همه سایت','Overall website volume'):names[key][0])+'</label>'+(key==='master'?'':'<small>'+names[key][1]+'</small>')+'</div><input id="elara-audio-'+key+'" type="range" min="0" max="100" step="1" data-audio-volume="'+key+'"><output data-audio-readout="'+key+'"></output>'+(key==='master'?'<span aria-hidden="true">♫</span>':'<button type="button" class="quiet-button elara-audio-mute" data-audio-mute="'+key+'" data-audio-label="'+names[key][0]+'"></button>')+(key==='ui'||key==='rewards'||key==='timer'?'<button type="button" class="quiet-button elara-audio-preview" data-audio-preview="'+key+'">'+tr('آزمایش','Test')+'</button>':'')+'</div>';
 return '<section class="elara-audio-settings surface settings-card" data-elara-audio-host data-elara-i18n="off" aria-label="'+tr('تنظیمات صدا','Audio settings')+'">'+
  '<div class="elara-audio-head"><div><h2>🔊 '+tr('تنظیمات همه صداها','All sound settings')+'</h2><p class="muted">'+tr('هر صدا را جدا کم، زیاد یا قطع کن. تنظیمات روی این دستگاه ذخیره می‌شود.','Adjust or mute every sound independently. Preferences are saved on this device.')+'</p></div><button type="button" class="quiet-button elara-audio-master-btn" data-audio-master aria-pressed="false"></button></div>'+
  slider('master')+
  '<div class="elara-audio-group-label">'+tr('موسیقی و صداهای محیطی','Music and ambience')+'</div>'+
  ['music','ambient','focus','profile'].map(key=>slider(key)).join('')+
  '<div class="elara-audio-group-label">'+tr('تعاملات و اعلان‌ها','Interactions and notifications')+'</div>'+
  ['ui','rewards','timer'].map(key=>slider(key)).join('')+
  '<div class="elara-audio-samples"><button type="button" class="quiet-button" data-audio-preview="goal">'+tr('✨ آزمایش تیک هدف','✨ Goal check preview')+'</button><button type="button" class="quiet-button" data-audio-preview="rewards">'+tr('✦ آزمایش صدای مأموریت','✦ Mission reward preview')+'</button></div>'+
  '<div class="elara-audio-actions"><label>'+tr('انتخاب فضای محیطی','Ambient sound')+' <select data-audio-scene>'+Object.entries(scenes).map(([key,label])=>'<option value="'+key+'">'+tr(...label)+'</option>').join('')+'</select></label>'+
  '<button type="button" class="quiet-button" data-audio-ambient-play></button>'+
  '<button type="button" class="quiet-button" data-audio-music-play></button>'+
  '<button type="button" class="quiet-button" data-audio-reset>'+tr('بازنشانی تنظیمات صدا','Reset sound settings')+'</button></div>'+
  '<p class="elara-audio-note">'+tr('صدای کاراکتر سه‌بعدی هنوز متصل نشده است؛ پس از فعال‌شدن سرویس گفتار برای آن تنظیم جداگانه می‌گذاریم. صداهای محیطی و موسیقی به کلیک پخش نیاز دارند.','The 3D character voice is not connected yet and will get its own control when TTS is available. Music and ambience start on a user gesture.')+' <a href="https://github.com/Mohadesehjohari/elaraspace/blob/main/docs/AUDIO-SOURCES.md" target="_blank" rel="noopener noreferrer">'+tr('منابع صداهای طبیعی','Natural recording credits')+'</a></p>'+
 '</section>'
}
const soundViews={page:'general',drawer:'general'};
function applySoundView(root,suffix){
 const tabs=root.querySelector(':scope > [data-elara-audio-tabs]');
 const mixer=root.querySelector(':scope > [data-elara-audio-host]');
 if(!tabs||!mixer)return;
 const audio=soundViews[suffix]==='audio';
 for(const child of [...root.children]){
  if(child===tabs)continue;
  if(child===mixer){child.toggleAttribute('data-elara-audio-hidden',!audio);continue}
  if(child.matches('.section-heading,.drawer-section-heading')||child===root.firstElementChild&&child!==mixer)continue;
  child.toggleAttribute('data-elara-audio-hidden',audio);
 }
 for(const btn of tabs.querySelectorAll('[data-elara-audio-tab]')){
  const selected=btn.dataset.elaraAudioTab===(audio?'audio':'general');
  btn.setAttribute('aria-selected',String(selected));btn.tabIndex=selected?0:-1;
 }
}
function mount(){
 for(const [selector,suffix] of [['#panel-settings','page'],['#drawer-settings-area','drawer']]){
  const root=document.querySelector(selector);
  if(!root||!root.children.length)continue;
  let card=root.querySelector(':scope > [data-elara-audio-host]');
  if(!card){
   const wrap=document.createElement('div');
   wrap.innerHTML=markup().replaceAll('id="elara-audio-', 'id="elara-audio-'+suffix+'-').replaceAll('for="elara-audio-', 'for="elara-audio-'+suffix+'-');
   card=wrap.firstElementChild;
   const theme=root.querySelector('.elara-theme-settings-inline, .elara-theme-settings-card');
   if(theme)theme.after(card);else root.append(card);
  }
  let tabs=root.querySelector(':scope > [data-elara-audio-tabs]');
  if(!tabs){
   tabs=document.createElement('nav');
   tabs.className='elara-audio-tabs';tabs.dataset.elaraAudioTabs=suffix;
   tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',tr('تب‌های تنظیمات','Settings tabs'));
   tabs.innerHTML='<button type="button" role="tab" data-elara-audio-tab="general">'+tr('⚙ تنظیمات عمومی','⚙ General settings')+'</button>'+
    '<button type="button" role="tab" data-elara-audio-tab="audio">'+tr('🔊 صداها','🔊 Sounds')+'</button>';
   const first=root.querySelector(':scope > .section-heading')||root.firstElementChild;
   if(first)first.after(tabs);else root.prepend(tabs);
  }
  applySoundView(root,suffix);
 }
 render();
}
let drawerObserver=null;
function watchDrawer(){
 const drawer=document.querySelector('#drawer-settings-area');
 if(drawer&&!drawerObserver){
  drawerObserver=new MutationObserver(()=>{
   if(drawer.children.length&&(!drawer.querySelector(':scope > [data-elara-audio-host]')||!drawer.querySelector(':scope > [data-elara-audio-tabs]')))mount()
  });
  drawerObserver.observe(drawer,{childList:true});
 }
 mount();
}
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-elara-audio-tab]');
 if(!tab)return;
 const nav=tab.closest('[data-elara-audio-tabs]');if(!nav)return;
 soundViews[nav.dataset.elaraAudioTabs]=tab.dataset.elaraAudioTab==='audio'?'audio':'general';
 const root=nav.parentElement;if(root)applySoundView(root,nav.dataset.elaraAudioTabs);
});
document.addEventListener('input',e=>{const el=e.target.closest('[data-audio-volume]');if(!el)return;const k=el.dataset.audioVolume,v=limit(el.value);set(k==='master'?{master:v}:{volume:{[k]:v}})});
document.addEventListener('play',e=>{applyMedia(e.target)},true);
document.addEventListener('loadedmetadata',e=>{applyMedia(e.target)},true);
document.addEventListener('change',e=>{if(e.target.matches('[data-audio-scene]')){state.scene=e.target.value;if(state.ambiencePlaying){void playAmbient().catch(console.warn)}else{persist();render()}}});
document.addEventListener('click',e=>{const el=e.target.closest('[data-audio-master],[data-audio-mute],[data-audio-reset],[data-audio-ambient-play],[data-audio-music-play],[data-audio-preview]');if(!el)return;
if(el.matches('[data-audio-master]'))set({enabled:!state.enabled});
else if(el.matches('[data-audio-mute]')){const k=el.dataset.audioMute;set({mute:{[k]:!state.mute[k]}})}
else if(el.matches('[data-audio-reset]')){stopAll();set({...defaults,volume:{...channels},mute:{}})}
else if(el.matches('[data-audio-ambient-play]')){if(state.ambiencePlaying)stopAmbient();else void playAmbient().catch(console.warn)}
else if(el.matches('[data-audio-music-play]')){if(state.musicPlaying)stopMusic();else void playMusic().catch(console.warn)}
else if(el.matches('[data-audio-preview]')){const key=el.dataset.audioPreview;cue(key==='rewards'?'rewards':key==='timer'?'timer':key==='goal'?'goal':'ui')}});
document.addEventListener('click',e=>{if(e.target.closest('[data-elara-audio-host]'))return;if(e.target.closest('#timer-start,#timer-reset,[data-focus-timer-start],[data-focus-timer-stop]')){cue('timer');return}const button=e.target.closest('button,.quiet-button,.primary-button,[role="button"]');if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'||button.closest('[data-elara-no-sfx],.freedom-fox-overlay'))return;if(button.matches('[data-action="toggle-step"],[data-action="toggle-goal-daily"]'))return;cue('ui')},true);
window.addEventListener('elara:open',e=>{mount();const tab=String(e.detail?.tab||'');if(tab==='settings')mount()});
window.addEventListener('elara:data-changed',()=>{if(document.querySelector('#drawer-settings-area,#panel-settings'))mount()});
window.addEventListener('elara:locale-changed',()=>{document.querySelectorAll('[data-elara-audio-host],[data-elara-audio-tabs]').forEach(n=>n.remove());mount()});
document.addEventListener('click',e=>{if(e.target.closest('[data-audio-master],[data-audio-mute],[data-audio-reset]'))return;const btn=e.target.closest('[data-elara-complete-task], [data-habit-check], [data-mission-claim], [data-book-add]');if(btn){const type=btn.matches('[data-mission-claim]')?'rewards':btn.matches('[data-habit-check]')?'habit':btn.matches('[data-book-add]')?'book':'complete';cue(type)}});
window.addEventListener('elara:mission-claimed',()=>cue('rewards'));
window.addEventListener('elara:domain-milestone',e=>{const type=e.detail?.type;if(type==='book')cue('book');else if(type==='task'||type==='goal'||type==='habit')cue('complete')});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ctx?.state==='running')void ctx.suspend();else if(!document.hidden&&ctx?.state==='suspended'&&(state.ambiencePlaying||state.musicPlaying))void ctx.resume()});
window.addEventListener('pagehide',()=>{stopAll();if(ctx)void ctx.close()});
window.ElaraAudio={read:()=>({...state,volume:{...state.volume},mute:{...state.mute}}),set,volumeFor,cue,playAmbient,stopAmbient,playMusic,stopMusic,mount,applyMedia,get context(){return ctx}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchDrawer,{once:true});else watchDrawer();
})();
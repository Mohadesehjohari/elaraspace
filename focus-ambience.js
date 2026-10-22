(()=>{'use strict';
const KEY='elara_focus_ambience_v1';
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
let ctx=null,master=null,nodes=[],chirpTimer=null,fieldFocus=null,playing=false;
const CLIP_ROOT='https://commons.wikimedia.org/wiki/Special:Redirect/file/';
const focusClips={rain:'Rain.ogg',forest:'Birdsong_mild_sunny_day.ogg',ocean:'Waves.ogg',library:'Rain_against_the_window.ogg'};
function read(){try{return{mode:'quiet',volume:28,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return{mode:'quiet',volume:28}}}
function write(patch){const next={...read(),...patch};localStorage.setItem(KEY,JSON.stringify(next));return next}
function stopAudio(){
 clearInterval(chirpTimer);chirpTimer=null;
 if(fieldFocus){fieldFocus.onerror=null;fieldFocus.pause();fieldFocus.removeAttribute('src');fieldFocus=null}
 for(const n of nodes){try{n.stop?.()}catch{}try{n.disconnect?.()}catch{}}
 nodes=[];try{master?.disconnect?.()}catch{}master=null;playing=false;syncState()
}
function ensureContext(){
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error(t('مرورگر این دستگاه صدای محیطی را پشتیبانی نمی‌کند.','This browser does not support ambient audio.'));
 if(!ctx||ctx.state==='closed')ctx=new Audio();return ctx
}
function gainValue(){const engine=window.ElaraAudio;const factor=engine?.volumeFor?.('focus')??1;return Math.max(0,Math.min(1,Number(read().volume||0)/100))*0.16*factor}
function noiseBuffer(c,seconds=4){
 const len=Math.max(1,Math.floor(c.sampleRate*seconds)),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
 let last=0;for(let i=0;i<len;i++){const white=Math.random()*2-1;last=(last+0.025*white)/1.025;d[i]=last*3.2}return buf
}
function addNoise(c,{low=6500,high=120,level=.8}={}){
 const src=c.createBufferSource();src.buffer=noiseBuffer(c);src.loop=true;
 const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=high;
 const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=low;
 const g=c.createGain();g.gain.value=level;src.connect(hp);hp.connect(lp);lp.connect(g);g.connect(master);src.start();nodes.push(src,hp,lp,g)
}
function addTone(c,freq,level=.18,type='sine'){
 const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.value=level;o.connect(g);g.connect(master);o.start();nodes.push(o,g)
}
function chirp(c){
 if(!playing||read().mode!=='forest')return;const o=c.createOscillator(),g=c.createGain(),now=c.currentTime;o.type='sine';o.frequency.setValueAtTime(1100+Math.random()*500,now);o.frequency.exponentialRampToValueAtTime(1800+Math.random()*700,now+.14);g.gain.setValueAtTime(0.0001,now);g.gain.exponentialRampToValueAtTime(.06,now+.025);g.gain.exponentialRampToValueAtTime(.0001,now+.22);o.connect(g);g.connect(master);o.start(now);o.stop(now+.24)
}
async function startAudio(){
 const cfg=read();if(cfg.mode==='quiet'){stopAudio();return}
 stopAudio();
 const source=focusClips[cfg.mode];
 if(source&&typeof Audio!=='undefined'){
  const clip=new Audio(CLIP_ROOT+encodeURIComponent(source));
  clip.preload='auto';clip.loop=true;clip.dataset.elaraAudioChannel='focus';
  fieldFocus=clip;playing=true;syncVolume();syncState();
  try{
   await clip.play();
   if(fieldFocus!==clip){clip.pause();return}
   return;
  }catch(error){
   if(fieldFocus===clip){clip.onerror=null;clip.pause();fieldFocus=null}
   console.warn('Natural focus recording unavailable; using soft built-in ambience',error?.message||error);
  }
 }
 // Offline fallback only: lower, softer noise for real-world scenes, never
 // high pitched artificial chirps or a single unchanging library hiss.
 const c=ensureContext();if(c.state==='suspended')await c.resume();
 if(!playing)playing=true;
 master=c.createGain();master.gain.value=gainValue();master.connect(c.destination);
 if(cfg.mode==='rain'||cfg.mode==='library'){addNoise(c,{low:1800,high:100,level:cfg.mode==='library'?.18:.3});}
 else if(cfg.mode==='forest'){addNoise(c,{low:750,high:50,level:.16});}
 else if(cfg.mode==='ocean'){addNoise(c,{low:950,high:70,level:.22});}
 else if(cfg.mode==='tone'){
  addTone(c,174.61,.11);addTone(c,261.63,.072);addTone(c,349.23,.028);
 }
 playing=true;syncState();
}
function syncVolume(){if(master)master.gain.value=gainValue();if(fieldFocus){fieldFocus.dataset.elaraAudioGain=String(Math.min(1,Math.max(0,read().volume/100)*.8));window.ElaraAudio?.applyMedia?.(fieldFocus)}}
function syncState(){
 const root=document.getElementById('focus-ambience');if(!root)return;const cfg=read();
 root.dataset.mode=cfg.mode;root.dataset.playing=String(playing);
 root.querySelectorAll('[data-ambience-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ambienceMode===cfg.mode)));
 const play=root.querySelector('[data-ambience-play]');if(play){play.setAttribute('aria-pressed',String(playing));play.textContent=playing?t('توقف صدا','Stop sound'):t('پخش صدا','Play sound')}
 const vol=root.querySelector('[data-ambience-volume]');if(vol&&document.activeElement!==vol)vol.value=String(cfg.volume);
 const label=root.querySelector('[data-ambience-now]');if(label){const names={quiet:t('ساکت','Quiet'),rain:t('باران طبیعی','Real rain'),forest:t('صدای پرندگان جنگل','Forest birds'),ocean:t('امواج دریا','Ocean waves'),library:t('کتابخانه و باران','Library rain'),tone:t('آکورد آرام تمرکز','Calm focus chords')};label.textContent=names[cfg.mode]||names.quiet}
}
function markup(){
 const cfg=read();
 return `<section id="focus-ambience" class="focus-ambience focus-inline-ambience" data-elara-i18n="off" data-mode="${cfg.mode}">
  <div class="focus-ambience-modes" role="group" aria-label="${t('انتخاب صدای محیطی','Choose ambience')}">
   <button type="button" data-ambience-mode="quiet"><span class="focus-inline-icon">◌</span><span>${t('سکوت','Silence')}</span></button>
   <button type="button" data-ambience-mode="rain"><span class="focus-inline-icon">☂</span><span>${t('باران','Rain')}</span></button>
   <button type="button" data-ambience-mode="forest"><span class="focus-inline-icon">♧</span><span>${t('پرندگان جنگل','Forest birds')}</span></button>
   <button type="button" data-ambience-mode="ocean"><span class="focus-inline-icon">≈</span><span>${t('امواج واقعی','Real waves')}</span></button>
   <button type="button" data-ambience-mode="library"><span class="focus-inline-icon">☾</span><span>${t('کتابخانه و باران','Library rain')}</span></button>
   <button type="button" data-ambience-mode="tone"><span class="focus-inline-icon">♫</span><span>${t('موسیقی تمرکز','Focus tone')}</span></button>
  </div>
  <div class="focus-ambience-controls">
   <button type="button" data-ambience-play aria-pressed="false">${t('پخش صدا','Play sound')}</button>
   <label>${t('بلندی صدا','Volume')} <input data-ambience-volume type="range" min="0" max="100" step="1" value="${cfg.volume}"></label>
   <span>${t('در حال انتخاب:','Selected:')} <strong data-ambience-now></strong></span>
  </div>
  <p class="focus-ambience-note">${t('ضبط طبیعی صدا پس از کلیک پخش می‌شود؛ بدون صدای تیز و مصنوعی.','Natural recordings start after your click; no sharp synthetic effects.')}</p>
 </section>`
}
function mount(){
 const pomodoro=document.getElementById('panel-focus-pomodoro');
 const card=pomodoro?.querySelector('.focus-ref-ambience');
 if(!card)return false;
 let root=document.getElementById('focus-ambience');
 if(!root){const wrap=document.createElement('div');wrap.innerHTML=markup();root=wrap.firstElementChild}
 if(root.parentElement!==card)card.append(root);
 syncState();return true
}
document.addEventListener('click',e=>{
 const mode=e.target.closest('[data-ambience-mode]');if(mode){const cfg=write({mode:mode.dataset.ambienceMode});if(playing){void startAudio().catch(console.warn)}else syncState();return}
 const play=e.target.closest('[data-ambience-play]');if(play){if(playing)stopAudio();else void startAudio().catch(err=>{const note=document.querySelector('.focus-ambience-note');if(note)note.textContent=err.message});return}
});
document.addEventListener('input',e=>{if(!e.target.matches('[data-ambience-volume]'))return;write({volume:Number(e.target.value)});syncVolume();syncState()});
let mountTimer=0,observer=null;
function ensureMounted(delay=0){clearTimeout(mountTimer);mountTimer=setTimeout(()=>{mount();},delay)}
window.addEventListener('elara:locale-changed',()=>{document.getElementById('focus-ambience')?.remove();ensureMounted(0)});
window.addEventListener('elara:open',e=>{
 if(e.detail?.tab==='focus-ambience'){window.ElaraOpen?.('focus-pomodoro',{history:'replace'});ensureMounted(40);return}
 if(e.detail?.tab==='focus-pomodoro'||e.detail?.tab==='focus')ensureMounted(40)
});
window.addEventListener('hashchange',()=>{
 if(location.hash==='#focus-ambience'){window.ElaraOpen?.('focus-pomodoro',{history:'replace'});return}
 if(location.hash==='#focus-pomodoro')ensureMounted(40)
});
window.addEventListener('elara:data-changed',()=>ensureMounted(25));
window.addEventListener('elara:state-committed',()=>ensureMounted(25));
window.addEventListener('elara:boot-watchdog',()=>ensureMounted(0));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&ctx?.state==='running')void ctx.suspend();else if(!document.hidden&&playing&&ctx?.state==='suspended')void ctx.resume()});
const start=()=>{if(!mount())ensureMounted(100);if(!observer&&document.documentElement){observer=new MutationObserver(()=>{const card=document.querySelector('#panel-focus-pomodoro .focus-ref-ambience');if(card&&document.getElementById('focus-ambience')?.parentElement!==card)ensureMounted(0)});observer.observe(document.documentElement,{childList:true,subtree:true})}};
window.addEventListener('elara:audio-settings-changed',syncVolume);
window.ElaraFocusAmbience={read,start:startAudio,stop:stopAudio,mount,get playing(){return playing}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
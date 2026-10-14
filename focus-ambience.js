(()=>{'use strict';
const KEY='elara_focus_ambience_v1';
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
let ctx=null,master=null,nodes=[],chirpTimer=null,playing=false;
function read(){try{return{mode:'night',volume:28,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return{mode:'night',volume:28}}}
function write(patch){const next={...read(),...patch};localStorage.setItem(KEY,JSON.stringify(next));return next}
function stopAudio(){
 clearInterval(chirpTimer);chirpTimer=null;
 for(const n of nodes){try{n.stop?.()}catch{}try{n.disconnect?.()}catch{}}
 nodes=[];try{master?.disconnect?.()}catch{}master=null;playing=false;syncState()
}
function ensureContext(){
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error(t('مرورگر این دستگاه صدای محیطی را پشتیبانی نمی‌کند.','This browser does not support ambient audio.'));
 if(!ctx||ctx.state==='closed')ctx=new Audio();return ctx
}
function gainValue(){return Math.max(0,Math.min(1,Number(read().volume||0)/100))*0.16}
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
 const c=ensureContext();if(c.state==='suspended')await c.resume();stopAudio();master=c.createGain();master.gain.value=gainValue();master.connect(c.destination);
 if(cfg.mode==='rain'){addNoise(c,{low:7200,high:500,level:.95});addNoise(c,{low:2600,high:80,level:.35})}
 else if(cfg.mode==='forest'){addNoise(c,{low:1800,high:70,level:.28})}
 else if(cfg.mode==='night'){addNoise(c,{low:900,high:80,level:.22});addTone(c,174.61,.08,'sine')}
 else if(cfg.mode==='cafe'){addNoise(c,{low:1050,high:130,level:.45});addNoise(c,{low:2700,high:350,level:.15})}
 else if(cfg.mode==='sea'){addNoise(c,{low:3600,high:70,level:.75});addNoise(c,{low:700,high:80,level:.45})}
 else if(cfg.mode==='tone'){addTone(c,174.61,.18,'sine');addTone(c,261.63,.11,'sine');addTone(c,349.23,.06,'triangle')}
 playing=true;syncState()
}
function syncVolume(){if(master)master.gain.value=gainValue()}
function syncState(){
 const root=document.getElementById('focus-ambience');if(!root)return;const cfg=read();
 root.dataset.mode=cfg.mode;root.dataset.playing=String(playing);
 root.querySelectorAll('[data-ambience-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ambienceMode===cfg.mode)));
 const play=root.querySelector('[data-ambience-play]');if(play){play.setAttribute('aria-pressed',String(playing));play.textContent=playing?t('توقف صدا','Stop sound'):t('پخش صدا','Play sound')}
 const vol=root.querySelector('[data-ambience-volume]');if(vol&&document.activeElement!==vol)vol.value=String(cfg.volume);
 const label=root.querySelector('[data-ambience-now]');if(label){const names={quiet:t('ساکت','Quiet'),night:t('کتابخانه شب','Night library'),rain:t('باران','Rain'),cafe:t('کافه دنج','Cozy cafe'),forest:t('جنگل','Forest'),sea:t('دریا','Sea'),tone:'Focus Tone'};label.textContent=names[cfg.mode]||names.quiet}
}
/* FOCUS-06: all real ambient controls live in the Pomodoro card.
   The independent old illustrated garden has been retired. */
function markup(){
 const cfg=read();
 const cards=[
  ['night','☕',t('کتابخانه شب','Night library')],
  ['rain','☂',t('باران','Rain')],
  ['cafe','♨',t('کافه دنج','Cozy cafe')],
  ['forest','♧',t('صدای جنگل','Forest ambience')],
  ['sea','≈',t('صدای دریا','Ocean waves')],
  ['quiet','◌',t('بدون صدا','Quiet')]
 ];
 return `<section id="focus-ambience" class="focus-ambience focus06-audio" data-elara-i18n="off" data-mode="${cfg.mode}">
  <div class="focus-ambience-modes" role="group" aria-label="${t('انتخاب صدای محیطی','Choose ambience')}">
   ${cards.map(([mode,icon,label])=>'<button type="button" data-ambience-mode="'+mode+'" aria-pressed="'+(cfg.mode===mode)+'"><span class="focus06-mode-art" aria-hidden="true">'+icon+'</span><span>'+label+'</span></button>').join('')}
  </div>
  <div class="focus-ambience-controls">
   <button type="button" class="focus06-sound-toggle" data-ambience-play aria-pressed="false">${t('پخش صدا','Play sound')}</button>
   <label>${t('حجم صدا','Volume')} <input data-ambience-volume type="range" min="0" max="100" step="1" value="${cfg.volume}"></label>
   <span class="focus06-now">${t('انتخاب شده:','Selected:')} <strong data-ambience-now></strong></span>
  </div>
  <p class="focus-ambience-note" role="status">${t('پخش صدا فقط با کلیک شما آغاز می‌شود.','Sound only starts when you click play.')}</p>
 </section>`;
}
function focusSlot(){
 return document.querySelector('#panel-focus-pomodoro .focus-ref-ambience .focus-ref-ambience-slot');
}
function mount(){
 const slot=focusSlot();if(!slot)return false;
 let root=document.getElementById('focus-ambience');
 if(!root){const wrap=document.createElement('div');wrap.innerHTML=markup();root=wrap.firstElementChild}
 if(root.parentElement!==slot)slot.append(root);
 syncState();return true
}
function redirectRetiredRoute(){
 if(location.hash==='#focus-ambience'){
  if(window.ElaraOpen)window.ElaraOpen('focus-pomodoro',{history:'replace'});
  else history.replaceState(null,'','#focus-pomodoro');
 }
}
document.addEventListener('click',e=>{
 const mode=e.target.closest('[data-ambience-mode]');if(mode){const cfg=write({mode:mode.dataset.ambienceMode});if(playing){void startAudio()}else syncState();return}
 const play=e.target.closest('[data-ambience-play]');if(play){if(playing)stopAudio();else void startAudio().catch(err=>{const note=document.querySelector('.focus-ambience-note');if(note)note.textContent=err.message});return}
});
document.addEventListener('input',e=>{if(!e.target.matches('[data-ambience-volume]'))return;write({volume:Number(e.target.value)});syncVolume();syncState()});
let mountTimer=0,observer=null;
function ensureMounted(delay=0){clearTimeout(mountTimer);mountTimer=setTimeout(()=>mount(),delay)}
window.addEventListener('elara:locale-changed',()=>{document.getElementById('focus-ambience')?.remove();ensureMounted(0)});
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='focus-ambience'){queueMicrotask(redirectRetiredRoute);return}if(e.detail?.tab==='focus-pomodoro')ensureMounted(40)});
window.addEventListener('hashchange',()=>{redirectRetiredRoute();if(location.hash==='#focus-pomodoro')ensureMounted(40)});
window.addEventListener('elara:data-changed',()=>ensureMounted(25));
window.addEventListener('elara:state-committed',()=>ensureMounted(25));
window.addEventListener('elara:boot-watchdog',()=>ensureMounted(0));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&ctx?.state==='running')void ctx.suspend();else if(!document.hidden&&playing&&ctx?.state==='suspended')void ctx.resume()});
const start=()=>{redirectRetiredRoute();if(!mount())ensureMounted(100);if(!observer&&document.documentElement){observer=new MutationObserver(()=>{if(focusSlot()&&!document.getElementById('focus-ambience'))ensureMounted(0)});observer.observe(document.documentElement,{childList:true,subtree:true})}};
window.ElaraFocusAmbience={read,start:startAudio,stop:stopAudio,mount,get playing(){return playing}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
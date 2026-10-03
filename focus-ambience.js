(()=>{'use strict';
const KEY='elara_focus_ambience_v1';
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
let ctx=null,master=null,nodes=[],chirpTimer=null,playing=false;
function read(){try{return{mode:'quiet',volume:28,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return{mode:'quiet',volume:28}}}
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
 else if(cfg.mode==='forest'){addNoise(c,{low:1800,high:70,level:.28});chirp(c);chirpTimer=setInterval(()=>chirp(c),2800)}
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
 const label=root.querySelector('[data-ambience-now]');if(label){const names={quiet:t('ساکت','Quiet'),rain:t('باران','Rain'),forest:t('جنگل','Forest'),tone:t('Focus Tone','Focus Tone')};label.textContent=names[cfg.mode]||names.quiet}
}
function markup(){
 const cfg=read();
 return `<section id="focus-ambience" class="focus-ambience surface" data-elara-i18n="off" data-mode="${cfg.mode}">
  <div class="focus-garden" aria-hidden="true">
   <span class="focus-sun"></span><span class="focus-cloud c1"></span><span class="focus-cloud c2"></span>
   <span class="focus-tree"><i class="trunk"></i><i class="crown crown-a"></i><i class="crown crown-b"></i><i class="crown crown-c"></i></span>
   <span class="focus-hill hill-a"></span><span class="focus-hill hill-b"></span>
   <span class="flower f1">✿</span><span class="flower f2">✿</span><span class="flower f3">✿</span><span class="flower f4">✿</span><span class="flower f5">✿</span>
   <span class="focus-butterfly">⌁</span>
  </div>
  <div class="focus-ambience-copy"><small>FOCUS AMBIENCE</small><h2>${t('فضای آرام پومودورو','Pomodoro ambience')}</h2><p>${t('برای تمرکز، یک صدای خیلی ملایم و منظرهٔ بهاری انتخاب کن.','Choose a gentle soundscape and a spring scene for focus.')}</p></div>
  <div class="focus-ambience-modes" role="group" aria-label="${t('انتخاب صدای محیطی','Choose ambience')}">
   <button type="button" data-ambience-mode="quiet">🤫 <span>${t('ساکت','Quiet')}</span></button>
   <button type="button" data-ambience-mode="rain">🌧️ <span>${t('باران','Rain')}</span></button>
   <button type="button" data-ambience-mode="forest">🌿 <span>${t('جنگل','Forest')}</span></button>
   <button type="button" data-ambience-mode="tone">🎧 <span>Focus Tone</span></button>
  </div>
  <div class="focus-ambience-controls">
   <button type="button" class="primary-button" data-ambience-play aria-pressed="false">${t('پخش صدا','Play sound')}</button>
   <label>${t('صدا','Volume')} <input data-ambience-volume type="range" min="0" max="100" step="1" value="${cfg.volume}"></label>
   <span>${t('اکنون:','Now:')} <strong data-ambience-now></strong></span>
  </div>
  <p class="focus-ambience-note">${t('صدا فقط بعد از لمس/کلیک شما فعال می‌شود و چیزی به سرور ارسال نمی‌شود.','Audio starts only after your click/tap and nothing is sent to a server.')}</p>
 </section>`
}
function focusOwner(){
 const focus=document.getElementById('panel-focus'),books=document.getElementById('panel-books'),dedicated=document.getElementById('panel-focus-ambience'),pomodoro=document.getElementById('panel-focus-pomodoro');
 const card=focus?.querySelector('.focus-card')||pomodoro?.querySelector('.focus-card')||books?.querySelector('.focus-card')||document.querySelector('#ref-library-focus .focus-card');
 const panel=dedicated||card?.closest('#panel-focus,#panel-books,#panel-focus-pomodoro')||focus||books;
 return{panel,card,dedicated}
}
function mount(){
 const {panel,card,dedicated}=focusOwner();if(!panel||!card)return false;
 let root=document.getElementById('focus-ambience');
 if(!root){const wrap=document.createElement('div');wrap.innerHTML=markup();root=wrap.firstElementChild;if(dedicated)dedicated.append(root);else{const history=panel.querySelector('.focus-history-card'),libraryFocus=card.closest('#ref-library-focus');if(libraryFocus)libraryFocus.insertAdjacentElement('afterend',root);else history?history.insertAdjacentElement('beforebegin',root):card.insertAdjacentElement('afterend',root)}}
 else if(dedicated&&root.parentElement!==dedicated)dedicated.append(root);
 else if(!dedicated&&root.parentElement!==panel&&!root.closest('#ref-library-focus')){const libraryFocus=card.closest('#ref-library-focus');libraryFocus?libraryFocus.insertAdjacentElement('afterend',root):card.insertAdjacentElement('afterend',root)}
 syncState();return true
}
document.addEventListener('click',e=>{
 const mode=e.target.closest('[data-ambience-mode]');if(mode){const cfg=write({mode:mode.dataset.ambienceMode});if(playing){void startAudio()}else syncState();return}
 const play=e.target.closest('[data-ambience-play]');if(play){if(playing)stopAudio();else void startAudio().catch(err=>{const note=document.querySelector('.focus-ambience-note');if(note)note.textContent=err.message});return}
});
document.addEventListener('input',e=>{if(!e.target.matches('[data-ambience-volume]'))return;write({volume:Number(e.target.value)});syncVolume();syncState()});
let mountTimer=0,observer=null;
function ensureMounted(delay=0){clearTimeout(mountTimer);mountTimer=setTimeout(()=>{if(!document.getElementById('focus-ambience'))mount();},delay)}
window.addEventListener('elara:locale-changed',()=>{document.getElementById('focus-ambience')?.remove();ensureMounted(0)});
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='focus')ensureMounted(40)});
window.addEventListener('hashchange',()=>{if(location.hash==='#focus')ensureMounted(40)});
window.addEventListener('elara:data-changed',()=>ensureMounted(25));
window.addEventListener('elara:state-committed',()=>ensureMounted(25));
window.addEventListener('elara:boot-watchdog',()=>ensureMounted(0));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&ctx?.state==='running')void ctx.suspend();else if(!document.hidden&&playing&&ctx?.state==='suspended')void ctx.resume()});
const start=()=>{if(!mount())ensureMounted(100);if(!observer&&document.documentElement){observer=new MutationObserver(()=>{const {panel,card}=focusOwner();if(panel&&card&&!document.getElementById('focus-ambience'))ensureMounted(0)});observer.observe(document.documentElement,{childList:true,subtree:true})}};
window.ElaraFocusAmbience={read,start:startAudio,stop:stopAudio,mount,get playing(){return playing}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
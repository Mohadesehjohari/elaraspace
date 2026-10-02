(()=>{'use strict';
const KEY='elara_space_v1',PREF='elara_focus_ambience_v1',$=s=>document.querySelector(s);
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
let ctx=null,nodes=[],pulseTimer=null,selected='spring',enabled=false;
function readState(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return{}}}
function readPref(){try{return {mode:'spring',enabled:false,...JSON.parse(localStorage.getItem(PREF)||'{}')}}catch{return{mode:'spring',enabled:false}}}
function savePref(){localStorage.setItem(PREF,JSON.stringify({mode:selected,enabled}))}
function stopAudio(){clearInterval(pulseTimer);pulseTimer=null;for(const n of nodes.splice(0)){try{n.stop?.()}catch{}try{n.disconnect?.()}catch{}}}
function ensureCtx(){if(ctx)return ctx;const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ctx=new A();return ctx}
function gain(value=.035){const c=ensureCtx(),g=c?.createGain();if(g)g.gain.value=value;return g}
function startNoise(kind){
 const c=ensureCtx();if(!c)return;const seconds=2,buf=c.createBuffer(1,c.sampleRate*seconds,c.sampleRate),data=buf.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(kind==='rain'?.55:.25);
 const src=c.createBufferSource();src.buffer=buf;src.loop=true;const filter=c.createBiquadFilter(),g=gain(kind==='rain'?.028:.022);
 filter.type=kind==='rain'?'highpass':'lowpass';filter.frequency.value=kind==='rain'?1600:520;src.connect(filter).connect(g).connect(c.destination);src.start();nodes.push(src,filter,g)
}
function chime(){
 const c=ensureCtx();if(!c||!enabled)return;const notes=[261.63,329.63,392,523.25],o=c.createOscillator(),g=c.createGain(),now=c.currentTime;
 o.type='sine';o.frequency.value=notes[Math.floor(Math.random()*notes.length)];g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.035,now+.05);g.gain.exponentialRampToValueAtTime(.0001,now+1.8);o.connect(g).connect(c.destination);o.start(now);o.stop(now+1.9);nodes.push(o,g);setTimeout(()=>{nodes=nodes.filter(x=>x!==o&&x!==g)},2100)
}
async function startAudio(){
 const c=ensureCtx();if(!c)return false;await c.resume().catch(()=>{});stopAudio();
 if(selected==='spring'){chime();pulseTimer=setInterval(chime,3600)}
 else if(selected==='rain')startNoise('rain');
 else if(selected==='night'){startNoise('night');pulseTimer=setInterval(chime,6500)}
 return true
}
function activeRunning(){return readState().activeFocus?.status==='running'}
async function syncAudio(fromGesture=false){
 if(!enabled||!activeRunning()){stopAudio();renderControls();return}
 if(ctx?.state==='running'){if(!nodes.length)await startAudio();renderControls();return}
 if(fromGesture){await startAudio();renderControls()}
}
function gardenStats(){const sessions=(readState().focusSessions||[]).filter(x=>x?.completed);return{count:sessions.length,minutes:sessions.reduce((n,x)=>n+Math.max(0,Number(x.durationMin)||0),0)}}
function gardenMarkup(){
 const {count,minutes}=gardenStats(),stage=Math.min(5,Math.floor(count/3)),flowers=Math.min(14,count);
 return '<div class="focus-garden-scene" data-stage="'+stage+'" role="img" aria-label="'+t('باغ تمرکز؛ '+count+' جلسه کامل','Focus garden; '+count+' completed sessions')+'"><div class="focus-sky"><i></i><i></i><i></i></div><div class="focus-tree"><span class="trunk"></span><span class="crown c1"></span><span class="crown c2"></span><span class="crown c3"></span></div><div class="focus-ground">'+Array.from({length:flowers},(_,i)=>'<span class="focus-flower f'+(i%5)+'" style="--i:'+i+'"><b></b></span>').join('')+'</div><div class="focus-garden-meta"><strong>'+count.toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+' '+t('جلسه','sessions')+'</strong><small>'+minutes.toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+' '+t('دقیقه تمرکز','focus minutes')+'</small></div></div>'
}
function ensure(){
 const card=document.querySelector('#panel-focus .focus-card');if(!card)return false;
 let host=card.querySelector('.focus-ambience');if(!host){host=document.createElement('section');host.className='focus-ambience';host.dataset.elaraI18n='off';card.append(host)}
 return true
}
function renderControls(){
 if(!ensure())return;const host=document.querySelector('#panel-focus .focus-ambience'),running=activeRunning();
 host.innerHTML='<div class="focus-ambience-head"><div><small>ELARA · FOCUS GARDEN</small><strong>'+t('فضای آرام تمرکز','Focus ambience')+'</strong><span>'+t('هر جلسهٔ کامل باغت را کمی بزرگ‌تر می‌کند.','Every completed session grows your garden a little.')+'</span></div><button type="button" data-focus-sound-toggle aria-pressed="'+enabled+'" title="'+t('روشن/خاموش کردن صدا','Toggle ambience audio')+'">'+(enabled?'🔊':'🔇')+'</button></div><div class="focus-ambience-modes">'+[['spring','🌸',t('بهار آرام','Soft spring')],['rain','🌧️',t('باران','Rain')],['night','🌙',t('شب آرام','Night')]].map(([id,icon,label])=>'<button type="button" data-focus-ambience-mode="'+id+'" aria-pressed="'+(selected===id)+'"><span>'+icon+'</span><b>'+label+'</b></button>').join('')+'</div>'+gardenMarkup()+'<p class="focus-audio-note">'+(enabled?(running?t('صدا همراه جلسهٔ فعلی پخش می‌شود.','Audio follows the active focus session.'):t('صدا آماده است؛ با شروع Focus پخش می‌شود.','Audio is ready and will play when Focus starts.')):t('صدا خاموش است؛ باغ همچنان با Sessionهای واقعی رشد می‌کند.','Audio is off; the garden still grows from real sessions.'))+'</p>'
}
async function toggleSound(){
 enabled=!enabled;savePref();if(enabled){ensureCtx();await syncAudio(true)}else{stopAudio();renderControls()}
}
async function choose(mode){if(!['spring','rain','night'].includes(mode))return;selected=mode;savePref();if(enabled&&activeRunning())await startAudio();renderControls()}
document.addEventListener('click',e=>{const toggle=e.target.closest('[data-focus-sound-toggle]');if(toggle){e.preventDefault();void toggleSound();return}const mode=e.target.closest('[data-focus-ambience-mode]');if(mode){e.preventDefault();void choose(mode.dataset.focusAmbienceMode)}});
window.addEventListener('elara:data-changed',()=>{renderControls();void syncAudio(false)});
window.addEventListener('elara:hydrate',()=>setTimeout(()=>{renderControls();void syncAudio(false)},60));
window.addEventListener('elara:locale-changed',renderControls);
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='focus')setTimeout(renderControls,80)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ctx?.state==='running')ctx.suspend().catch(()=>{});else if(!document.hidden&&enabled&&activeRunning()&&ctx)ctx.resume().catch(()=>{})});
const p=readPref();selected=['spring','rain','night'].includes(p.mode)?p.mode:'spring';enabled=!!p.enabled;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderControls,160),{once:true});else setTimeout(renderControls,80);
window.ElaraFocusAmbience={render:renderControls,toggle:toggleSound,choose,stats:gardenStats,get state(){return{selected,enabled,running:activeRunning()}}};
})();
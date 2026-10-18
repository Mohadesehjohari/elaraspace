/* ELARA FOX PRIZE EXPERIENCE. XP belongs exclusively to canonical modules. */
(()=>{'use strict';
const STORE='elara_fox_prize_v1',PREF='elara_fox_prize_settings_v1';
const $=s=>document.querySelector(s);
const en=()=>document.documentElement.lang==='en';
const t=(fa,eng)=>en()?eng:fa;
const fmt=n=>Number(n||0).toLocaleString(en()?'en-US':'fa-IR');
const who=()=>String(window.ElaraAccount?.user?.uid||'local');
function storeKey(){return STORE+':'+who()}
function empty(){return {pending:[],claimed:[],claimedKeys:[],totalStars:0}}
function read(){
 try{const d=JSON.parse(localStorage.getItem(storeKey())||'{}');
 return {...empty(),...d,pending:Array.isArray(d.pending)?d.pending:[],
 claimed:Array.isArray(d.claimed)?d.claimed:[],claimedKeys:Array.isArray(d.claimedKeys)?d.claimedKeys:[]}}catch{return empty()}
}
function persist(d){try{localStorage.setItem(storeKey(),JSON.stringify(d));return true}catch{return false}}
function prefs(){try{const d=JSON.parse(localStorage.getItem(PREF)||'{}');return {sound:d.sound===true,motion:d.motion!==false}}catch{return {sound:false,motion:true}}}
function savePrefs(d){try{localStorage.setItem(PREF,JSON.stringify(d))}catch{}}
function el(tag,cls,txt){const v=document.createElement(tag);if(cls)v.className=cls;if(txt!==undefined)v.textContent=String(txt);return v}
const isDemo=d=>String(d.key||'').startsWith('preview:')||d.preview===true;
function recordFor(data){
 const stars=Math.max(1,Math.min(8,Math.trunc(Number(data.stars)||1)));
 return {key:String(data.key||'').slice(0,240),kind:String(data.kind||'default'),
  image:String(data.image||'celebrate'),title:String(data.title||'').slice(0,180),
  description:String(data.description||'').slice(0,720),
  kicker:String(data.kicker||'').slice(0,130),
  tags:Array.isArray(data.tags)?data.tags.slice(0,8).map(String):[],
  rewardXp:Math.max(0,Number(data.rewardXp)||0),stars,
  primary:String(data.primary||''),secondary:String(data.secondary||''),go:String(data.go||''),created:Date.now()};
}
function wasClaimed(key){return !!key&&read().claimedKeys.includes(String(key))}
function ensure(data){
 if(isDemo(data))return true;
 const rec=recordFor(data),d=read();
 if(!rec.key||d.claimedKeys.includes(rec.key))return false;
 if(d.pending.some(x=>x.key===rec.key))return true;
 d.pending.unshift(rec);d.pending=d.pending.slice(0,120);return persist(d)
}
function claim(key){
 const d=read(),idx=d.pending.findIndex(x=>x.key===key);
 if(idx<0||d.claimedKeys.includes(key))return false;
 const rec=d.pending[idx];
 d.pending.splice(idx,1);
 d.claimed.unshift({...rec,collectedAt:Date.now()});d.claimed=d.claimed.slice(0,180);
 d.totalStars=Math.max(0,Number(d.totalStars)||0)+(rec.stars||1);
 d.claimedKeys.push(key);d.claimedKeys=d.claimedKeys.slice(-3000);
 return persist(d)
}
function chime(kind){
 if(!prefs().sound)return;
 const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 try{const c=new C(),notes=kind==='level'?[523.25,659.25,783.99,1046.5]:[659.25,830.61,987.77];
  notes.forEach((hz,i)=>{const at=c.currentTime+i*.095,o=c.createOscillator(),g=c.createGain();
   o.type='sine';o.frequency.setValueAtTime(hz,at);
   g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.045,at+.022);
   g.gain.exponentialRampToValueAtTime(.0001,at+.24);o.connect(g);g.connect(c.destination);
   o.start(at);o.stop(at+.26)
  });
  setTimeout(()=>{try{const p=c.close?.();p?.catch?.(()=>{})}catch{}},1000)
 }catch{}
}
function present({shade,dialog,data,primary,secondary,img}){
 if(!shade||!dialog||!primary||!data)return;
 const demo=isDemo(data),eligible=demo||ensure(data);
 if(!eligible)return;
 if(!prefs().motion)shade.dataset.foxMotion='off';
 dialog.dataset.foxPhase='ready';
 const stage=el('div','elara-fox-prize-stage');
 img?.parentNode?.insertBefore(stage,img);if(img)stage.append(img);
 const halo=el('span','elara-fox-prize-halo');halo.setAttribute('aria-hidden','true');stage.prepend(halo);
 const chest=el('div','elara-fox-treasure');chest.setAttribute('aria-hidden','true');
 for(const [cls,content] of [['elara-fox-treasure-back',''],['elara-fox-treasure-glow',''],['elara-fox-treasure-star','✦'],['elara-fox-treasure-lid',''],['elara-fox-treasure-box',''],['elara-fox-treasure-lock','✦']])
  chest.append(el('span',cls,content));
 stage.append(chest);
 const victory=el('span','elara-fox-victory-mark','✓');victory.setAttribute('aria-hidden','true');stage.append(victory);
 for(let i=0;i<12;i++){const spark=el('i','elara-fox-prize-spark');spark.style.setProperty('--i',i);spark.style.setProperty('--spark-angle',i*30+'deg');spark.style.setProperty('--spark-x',Math.round(Math.cos(i*Math.PI/6)*140)+'px');spark.style.setProperty('--spark-y',Math.round(Math.sin(i*Math.PI/6)*95-30)+'px');spark.setAttribute('aria-hidden','true');stage.append(spark)}
 const progress=el('div','elara-fox-claim-progress');progress.setAttribute('aria-hidden','true');
 const firstStep=el('span','elara-fox-claim-step is-current',t('✧ پاداش باز شد','✧ Unlocked'));
 const stepLine=el('span','elara-fox-claim-connector','');
 const secondStep=el('span','elara-fox-claim-step',t('✓ دریافت شد','✓ Collected'));
 progress.append(firstStep,stepLine,secondStep);stage.before(progress);
 const reward=el('section','elara-fox-prize-card');reward.setAttribute('aria-label',t('جایزهٔ دستاورد','Achievement reward'));
 const sigil=el('span','elara-fox-prize-sigil','✦');sigil.setAttribute('aria-hidden','true');
 const info=el('div','elara-fox-prize-info');
 const label=el('span','elara-fox-prize-overline',t('جایزه آمادهٔ دریافت است','REWARD UNLOCKED'));
 const stars=Math.max(1,Math.min(8,Math.trunc(Number(data.stars)||1)));
 const amount=el('strong','elara-fox-prize-stars','+'+fmt(stars)+' '+t('ستارهٔ یادگاری','keepsake star'+(stars>1?'s':'')));
 info.append(label,amount);
 if(Number(data.rewardXp)>0){const xp=el('span','elara-fox-prize-xp','+'+fmt(data.rewardXp)+' XP');
 info.append(xp);info.append(el('small','',t('XP از قبل به امتیازت اضافه شده','XP already credited to your account')))}
 else info.append(el('small','',t('این ستاره به گنجینه‌ات اضافه می‌شه','This star will join your keepsake vault')));
 reward.append(sigil,info);
 dialog.querySelector('.elara-fox-actions')?.before(reward);
 const status=el('p','elara-fox-prize-status',demo?t('پیش‌نمایش: هیچ جایزه‌ای ثبت نمی‌شه','Preview: nothing will be saved'):t('برای ثبت ستاره، جایزه رو دریافت کن','Collect to save your star'));
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');reward.after(status);
 primary.textContent=demo?t('آزمایش دریافت جایزه','Try collecting'):t('دریافت جایزه','Collect reward');
 if(secondary)secondary.textContent=t('بعداً','Later');
 let collected=false;
 primary.addEventListener('click',event=>{
  if(collected)return; // The existing handler handles Continue/route on the second click.
  event.preventDefault();event.stopImmediatePropagation();
  if(!demo&&!claim(String(data.key||''))){status.textContent=t('ثبت نشد؛ دوباره تلاش کن','Could not save; please retry');return}
  collected=true;
  dialog.classList.add('is-fox-prize-collected');
  dialog.dataset.foxPhase='collected';
  firstStep.classList.remove('is-current');firstStep.classList.add('is-complete');
  secondStep.classList.add('is-current');
  // The fox changes expression only AFTER the confirmed cosmetic claim.
  if(img){img.src=window.ElaraFoxRewards?.asset?.('celebrate')||'assets/ui/fox-celebrate.webp'}
  const title=dialog.querySelector('#elara-fox-title');
  const desc=dialog.querySelector('#elara-fox-desc');
  if(title)title.textContent=t('جایزه‌ات رو گرفتی!','Your reward is yours!');
  if(desc)desc.textContent=demo
   ?t('این فقط یک جشن آزمایشی بود ✨','That was only a preview ✨')
   :t('درخشیدی! ستارهٔ جدیدت برای «'+String(data.title||'موفقیتت')+'» توی گنجینه ذخیره شد.',
      'Amazing! Your star for “'+String(data.title||'your milestone')+'” is safely in the vault.');
  label.textContent=t('به گنجینه اضافه شد','ADDED TO YOUR VAULT');
  amount.textContent=fmt(stars)+t(' ستارهٔ درخشان',' shining star'+(stars===1?'':'s'));
  sigil.textContent='✓';
  status.textContent=demo?t('پیش‌نمایش انجام شد؛ امتیازی تغییر نکرد','Preview complete; no progress changed'):t('ستاره به گنجینه‌ات اضافه شد!','Star added to your vault!');
  primary.textContent=data.primary||t('ادامهٔ مسیر','Continue');
  if(secondary)secondary.textContent=t('بستن','Close');
  chime(data.kind);window.ElaraFoxRewards?.refresh?.();
 },true);
}
function settings(card){
 if(!card)return;
 const old=card.querySelector('#elara-fox-prize-vault');old?.remove();
 const d=read(),p=prefs(),box=el('section','elara-fox-vault');box.id='elara-fox-prize-vault';
 box.append(el('h3','',t('گنجینهٔ ستاره‌های من','My keepsake vault')));
 box.append(el('p','muted',t(fmt(d.totalStars)+' ستارهٔ جمع‌شده · '+fmt(d.pending.length)+' جایزهٔ منتظر','Collected '+fmt(d.totalStars)+' stars · '+fmt(d.pending.length)+' waiting rewards')));
 for(const [key,fa,eng,value] of [['sound','صدای جادویی دریافت جایزه','Reward sound effects',p.sound],['motion','انیمیشن‌های تشویقی','Celebration animations',p.motion]]){
  const label=el('label','elara-fox-settings-toggle'),span=el('span','',t(fa,eng)),input=el('input');
  input.type='checkbox';input.checked=value;input.dataset.foxPrizeSetting=key;label.append(span,input);box.append(label)
 }
 if(d.pending.length){
  const list=el('div','elara-fox-pending-list');
  for(const r of d.pending.slice(0,15)){
   const button=el('button','elara-fox-pending-item');button.type='button';button.dataset.foxClaimPending=r.key;
   button.disabled=window.ElaraFoxRewards?.options?.visible===false||window.ElaraFoxRewards?.options?.celebrations===false;
   button.append(el('span','',r.title),el('strong','',t('دریافت ✦','Collect ✦')));list.append(button)
  }
  box.append(list)
 }else box.append(el('p','muted',t('هیچ جایزهٔ منتظری نداری؛ به مسیرت ادامه بده!','No pending rewards — keep going!')));
 card.append(box)
}
document.addEventListener('change',event=>{
 const input=event.target.closest?.('[data-fox-prize-setting]');if(!input)return;
 const p=prefs();p[input.dataset.foxPrizeSetting]=!!input.checked;savePrefs(p)
});
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-fox-claim-pending]');if(!button)return;
 const data=read().pending.find(x=>x.key===button.dataset.foxClaimPending);
 if(data)window.ElaraFoxRewards?.openPending?.(data)
});
window.ElaraFoxClaim=Object.freeze({present,settings,wasClaimed,read,prefs});
})();
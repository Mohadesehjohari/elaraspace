/* ELARA FOX — visual-only companion and rewards. Canonical modules own all data and XP. */
(()=>{'use strict';
const ROOT='assets/ui/',FALLBACK='assets/mascot/fox-fallback.svg',KEY='elara_fox_options_v1';
const ART=Object.freeze({celebrate:'fox-celebrate.webp',mission:'fox-mission.webp',language:'fox-language.webp',library:'fox-library.webp',sport:'fox-sport.webp',focus:'fox-focus.webp',habits:'fox-habits.webp',goals:'fox-goals.webp',tasks:'fox-tasks.webp',progress:'fox-progress.webp',thoughtful:'fox-thoughtful.webp',sleep:'fox-sleep.webp',surprised:'fox-surprised.webp',loved:'fox-loved.webp',sad:'fox-sad.webp'});
const $=s=>document.querySelector(s),en=()=>document.documentElement.lang==='en',t=(fa,eng)=>en()?eng:fa,fmt=n=>Number(n||0).toLocaleString(en()?'en-US':'fa-IR');
const options=()=>{try{const o=JSON.parse(localStorage.getItem(KEY)||'{}');return {visible:o.visible!==false,celebrations:o.celebrations!==false}}catch{return {visible:true,celebrations:true}}};
let queue=[],active=null,restoreFocus=null,account='',xpBaseline=null,lastWord='',syncQueued=false;
const seen=new Set();
function person(){return String(window.ElaraAccount?.user?.uid||'local')}
function xp(){try{return Math.max(0,Number(JSON.parse(localStorage.getItem('elara_space_v1')||'{}').xp)||0)}catch{return 0}}
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e}
function art(el,name){el.src=ROOT+(ART[name]||ART.celebrate);el.onerror=()=>{el.onerror=null;el.src=FALLBACK};el.alt='';el.loading='lazy';el.decoding='async'}
function initial(){account=person();xpBaseline=xp();queue=[];lastWord='';seen.clear()}
function allow(kind='major'){const o=options();return o.visible&&(kind==='companion'||o.celebrations)}
function dismiss(clearQueue=false){
 if(clearQueue)queue=[];
 if(!active)return;
 const old=active;active=null;old.remove();
 document.body.classList.remove('elara-fox-modal-open');
 if(restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});
 restoreFocus=null;
 if(queue.length){const next=queue.shift();open(next)}
}
function open(data){
 if(!allow()||document.documentElement.hasAttribute('data-elara-booting'))return false;
 if(active){if(queue.length<3&&!queue.some(x=>x.key===data.key))queue.push(data);return true}
 if(!document.body)return false;
 restoreFocus=document.activeElement;
 const shade=node('div','elara-fox-overlay');shade.dataset.elaraRewardModal='1';
 const dialog=node('section','elara-fox-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','elara-fox-title');dialog.setAttribute('aria-describedby','elara-fox-desc');
 const close=node('button','elara-fox-close','×');close.type='button';close.setAttribute('aria-label',t('بستن','Close'));close.addEventListener('click',()=>dismiss());dialog.append(close);
 const img=node('img','elara-fox-image');art(img,data.image||'celebrate');img.width=194;img.height=194;dialog.append(img);
 dialog.append(node('div','elara-fox-eyebrow',data.kicker||'ELARA · YOUR PERSONAL COSMOS'));
 const h=node('h2','',data.title);h.id='elara-fox-title';dialog.append(h);
 const desc=node('p','',data.description);desc.id='elara-fox-desc';dialog.append(desc);
 if(data.tags?.length){const pills=node('div','elara-fox-meta');for(const label of data.tags.filter(Boolean))pills.append(node('span','',label));dialog.append(pills)}
 const actions=node('div','elara-fox-actions'),secondary=node('button','elara-fox-action',data.secondary||t('بستن','Close'));
 secondary.type='button';secondary.addEventListener('click',()=>dismiss());
 const primary=node('button','elara-fox-action primary',data.primary||t('ادامه','Continue'));primary.type='button';
 primary.addEventListener('click',()=>{dismiss();if(data.go==='leitner')document.querySelector('#l3-review-scene [data-l3-exit]')?.click();else if(data.go&&typeof window.ElaraOpen==='function')window.ElaraOpen(data.go,{history:'push'})});
 actions.append(secondary,primary);dialog.append(actions);shade.append(dialog);document.body.append(shade);active=shade;
 document.body.classList.add('elara-fox-modal-open');primary.focus({preventScroll:true});
 shade.addEventListener('click',e=>{if(e.target===shade)dismiss()});
 return true;
}
function reward(key,config){
 if(!allow()||seen.has(key))return false;
 seen.add(key);
 return open({key,...config});
}
function onWord(event){
 const d=event.detail||{};
 if(!d.wasDue||Number(d.dueBefore)<=0||Number(d.dueRemaining)!==0)return;
 const key=person()+':'+String(d.wordId||'');if(lastWord===key)return;lastWord=key;
 reward('leitner:'+key,{image:'celebrate',kicker:t('لایتنر · پایان مرور','LEITNER · SESSION COMPLETE'),
  title:t('مرور امروز تموم شد!','Today’s review is complete!'),
  description:t('همهٔ واژه‌های موعددار رو مرور کردی. قدم‌به‌قدم یادگیری ماندگار می‌شه.','You reviewed all due words. Your learning grows one step at a time.'),
  tags:[t('واژهٔ باقی‌مانده: ','Words left: ')+fmt(0),...(d.xpAwarded>0?[t('پاداش آخرین واژه: ','Last word reward: ')+'+'+fmt(d.xpAwarded)+' XP']:[])],
  primary:t('بازگشت به لایتنر','Back to Leitner'),secondary:t('همین‌جا بمون','Stay here'),go:'leitner'});
}
function onXp(){
 const me=person(),value=xp();
 if(me!==account){dismiss(true);initial();return}
 if(xpBaseline===null){xpBaseline=value;return}
 const before=xpBaseline;xpBaseline=value;if(value<=before)return;
 const levels=window.ElaraLevels;if(typeof levels?.level!=='function')return;
 const oldLevel=levels.level(before),newLevel=levels.level(value);if(newLevel<=oldLevel)return;
 reward('level:'+me+':'+newLevel,{image:'surprised',kicker:t('ارتقای سطح','LEVEL UP'),
  title:t('سطح '+fmt(newLevel)+' مبارک!','Welcome to level '+fmt(newLevel)+'!'),
  description:t('این نتیجهٔ تلاش واقعی خودته. روباه الارا بهت افتخار می‌کنه!','This is the result of real progress. Your fox companion is cheering for you!'),
  tags:[levels.titleForLevel?.(newLevel)||'',...(newLevel>oldLevel+1?[t('+'+fmt(newLevel-oldLevel)+' سطح','+'+fmt(newLevel-oldLevel)+' levels')]:[])],
  primary:t('ادامهٔ مسیر','Keep going'),secondary:t('باشه','Got it')});
}
function onMilestone(event){
 const d=event.detail||{},type=String(d.type||''),key=String(d.dedupeKey||'');
 if(!key)return;
 const base={description:String(d.message||''),primary:t('ادامه بده','Keep going')};
 if(type==='book')return reward('domain:'+key,{...base,image:'library',kicker:t('کتابخانه','LIBRARY'),title:t('یه کتاب دیگه تموم شد!','Book completed!')});
 if(type==='goal')return reward('domain:'+key,{...base,image:'goals',kicker:t('اهداف','GOALS'),title:t('به هدفت رسیدی!','Goal achieved!')});
 if(type==='habit')return reward('domain:'+key,{...base,image:'habits',kicker:t('تداوم','STREAK'),title:t('استریکت رشد کرد!','Your streak grew!')});
 if(type==='system'&&key.startsWith('workout:')){
  if(!key.endsWith(':20'))return;
  return reward('domain:'+key,{...base,image:'sport',kicker:t('ورزش','WELLNESS'),title:t('۲۰ دقیقه فعالیت!','20 minutes of activity!')});
 }
}
function onFocus(event){
 const d=event.detail||{};if(!d.sessionId||!Number.isFinite(Number(d.minutes)))return;
 reward('focus:'+person()+':'+d.sessionId,{image:'focus',kicker:t('تمرکز','FOCUS'),
  title:t('جلسهٔ تمرکز کامل شد!','Focus session complete!'),
  description:t('برای خودت وقت گذاشتی. حالا یه استراحت کوتاه هم حقته.','You showed up for yourself. Enjoy a well-earned break.'),
  tags:[fmt(d.minutes)+t(' دقیقه تمرکز',' minutes focused'),...(d.xpAwarded>0?['+'+fmt(d.xpAwarded)+' XP']:[])],
  primary:t('عالیه','Nice!'),secondary:t('بستن','Close')});
}
function onKeys(event){
 if(!active)return;
 if(event.key==='Escape'){event.stopPropagation();event.preventDefault();dismiss();return}
 if(event.key!=='Tab')return;
 const buttons=[...active.querySelectorAll('button:not([disabled])')];
 if(!buttons.length)return;const first=buttons[0],last=buttons[buttons.length-1];
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
}
/* Product rule: no persistent fox in hero, header, pages or mission level card.
   The mascot is reserved for actual progress feedback and optional preview. */
function settings(){
 const root=$('#panel-settings');if(!root)return;
 let card=root.querySelector('#elara-fox-settings');
 if(!card){
  card=node('section','surface settings-card elara-fox-settings');card.id='elara-fox-settings';card.setAttribute('aria-label',t('تشویق‌های الارا','Elara celebrations'));
  root.append(card);
 }
 const o=options();
 card.replaceChildren();
 const head=node('div','elara-fox-settings-head'),img=node('img','elara-fox-settings-image');art(img,'thoughtful');img.width=66;img.height=66;
 const heading=node('div');heading.append(node('h2','',t('تشویق‌های الارا','Elara celebrations')));heading.append(node('p','muted',t('روباه فقط هنگام دستاوردهای مهم ظاهر می‌شه. اینجا واکنش‌ها رو تنظیم کن.','Your fox appears only for real milestones. Customize its reactions here.')));
 head.append(img,heading);card.append(head);
 for(const [name,fa,eng,value] of [['visible','فعال‌بودن واکنش‌های روباه','Enable fox reactions',o.visible],['celebrations','نمایش پاپ‌آپ‌های تبریک','Show celebration popups',o.celebrations]]){
  const label=node('label','elara-fox-settings-toggle'),span=node('span','',t(fa,eng)),input=node('input');input.type='checkbox';input.checked=value;input.dataset.foxSetting=name;
  label.append(span,input);card.append(label);
 }
 const preview=node('button','quiet-button elara-fox-preview',t('پیش‌نمایش تبریک','Preview celebration'));preview.type='button';preview.dataset.foxPreview='1';preview.disabled=!o.visible||!o.celebrations;card.append(preview);
}
function sync(){if(syncQueued)return;syncQueued=true;requestAnimationFrame(()=>{syncQueued=false;settings()})}
function setOption(field,value){
 const o=options();o[field]=!!value;try{localStorage.setItem(KEY,JSON.stringify(o))}catch{}
 if(!o.visible||!o.celebrations){dismiss(true);window.ElaraMissionCelebration?.close?.()}
 sync();
}
function preview(){
 reward('preview:'+Date.now(),{image:'celebrate',kicker:'ELARA SPACE',title:t('آفرین!','Well done!'),description:t('این فقط پیش‌نمایش طراحی تبریکه و هیچ امتیازی اضافه نمی‌کنه.','This is a visual preview only. No XP is awarded.'),primary:t('متوجه شدم','Got it')});
}
document.addEventListener('change',e=>{const el=e.target.closest?.('#elara-fox-settings [data-fox-setting]');if(el)setOption(el.dataset.foxSetting,el.checked)});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-fox-preview]'))preview()});
document.addEventListener('keydown',onKeys,true);
window.addEventListener('elara:leitner-review-committed',onWord);
window.addEventListener('elara:domain-milestone',onMilestone);
window.addEventListener('elara:fox-focus-completed',onFocus);
window.addEventListener('elara:data-changed',onXp);
window.addEventListener('elara:state-committed',onXp);
window.addEventListener('elara:account-ready',()=>{dismiss(true);initial();sync()});
window.addEventListener('elara:hydrate',()=>{dismiss(true);initial();sync()});
window.addEventListener('elara:logout',()=>{dismiss(true);initial();sync()});
for(const evt of ['elara:open','elara:secondary-ready','elara:visual-ready','elara:locale-changed'])window.addEventListener(evt,()=>{sync();setTimeout(sync,100)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
initial();
window.ElaraFoxRewards=Object.freeze({show:reward,close:dismiss,refresh:sync,asset:name=>ROOT+(ART[name]||ART.celebrate),get active(){return !!active},get options(){return options()}});
})();

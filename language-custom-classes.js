/* Custom language classes: local/private canonical state now; sharing remains backend-gated. */
(()=>{'use strict';
const STORE='elara_space_v1',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'local',id=()=>crypto.randomUUID?.()||('class-'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
const fa=n=>Number(n||0).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR');
function read(){try{const s=JSON.parse(localStorage.getItem(STORE)||'{}');if(!Array.isArray(s.languageClasses))s.languageClasses=[];return s}catch{return{languageClasses:[]}}}
function write(s){localStorage.setItem(STORE,JSON.stringify(s));window.dispatchEvent(new CustomEvent('elara:state-committed',{detail:s}));window.dispatchEvent(new Event('elara:data-changed'));render()}
const total=c=>Math.max(1,Number(c.terms)||1)*Math.max(1,Number(c.sessionsPerTerm)||1);
const completed=c=>Math.min(total(c),Math.max(0,Array.isArray(c.sessionLogs)?c.sessionLogs.length:Number(c.completedSessions)||0));
const pct=c=>Math.round(completed(c)/total(c)*100);
const dayNames=()=>document.documentElement.lang==='en'?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function eta(c){
 const remain=Math.max(0,total(c)-completed(c));if(!remain)return {date:null,weeks:0,days:0};
 const days=(Array.isArray(c.weekdays)?c.weekdays:[]).map(Number).filter(x=>x>=0&&x<=6);if(!days.length)return {date:null,weeks:null,days:null};
 const cursor=new Date();cursor.setHours(12,0,0,0);let found=0,guard=0;
 while(found<remain&&guard<3650){if(days.includes(cursor.getDay()))found++;if(found<remain)cursor.setDate(cursor.getDate()+1);guard++}
 const diff=Math.max(0,Math.ceil((cursor-new Date(new Date().setHours(12,0,0,0)))/86400000));
 return {date:iso(cursor),days:diff,weeks:Math.max(1,Math.ceil(diff/7))};
}
function typeLabel(v){return v==='online'?tx('آنلاین','Online'):v==='linked'?tx('لینک‌شده','Linked'):tx('آفلاین','Offline')}
function scheduleLabel(c){const names=dayNames(),days=(c.weekdays||[]).map(x=>names[Number(x)]).filter(Boolean).join('، ');return (days||tx('روز مشخص نشده','No days'))+(c.studyTime?' · '+esc(c.studyTime):'')}
function hours(n){const h=(Number(n)||0)/60;return h<1?fa(Math.round(Number(n)||0))+' '+tx('دقیقه','min'):fa(Number(h.toFixed(1)))+' '+tx('ساعت','h')}
function card(c){
 const e=eta(c),done=completed(c),sum=total(c),percent=pct(c);
 return '<article class="language-class-card" data-language-class-id="'+esc(c.id)+'"><header><div><small>'+typeLabel(c.type)+'</small><h3 dir="auto">'+esc(c.title||tx('کلاس بدون نام','Untitled class'))+'</h3></div><span>'+fa(percent)+'٪</span></header><div class="language-class-progress"><i style="width:'+percent+'%"></i></div><div class="language-class-meta"><span>'+tx('ترم','Terms')+': '+fa(c.terms)+'</span><span>'+tx('جلسه','Sessions')+': '+fa(done)+' / '+fa(sum)+'</span><span>'+tx('هر جلسه','Per session')+': '+hours(c.durationMin)+'</span><span>'+scheduleLabel(c)+'</span></div><p class="language-class-eta">'+(percent>=100?tx('✓ این کلاس تمام شده','✓ Class completed'):e.date?tx('با این ریتم، پایان تقریبی: ','Estimated finish at this pace: ')+esc(e.date)+' · '+fa(e.weeks)+' '+tx('هفته','weeks'):tx('برای محاسبه ETA حداقل یک روز هفته انتخاب کن.','Choose at least one weekday to calculate ETA.'))+'</p>'+(c.linkUrl?'<a class="language-class-link" href="'+esc(c.linkUrl)+'" target="_blank" rel="noopener">'+tx('باز کردن لینک کلاس','Open class link')+'</a>':'')+'<footer><button type="button" class="primary-button" data-class-session="'+esc(c.id)+'" '+(done>=sum?'disabled':'')+'>'+tx('ثبت جلسه بعدی','Complete next session')+'</button><button type="button" class="quiet-button" data-class-report="'+esc(c.id)+'">'+tx('گزارش','Report')+'</button><button type="button" class="quiet-button" data-class-edit="'+esc(c.id)+'">'+tx('ویرایش','Edit')+'</button><button type="button" class="quiet-button danger" data-class-delete="'+esc(c.id)+'">'+tx('حذف','Delete')+'</button></footer></article>';
}
function editorMarkup(c={}){
 const selected=new Set((c.weekdays||[]).map(Number)),names=dayNames();
 return '<form class="language-class-editor" data-language-class-form><input type="hidden" name="id" value="'+esc(c.id||'')+'"><label>'+tx('اسم کلاس','Class name')+'<input name="title" maxlength="120" required value="'+esc(c.title||'')+'" placeholder="'+tx('مثلاً English C1','e.g. English C1')+'"></label><div class="language-class-form-grid"><label>'+tx('نوع کلاس','Class type')+'<select name="type"><option value="offline" '+(c.type==='offline'||!c.type?'selected':'')+'>'+tx('آفلاین','Offline')+'</option><option value="online" '+(c.type==='online'?'selected':'')+'>'+tx('آنلاین','Online')+'</option><option value="linked" '+(c.type==='linked'?'selected':'')+'>'+tx('لینک‌شده','Linked')+'</option></select></label><label>'+tx('تعداد ترم','Terms')+'<input name="terms" type="number" min="1" max="40" value="'+esc(c.terms||1)+'" required></label><label>'+tx('جلسه در هر ترم','Sessions / term')+'<input name="sessionsPerTerm" type="number" min="1" max="100" value="'+esc(c.sessionsPerTerm||12)+'" required></label><label>'+tx('مدت هر جلسه (دقیقه)','Session duration (min)')+'<input name="durationMin" type="number" min="10" max="480" step="5" value="'+esc(c.durationMin||60)+'" required></label><label>'+tx('ساعت مطالعه','Study time')+'<input name="studyTime" type="time" value="'+esc(c.studyTime||'18:00')+'"></label></div><fieldset><legend>'+tx('روزهای کلاس/مطالعه','Class / study days')+'</legend><div class="language-class-days">'+names.map((name,i)=>'<label><input type="checkbox" name="weekday" value="'+i+'" '+(selected.has(i)?'checked':'')+'><span>'+name+'</span></label>').join('')+'</div></fieldset><label data-class-link-field>'+tx('لینک کلاس (اختیاری)','Class link (optional)')+'<input name="linkUrl" type="url" maxlength="1000" dir="ltr" value="'+esc(c.linkUrl||'')+'" placeholder="https://..."></label><div class="language-class-live-estimate" data-class-estimate></div></form>';
}
function payload(form,old){
 const days=[...form.querySelectorAll('[name=weekday]:checked')].map(x=>Number(x.value)).sort((a,b)=>a-b);
 return {id:form.elements.id.value||id(),ownerUid:uid(),title:String(form.elements.title.value||'').trim().slice(0,120),type:form.elements.type.value,terms:Math.max(1,Math.min(40,Math.round(Number(form.elements.terms.value)||1))),sessionsPerTerm:Math.max(1,Math.min(100,Math.round(Number(form.elements.sessionsPerTerm.value)||1))),durationMin:Math.max(10,Math.min(480,Math.round(Number(form.elements.durationMin.value)||60))),weekdays:days,studyTime:String(form.elements.studyTime.value||''),linkUrl:String(form.elements.linkUrl.value||'').trim().slice(0,1000),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now(),sessionLogs:Array.isArray(old?.sessionLogs)?old.sessionLogs:[]};
}
function estimateInto(form){
 const host=form.querySelector('[data-class-estimate]'),old={sessionLogs:[]},draft=payload(form,old),e=eta(draft);
 host.innerHTML='<strong>'+tx('پیش‌بینی','Estimate')+'</strong><span>'+fa(total(draft))+' '+tx('جلسه','sessions')+' · '+hours(total(draft)*draft.durationMin)+'</span><span>'+(e.date?tx('پایان تقریبی ','Estimated finish ')+esc(e.date):tx('روزهای هفته را انتخاب کن','Choose weekdays'))+'</span>';
 form.querySelector('[data-class-link-field]').hidden=form.elements.type.value==='offline';
}
async function openEditor(c){
 const wrap=document.createElement('div');wrap.innerHTML=editorMarkup(c);const form=wrap.querySelector('form');estimateInto(form);form.addEventListener('input',()=>estimateInto(form));form.addEventListener('change',()=>estimateInto(form));
 const ok=await window.ElaraDialog.open({title:c?tx('ویرایش کلاس','Edit class'):tx('کلاس سفارشی جدید','New custom class'),content:wrap,wide:true,actions:[{label:tx('انصراف','Cancel'),value:false},{label:tx('ذخیره کلاس','Save class'),value:true,kind:'primary'}]});if(ok!==true)return;
 const s=read(),old=form.elements.id.value?s.languageClasses.find(x=>x.id===form.elements.id.value):null,next=payload(form,old);if(!next.title){return window.ElaraDialog.alert(tx('اسم کلاس را وارد کن.','Enter a class name.'))}if(!next.weekdays.length){return window.ElaraDialog.alert(tx('حداقل یک روز هفته انتخاب کن.','Choose at least one weekday.'))}
 if(old)Object.assign(old,next);else s.languageClasses.push(next);write(s);
}
async function report(c){
 const sum=total(c),done=completed(c),mins=done*Number(c.durationMin||0),remain=(sum-done)*Number(c.durationMin||0),e=eta(c),logs=(c.sessionLogs||[]).slice().sort((a,b)=>b.at-a.at);
 const box=document.createElement('section');box.className='language-class-report';box.dataset.elaraI18n='off';box.innerHTML='<div class="language-class-report-grid"><article><small>'+tx('پیشرفت','Progress')+'</small><strong>'+fa(pct(c))+'٪</strong></article><article><small>'+tx('جلسات','Sessions')+'</small><strong>'+fa(done)+' / '+fa(sum)+'</strong></article><article><small>'+tx('زمان انجام‌شده','Studied')+'</small><strong>'+hours(mins)+'</strong></article><article><small>'+tx('زمان باقی‌مانده','Remaining')+'</small><strong>'+hours(remain)+'</strong></article></div><div class="language-class-report-copy"><p><b>'+tx('برنامه: ','Schedule: ')+'</b>'+scheduleLabel(c)+'</p><p><b>'+tx('پایان تقریبی: ','Estimated finish: ')+'</b>'+(e.date?esc(e.date):'—')+'</p></div><div class="language-class-log"><h3>'+tx('جلسات ثبت‌شده','Session log')+'</h3>'+(logs.length?logs.map((x,i)=>'<div><span>'+tx('جلسه ','Session ')+fa(done-i)+'</span><time>'+esc(new Date(x.at).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR'))+'</time></div>').join(''):'<p class="muted">'+tx('هنوز جلسه‌ای ثبت نشده.','No sessions logged yet.')+'</p>')+'</div>';
 await window.ElaraDialog.open({title:esc(c.title),content:box,wide:true,actions:[{label:tx('بستن','Close'),value:false}]});
}
async function remove(c){
 const ok=await window.ElaraDialog.confirm(tx('این کلاس و گزارش جلساتش حذف شود؟','Delete this class and its session history?'),{title:tx('حذف کلاس','Delete class'),confirmText:tx('حذف','Delete'),danger:true});if(!ok)return;
 const s=read();s.languageClasses=s.languageClasses.filter(x=>x.id!==c.id);write(s);
}
function render(){
 const panel=document.getElementById('panel-language-courses');if(!panel)return;
 let host=panel.querySelector('[data-custom-classes]');if(!host){host=document.createElement('section');host.className='language-custom-classes';host.dataset.customClasses='';panel.append(host)}
 const rows=read().languageClasses.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 host.innerHTML='<section class="elara-card language-class-intro"><div><small>ELARA · CUSTOM CLASSES</small><h2>'+tx('کلاس‌های خودت را دقیق بساز','Build your classes your way')+'</h2><p>'+tx('آنلاین، آفلاین یا لینک‌شده؛ تعداد ترم و جلسه، مدت، روزها و ساعت را مشخص کن تا ETA واقعی محاسبه شود.','Online, offline or linked; set terms, sessions, duration, days and time for a real ETA.')+'</p></div><button type="button" class="primary-button" data-class-add>+ '+tx('کلاس جدید','New class')+'</button></section><div class="language-class-list">'+(rows.length?rows.map(card).join(''):'<section class="elara-card language-class-empty"><strong>'+tx('هنوز کلاس سفارشی نداری.','No custom classes yet.')+'</strong><p>'+tx('مثلاً یک کلاس ۳ ترمه با ۱۲ جلسه در هر ترم بساز و روزهای مطالعه را انتخاب کن.','Create a 3-term class with 12 sessions per term and choose your study days.')+'</p></section>')+'</div><section class="elara-card language-class-sharing-gate"><div><small>BACKEND GATE</small><h3>'+tx('همکلاسی، اشتراک‌گذاری و چالش دائمی','Classmates, sharing & persistent challenge')+'</h3><p>'+tx('این بخش به‌جای نمایش همکلاسی یا پیشرفت ساختگی قفل می‌ماند تا Rules چند UID، دعوت/Join و Privacy تست شوند.','This stays locked instead of showing fake classmates or progress until multi-UID rules, invite/join and privacy are tested.')+'</p></div><button type="button" disabled>'+tx('دعوت دوست — به‌زودی','Invite friend — soon')+'</button></section>';
}
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-class-add]');if(add){void openEditor(null);return}
 const find=id=>read().languageClasses.find(x=>x.id===id);
 const edit=e.target.closest('[data-class-edit]');if(edit){const c=find(edit.dataset.classEdit);if(c)void openEditor(c);return}
 const rep=e.target.closest('[data-class-report]');if(rep){const c=find(rep.dataset.classReport);if(c)void report(c);return}
 const del=e.target.closest('[data-class-delete]');if(del){const c=find(del.dataset.classDelete);if(c)void remove(c);return}
 const ses=e.target.closest('[data-class-session]');if(ses){const s=read(),c=s.languageClasses.find(x=>x.id===ses.dataset.classSession);if(!c||completed(c)>=total(c))return;c.sessionLogs=Array.isArray(c.sessionLogs)?c.sessionLogs:[];c.sessionLogs.push({id:id(),at:Date.now()});c.updatedAt=Date.now();write(s);window.ElaraNotify?.push?.({type:'language',title:tx('جلسه ثبت شد 📚','Session logged 📚'),message:c.title+' · '+fa(completed(c))+'/'+fa(total(c)),dedupeKey:'class-session:'+c.id+':'+completed(c)});return}
});
for(const ev of ['elara:open','elara:data-changed','elara:locale-changed','elara:hydrate','elara:account-ready'])window.addEventListener(ev,e=>{if(ev!=='elara:open'||e.detail?.tab==='language-courses'||e.detail?.tab==='language')setTimeout(render,0)});
const start=()=>render();document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
window.ElaraLanguageClasses={render,read:()=>read().languageClasses.slice(),eta,total,completed,openEditor};
})();

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
 const remain=Math.max(0,total(c)-completed(c));if(!remain)return {date:null,weeks:0,days:0,sessionsPerDay:0};
 const days=(Array.isArray(c.weekdays)?c.weekdays:[]).map(Number).filter(x=>x>=0&&x<=6);if(!days.length)return {date:null,weeks:null,days:null,sessionsPerDay:0};
 const duration=Math.max(10,Number(c.durationMin)||60),studyHours=Math.max(duration/60,Number(c.studyHoursPerDay)||duration/60),sessionsPerDay=Math.max(1,Math.floor(studyHours*60/duration));
 const cursor=new Date();cursor.setHours(12,0,0,0);let found=0,guard=0;
 while(found<remain&&guard<3650){if(days.includes(cursor.getDay()))found+=sessionsPerDay;if(found<remain)cursor.setDate(cursor.getDate()+1);guard++}
 const diff=Math.max(0,Math.ceil((cursor-new Date(new Date().setHours(12,0,0,0)))/86400000));
 return {date:iso(cursor),days:diff,weeks:Math.max(1,Math.ceil(diff/7)),sessionsPerDay};
}
function typeLabel(v){return v==='online'?tx('آنلاین','Online'):v==='linked'?tx('لینک‌شده','Linked'):tx('آفلاین','Offline')}
function friendRows(){return Array.isArray(window.ElaraSocial?.friends)?window.ElaraSocial.friends:[]}
function friendOptions(selected=''){const rows=friendRows();return '<option value="">'+tx('یک دوست انتخاب کن','Choose a friend')+'</option>'+rows.map(p=>'<option value="'+esc(p.uid)+'" '+(p.uid===selected?'selected':'')+'>'+esc(p.name||p.username||tx('دوست','Friend'))+(p.username?' · @'+esc(p.username):'')+'</option>').join('')}
function syncShareField(form){const on=!!form.elements.shareEnabled?.checked,field=form.closest('.elara-dialog-panel')?.querySelector('[data-class-friend-field]')||form.querySelector('[data-class-friend-field]');if(field)field.hidden=!on}

function scheduleLabel(c){const names=dayNames(),days=(c.weekdays||[]).map(x=>names[Number(x)]).filter(Boolean).join('، ');return (days||tx('روز مشخص نشده','No days'))+(c.studyTime?' · '+esc(c.studyTime):'')}
function hours(n){const h=(Number(n)||0)/60;return h<1?fa(Math.round(Number(n)||0))+' '+tx('دقیقه','min'):fa(Number(h.toFixed(1)))+' '+tx('ساعت','h')}
function card(c){
 const done=completed(c),sum=total(c),percent=pct(c),shared=!!c.collabSpaceId,owner=!shared||c.collabRole!=='member';
 const safeId=esc(c.id),next=nextSession(c),schedule=scheduleLabel(c);
 const cover='assets/ui/24-language-classes-icon.webp';
 const progress='<div class="lc2-ring" role="progressbar" aria-label="'+tx('پیشرفت کلاس','Class progress')+'" aria-valuenow="'+percent+'" aria-valuemin="0" aria-valuemax="100" style="--lc2-progress:'+percent+'%"><div><strong>'+fa(percent)+'٪</strong></div></div>';
 const meta='<div class="lc2-meta"><span>⌗ '+tx('ترم','Terms')+' '+fa(c.terms||1)+'</span><span>▤ '+fa(done)+' / '+fa(sum)+' '+tx('جلسه','sessions')+'</span><span>◷ '+tx('هر جلسه','Each session')+' '+hours(c.durationMin||60)+'</span><span>▦ '+esc(schedule)+'</span>'+(next?'<span class="lc2-next">▦ '+tx('جلسه بعدی: ','Next: ')+esc(next)+'</span>':'')+'</div>';
 const action=(attr,label,kind='',disabled=false)=>'<button type="button" class="'+kind+'" '+attr+'="'+safeId+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
 return '<article class="language-class-card lc2-class-card '+(shared?'is-shared':'is-personal')+'" data-language-class-id="'+safeId+'">'+
  '<div class="lc2-cover" aria-hidden="true"><img src="'+cover+'" alt="" loading="lazy" decoding="async"></div>'+
  '<div class="lc2-class-info"><div class="lc2-class-heading"><h3 dir="auto" data-elara-ugc>'+esc(c.title||tx('کلاس بدون نام','Untitled class'))+'</h3><span class="lc2-type '+esc(c.type||'offline')+'">'+typeLabel(c.type)+'</span></div>'+
  '<p class="lc2-description">'+tx('مسیر یادگیری شخصی با برنامه‌ریزی جلسات و ثبت پیشرفت واقعی.','Your class schedule and real logged learning progress.')+'</p>'+
  meta+'<p class="lc2-eta">'+(percent>=100?tx('✓ این کلاس به پایان رسیده است','✓ Course complete'):eta(c).date?tx('پایان تقریبی: ','Estimated finish: ')+esc(eta(c).date):tx('روزهای کلاس را برای برنامه‌ریزی مشخص کن.','Set class days to see a schedule.'))+'</p>'+
  (c.linkUrl&&/^https?:\/\//i.test(c.linkUrl)?'<a class="lc2-link" href="'+esc(c.linkUrl)+'" target="_blank" rel="noopener noreferrer">'+tx('باز کردن لینک کلاس ↗','Open class link ↗')+'</a>':'')+'</div>'+
  '<div class="lc2-class-progress">'+progress+'<small>'+tx('پیشرفت شما','Your progress')+'</small><span>'+fa(done)+' / '+fa(sum)+' '+tx(' جلسه',' sessions')+'</span>'+
  action('data-class-session',tx('ثبت جلسه بعدی','Log next session'),'lc2-session',done>=sum)+'</div>'+
  '<footer class="lc2-class-actions">'+
  action('data-class-edit',tx('ویرایش','Edit'))+
  action('data-class-report',tx('گزارش','Report'))+
  (shared&&owner?action('data-class-share-link',tx('لینک عضویت','Join link')):'')+
  (shared?action('data-class-classmates',tx('همکلاسی‌ها','Classmates')):'')+
  (!shared||owner?action('data-class-share',tx('دعوت همکلاسی','Invite classmate')):'')+
  (done>0?action('data-class-session-undo',tx('برگرداندن جلسه','Undo session')):'')+
  action('data-class-delete',tx('حذف','Delete'),'lc2-delete')+'</footer></article>';
}
function nextSession(c){
 const days=(Array.isArray(c.weekdays)?c.weekdays:[]).map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6);
 if(!days.length||completed(c)>=total(c))return '';
 const time=/^([01]\d|2[0-3]):[0-5]\d$/.test(String(c.studyTime||''))?c.studyTime:'';
 const now=new Date();
 for(let i=0;i<15;i++){
  const d=new Date(now);d.setHours(time?Number(time.slice(0,2)):12,time?Number(time.slice(3)):0,0,0);d.setDate(d.getDate()+i);
  if(days.includes(d.getDay())&&(!time||d>=now||i>0)){
   return d.toLocaleDateString(document.documentElement.lang==='en'?'en-US':'fa-IR',{weekday:'long',month:'long',day:'numeric'})+(time?' · '+time:'');
  }
 }
 return '';
}
function editorMarkup(c={}){
 const selected=new Set((c.weekdays||[]).map(Number)),names=dayNames(),shared=!!c.collabSpaceId,collabMember=shared&&c.collabRole==='member';
 const icons={
  book:'<path d="M12 7c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V6c-4-1-7-1-10 1zM12 7v14"/>',
  monitor:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>',
  layers:'<path d="m12 3-9 5 9 5 9-5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  calendar:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h3v3H8z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
  chart:'<path d="M4 20v-6M10 20V9M16 20V5M22 20V2"/>',
  link:'<path d="M9 15l6-6M7 11l-2 2a4 4 0 0 0 6 6l2-2M17 13l2-2a4 4 0 0 0-6-6l-2 2"/>',
  people:'<circle cx="9" cy="7" r="3"/><circle cx="18" cy="8" r="2"/><path d="M2 21v-3c0-3 3-5 7-5s7 2 7 5v3M17 14c3 0 5 2 5 5v2"/>'
 };
 const icon=n=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(icons[n]||icons.book)+'</svg>';
 const field=(name,label,graphic,control)=>'<label class="lf3-field lf3-field-'+name+'"><span class="lf3-field-heading">'+icon(graphic)+'<span>'+label+'</span></span>'+control+'</label>';
 const option=(v,label,defaultSelected=false)=>'<option value="'+v+'" '+((c.type===v||(!c.type&&defaultSelected))?'selected':'')+'>'+label+'</option>';
 const title=field('title',tx('اسم کلاس','Class name'),'book','<input name="title" maxlength="120" required dir="auto" value="'+esc(c.title||'')+'" placeholder="'+tx('مثلاً English C1','e.g. English C1')+'">');
 const type=field('type',tx('نوع کلاس','Class type'),'monitor','<select name="type">'+option('online',tx('آنلاین','Online'),true)+option('offline',tx('آفلاین','Offline'))+option('linked',tx('لینک‌شده','Linked'))+'</select>');
 const terms=field('terms',tx('تعداد ترم','Number of terms'),'layers','<input name="terms" type="number" min="1" max="40" step="1" value="'+esc(c.terms||1)+'" required>');
 const sessions=field('sessions',tx('جلسه در هر ترم','Sessions per term'),'calendar','<input name="sessionsPerTerm" type="number" min="1" max="100" step="1" value="'+esc(c.sessionsPerTerm||12)+'" required>');
 const duration=field('duration',tx('مدت هر جلسه (دقیقه)','Session length (minutes)'),'clock','<input name="durationMin" type="number" min="10" max="480" step="5" value="'+esc(c.durationMin||60)+'" required>');
 const hoursField=field('hours',tx('چند ساعت در هر روز مطالعه؟','Study hours per selected day'),'chart','<input name="studyHoursPerDay" type="number" min="0.25" max="16" step="0.25" value="'+esc(c.studyHoursPerDay||Math.max(1,(Number(c.durationMin)||60)/60))+'" required>');
 const time=field('time',tx('ساعت مطالعه','Study time'),'clock','<input name="studyTime" type="time" value="'+esc(c.studyTime||'18:00')+'">');
 const days='<fieldset class="lf3-days"><legend>'+icon('calendar')+tx('روزهای کلاس / مطالعه','Class / study days')+'</legend><p>'+tx('روزهایی که کلاس برگزار می‌شود یا مطالعه می‌کنید را انتخاب کنید.','Select the days you meet or study.')+'</p><div class="language-class-days">'+names.map((name,i)=>'<label><input type="checkbox" name="weekday" value="'+i+'" '+(selected.has(i)?'checked':'')+'><span>'+name+'</span></label>').join('')+'</div></fieldset>';
 const link='<label class="lf3-link" data-class-link-field><span class="lf3-field-heading">'+icon('link')+'<span>'+tx('لینک کلاس (اختیاری)','Class link (optional)')+'</span></span><input name="linkUrl" type="url" maxlength="1000" dir="auto" value="'+esc(c.linkUrl||'')+'" placeholder="'+tx('لینک جلسات آنلاین را وارد کنید (اختیاری)...','Online meeting link (optional)...')+'"></label>';
 const share=collabMember?'<div class="language-class-member-note"><strong>'+icon('people')+tx('عضو این کلاس مشترک هستی','You are a member of this shared class')+'</strong><p>'+tx('پیشرفت شما جدا ثبت می‌شود و دعوت اعضای جدید فقط برای سازنده است.','Your progress is separate. Only the owner can invite members.')+'</p></div>':
  '<label class="language-class-share-toggle lf3-share-toggle"><input type="checkbox" name="shareEnabled">'+icon('people')+'<strong>'+(shared?tx('دعوت یک دوست دیگر به این کلاس','Invite another friend to this class'):tx('این درس/کلاس را با یک دوست مشترک بگذارم','Share this class with a friend'))+'</strong></label>'+
  '<label data-class-friend-field hidden class="lf3-friend-choice">'+tx('انتخاب دوست','Choose a friend')+'<select name="friendUid">'+friendOptions()+'</select></label>'+
  '<p class="lf3-share-note">'+(shared?tx('پیشرفت هر عضو مستقل ثبت می‌شود.','Each member keeps individual progress.'):tx('دعوت فقط پس از پذیرفتن دوست فعال می‌شود.','Sharing only begins after your friend accepts.'))+'</p>';
 return '<form class="language-class-editor lf-class-editor lf3-class-editor" data-language-class-form dir="'+(document.documentElement.lang==='en'?'ltr':'rtl')+'">'+
  '<header class="lf-editor-hero lf3-hero"><div class="lf-editor-cover" aria-hidden="true"></div><div class="lf3-hero-copy"><small>ELARA</small><h2>'+tx(c.id?'ویرایش کلاس سفارشی':'کلاس سفارشی جدید',c.id?'Edit custom class':'New custom class')+'</h2><p>'+tx('کلاس رویایی خود را بسازید و مسیر یادگیری‌تان را شخصی‌سازی کنید.','Create your own class and personalize your learning journey.')+'</p></div></header>'+
  '<input type="hidden" name="id" value="'+esc(c.id||'')+'">'+
  '<section class="lf3-title-section">'+title+'</section>'+
  '<div class="language-class-form-grid lf3-field-grid">'+type+terms+sessions+duration+time+hoursField+'</div>'+
  days+'<section class="lf3-link-section">'+link+'</section>'+
  '<section class="language-class-share-field lf3-share-field">'+share+'</section>'+
  '<div class="language-class-live-estimate lf3-estimate" data-class-estimate aria-live="off"></div></form>';
}
function payload(form,old){
 const days=[...form.querySelectorAll('[name=weekday]:checked')].map(x=>Number(x.value)).sort((a,b)=>a-b);
 return {id:form.elements.id.value||id(),ownerUid:old?.ownerUid||uid(),title:String(form.elements.title.value||'').trim().slice(0,120),type:form.elements.type.value,terms:Math.max(1,Math.min(40,Math.round(Number(form.elements.terms.value)||1))),sessionsPerTerm:Math.max(1,Math.min(100,Math.round(Number(form.elements.sessionsPerTerm.value)||1))),durationMin:Math.max(10,Math.min(480,Math.round(Number(form.elements.durationMin.value)||60))),weekdays:days,studyTime:String(form.elements.studyTime.value||''),studyHoursPerDay:Math.max(.25,Math.min(16,Number(form.elements.studyHoursPerDay.value)||1)),linkUrl:String(form.elements.linkUrl.value||'').trim().slice(0,1000),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now(),sessionLogs:Array.isArray(old?.sessionLogs)?old.sessionLogs:[],...(old?.collabSpaceId?{collabSpaceId:old.collabSpaceId,collabRole:old.collabRole||'owner',collabOwnerUid:old.collabOwnerUid||old.ownerUid||uid(),shared:true}:{})};
}
function estimateInto(form){
 const host=form.querySelector('[data-class-estimate]'),old={sessionLogs:[]},draft=payload(form,old),e=eta(draft);
 host.innerHTML='<strong>'+tx('پیش‌بینی','Estimate')+'</strong><span>'+fa(total(draft))+' '+tx('جلسه','sessions')+' · '+hours(total(draft)*draft.durationMin)+'</span><span>'+tx('ظرفیت هر روز: ','Daily capacity: ')+fa(e.sessionsPerDay||0)+' '+tx('جلسه','sessions')+'</span><span>'+(e.date?tx('پایان تقریبی ','Estimated finish ')+esc(e.date)+' · '+fa(e.weeks)+' '+tx('هفته','weeks'):tx('روزهای هفته را انتخاب کن','Choose weekdays'))+'</span>';
 form.querySelector('[data-class-link-field]').hidden=false;syncShareField(form);
}
async function openEditor(c){
 const wrap=document.createElement('div');wrap.innerHTML=editorMarkup(c||{});const form=wrap.querySelector('form');estimateInto(form);form.addEventListener('input',()=>estimateInto(form));form.addEventListener('change',()=>estimateInto(form));
 form.elements.title?.setAttribute('autocomplete','off');
 // Validate in capture phase: dialog.js otherwise destroys the form before validation.
 const isNew=!c?.id;
 const dialog=window.ElaraDialog.open({title:isNew?tx('کلاس سفارشی جدید','New custom class'):tx('ویرایش کلاس','Edit class'),content:wrap,wide:true,actions:[{label:tx('انصراف','Cancel'),value:false},{label:tx('ذخیره کلاس','Save class'),value:true,kind:'primary'}]});
 const modal=form.closest('.elara-dialog-panel'),footer=modal?.querySelector('.elara-dialog-actions');
 // Keep the original ElaraDialog buttons and validation. Move only the real
 // share control into the visual footer, associating its inputs with this form.
 form.id='lf3-class-form-'+id();
 const shareField=form.querySelector('.lf3-share-field');
 if(footer&&shareField){
  shareField.querySelectorAll('input,select,textarea').forEach(control=>control.setAttribute('form',form.id));
  footer.prepend(shareField);
  shareField.addEventListener('input',()=>estimateInto(form));
  shareField.addEventListener('change',()=>estimateInto(form));
 }
 const saveButton=footer?.querySelector('.primary-button');
 const errorBox=document.createElement('p');errorBox.className='lf-editor-error';errorBox.setAttribute('role','alert');errorBox.hidden=true;form.append(errorBox);
 const onSave=event=>{
   errorBox.hidden=true;form.querySelectorAll('[aria-invalid="true"]').forEach(el=>el.removeAttribute('aria-invalid'));
   const firstInvalid=form.querySelector(':invalid'),title=form.elements.title,days=[...form.querySelectorAll('input[name="weekday"]:checked')];
   const friend=form.elements.friendUid,needsFriend=!!form.elements.shareEnabled?.checked;
   const message=firstInvalid?tx('مقدار فیلد مشخص‌شده معتبر نیست.','Correct the highlighted field.'):
    !String(title.value||'').trim()?tx('اسم کلاس را وارد کن.','Enter a class name.'):
    !days.length?tx('حداقل یک روز هفته انتخاب کن.','Choose at least one weekday.'):
    needsFriend&&!friend?.value?tx('برای اشتراک کلاس، یک دوست واقعی انتخاب کن.','Choose a real friend to share.'):null;
   if(!message)return;
   event.preventDefault();event.stopImmediatePropagation();
   const target=firstInvalid||(!String(title.value||'').trim()?title:!days.length?form.querySelector('input[name="weekday"]'):friend);
   errorBox.hidden=false;errorBox.textContent=message;target?.setAttribute('aria-invalid','true');target?.focus({preventScroll:false});
   if(firstInvalid)form.reportValidity();
 };
 saveButton?.addEventListener('click',onSave,{capture:true});
 const ok=await dialog;if(ok!==true)return;
 const s=read(),old=form.elements.id.value?s.languageClasses.find(x=>x.id===form.elements.id.value):null,next=payload(form,old);if(!next.title){return window.ElaraDialog.alert(tx('اسم کلاس را وارد کن.','Enter a class name.'))}if(!next.weekdays.length){return window.ElaraDialog.alert(tx('حداقل یک روز هفته انتخاب کن.','Choose at least one weekday.'))}
 if(old)Object.assign(old,next);else s.languageClasses.push(next);write(s);
 if(form.elements.shareEnabled?.checked&&form.elements.friendUid?.value){try{await window.ElaraCollab?.shareEntity?.('language-class',next,form.elements.friendUid.value);render()}catch(error){await window.ElaraDialog.alert(error?.message||String(error),{title:tx('کلاس ذخیره شد؛ دعوت ارسال نشد','Class saved; invite failed')})}}
}
async function report(c){
 const sum=total(c),done=completed(c),mins=done*Number(c.durationMin||0),remain=(sum-done)*Number(c.durationMin||0),e=eta(c),logs=(c.sessionLogs||[]).slice().sort((a,b)=>b.at-a.at);let classmates='';
 const needsClassmates=!!c.collabSpaceId;
 classmates=needsClassmates?'<section class="language-class-classmates" data-classmate-results aria-live="polite"><h3>'+tx('همکلاسی‌ها','Classmates')+'</h3><p class="muted">'+tx('در حال دریافت آمار اعضای مجاز…','Loading authorized class members…')+'</p></section>':'';

 const box=document.createElement('section');box.className='language-class-report';box.dataset.elaraI18n='off';box.innerHTML='<div class="language-class-report-grid"><article><small>'+tx('پیشرفت','Progress')+'</small><strong>'+fa(pct(c))+'٪</strong></article><article><small>'+tx('جلسات','Sessions')+'</small><strong>'+fa(done)+' / '+fa(sum)+'</strong></article><article><small>'+tx('زمان انجام‌شده','Studied')+'</small><strong>'+hours(mins)+'</strong></article><article><small>'+tx('زمان باقی‌مانده','Remaining')+'</small><strong>'+hours(remain)+'</strong></article></div><div class="language-class-report-copy"><p><b>'+tx('برنامه: ','Schedule: ')+'</b>'+scheduleLabel(c)+' · '+fa(Number(c.studyHoursPerDay||1))+' '+tx('ساعت در روز','h/day')+'</p><p><b>'+tx('سرعت برنامه: ','Pace: ')+'</b>'+fa(e.sessionsPerDay||0)+' '+tx('جلسه در هر روز انتخابی','sessions per selected day')+'</p><p><b>'+tx('پایان تقریبی: ','Estimated finish: ')+'</b>'+(e.date?esc(e.date):'—')+'</p></div>'+classmates+'<div class="language-class-log"><h3>'+tx('جلسات ثبت‌شده','Session log')+'</h3>'+(logs.length?logs.map((x,i)=>'<div><span>'+tx('جلسه ','Session ')+fa(done-i)+'</span><time>'+esc(new Date(x.at).toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR'))+'</time></div>').join(''):'<p class="muted">'+tx('هنوز جلسه‌ای ثبت نشده.','No sessions logged yet.')+'</p>')+'</div>';
 const dialog=window.ElaraDialog.open({title:esc(c.title),content:box,wide:true,actions:[{label:tx('بستن','Close'),value:false}]});
 // Never delay opening the actual dialog while an authenticated collaboration query is pending.
 if(needsClassmates){
   void (async()=>{
     const target=box.querySelector('[data-classmate-results]');
     if(!window.ElaraCollab?.memberRows){if(target?.isConnected)target.innerHTML='<h3>'+tx('همکلاسی‌ها','Classmates')+'</h3><p class="muted">'+tx('دادهٔ معتبر اعضا در دسترس نیست.','Authorized member data is unavailable.')+'</p>';return}
     try{
       const rows=await window.ElaraCollab.memberRows(c.collabSpaceId);
       if(!target?.isConnected)return;
       const safeRows=Array.isArray(rows)?rows.filter(r=>r&&typeof r==='object'):[];
       target.innerHTML='<h3>'+tx('همکلاسی‌ها','Classmates')+'</h3>'+(safeRows.length?safeRows.map(r=>{
         const pc=Math.min(100,Math.max(0,Number(r.percent)||0));
         return '<div class="language-class-member"><span><strong data-elara-ugc dir="auto">'+esc(r.name||tx('عضو کلاس','Class member'))+'</strong><small>'+fa(Math.max(0,Number(r.completed)||0))+' / '+fa(Math.max(0,Number(r.total)||0))+'</small></span><span class="language-class-progress"><i style="width:'+pc+'%"></i></span><b>'+fa(pc)+'٪</b></div>'
       }).join(''):'<p class="muted">'+tx('عضو مجاز دیگری برای نمایش وجود ندارد.','No other authorized member results.')+'</p>');
     }catch(error){if(target?.isConnected)target.innerHTML='<h3>'+tx('همکلاسی‌ها','Classmates')+'</h3><p class="muted">'+tx('آمار اعضا در دسترس نیست یا مجوز مشاهده وجود ندارد.','Member statistics unavailable or access denied.')+'</p>'}
   })();
 }
 await dialog;
}
async function remove(c){
 const ok=await window.ElaraDialog.confirm(tx('این کلاس و گزارش جلساتش حذف شود؟','Delete this class and its session history?'),{title:tx('حذف کلاس','Delete class'),confirmText:tx('حذف','Delete'),danger:true});if(!ok)return;
 const s=read();s.languageClasses=s.languageClasses.filter(x=>x.id!==c.id);write(s);
}
let languageClassesFilter='all';
let languageClassesSearch='';
function render(){
 const panel=document.getElementById('panel-language-courses');if(!panel)return;
 let host=panel.querySelector('[data-custom-classes]');
 if(!host){host=document.createElement('section');host.className='language-custom-classes lc2-classes-page';host.dataset.customClasses='';panel.append(host)}
 host.classList.add('lc2-classes-page');host.setAttribute('dir',document.documentElement.lang==='en'?'ltr':'rtl');
 const rows=read().languageClasses.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 const sharedRows=rows.filter(x=>x.collabSpaceId),personalRows=rows.filter(x=>!x.collabSpaceId);
 const ongoing=rows.filter(c=>completed(c)<total(c)),done=rows.reduce((n,c)=>n+completed(c),0),planned=rows.reduce((n,c)=>n+total(c),0);
 const overall=planned?Math.round(done/planned*100):0;
 const upcoming=ongoing.map(c=>({c,next:nextSession(c)})).filter(x=>x.next);
 const soon=upcoming.sort((a,b)=>{const find=c=>{const ds=(c.weekdays||[]).map(Number);const now=new Date();for(let i=0;i<14;i++){const d=new Date(now);d.setDate(d.getDate()+i);const t=/^\d\d:\d\d$/.test(c.studyTime||'')?c.studyTime:'12:00';d.setHours(+t.slice(0,2),+t.slice(3),0,0);if(ds.includes(d.getDay())&&d>=now)return d.getTime()}return Infinity};return find(a.c)-find(b.c)})[0];
 const paths='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v16H4zM8 2v5M16 2v5M4 10h16"/></svg>';
 const people='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="18" cy="9" r="2"/><path d="M2 21v-3c0-4 3-6 7-6s7 2 7 6v3M17 14c3 0 5 2 5 6"/></svg>';
 const bars='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20v-7M10 20V6M16 20v-10M22 20v-15"/></svg>';
 const book='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 7c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V6c-4-1-7-1-10 1zM12 7v14"/></svg>';
 const stat=(kind,label,value,note,icon,mark='')=>'<article class="l1-class-stat lc2-stat lc2-stat-'+kind+'"><span class="l1-stat-symbol" aria-hidden="true">'+icon+'</span><div><small>'+label+'</small><strong>'+value+'</strong><span>'+note+'</span>'+mark+'</div></article>';
 const emptyPersonal='<div class="elara-card language-class-empty lc2-empty"><img src="assets/ui/24-language-classes-icon.webp" alt="" loading="lazy"><strong>'+tx('هنوز کلاس شخصی نداری!','No personal classes yet!')+'</strong><p>'+tx('با ایجاد یک کلاس، مسیر یادگیری خودت را آغاز کن و آن را با کلاس‌های موجود مقایسه کن.','Create a class to start your personal learning path.')+'</p><button type="button" class="l1-empty-cta" data-class-add>＋ '+tx('ایجاد اولین کلاس','Create your first class')+'</button></div>';
 const emptyShared='<div class="language-shared-classes-empty lc2-empty"><img src="assets/ui/24-language-classes-icon.webp" alt="" loading="lazy"><strong>'+tx('هنوز کلاس مشترکی نداری','No shared classes yet')+'</strong><p>'+tx('کلاس‌هایی که دعوت آن‌ها را پذیرفته‌ای اینجا نمایش داده می‌شوند.','Accepted class invitations appear here.')+'</p><button type="button" class="l1-shared-cta" data-class-friends>'+tx('مشاهده درخواست‌های دوستان','View friend requests')+'</button></div>';
 host.innerHTML=
  '<header class="lc2-top"><div class="lc2-top-tools"><button type="button" class="lc2-back" data-class-back aria-label="'+tx('بازگشت به زبان','Back to language')+'">←</button><label class="lc2-search-wrap"><span class="lc2-search-icon" aria-hidden="true">⌕</span><input type="search" data-class-search autocomplete="off" maxlength="120" value="'+esc(languageClassesSearch)+'" placeholder="'+tx('جستجو در کلاس‌ها و مسیرها...','Search classes and paths...')+'" aria-label="'+tx('جستجوی کلاس‌ها','Search classes')+'"></label></div><div class="lc2-top-title"><span aria-hidden="true" class="lc2-heading-icon">'+book+'</span><h1>'+tx('کلاس‌ها و مسیرها','Classes & paths')+'</h1><p>'+tx('مسیرهای یادگیری، کلاس‌های شخصی و کلاس‌های مشترک شما در یک نگاه','Your learning paths, personal classes and shared classes at a glance')+'</p></div></header>'+
  '<section class="l1-class-stats lc2-stat-grid" aria-label="'+tx('آمار واقعی کلاس‌ها','Real class statistics')+'">'+
   stat('shared',tx('کلاس‌های مشترک','Shared classes'),fa(sharedRows.length),tx('عضویت پذیرفته‌شده','Accepted shared classes'),people)+
   stat('progress',tx('پیشرفت کل','Overall progress'),fa(overall)+'٪',tx('در همه کلاس‌ها','Across classes'),bars,'<span class="lc2-mini-track"><i style="width:'+overall+'%"></i></span>')+
   stat('next',tx('جلسه بعدی','Next session'),soon?esc(soon.next):'—',soon?esc(soon.c.title):tx('هنوز برنامه‌ای ثبت نشده','Not scheduled yet'),paths)+
   stat('active',tx('کلاس‌های فعال','Active classes'),fa(ongoing.length),tx('در حال یادگیری','In progress'),people)+
  '</section>'+
  '<nav class="lf-class-filter lc2-filter" aria-label="'+tx('فیلتر کلاس‌ها','Filter classes')+'">'+
    [['all',tx('همه کلاس‌ها','All classes')],['online',tx('آنلاین','Online')],['linked',tx('لینک‌شده','Linked')],['offline',tx('آفلاین','Offline')]].map(([type,label])=>'<button type="button" data-lf-class-filter="'+type+'" aria-pressed="'+(languageClassesFilter===type)+'">'+label+'</button>').join('')+
    '<button type="button" class="lc2-filter-create" data-class-add>＋ '+tx('ایجاد کلاس جدید','Create new class')+'</button></nav>'+
  '<section class="elara-card language-class-intro l1-class-hero lc2-create-hero"><div class="lc2-create-art" aria-hidden="true"><img src="assets/ui/24-language-classes-icon.webp" alt=""></div><div class="lc2-create-copy"><h2>'+tx('ساخت کلاس شخصی','Create a personal class')+'</h2><p>'+tx('کلاس اختصاصی خود را بساز و برنامه یادگیری دلخواهت را با دیگران به اشتراک بگذار.','Build your own learning plan and share it with others.')+'</p><div class="lc2-feature-pills"><span>▦ '+tx('برنامه‌ریزی جلسات','Session scheduling')+'</span><span>♧ '+tx('دعوت از همکلاسی‌ها','Classmate invitations')+'</span><span>◷ '+tx('زمان‌بندی منعطف','Flexible schedule')+'</span><span>▥ '+tx('پیگیری پیشرفت','Progress tracking')+'</span></div></div><button type="button" class="l1-main-cta" data-class-add>＋ '+tx('ایجاد کلاس جدید','Create new class')+'</button></section>'+
  '<section class="language-personal-classes lc2-section"><header><h2><span class="lc2-section-icon" aria-hidden="true">♙</span>'+tx('کلاس‌های من','My classes')+'</h2><p>'+tx('کلاس‌هایی که ساخته‌اید یا در آن‌ها عضو هستید.','Classes you have created or joined.')+'</p></header><div class="language-class-list lc2-card-list">'+(personalRows.length?personalRows.map(card).join(''):emptyPersonal)+'</div></section>'+
  '<section class="elara-card language-shared-classes lc2-section" data-shared-classes><header><h2><span class="lc2-section-icon" aria-hidden="true">♧</span>'+tx('کلاس‌های مشترک','Shared classes')+'</h2><p>'+tx('کلاس‌هایی که دیگران ساخته‌اند و شما در آن‌ها عضو هستید.','Classes shared with you and your classmates.')+'</p></header><div class="language-shared-classes-list lc2-card-list">'+(sharedRows.length?sharedRows.map(card).join(''):emptyShared)+'</div></section>';
 applyClassFilters(host);
}
function applyClassFilters(host){
 if(!host)return;
 const query=languageClassesSearch.trim().toLocaleLowerCase();
 for(const element of host.querySelectorAll('[data-language-class-id]')){
  const type=element.querySelector('.lc2-type')?.classList;
  const typeName=type?.contains('online')?'online':type?.contains('linked')?'linked':'offline';
  const recordMatches=languageClassesFilter==='all'||typeName===languageClassesFilter;
  const title=element.querySelector('.lc2-class-heading h3')?.textContent||'';
  const textMatches=!query||title.toLocaleLowerCase().includes(query);
  element.hidden=!(recordMatches&&textMatches);
 }
 for(const section of host.querySelectorAll('.lc2-section')){
  let note=section.querySelector('.lf-filter-empty');
  const cards=[...section.querySelectorAll('[data-language-class-id]')];
  const none=cards.length&&cards.every(el=>el.hidden);
  if(none&&!note){note=document.createElement('p');note.className='lf-filter-empty';note.textContent=tx('کلاسی مطابق جستجو یا فیلتر پیدا نشد.','No classes match your search or filter.');section.querySelector('.lc2-card-list')?.append(note)}
  if(note)note.hidden=!none;
 }
}
document.addEventListener('input',e=>{
 const search=e.target.closest?.('#panel-language-courses [data-class-search]');
 if(!search)return;
 languageClassesSearch=search.value.slice(0,120);
 applyClassFilters(search.closest('[data-custom-classes]'));
});
document.addEventListener('click',e=>{
 const filter=e.target.closest('[data-lf-class-filter]');if(filter){languageClassesFilter=filter.dataset.lfClassFilter;render();return}
 const goBack=e.target.closest('[data-class-back]');if(goBack){e.preventDefault();window.ElaraOpen?.('language',{history:'push'});return}
 const goFriends=e.target.closest('[data-class-friends]');if(goFriends){e.preventDefault();window.ElaraOpen?.('social',{history:'push'});return}
 const typed=e.target.closest('[data-class-add-type]');if(typed){void openEditor({type:typed.dataset.classAddType});return}
 const add=e.target.closest('[data-class-add]');if(add){void openEditor(null);return}
 const find=id=>read().languageClasses.find(x=>x.id===id);
 const edit=e.target.closest('[data-class-edit]');if(edit){const c=find(edit.dataset.classEdit);if(c)void openEditor(c);return}
 const rep=e.target.closest('[data-class-report]');if(rep){const c=find(rep.dataset.classReport);if(c)void report(c);return}
 const del=e.target.closest('[data-class-delete]');if(del){const c=find(del.dataset.classDelete);if(c)void remove(c);return}
 const share=e.target.closest('[data-class-share]');if(share){const c=find(share.dataset.classShare);if(c)void window.ElaraCollab?.shareEntity?.('language-class',c).then(()=>render()).catch(error=>window.ElaraDialog.alert(error?.message||String(error)));return}
 const mates=e.target.closest('[data-class-classmates]');if(mates){const c=find(mates.dataset.classClassmates);if(c?.collabSpaceId)void report(c).catch(error=>window.ElaraDialog?.alert?.(String(error?.message||error)));return}
 const link=e.target.closest('[data-class-share-link]');if(link){const c=find(link.dataset.classShareLink);if(c?.collabSpaceId)void window.ElaraCollab?.copyShareLink?.(c.collabSpaceId,e).catch(error=>window.ElaraDialog.alert(error?.message||String(error)));return}
 const undo=e.target.closest('[data-class-session-undo]');if(undo){const s=read(),c=s.languageClasses.find(x=>x.id===undo.dataset.classSessionUndo);if(!c||completed(c)<=0)return;c.sessionLogs=Array.isArray(c.sessionLogs)?c.sessionLogs:[];if(c.sessionLogs.length)c.sessionLogs.pop();else c.completedSessions=Math.max(0,Number(c.completedSessions||0)-1);c.updatedAt=Date.now();write(s);window.ElaraNotify?.push?.({type:'language',title:tx('جلسه برگردانده شد ↶','Session undone ↶'),message:c.title+' · '+fa(completed(c))+'/'+fa(total(c)),dedupeKey:'class-session-undo:'+c.id+':'+Date.now()});return}
 const ses=e.target.closest('[data-class-session]');if(ses){const s=read(),c=s.languageClasses.find(x=>x.id===ses.dataset.classSession);if(!c||completed(c)>=total(c))return;c.sessionLogs=Array.isArray(c.sessionLogs)?c.sessionLogs:[];c.sessionLogs.push({id:id(),at:Date.now()});c.updatedAt=Date.now();write(s);window.ElaraNotify?.push?.({type:'language',title:tx('جلسه ثبت شد 📚','Session logged 📚'),message:c.title+' · '+fa(completed(c))+'/'+fa(total(c)),dedupeKey:'class-session:'+c.id+':'+completed(c)});return}
});
for(const ev of ['elara:open','elara:data-changed','elara:locale-changed','elara:hydrate','elara:account-ready'])window.addEventListener(ev,e=>{if(ev!=='elara:open'||e.detail?.tab==='language-courses'||e.detail?.tab==='language')setTimeout(render,0)});
const start=()=>render();document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
window.ElaraLanguageClasses={render,read:()=>read().languageClasses.slice(),eta,total,completed,openEditor};
})();

/* ELARA WELL-POP-01 · Responsive, private wellness editors and sleep overview. */
(()=>{'use strict';
const $=(selector,root=document)=>root.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
const key=()=>uid()?'elara_private_wellness_v1_'+uid():null;
const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'elwp-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const localDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>localDate(new Date());
const faNum=n=>Number(n||0).toLocaleString('fa-IR',{maximumFractionDigits:1});
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const clone=o=>JSON.parse(JSON.stringify(o));
function read(){try{const k=key();return k?JSON.parse(window.ElaraCloudStorage.getItem(k)||'{}')||{}:{}}catch{return {}}}
function save(patch){const k=key();if(!k)return false;try{window.ElaraCloudStorage.setItem(k,JSON.stringify({...read(),...patch}));window.dispatchEvent(new CustomEvent('elara:wellness-saved',{detail:patch}));return true}catch{return false}}
const trainingDays=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const mealDays=['همه روزها','روزهای کاری',...trainingDays];
const heading={workout:'برنامه تمرینی',nutrition:'برنامه تغذیه'};
const defaultFolders={workout:['گرم کردن','تمرینات قدرتی','هوازی و استقامت'],nutrition:['وعده‌های اصلی','میان‌وعده‌ها','مکمل‌ها و نوشیدنی‌ها','نکات و راهنمایی‌ها']};
function seedChecks(kind,title){
 if(kind==='workout'){return title==='گرم کردن'?['دویدن آرام به مدت ۵ دقیقه','حرکات کششی پویا','چرخش مفاصل','اسکوات سبک']:title==='تمرینات قدرتی'?['تمرین اصلی','استراحت بین ست‌ها']:['حرکت هوازی','حرکات کششی پایانی']}
 return title==='وعده‌های اصلی'?['صبحانه: اوتمیل با میوه و مغزها','میان‌وعده: ماست یونانی و بادام','ناهار: مرغ گریل‌شده با برنج قهوه‌ای و سبزیجات','میان‌وعده: میوه فصل','شام: ماهی سالمون با کینوا و سالاد']:['مورد جدید'];
}
function defaultNote(kind,title){
 if(kind==='workout'&&title==='گرم کردن')return 'قبل از شروع تمرین، ۱۰ دقیقه بدن را گرم کنید.\nتمرکز روی تنفس عمیق و حفظ ریتم حرکتی باشد.\nدر صورت خستگی، شدت تمرین را پایین‌تر تنظیم کنید.';
 if(kind==='nutrition'&&title==='نکات و راهنمایی‌ها')return 'آب کافی در طول روز مصرف شود.\nمصرف سبزیجات تازه در وعده‌های اصلی فراموش نشود.\nتا حد امکان از غذاهای فرآوری‌شده پرهیز کنید.';
 return '';
}
function folderKey(kind){return kind==='workout'?'workoutPlanFolders':'nutritionPlanFolders'}
function metaKey(kind){return kind==='workout'?'workoutPlanMeta':'nutritionPlanMeta'}
function oldNoteKey(kind){return kind==='workout'?'workoutPlanNote':'nutritionPlanNote'}
function normalizeFolder(x){return {id:String(x.id||id()),title:String(x.title||'پوشه بدون نام').slice(0,80),programName:String(x.programName||'').slice(0,100),description:String(x.description||'').slice(0,5000),note:String(x.note||'').slice(0,5000),days:Array.isArray(x.days)?x.days.filter(d=>trainingDays.includes(d)||d==='همه روزها'||d==='روزهای کاری').slice(0,9):null,checks:Array.isArray(x.checks)?x.checks.slice(0,90).map(c=>({id:String(c.id||id()),text:String(c.text||'').slice(0,180),done:!!c.done})):[],updatedAt:x.updatedAt||Date.now()}}
function initialState(kind){
 const s=read(),old=s[metaKey(kind)]||{};
 const meta=kind==='workout'?{name:'تناسب اندام تابستان',description:'',days:['شنبه','دوشنبه','چهارشنبه'],duration:'30',intensity:'متوسط',focus:'کاهش وزن'}:
 {name:'برنامه تغذیه سالم و متعادل',description:'',days:['همه روزها'],meals:'5',style:'متعادل',calories:'2000'};
 const folders=Array.isArray(s[folderKey(kind)])?s[folderKey(kind)].filter(x=>x?.id&&x?.title).slice(0,60).map(normalizeFolder):[];
 // Empty accounts get useful editable suggestions without storing data until Save.
 if(!folders.length)defaultFolders[kind].forEach(title=>folders.push({id:id(),title,programName:'',description:'',note:defaultNote(kind,title),days:null,checks:seedChecks(kind,title).map(text=>({id:id(),text,done:false})),updatedAt:Date.now()}));
 const merged={...meta,...old};
 if(!old.description&&s[oldNoteKey(kind)])merged.description=String(s[oldNoteKey(kind)]).slice(0,5000);
 return {kind,meta:merged,folders,selected:folders[0]?.id||'',tab:kind==='workout'?'note':'check',confirmDelete:false,addFolder:false,errors:''};
}
let active=null;
function selected(){return active?.draft?.folders.find(x=>x.id===active.draft.selected)||null}
function btn(action,label,extra=''){return '<button type="button" data-elwp-action="'+action+'" '+extra+'>'+label+'</button>'}
function fields(kind,m){
 const isWorkout=kind==='workout',d=isWorkout?trainingDays:mealDays;
 const days=d.map(day=>'<button type="button" class="elwp-chip" aria-pressed="'+(m.days||[]).includes(day)+'" data-elwp-day="'+esc(day)+'">'+esc(day)+'</button>').join('');
 const select=(role,opts,value)=>'<select data-elwp-meta="'+role+'" aria-label="'+esc(role)+'">'+opts.map(x=>'<option value="'+esc(x)+'" '+(String(value)===String(x)?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select>';
 const base='<div class="elwp-text-row"><label><span>نام برنامه</span><input data-elwp-meta="name" maxlength="100" value="'+esc(m.name)+'" required placeholder="نام برنامه را بنویسید"></label>'+
 '<label class="elwp-description-label"><span>توضیحات برنامه</span><textarea data-elwp-meta="description" maxlength="5000" rows="3" placeholder="هدف و توضیحات برنامه">'+esc(m.description||'')+'</textarea></label></div>';
 const timetable='<div class="elwp-days"><div class="elwp-section-title"><span>▦</span><strong>'+(isWorkout?'زمان‌بندی':'زمان‌بندی وعده‌ها')+'</strong></div><div class="elwp-chips" role="group" aria-label="زمان‌بندی برنامه">'+days+'</div></div>';
 const extras=isWorkout?'<div class="elwp-params">'+
 '<label><span>◷ مدت زمان هر جلسه</span>'+select('duration',['15','20','30','45','60','90'],m.duration)+'<small>دقیقه</small></label>'+
 '<label><span>▥ شدت تمرین</span>'+select('intensity',['سبک','متوسط','زیاد'],m.intensity)+'</label>'+
 '<label><span>◎ تمرکز برنامه</span>'+select('focus',['کاهش وزن','افزایش انرژی','عضله‌سازی','انعطاف‌پذیری','سلامتی عمومی'],m.focus)+'</label></div>':
 '<div class="elwp-params">'+
 '<label><span>◷ تعداد وعده در روز</span>'+select('meals',['3','4','5','6'],m.meals)+'<small>وعده</small></label>'+
 '<label><span>♜ سبک تغذیه</span>'+select('style',['متعادل','گیاه‌خواری','پروتئین بالا','مدیترانه‌ای','دلخواه'],m.style)+'</label>'+
 '<label><span>♧ هدف کالری روزانه</span>'+select('calories',['1200','1500','1800','2000','2200','2500','2800','3000'],m.calories)+'<small>کالری</small></label></div>';
 return base+timetable+extras;
}
function folderList(d){
 return '<div class="elwp-folder-head"><h3>پوشه‌ها <span aria-hidden="true">▱</span></h3>'+btn('new-folder','＋ پوشه جدید','class="elwp-outline"')+'</div>'+
 '<div class="elwp-folder-stack">'+d.folders.map(x=>'<div class="elwp-folder '+(d.selected===x.id?'is-active':'')+'"><button type="button" class="elwp-folder-pick" data-elwp-folder="'+esc(x.id)+'" aria-pressed="'+(d.selected===x.id)+'"><span class="elwp-folder-icon" aria-hidden="true">▰</span><strong>'+esc(x.title)+'</strong><small>'+faNum(x.checks.filter(c=>c.done).length)+' / '+faNum(x.checks.length)+'</small></button><div class="elwp-folder-actions">'+btn('rename-folder','✎','data-elwp-id="'+esc(x.id)+'" aria-label="ویرایش نام پوشه"')+btn('remove-folder','♲','data-elwp-id="'+esc(x.id)+'" aria-label="حذف پوشه"')+'</div></div>').join('')+'</div>'+
 (d.addFolder?'<div class="elwp-inline"><input data-elwp-new-folder maxlength="80" aria-label="نام پوشه جدید" placeholder="نام پوشه جدید">'+btn('confirm-folder','افزودن')+btn('cancel-folder','×')+'</div>':'');
}
function detail(d){
 const f=selected();if(!f)return '<div class="elwp-empty-folder">پوشه‌ای برای نمایش وجود ندارد. یک پوشه بسازید.</div>';
 const isNote=d.tab==='note';
 return '<div class="elwp-folder-detail"><label class="elwp-folder-title">▰ <input data-elwp-folder-title maxlength="80" value="'+esc(f.title)+'" aria-label="نام پوشه"></label>'+
  '<div class="elwp-folder-program-fields"><label><span>نام برنامه در این پوشه</span><input data-elwp-folder-program-name maxlength="100" value="'+esc(f.programName||'')+'" placeholder="مثلاً برنامه چربی‌سوزی هفته اول"></label><label><span>توضیحات برنامه در این پوشه</span><textarea data-elwp-folder-description maxlength="5000" rows="4" placeholder="هدف، نحوه اجرا و توضیحات این برنامه را بنویسید...">'+esc(f.description||'')+'</textarea></label><div class="elwp-folder-own-days"><strong>روزهای هفته این پوشه</strong><div class="elwp-chips">'+(d.kind==='workout'?trainingDays:mealDays).map(day=>'<button type="button" class="elwp-chip" data-elwp-folder-day="'+esc(day)+'" aria-pressed="'+(Array.isArray(f.days)?f.days.includes(day):(d.meta.days||[]).includes(day))+'">'+esc(day)+'</button>').join('')+'</div></div></div>'+
 '<div class="elwp-tabs" role="tablist" aria-label="محتوای پوشه"><button type="button" role="tab" data-elwp-tab="note" aria-selected="'+isNote+'" class="'+(isNote?'active':'')+'">▤ یادداشت</button><button type="button" role="tab" data-elwp-tab="check" aria-selected="'+!isNote+'" class="'+(!isNote?'active':'')+'">☷ چک‌لیست</button></div>'+
 (isNote?'<textarea class="elwp-note" data-elwp-folder-note maxlength="5000" rows="8" placeholder="یادداشت این پوشه را بنویسید...">'+esc(f.note)+'</textarea>':
 '<div class="elwp-check-box"><div class="elwp-check-input"><input data-elwp-new-check maxlength="180" placeholder="آیتم جدید را وارد کنید..." aria-label="آیتم جدید">'+btn('add-check','＋','aria-label="افزودن آیتم"')+'</div><ul class="elwp-check-items">'+f.checks.map(c=>'<li><label><input type="checkbox" data-elwp-check="'+esc(c.id)+'" '+(c.done?'checked':'')+'><span class="'+(c.done?'checked':'')+'">'+esc(c.text)+'</span></label>'+btn('remove-check','⋮','data-elwp-id="'+esc(c.id)+'" aria-label="حذف آیتم"')+'</li>').join('')+'</ul></div>')+
 (d.confirmDelete?'<div class="elwp-confirm">این پوشه و محتوایش حذف شود؟ '+btn('confirm-delete','بله، حذف شود')+btn('cancel-delete','انصراف')+'</div>':'')+'</div>';
}
function redrawPlan(focusSelector){
 const d=active?.draft,host=active?.body;if(!d||!host)return;
 host.innerHTML='<div class="elwp-plan-fields">'+fields(d.kind,d.meta)+'</div><div class="elwp-folders"><aside>'+folderList(d)+'</aside><section>'+detail(d)+'</section></div>'+
 '<p class="elwp-error" role="alert" '+(d.errors?'':'hidden')+'>'+esc(d.errors)+'</p>';
 if(focusSelector)$(focusSelector,host)?.focus();
}
function syncPlanText(){
 if(!active?.draft)return;const d=active.draft,root=active.body;
 root.querySelectorAll('[data-elwp-meta]').forEach(el=>d.meta[el.dataset.elwpMeta]=el.value);
 const f=selected();if(f){const title=$('[data-elwp-folder-title]',root),note=$('[data-elwp-folder-note]',root);if(title)f.title=title.value.slice(0,80);if(note)f.note=note.value.slice(0,5000);const desc=$('[data-elwp-folder-description]',root);if(desc)f.description=desc.value.slice(0,5000);const pn=$('[data-elwp-folder-program-name]',root);if(pn)f.programName=pn.value.slice(0,100)}
}
function onPlanClick(e){
 const button=e.target.closest('button');if(!button||!active)return;
 const d=active.draft;syncPlanText();
 if(button.hasAttribute('data-elwp-day')){const day=button.dataset.elwpDay;d.meta.days=(d.meta.days||[]).includes(day)?d.meta.days.filter(x=>x!==day):[...d.meta.days,day];redrawPlan();return}
  if(button.hasAttribute('data-elwp-folder-day')){const f=selected();if(!f)return;const day=button.dataset.elwpFolderDay,days=Array.isArray(f.days)?f.days:(d.meta.days||[]);f.days=days.includes(day)?days.filter(x=>x!==day):[...days,day];redrawPlan();return}
 if(button.dataset.elwpFolder){d.selected=button.dataset.elwpFolder;d.confirmDelete=false;d.tab=d.kind==='workout'?'note':'check';redrawPlan();return}
 if(button.dataset.elwpTab){d.tab=button.dataset.elwpTab;redrawPlan();return}
 if(!button.dataset.elwpAction)return;
 const act=button.dataset.elwpAction,f=selected();
 if(act==='new-folder'){d.addFolder=true;redrawPlan('[data-elwp-new-folder]')}
 else if(act==='cancel-folder'){d.addFolder=false;redrawPlan()}
 else if(act==='confirm-folder'){const name=$('[data-elwp-new-folder]',active.body)?.value.trim();if(!name){$('[data-elwp-new-folder]',active.body)?.focus();return}if(d.folders.length>=60){d.errors='حداکثر ۶۰ پوشه قابل ثبت است.';redrawPlan();return}const folder={id:id(),title:name.slice(0,80),programName:'',description:'',note:'',days:Array.isArray(d.meta.days)?[...d.meta.days]:[],checks:[],updatedAt:Date.now()};d.folders.push(folder);d.selected=folder.id;d.addFolder=false;d.confirmDelete=false;redrawPlan('[data-elwp-folder-title]')}
 else if(act==='rename-folder'){d.selected=button.dataset.elwpId;redrawPlan('[data-elwp-folder-title]')}
 else if(act==='remove-folder'){d.selected=button.dataset.elwpId;d.confirmDelete=true;redrawPlan()}
 else if(act==='confirm-delete'){d.folders=d.folders.filter(x=>x.id!==d.selected);d.selected=d.folders[0]?.id||'';d.confirmDelete=false;redrawPlan()}
 else if(act==='cancel-delete'){d.confirmDelete=false;redrawPlan()}
 else if(act==='add-check'){const input=$('[data-elwp-new-check]',active.body),value=input?.value.trim();if(!value)return input?.focus();if(f.checks.length>=90){d.errors='حداکثر ۹۰ آیتم در هر پوشه قابل ثبت است.';redrawPlan();return}f.checks.push({id:id(),text:value.slice(0,180),done:false});redrawPlan('[data-elwp-new-check]')}
 else if(act==='remove-check'){f.checks=f.checks.filter(x=>x.id!==button.dataset.elwpId);redrawPlan()}
}
function icon(name){const p={calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',moon:'<path d="M20 15.3A8 8 0 0 1 8.7 4 7.8 7.8 0 1 0 20 15.3z"/>',save:'<path d="M4 3h14l3 3v15H3V3zM7 3v7h10V3M7 21v-8h10v8"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',bed:'<path d="M3 4v17M3 16h18v5M4 11h5a3 3 0 0 1 3 3v2H4zM12 12h6a3 3 0 0 1 3 3v1h-9z"/>'};
 return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(p[name]||p.calendar)+'</svg>';
}
function openBase(title,kind){
 close(false);
 const origin=document.activeElement,priorBody=document.body.style.overflow,priorHtml=document.documentElement.style.overflow;
 const overlay=document.createElement('div');overlay.className='elwp-overlay';overlay.innerHTML='<section class="elwp-dialog elwp-'+kind+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'" dir="rtl">'+
 '<header class="elwp-header"><div><small>ELARA</small><h2>'+esc(title)+'</h2></div><button type="button" class="elwp-back" data-elwp-close aria-label="بازگشت">←</button><button type="button" class="elwp-close" data-elwp-close aria-label="بستن">×</button></header>'+
 '<div class="elwp-body"></div><footer class="elwp-footer"><button type="button" class="elwp-save" data-elwp-save>'+icon('save')+' ذخیره</button><button type="button" class="elwp-cancel" data-elwp-close>انصراف</button></footer></section>';
 document.body.append(overlay);document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';
 const marker='elwp-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 history.pushState({...history.state,elaraWellPopup:marker},'',location.href);
 const instance={overlay,body:$('.elwp-body',overlay),origin,priorBody,priorHtml,marker,kind,cleaned:false,draft:null,listener:null};active=instance;
 const onBack=()=>{if(active===instance)close(false)};
 const onKey=e=>{if(active!==instance)return;if(e.key==='Escape'){e.preventDefault();close();return}if(e.key!=='Tab')return;const nodes=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])')].filter(x=>x.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};
 const guard=e=>{if(active===instance&&!overlay.contains(e.target))overlay.querySelector('[data-elwp-close]')?.focus({preventScroll:true})};
 document.addEventListener('keydown',onKey,true);document.addEventListener('focusin',guard,true);window.addEventListener('popstate',onBack);
 instance.listener=()=>{document.removeEventListener('keydown',onKey,true);document.removeEventListener('focusin',guard,true);window.removeEventListener('popstate',onBack)};
 overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-elwp-close]')){e.preventDefault();close();return}if(e.target.closest('[data-elwp-save]')){e.preventDefault();if(kind==='sleep')saveSleep();else savePlan();return}if(kind!=='sleep')onPlanClick(e);else onSleepClick(e)});
 window.setTimeout(()=>overlay.querySelector('[data-elwp-close]')?.focus({preventScroll:true}),0);
 return instance;
}
function close(pop=true){const a=active;if(!a||a.cleaned)return;a.cleaned=true;active=null;a.listener?.();a.overlay.remove();document.body.style.overflow=a.priorBody;document.documentElement.style.overflow=a.priorHtml;if(a.origin?.isConnected)a.origin.focus({preventScroll:true});if(pop&&history.state?.elaraWellPopup===a.marker)history.back()}
function openPlan(kind,options={}){if(kind!=='workout'&&kind!=='nutrition')return;const a=openBase(heading[kind],kind);a.draft=initialState(kind);if(options.folderId&&a.draft.folders.some(f=>f.id===options.folderId))a.draft.selected=options.folderId;if(options.add)a.draft.addFolder=true;a.body.addEventListener('change',e=>{if(e.target.matches('[data-elwp-check]')){const f=selected(),c=f?.checks.find(x=>x.id===e.target.dataset.elwpCheck);if(c)c.done=e.target.checked}});a.body.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-elwp-new-check],[data-elwp-new-folder]')){e.preventDefault();const add=e.target.matches('[data-elwp-new-check]')?'add-check':'confirm-folder';a.body.querySelector('[data-elwp-action="'+add+'"]')?.click()}});redrawPlan(options.add?'[data-elwp-new-folder]':undefined)}
function savePlan(){const a=active;if(!a||a.kind==='sleep')return;syncPlanText();const d=a.draft;const error=!d.meta.name.trim()?'نام برنامه را وارد کنید.':!d.meta.days?.length?'حداقل یک روز یا بازه انتخاب کنید.':d.folders.some(f=>!f.title.trim())?'برای تمام پوشه‌ها نام بنویسید.':'';if(error){d.errors=error;redrawPlan('[data-elwp-meta="name"]');return}if(!uid()){d.errors='برای ذخیره برنامه خصوصی وارد حساب کاربری شوید.';redrawPlan();return}
 const next=clone(d.folders.map(normalizeFolder));const patch={[folderKey(d.kind)]:next,[metaKey(d.kind)]:{...d.meta,name:d.meta.name.trim().slice(0,100),description:String(d.meta.description||'').trim().slice(0,5000)},[oldNoteKey(d.kind)]:String(d.meta.description||'').trim().slice(0,5000)};
 if(save(patch)){close();renderSleepOverview()}else{d.errors='ذخیره انجام نشد. فضای ذخیره‌سازی مرورگر را بررسی کنید.';redrawPlan()}}

/* Readable, extra-large folder detail modal. Editing remains in the plan settings. */
function folderViewerMarkup(d){
 const f=d.folders.find(x=>x.id===d.selected);
 if(!f)return '<p class="elwp-view-empty">این پوشه پیدا نشد.</p>';
 const checks=Array.isArray(f.checks)?f.checks:[],done=checks.filter(x=>x.done).length;
 const percent=checks.length?Math.round(done/checks.length*100):0;
 const days=Array.isArray(f.days)?f.days:(Array.isArray(d.meta.days)?d.meta.days:[]);
 const description=String(f.description||d.meta.description||'').trim();
 const note=String(f.note||'').trim();
 const h=t=>'<h3><span class="elwp-view-heading-icon" aria-hidden="true">▤</span>'+t+'</h3>';
 return '<div class="elwp-folder-view-top"><div class="elwp-view-folder-symbol" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M3.5 8a3 3 0 0 1 3-3H13l3.2 3.4h9.3a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-19a3 3 0 0 1-3-3V8Z" fill="currentColor"/><path d="M4 12h24" stroke="#bcffe0" stroke-opacity=".55" stroke-width="1.5"/></svg></div><div><small>'+esc(heading[d.kind])+'</small><h2 data-elara-ugc dir="auto">'+esc(f.title)+'</h2><p>'+esc('برنامه: '+String(f.programName||f.title))+'</p></div><span class="elwp-view-status">● خصوصی</span></div>'+
 '<div class="elwp-folder-view-layout" dir="ltr">'+
 '<section class="elwp-view-card elwp-view-description" dir="rtl">'+h('توضیحات برنامه')+'<div class="elwp-view-prose" data-elara-ugc dir="auto">'+(description?esc(description).replace(/\n/g,'<br>'):'<p class="elwp-view-placeholder">هنوز توضیحاتی برای این برنامه نوشته نشده است. از بخش ویرایش می‌توانید اضافه کنید.</p>')+'</div></section>'+
 '<section class="elwp-view-card elwp-view-days" dir="rtl">'+h('روزهای هفته')+'<div class="elwp-view-weekdays">'+trainingDays.map(day=>'<span class="elwp-view-day '+(days.includes(day)||days.includes('همه روزها')?'is-selected':'')+'">'+esc(day)+'</span>').join('')+'</div></section>'+
 '<section class="elwp-view-card elwp-view-tasks" dir="rtl"><div class="elwp-view-tasks-head">'+h('تسک‌ها')+'<span data-elwp-view-count>'+faNum(done)+' از '+faNum(checks.length)+' انجام شده</span></div><div class="elwp-view-progress" role="progressbar" aria-label="پیشرفت تسک‌ها" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+percent+'"><span style="width:'+percent+'%"></span></div>'+
 (checks.length?'<ul class="elwp-view-checklist">'+checks.map(c=>'<li><label><input type="checkbox" data-elwp-view-check="'+esc(c.id)+'" '+(c.done?'checked':'')+'><span class="'+(c.done?'is-done':'')+'" data-elara-ugc dir="auto">'+esc(c.text)+'</span></label></li>').join('')+'</ul>':'<p class="elwp-view-placeholder">هنوز تسکی ثبت نشده؛ از بخش ویرایش می‌توانید تسک اضافه کنید.</p>')+'</section>'+
 '<section class="elwp-view-card elwp-view-notes" dir="rtl">'+h('یادداشت‌ها')+'<div class="elwp-view-prose" data-elara-ugc dir="auto">'+(note?esc(note).replace(/\n/g,'<br>'):'<p class="elwp-view-placeholder">هنوز یادداشتی برای این پوشه ثبت نشده است.</p>')+'</div></section>'+
 '</div>';
}
function openFolder(kind,folderId){
 if(!['workout','nutrition'].includes(kind))return;
 const draft=initialState(kind),folder=draft.folders.find(x=>x.id===folderId);
 if(!folder){openPlan(kind);return}
 draft.selected=folder.id;
 const a=openBase(heading[kind],kind);
 a.draft=draft;a.overlay.classList.add('elwp-folder-view-overlay');
 a.overlay.querySelector('.elwp-header h2').textContent=folder.title;
 a.overlay.querySelector('.elwp-dialog').setAttribute('aria-label','جزئیات پوشه '+folder.title);
 a.overlay.querySelector('.elwp-header small').textContent='ELARA · WELLNESS';
 a.overlay.querySelector('.elwp-footer').innerHTML='<button type="button" class="elwp-view-close" data-elwp-close>بستن</button><button type="button" class="elwp-view-share" data-wellness-folder-share="'+kind+'" data-folder-id="'+esc(folder.id)+'">♧ اشتراک با دوست</button><button type="button" class="elwp-view-edit" data-elwp-folder-edit>✎ ویرایش برنامه</button>';
 a.body.innerHTML=folderViewerMarkup(draft);
 a.overlay.addEventListener('click',e=>{if(e.target.closest('[data-elwp-folder-edit]')){e.preventDefault();openPlan(kind,{folderId:folder.id})}});
 a.body.addEventListener('change',e=>{
  const box=e.target.closest('[data-elwp-view-check]');if(!box)return;
  const current=read(),rows=Array.isArray(current[folderKey(kind)])?current[folderKey(kind)]:[];
  const row=rows.find(x=>x?.id===folder.id),check=row?.checks?.find(x=>x.id===box.dataset.elwpViewCheck);
  if(!check){a.body.innerHTML=folderViewerMarkup(a.draft);return}
  check.done=box.checked;
  if(save({[folderKey(kind)]:rows})){
   a.draft.folders=rows.map(normalizeFolder);
   a.body.innerHTML=folderViewerMarkup(a.draft);
  }else box.checked=!box.checked;
 });
}

const qualities=['ضعیف','متوسط','خوب','عالی'],moods=['خیلی بد','بد','معمولی','خوب','عالی'];
function sleepMinutes(r){if(!r.date||!r.bed||!r.wake)return 0;const a=Date.parse(r.date+'T'+r.bed+':00'),b=Date.parse(r.date+'T'+r.wake+':00');if(!Number.isFinite(a)||!Number.isFinite(b))return 0;const min=Math.round((b<=a?b+86400000:b)-a)/60000;return min>0&&min<=1440?min:0}
function sleepDate(value){try{return new Date(value+'T12:00:00').toLocaleDateString('fa-IR-u-ca-persian',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}catch{return value}}
function openSleep(recordId=''){
 const s=read(),old=(Array.isArray(s.sleep)?s.sleep:[]).find(x=>x.id===recordId)||{};
 const a=openBase('ثبت خواب','sleep');a.draft={...old,id:recordId||'',date:old.date||today(),bed:old.bed||'23:00',wake:old.wake||'07:00',quality:old.quality||'خوب',mood:old.mood||'خوب',note:old.note||''};
 a.body.innerHTML='<div class="elwp-sleep-fields"><label><span>'+icon('calendar')+' تاریخ خواب</span><input type="date" data-elwp-sleep="date" value="'+esc(a.draft.date)+'"><small data-elwp-date-display>'+esc(sleepDate(a.draft.date))+'</small></label>'+
 '<div class="elwp-sleep-times"><label><span>'+icon('moon')+' زمان خوابیدن</span><input type="time" data-elwp-sleep="bed" value="'+esc(a.draft.bed)+'"></label><label><span>'+icon('clock')+' زمان بیدار شدن</span><input type="time" data-elwp-sleep="wake" value="'+esc(a.draft.wake)+'"></label></div>'+
 '<div class="elwp-sleep-length">'+icon('bed')+'<div><small>مدت خواب</small><strong data-elwp-duration></strong></div><span>براساس زمان‌های واردشده محاسبه می‌شود.</span></div>'+
 '<div class="elwp-sleep-rating"><div class="elwp-section-title">☾ کیفیت خواب</div><div class="elwp-rating-chips" data-elwp-group="quality"></div></div>'+
 '<div class="elwp-sleep-rating"><div class="elwp-section-title">☺ وضعیت روحی پس از بیداری</div><div class="elwp-rating-chips" data-elwp-group="mood"></div></div>'+
 '<label class="elwp-sleep-note"><span>▤ یادداشت‌ها (اختیاری)</span><textarea data-elwp-sleep="note" maxlength="500" rows="4" placeholder="رویاها، عوامل مؤثر بر خواب و احساست را بنویسید...">'+esc(a.draft.note)+'</textarea><small><span data-elwp-note-count>'+a.draft.note.length+'</span>/۵۰۰</small></label><p class="elwp-error" hidden role="alert"></p>';
 a.body.addEventListener('input',onSleepInput);a.body.addEventListener('change',onSleepInput);renderSleepValues()
}
function renderSleepValues(){if(active?.kind!=='sleep')return;const a=active,r=a.draft,m=sleepMinutes(r),hours=Math.floor(m/60),minutes=m%60;const duration=$('[data-elwp-duration]',a.body);if(duration)duration.textContent=m?faNum(hours)+' ساعت و '+faNum(minutes)+' دقیقه':'زمان نامعتبر';
 const date=$('[data-elwp-date-display]',a.body);if(date)date.textContent=sleepDate(r.date);
 for(const [key,values] of [['quality',qualities],['mood',moods]]){const group=$('[data-elwp-group="'+key+'"]',a.body);if(group)group.innerHTML=values.map(v=>'<button type="button" data-elwp-choice="'+key+'" data-elwp-value="'+esc(v)+'" aria-pressed="'+(r[key]===v)+'" class="'+(r[key]===v?'active':'')+'">'+(key==='mood'?'☺ ':'☾ ')+esc(v)+'</button>').join('')}
}
function onSleepInput(e){if(active?.kind!=='sleep')return;const el=e.target;if(!el.dataset.elwpSleep)return;active.draft[el.dataset.elwpSleep]=el.value;if(el.dataset.elwpSleep==='note'){const count=$('[data-elwp-note-count]',active.body);if(count)count.textContent=el.value.length}else renderSleepValues()}
function onSleepClick(e){const b=e.target.closest('[data-elwp-choice]');if(!b||active?.kind!=='sleep')return;active.draft[b.dataset.elwpChoice]=b.dataset.elwpValue;renderSleepValues()}
function saveSleep(){if(active?.kind!=='sleep')return;const d=active.draft,m=sleepMinutes(d),error=$('.elwp-error',active.body);let message='';if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||Number.isNaN(Date.parse(d.date+'T12:00:00')))message='تاریخ خواب معتبر انتخاب کنید.';else if(!m)message='زمان خواب و بیداری باید یک بازه معتبر تا ۲۴ ساعت بسازند.';else if(!uid())message='برای ثبت خواب وارد حساب کاربری شوید.';if(message){error.textContent=message;error.hidden=false;return}
 const s=read(),rows=Array.isArray(s.sleep)?s.sleep:[],row={...d,id:d.id||id(),note:String(d.note||'').trim().slice(0,500)},patch={sleep:d.id?rows.map(x=>x.id===d.id?row:x):[...rows,row]};if(save(patch)){close();renderSleepOverview()}else{error.textContent='ذخیره انجام نشد. دوباره تلاش کنید.';error.hidden=false}}
function sleepStats(rows){const dates=Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-6+i);return localDate(d)});
 const values=dates.map(date=>rows.filter(x=>x.date===date).reduce((sum,x)=>sum+sleepMinutes(x),0)/60);const logged=values.filter(v=>v>0);const avg=logged.length?logged.reduce((a,b)=>a+b,0)/logged.length:null;
 return {dates,values,avg,best:logged.length?Math.max(...logged):null}}
function chart(stats){if(stats.avg===null)return '<div class="elwp-empty-chart">هنوز خوابی برای هفت روز اخیر ثبت نشده است.</div>';const w=610,h=218,x0=44,x1=585,y0=182,y1=24,scale=12;
 const pts=stats.values.map((v,i)=>({x:x0+(x1-x0)/6*i,y:y0-Math.min(scale,Math.max(0,v))/scale*(y0-y1),v})),coords=pts.map(p=>p.x+','+p.y).join(' ');
 return '<svg viewBox="0 0 '+w+' '+h+'" class="elwp-sleep-chart" role="img" aria-label="نمودار مدت خواب در هفت روز اخیر"><defs><linearGradient id="elwp-sleep-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#00f5ae" stop-opacity=".35"/><stop offset="1" stop-color="#00f5ae" stop-opacity="0"/></linearGradient></defs>'+
 [0,3,6,9,12].map(n=>'<line x1="'+x0+'" y1="'+(y0-n/scale*(y0-y1))+'" x2="'+x1+'" y2="'+(y0-n/scale*(y0-y1))+'" stroke="#24675a" stroke-opacity=".52" stroke-dasharray="2 3"/><text x="4" y="'+(y0-n/scale*(y0-y1)+4)+'" fill="#a6ccc2" font-size="12">'+n+'</text>').join('')+
 '<polygon points="'+x0+','+y0+' '+coords+' '+x1+','+y0+'" fill="url(#elwp-sleep-fill)"/><polyline points="'+coords+'" fill="none" stroke="#00f5b0" stroke-width="3"/>'+
 pts.map((p,i)=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="#17f7b1" stroke="#002e26" stroke-width="2"/>'+(p.v?'<text x="'+p.x+'" y="'+(p.y-14)+'" text-anchor="middle" fill="#e0fff5" font-size="12">'+p.v.toFixed(1)+'h</text>':'')+'<text x="'+p.x+'" y="207" text-anchor="middle" fill="#bddbd1" font-size="12">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(stats.dates[i]+'T12:00:00').getDay()]+'</text>').join('')+'</svg>'}
function renderSleepOverview(){
 const host=$('#panel-wellness-sleep');if(!host)return;
 let root=$('#elwp-sleep-dashboard',host);if(!root){root=document.createElement('section');root.id='elwp-sleep-dashboard';const heading=$('.feature-subpage-head',host);if(heading)heading.insertAdjacentElement('afterend',root);else host.prepend(root)}
 const rows=(Array.isArray(read().sleep)?read().sleep:[]).slice().sort((a,b)=>b.date.localeCompare(a.date)),stats=sleepStats(rows);
 root.innerHTML='<div class="elwp-overview-head"><h2>سوابق خواب '+icon('clock')+'</h2>'+btn('open-sleep','＋ ثبت خواب','class="elwp-primary-small"')+'</div><div class="elwp-sleep-overview-grid"><div class="elwp-sleep-entries">'+(rows.length?rows.slice(0,6).map(r=>'<button type="button" class="elwp-sleep-entry" data-elwp-edit-sleep="'+esc(r.id)+'"><span class="elwp-entry-moon">☾</span><span class="elwp-entry-date">'+esc(sleepDate(r.date))+'<small>'+esc(r.bed)+' — '+esc(r.wake)+'</small></span><strong>'+faNum(Math.floor(sleepMinutes(r)/60))+' ساعت و '+faNum(sleepMinutes(r)%60)+' دقیقه</strong><em>'+esc(r.quality||'ثبت‌شده')+'</em><span>‹</span></button>').join(''):'<p class="elwp-empty-entries">اولین شب خود را ثبت کنید.</p>')+'</div><div class="elwp-sleep-reports"><div class="elwp-report-title"><h3>میانگین مدت خواب در ۷ روز اخیر</h3><span>مدت خواب</span></div>'+chart(stats)+'<div class="elwp-sleep-stat-grid"><article><span>☾</span><small>میانگین هفتگی</small><strong>'+(stats.avg===null?'—':faNum(stats.avg)+' ساعت')+'</strong></article><article><span>↗</span><small>بیشترین خواب</small><strong>'+(stats.best===null?'—':faNum(stats.best)+' ساعت')+'</strong></article><article><span>◫</span><small>شب‌های ثبت‌شده</small><strong>'+faNum(stats.values.filter(x=>x>0).length)+' شب</strong></article></div></div></div><div class="elwp-sleep-tips"><h3>تحلیل و پیشنهادهای خواب ♧</h3><div><article><strong>محیط خواب بهتر</strong><p>اتاق خنک، تاریک و بدون حواس‌پرتی به کیفیت خواب کمک می‌کند.</p></article><article><strong>زمان خواب منظم</strong><p>سعی کنید هر شب در ساعت مشخصی بخوابید.</p></article><article><strong>بررسی روند شخصی</strong><p>با چند شب ثبت خواب، الگوی استراحت خودتان را بهتر می‌بینید.</p></article></div></div>';
}
function routeClick(e){
 if(active)return;
 const b=e.target.closest('[data-well01-folder-view],[data-wellness-plan-folder-add],[data-wellness-plan-folder],[data-wellness-plan-edit],[data-well01-plan-edit],[data-wellness-add="sleep"],[data-wellness-edit="sleep"],[data-elwp-open-sleep],[data-elwp-edit-sleep]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.hasAttribute('data-well01-folder-view')){openFolder(b.dataset.well01FolderView,b.dataset.folderId);return}
 if(b.matches('[data-elwp-open-sleep],[data-elwp-edit-sleep],[data-wellness-add="sleep"],[data-wellness-edit="sleep"]'))openSleep(b.dataset.elwpEditSleep||b.dataset.id||'');
 else openPlan(b.dataset.wellnessPlanFolderAdd||b.dataset.wellnessPlanFolder||b.dataset.wellnessPlanEdit||b.dataset.well01PlanEdit,{folderId:b.dataset.folderId||'',add:!!b.dataset.wellnessPlanFolderAdd});
}
document.addEventListener('click',routeClick,true);
document.addEventListener('click',e=>{if(e.target.closest('#elwp-sleep-dashboard [data-elwp-action="open-sleep"]')){e.preventDefault();openSleep()}});
for(const event of ['elara:open','elara:account-ready','elara:wellness-saved','elara:locale-changed'])window.addEventListener(event,()=>setTimeout(renderSleepOverview,40));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderSleepOverview,250),{once:true});else setTimeout(renderSleepOverview,250);
window.ElaraWellnessPopups={openPlan,openFolder,openSleep,close,renderSleepOverview,sleepMinutes};
})();
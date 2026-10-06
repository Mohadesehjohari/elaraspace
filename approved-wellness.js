/* Elara approved wellness: account-scoped local data, compact water UI, line sleep chart, no public health sharing. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tx=(fa,en)=>document.documentElement.lang==='en'?en:fa;
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date()),uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
const storageKey=()=>`elara_private_wellness_v1_${uid()}`;
const defaults=()=>({weight:'',targetWeight:'',goal:2000,glass:250,water:{},sleep:[],workouts:[],cycles:[],workoutPlanNote:'',nutritionPlanNote:'',workoutPlanFolders:[],nutritionPlanFolders:[]});
function read(){if(!uid())return defaults();try{const value=JSON.parse(localStorage.getItem(storageKey())||'{}');return {...defaults(),...value,targetWeight:value.targetWeight??'',water:value.water&&typeof value.water==='object'?value.water:{},sleep:Array.isArray(value.sleep)?value.sleep:[],workouts:Array.isArray(value.workouts)?value.workouts:[],cycles:Array.isArray(value.cycles)?value.cycles:[],workoutPlanNote:String(value.workoutPlanNote||'').slice(0,5000),nutritionPlanNote:String(value.nutritionPlanNote||'').slice(0,5000),workoutPlanFolders:Array.isArray(value.workoutPlanFolders)?value.workoutPlanFolders:[],nutritionPlanFolders:Array.isArray(value.nutritionPlanFolders)?value.nutritionPlanFolders:[]}}catch{return defaults()}}
function write(patch){if(!uid()){message('برای ذخیرهٔ داده‌های خصوصی ابتدا وارد حساب شو.');return false}try{localStorage.setItem(storageKey(),JSON.stringify({...read(),...patch}));refresh();window.dispatchEvent(new CustomEvent('elara:wellness-saved',{detail:patch}));return true}catch{message('ذخیرهٔ اطلاعات روی این دستگاه انجام نشد.');return false}}
function message(s){const el=$('wellness-status');if(el)el.textContent=s}
function profileSex(){const p=window.ElaraSocial?.me||window.ElaraAccount?.profile||{},privateProfile=window.ElaraProfileSystem?.readPrivate?.()||{},raw=String(p.sex||p.gender||privateProfile.sex||'').toLowerCase();if(['woman','female','f','زن'].includes(raw))return'female';if(['man','male','m','مرد'].includes(raw))return'male';if(raw)return'other';return''}
function cycleApplicable(){return profileSex()==='female'&&(window.ElaraProfileSystem?.readPrivate?.().periodEnabled!==false)}
function profileSettingsCopy(){const sex=profileSex();if(sex)return sex==='female'?'اطلاعات پروفایل برای امکانات اختیاری سلامت اعمال شده است.':'این پروفایل به ماژول چرخه نیاز ندارد.';return'اطلاعات لازم در پروفایل کامل نشده؛ از ویرایش پروفایل تکمیلش کن.'}
const num=(v,min,max)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):min};
const days=()=>Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-6+i);return iso(d)});
const fmt=n=>Number(n||0).toLocaleString('fa-IR');
const svgIcon=name=>window.ElaraIcons?.icon?.(name)||(()=>{
 const paths={
  sleep:'<path d="M20 15.2A8 8 0 1 1 8.8 4 6.8 6.8 0 0 0 20 15.2Z"/>',
  workout:'<path d="M6 7h2m8 0h2M4 5v4m4-5v6m8-6v6m4-5v4M8 7h8M5 17c3-3 5-2 7 0s4 3 7-1"/>',
  cycle:'<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  person:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
  water:'<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/><path d="M9 15c.6 1.3 1.6 2 3 2"/>'
 };
 return `<span class="pass2-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name]||paths.person}</svg></span>`;
})();
function barChart(values,max,label){const m=Math.max(1,max,...values);return `<div class="wellness-chart" role="img" aria-label="${esc(label)}">${days().map((date,i)=>`<div class="wellness-chart-day" title="${esc(date)}: ${fmt(values[i])}"><span>${fmt(values[i])}</span><div class="wellness-chart-track"><i style="height:${Math.max(2,Math.round(values[i]/m*100))}%"></i></div><small>${new Date(date+'T12:00:00').toLocaleDateString('fa-IR',{weekday:'short'})}</small></div>`).join('')}</div>`}
function lineChart(values,label){
 if(!values.some(v=>Number(v)>0))return '<div class="wellness-empty-chart">هنوز دادهٔ خوابی برای هفت روز اخیر ثبت نشده است.</div>';
 const width=350,height=100,left=18,right=8,top=12,bottom=22,max=Math.max(10,...values,1),usableW=width-left-right,usableH=height-top-bottom;
 const pts=values.map((v,i)=>({x:left+i*(usableW/6),y:top+(1-Math.min(max,Number(v)||0)/max)*usableH,v:Number(v)||0,date:days()[i]}));
 const poly=pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
 const labels=pts.map((p,i)=>`<text x="${p.x.toFixed(1)}" y="96" text-anchor="middle">${new Date(p.date+'T12:00:00').toLocaleDateString('fa-IR',{weekday:'narrow'})}</text>`).join('');
 const circles=pts.map(p=>`<circle class="point" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"><title>${esc(p.date)} · ${fmt(p.v)} ساعت</title></circle>`).join('');
 return `<div class="wellness-sleep-line" role="img" aria-label="${esc(label)}"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><line class="axis" x1="${left}" x2="${width-right}" y1="${height-bottom}" y2="${height-bottom}"/><polyline class="line" points="${poly}"/>${circles}${labels}</svg></div>`;
}
function weeklyAnalysis(s){
 const week=days(),goal=Math.max(250,Number(s.goal)||2000),waterRows=week.map(date=>Number(s.water?.[date]||0)),waterRecorded=waterRows.filter(v=>v>0),waterPct=waterRecorded.length?Math.round(waterRecorded.reduce((n,v)=>n+Math.min(1.5,v/goal),0)/waterRecorded.length*100):null;
 const sleepRows=week.map(date=>s.sleep.filter(x=>x.date===date).reduce((n,x)=>n+sleepMinutes(x),0)/60).filter(v=>v>0),sleepAvg=sleepRows.length?Math.round(sleepRows.reduce((a,b)=>a+b,0)/sleepRows.length*10)/10:null;
 const workoutMinutes=s.workouts.filter(x=>week.includes(x.date)).reduce((n,x)=>n+(Number(x.minutes)||0),0);
 const insights=[];
 if(waterPct==null)insights.push({kind:'water',icon:'💧',title:'آب',text:'برای تحلیل آب، چند روز مصرفت را ثبت کن.'});
 else if(waterPct>=85)insights.push({kind:'water',icon:'💧',title:'آب',text:'نسبت به هدف شخصی خودت، آب این هفته خوب پیش رفته ✨'});
 else insights.push({kind:'water',icon:'💧',title:'آب',text:'میانگین آب ثبت‌شده هنوز از هدف شخصی‌ات فاصله دارد؛ چند لیوان را در طول روز پخش کن.'});
 if(sleepAvg==null)insights.push({kind:'sleep',icon:'🌙',title:'خواب',text:'چند شب خواب ثبت کن تا الگو روشن‌تر شود.'});
 else if(sleepAvg<7)insights.push({kind:'sleep',icon:'🌙',title:'خواب',text:'خواب ثبت‌شدهٔ این هفته کوتاه‌تر بوده؛ اگر می‌توانی برای استراحت زمان بیشتری کنار بگذار.'});
 else if(sleepAvg<=9)insights.push({kind:'sleep',icon:'😴',title:'خواب',text:'میانگین خواب ثبت‌شده منظم‌تر به نظر می‌رسد؛ همین ریتم را حفظ کن ✨'});
 else insights.push({kind:'sleep',icon:'🌙',title:'خواب',text:'میانگین خواب ثبت‌شده طولانی است؛ ثبات ساعت خواب و بیداری را مرور کن.'});
 if(workoutMinutes>=150)insights.push({kind:'workout',icon:'🔥',title:'حرکت',text:'این هفته زمان خوبی برای حرکت ثبت کردی؛ عالی ادامه بده 💪'});
 else if(workoutMinutes>0)insights.push({kind:'workout',icon:'⚡',title:'حرکت',text:'حرکت شروع شده؛ چند جلسهٔ کوتاه دیگر می‌تواند تداومت را قوی‌تر کند.'});
 else insights.push({kind:'workout',icon:'👟',title:'حرکت',text:'هنوز ورزشی برای این هفته ثبت نشده؛ حتی یک حرکت کوتاه هم شروع حساب می‌شود.'});
 return {waterPct,sleepAvg,workoutMinutes,insights}
}
function normalizeWorkout(inputs,old={},id=''){const type=String(inputs?.type||''),customType=type==='ورزش دیگر'?String(inputs?.customType||'').trim().slice(0,80):'';return {...old,...inputs,id:id||old.id||'',type,customType,minutes:num(inputs?.minutes,1,1440)}}
function normalizeCycle(inputs,old={},id=''){return {...old,...inputs,id:id||old.id||'',note:String(inputs?.note||'').trim().slice(0,240)}}
function sleepMinutes(row){const a=Date.parse(`${row.date}T${row.bed}:00`),b=Date.parse(`${row.date}T${row.wake}:00`);if(!Number.isFinite(a)||!Number.isFinite(b))return 0;const minutes=Math.round((b<=a?b+86400000:b)-a)/60000;return minutes>0&&minutes<=1440?minutes:0}
function panel(){if($('panel-exercise'))return;const el=document.createElement('section');el.id='panel-exercise';el.className='panel hidden wellness-panel';el.innerHTML=`<header class="wellness-heading"><button type="button" class="quiet-button" data-wellness-back>→ بازگشت</button><div><h1>ورزش و حالِ خوب <img src="assets/ui/green_heart.webp" alt="" width="36" height="36"></h1><p class="muted">آب، خواب و فعالیت روزانه را در فضای خصوصی خودت ثبت کن.</p></div></header><div class="wellness-banner"><strong>هر قدم کوچک، راه تازه‌ای می‌سازد</strong><span>فضایی برای ثبت شخصی؛ بدون مقایسه با دیگران.</span></div><div class="wellness-layout">
<section class="elara-card wellness-analysis"><header><h2>✨ تحلیل این هفته</h2><span>فقط بر پایهٔ ثبت‌های خودت</span></header><div id="wellness-analysis"></div><small class="wellness-analysis-note">این جمع‌بندی تشخیص یا توصیهٔ پزشکی نیست؛ فقط الگوهای ثبت‌شده و هدف‌های شخصی خودت را خلاصه می‌کند.</small></section>
<section class="elara-card wellness-plans"><header><div><h2>📝 برنامه‌های شخصی من</h2><span>نوت‌ها را مثل کارت کنار هم بساز و افقی ورق بزن.</span></div><div class="wellness-plan-quick-add"><button type="button" class="quiet-button" data-wellness-plan-folder-add="workout">+ باکس ورزشی</button><button type="button" class="quiet-button" data-wellness-plan-folder-add="nutrition">+ باکس تغذیه</button></div></header><div class="wellness-plan-strip" id="wellness-plan-strip"></div></section>
<section class="elara-card wellness-water"><header><h2><span class="pass2-icon pass2-icon-image" aria-hidden="true"><img src="assets/ui/icon-wellness-water.webp" alt=""></span> آب امروز</h2><span id="wellness-water-total"></span></header>
<div class="wellness-water-visual"><div class="wellness-glass" aria-hidden="true"><div id="wellness-water-glass-fill" class="wellness-glass-fill"></div></div><div class="wellness-water-summary"><strong id="wellness-water-amount">۰ / ۰ ml</strong><b id="wellness-water-percent">۰٪</b><small>مصرف ثبت‌شده نسبت به هدف شخصی امروز</small><div class="wellness-water-controls"><button class="quiet-button" type="button" data-wellness-water="remove" aria-label="کم کردن یک لیوان">−</button><span>یک لیوان</span><button class="primary-button" type="button" data-wellness-water="add" aria-label="افزودن یک لیوان">+</button></div></div></div>
<div class="wellness-water-settings"><label>وزن فعلی اختیاری (کیلوگرم)<input id="wellness-weight" type="number" inputmode="decimal" min="1" max="400" step="0.1"></label><label>وزن هدف اختیاری (کیلوگرم)<input id="wellness-target-weight" type="number" inputmode="decimal" min="1" max="400" step="0.1"></label><label>هدف آب (میلی‌لیتر)<input id="wellness-goal" type="number" inputmode="numeric" min="250" max="10000" step="50"></label><label>حجم یک لیوان (میلی‌لیتر)<input id="wellness-glass" type="number" inputmode="numeric" min="50" max="1000" step="25"></label><div class="wellness-weight-status"><span>اختلاف ثبت‌شده تا هدف: <b id="wellness-weight-diff">—</b></span><span>این بخش فقط ثبت شخصی است و قضاوت یا توصیهٔ پزشکی ارائه نمی‌کند.</span></div></div>
<button class="quiet-button wellness-compact-save" type="button" data-wellness-save-settings>ذخیرهٔ تنظیمات</button><h3>آب در هفت روز اخیر</h3><div id="wellness-water-chart"></div></section>
<section class="elara-card wellness-sleep"><header><h2>${svgIcon('sleep')} خواب من</h2><button type="button" class="elara-link" data-wellness-add="sleep">+ ثبت خواب</button></header><div id="wellness-sleep-list"></div><h3>ساعت خواب در هفت روز اخیر</h3><div id="wellness-sleep-chart"></div></section>
<section class="elara-card wellness-workouts"><header><h2>${svgIcon('workout')} ورزش امروز</h2><button type="button" class="elara-link" data-wellness-add="workout">+ ثبت ورزش</button></header><div id="wellness-workout-list"></div></section>
<section class="elara-card wellness-profile-context wellness-personal-settings"><header><h2>${svgIcon('person')} اطلاعات پروفایل</h2><button type="button" class="elara-link" data-wellness-profile>ویرایش پروفایل</button></header><p class="muted" id="wellness-profile-context"></p><div id="wellness-cycle" hidden><header><h3>${svgIcon('cycle')} ثبت اختیاری چرخه</h3><button type="button" class="elara-link" data-wellness-add="cycle">+ ثبت تاریخ</button></header><p class="muted">این داده خصوصی است و در رنکینگ یا فید دوستان منتشر نمی‌شود.</p><div id="wellness-cycle-list"></div></div></section>
</div><p class="muted" id="wellness-status" role="status"></p>`;document.querySelector('#main')?.prepend(el)}
function planFolderKey(kind){return kind==='nutrition'?'nutritionPlanFolders':'workoutPlanFolders'}
function planFolders(s,kind){return (Array.isArray(s[planFolderKey(kind)])?s[planFolderKey(kind)]:[]).filter(x=>x&&x.id&&x.title).slice(0,60)}
function planFolderMarkup(s,kind){const rows=planFolders(s,kind),legacy=String(kind==='nutrition'?s.nutritionPlanNote:s.workoutPlanNote||'').trim();return '<div class="wellness-plan-folder-list">'+(legacy?'<button type="button" class="wellness-plan-folder legacy" data-wellness-plan-edit="'+kind+'"><span>📝</span><strong>'+esc(tx('یادداشت قبلی','Previous note'))+'</strong><small>'+esc(legacy.slice(0,90))+'</small></button>':'')+rows.map(x=>'<button type="button" class="wellness-plan-folder" data-wellness-plan-folder="'+esc(kind)+'" data-folder-id="'+esc(x.id)+'"><span>📁</span><strong data-elara-ugc dir="auto">'+esc(x.title)+'</strong><small data-elara-ugc dir="auto">'+esc(String(x.note||'').slice(0,90)||tx('برای دیدن برنامه باز کن','Open to view plan'))+'</small></button>').join('')+'</div><button type="button" class="quiet-button wellness-plan-folder-add" data-wellness-plan-folder-add="'+kind+'">+ '+tx('پوشه جدید','New folder')+'</button>'}
async function planFolderEditor(kind,folderId=''){
 if(!uid())return message(tx('برای ثبت اطلاعات ابتدا وارد حساب شو.','Sign in to save private notes.'));const s=read(),key=planFolderKey(kind),rows=planFolders(s,kind),old=rows.find(x=>x.id===folderId)||{},form=document.createElement('div');form.className='wellness-plan-editor wellness-plan-folder-editor';form.innerHTML='<label>'+tx('نام پوشه','Folder name')+'<input name="title" maxlength="80" data-elara-ugc dir="auto" value="'+esc(old.title||'')+'" placeholder="'+esc(kind==='nutrition'?tx('مثلاً وعده‌های هفتگی','e.g. Weekly meals'):tx('مثلاً انعطاف','e.g. Flexibility'))+'"></label><label>'+tx('برنامه / نوت','Plan / note')+'<textarea name="note" maxlength="5000" rows="10" data-elara-ugc dir="auto" placeholder="'+esc(tx('برنامه‌ات را سریع اینجا بنویس…','Write your plan here…'))+'">'+esc(old.note||'')+'</textarea></label>';
 const ok=await window.ElaraDialog.open({title:old.id?tx('برنامه پوشه','Folder plan'):tx('پوشه جدید','New folder'),content:form,wide:true,actions:[...(old.id?[{label:tx('حذف پوشه','Delete folder'),value:'delete',kind:'danger'}]:[]),{label:tx('انصراف','Cancel'),value:false},{label:tx('ذخیره','Save'),value:true,kind:'primary'}]});if(ok===false||ok==null)return;if(ok==='delete'){const yes=await window.ElaraDialog.confirm(tx('این پوشه و نوت داخلش حذف شود؟','Delete this folder and its note?'),{title:tx('حذف پوشه','Delete folder'),confirmText:tx('حذف','Delete'),danger:true});if(yes)write({[key]:rows.filter(x=>x.id!==old.id)});return}
 const title=String(form.querySelector('[name=title]').value||'').trim().slice(0,80),note=String(form.querySelector('[name=note]').value||'').trim().slice(0,5000);if(!title)return message(tx('برای پوشه یک نام بنویس.','Give the folder a name.'));const row={id:old.id||crypto.randomUUID?.()||('plan-'+Date.now()),title,note,updatedAt:Date.now()},next=old.id?rows.map(x=>x.id===old.id?row:x):[row,...rows];if(write({[key]:next}))message(tx('برنامه ذخیره شد.','Plan saved.'))
}
function refresh(){
 const host=$('panel-exercise');if(!host)return;const s=read(),date=today(),amount=Number(s.water[date]||0),glass=num(s.glass,50,1000),goal=num(s.goal,250,10000),count=Math.round(amount/glass),pct=Math.min(100,goal?amount/goal*100:0);
 $('wellness-water-total').textContent=`${fmt(count)} لیوان`;
 $('wellness-water-amount').textContent=`${fmt(amount)} / ${fmt(goal)} ml`;
 $('wellness-water-percent').textContent=`${fmt(Math.round(pct))}٪`;
 $('wellness-water-glass-fill').style.height=`${pct}%`;
 $('wellness-weight').value=s.weight;$('wellness-target-weight').value=s.targetWeight;$('wellness-goal').value=s.goal;$('wellness-glass').value=s.glass;const pc=$('wellness-profile-context');if(pc)pc.textContent=profileSettingsCopy();
 const current=Number(s.weight),target=Number(s.targetWeight),diff=current>0&&target>0?Math.abs(current-target):null;$('wellness-weight-diff').textContent=diff==null?'—':`${diff.toLocaleString('fa-IR',{maximumFractionDigits:1})} کیلوگرم`;
 const analysis=weeklyAnalysis(s),analysisHost=$('wellness-analysis');if(analysisHost)analysisHost.innerHTML=analysis.insights.map(x=>`<article class="wellness-insight wellness-insight-${x.kind}"><span aria-hidden="true">${x.icon}</span><div><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p></div></article>`).join('');const strip=$('wellness-plan-strip');if(strip){const cards=(kind,label,icon)=>{const rows=planFolders(s,kind),legacy=String(kind==='nutrition'?s.nutritionPlanNote:s.workoutPlanNote||'').trim(),all=[...(legacy?[{id:'legacy',title:label,note:legacy,legacy:true}]:[]),...rows];return all.map(x=>'<button type="button" class="wellness-plan-note-card '+kind+'" '+(x.legacy?'data-wellness-plan-edit="'+kind+'"':'data-wellness-plan-folder="'+kind+'" data-folder-id="'+esc(x.id)+'"')+'><span>'+icon+'</span><small>'+esc(kind==='nutrition'?tx('تغذیه','Nutrition'):tx('ورزش','Workout'))+'</small><strong data-elara-ugc dir="auto">'+esc(x.title)+'</strong><p data-elara-ugc dir="auto">'+esc(String(x.note||'').slice(0,130)||tx('برای نوشتن برنامه باز کن','Open to write your plan'))+'</p></button>').join('')};strip.innerHTML=cards('workout',tx('برنامه تمرینی','Workout plan'),'🏃')+cards('nutrition',tx('برنامه تغذیه','Nutrition plan'),'🥗')+'<button type="button" class="wellness-plan-note-card add" data-wellness-plan-folder-add="workout"><span>＋</span><strong>'+tx('باکس ورزشی','Workout box')+'</strong></button><button type="button" class="wellness-plan-note-card add" data-wellness-plan-folder-add="nutrition"><span>＋</span><strong>'+tx('باکس تغذیه','Nutrition box')+'</strong></button>'}
 $('wellness-cycle').hidden=!cycleApplicable();
 $('wellness-water-chart').innerHTML=barChart(days().map(d=>Math.round(Number(s.water[d]||0)/glass)),Math.ceil(goal/glass),'نمودار تعداد لیوان آب در هفت روز اخیر');
 $('wellness-sleep-chart').innerHTML=lineChart(days().map(d=>+(s.sleep.filter(x=>x.date===d).reduce((n,x)=>n+sleepMinutes(x),0)/60).toFixed(1)),'نمودار خطی ساعت خواب در هفت روز اخیر');
 $('wellness-sleep-list').innerHTML=s.sleep.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(x=>`<div class="wellness-entry"><span>${svgIcon('sleep')} ${esc(x.date)} · ${esc(x.bed)} تا ${esc(x.wake)} · ${fmt(Math.round(sleepMinutes(x)/60*10)/10)} ساعت</span><button type="button" data-wellness-edit="sleep" data-id="${esc(x.id)}">ویرایش</button><button type="button" data-wellness-delete="sleep" data-id="${esc(x.id)}">حذف</button></div>`).join('')||'<p class="muted">هنوز خوابت را ثبت نکردی.</p>';
 $('wellness-workout-list').innerHTML=s.workouts.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15).map(x=>`<div class="wellness-entry"><span>${svgIcon('workout')} ${esc(x.date)} · ${esc(x.type==='ورزش دیگر'?(x.customType||'ورزش دیگر'):x.type)} · ${fmt(x.minutes)} دقیقه</span><button type="button" data-wellness-edit="workout" data-id="${esc(x.id)}">ویرایش</button><button type="button" data-wellness-delete="workout" data-id="${esc(x.id)}">حذف</button></div>`).join('')||'<p class="muted">اولین حرکت امروزت را ثبت کن.</p>';
 $('wellness-cycle-list').innerHTML=s.cycles.slice().sort((a,b)=>b.start.localeCompare(a.start)).map(x=>`<div class="wellness-entry"><span>${esc(x.start)}${x.end?' تا '+esc(x.end):''}${x.note?` · ${esc(x.note)}`:''}</span><button type="button" data-wellness-edit="cycle" data-id="${esc(x.id)}">ویرایش</button><button type="button" data-wellness-delete="cycle" data-id="${esc(x.id)}">حذف</button></div>`).join('')||'<p class="muted">هیچ تاریخی ثبت نشده است.</p>';
 home()
}
function home(){
 const card=$('elara-home-habits');if(card)card.querySelectorAll('[data-wellness-home]').forEach(x=>x.remove());
}
async function editor(kind,id){
 if(!uid())return message('برای ثبت اطلاعات ابتدا وارد حساب شو.');if(!window.ElaraDialog?.open)return message('پنجرهٔ ثبت هنوز آماده نیست.');
 const s=read(),old=(kind==='sleep'?s.sleep:kind==='workout'?s.workouts:s.cycles).find(x=>x.id===id)||{},form=document.createElement('div');form.className='wellness-editor';
 if(kind==='sleep')form.innerHTML=`<label>تاریخ خواب<input type="date" name="date" value="${esc(old.date||today())}"></label><label>ساعت خوابیدن<input type="time" name="bed" value="${esc(old.bed||'23:00')}"></label><label>ساعت بیدارشدن<input type="time" name="wake" value="${esc(old.wake||'07:00')}"></label><small class="muted">اگر ساعت بیداری زودتر باشد، روز بعد در نظر گرفته می‌شود.</small>`;
 if(kind==='workout'){const kinds=['پیاده‌روی','دویدن','دوچرخه','یوگا','شنا','تمرین قدرتی','کشش','ورزش دیگر'],selected=kinds.includes(old.type)?old.type:'ورزش دیگر',custom=old.customType||(kinds.includes(old.type)?'':old.type)||'';form.innerHTML=`<label>تاریخ<input type="date" name="date" value="${esc(old.date||today())}"></label><label>نوع ورزش<select name="type">${kinds.map(x=>`<option ${selected===x?'selected':''}>${x}</option>`).join('')}</select></label><label data-workout-custom ${selected==='ورزش دیگر'?'':'hidden'}>نام ورزش<input type="text" name="customType" maxlength="80" value="${esc(custom)}" placeholder="مثلاً صخره‌نوردی"></label><label>مدت (دقیقه)<input type="number" name="minutes" min="1" max="1440" value="${esc(old.minutes||30)}"></label>`;const select=form.querySelector('[name="type"]'),customRow=form.querySelector('[data-workout-custom]');select?.addEventListener('change',()=>{customRow.hidden=select.value!=='ورزش دیگر';if(!customRow.hidden)form.querySelector('[name="customType"]')?.focus()})}
 if(kind==='cycle')form.innerHTML=`<label>تاریخ شروع<input type="date" name="start" value="${esc(old.start||today())}"></label><label>تاریخ پایان (اختیاری)<input type="date" name="end" value="${esc(old.end||'')}"></label><label>یادداشت اختیاری<textarea name="note" maxlength="240" rows="2" placeholder="یادداشت شخصی…">${esc(old.note||'')}</textarea></label>`;
 const ok=await window.ElaraDialog.open({title:kind==='sleep'?'ثبت خواب':kind==='workout'?'ثبت ورزش':'ثبت اختیاری تاریخ چرخه',content:form,actions:[{label:'انصراف',value:false},{label:'ذخیره',value:true,kind:'primary'}]});if(ok!==true)return;
 const inputs=Object.fromEntries([...form.querySelectorAll('[name]')].map(x=>[x.name,x.value]));
 if(kind==='sleep'&&(!inputs.date||!inputs.bed||!inputs.wake))return message('تاریخ و هر دو ساعت را وارد کن.');
 if(kind==='workout'&&(!inputs.date||!inputs.type||!Number(inputs.minutes)||inputs.type==='ورزش دیگر'&&!inputs.customType.trim()))return message('تاریخ، نوع ورزش، مدت و در صورت انتخاب «ورزش دیگر» نام ورزش را وارد کن.');
 if(kind==='cycle'&&(!inputs.start||inputs.end&&inputs.end<inputs.start))return message('تاریخ شروع و پایان را بررسی کن.');
 if(kind==='cycle'&&!cycleApplicable())return;
 const key=kind==='sleep'?'sleep':kind==='workout'?'workouts':'cycles',current=read(),newId=id||crypto.randomUUID?.()||String(Date.now()),row=kind==='workout'?normalizeWorkout(inputs,old,newId):kind==='cycle'?normalizeCycle(inputs,old,newId):{...old,...inputs,id:newId};if(kind==='sleep'&&!sleepMinutes(row))return message('بازهٔ خواب باید بین یک دقیقه تا ۲۴ ساعت باشد.');
 if(write({[key]:id?current[key].map(x=>x.id===id?row:x):[...current[key],row]}))message('ثبت شد.')
}
async function planEditor(kind){
 if(!uid())return message('برای ثبت اطلاعات ابتدا وارد حساب شو.');if(!window.ElaraDialog?.open)return;
 const key=kind==='nutrition'?'nutritionPlanNote':'workoutPlanNote',current=read(),form=document.createElement('div');form.className='wellness-plan-editor';form.innerHTML=`<label>${kind==='nutrition'?'برنامه تغذیه':'برنامه تمرینی'}<textarea name="note" maxlength="5000" rows="10" data-elara-ugc dir="auto" placeholder="${kind==='nutrition'?'وعده‌ها، خریدها، نکته‌های شخصی…':'تمرین‌ها، ست‌ها، روزها یا هر چیزی که می‌خواهی یادت بماند…'}">${esc(current[key]||'')}</textarea></label><small class="muted">این یادداشت فقط در فضای خصوصی حساب خودت نگه‌داری می‌شود.</small>`;
 const ok=await window.ElaraDialog.open({title:kind==='nutrition'?'برنامه تغذیه':'برنامه تمرینی',content:form,actions:[{label:'انصراف',value:false},{label:'ذخیره',value:true,kind:'primary'}]});if(ok!==true)return;
 const note=String(form.querySelector('[name="note"]').value||'').trim().slice(0,5000);if(write({[key]:note}))message(note?'برنامه ذخیره شد.':'یادداشت برنامه پاک شد.')
}
function relocateFocus(){const tasks=$('elara-home-tasks')?.closest('.elara-card'),focus=$('elara-home-focus')?.closest('.elara-card');if(tasks&&focus&&!tasks.contains(focus)){focus.classList.add('wellness-inline-focus');tasks.append(focus)}}
function wire(){
 panel();relocateFocus();refresh();
 window.addEventListener('elara:open',e=>{if(e.detail?.tab==='home'){relocateFocus();home()}if(e.detail?.tab==='exercise')refresh()});
 for(const name of ['elara:account-ready','elara:privacy-local-changed'])window.addEventListener(name,refresh);
 window.addEventListener('elara:data-changed',home);
 document.addEventListener('click',e=>{
   const back=e.target.closest('[data-wellness-back]');if(back){window.ElaraOpen?.('home');return}
   if(e.target.closest('[data-wellness-profile]')){window.ElaraProfileSystem?.openEditor?.();return}
   const folderAdd=e.target.closest('[data-wellness-plan-folder-add]');if(folderAdd){void planFolderEditor(folderAdd.dataset.wellnessPlanFolderAdd);return}
   const folder=e.target.closest('[data-wellness-plan-folder]');if(folder){void planFolderEditor(folder.dataset.wellnessPlanFolder,folder.dataset.folderId);return}
   const planEdit=e.target.closest('[data-wellness-plan-edit]');if(planEdit){void planEditor(planEdit.dataset.wellnessPlanEdit);return}
   const planDelete=e.target.closest('[data-wellness-plan-delete]');if(planDelete){const key=planDelete.dataset.wellnessPlanDelete==='nutrition'?'nutritionPlanNote':'workoutPlanNote';void window.ElaraDialog?.confirm?.('این یادداشت خصوصی حذف شود؟',{title:'حذف برنامه',confirmText:'حذف',danger:true}).then(ok=>{if(ok)write({[key]:''})});return}
   const add=e.target.closest('[data-wellness-add]');if(add){void editor(add.dataset.wellnessAdd);return}
   const edit=e.target.closest('[data-wellness-edit]');if(edit){void editor(edit.dataset.wellnessEdit,edit.dataset.id);return}
   const del=e.target.closest('[data-wellness-delete]');if(del){const key=del.dataset.wellnessDelete==='workout'?'workouts':del.dataset.wellnessDelete==='sleep'?'sleep':'cycles',s=read();write({[key]:s[key].filter(x=>x.id!==del.dataset.id)});return}
   const water=e.target.closest('[data-wellness-water]');if(water){const s=read(),amount=num(s.water[today()]||0,0,100000),glass=num(s.glass,50,1000);write({water:{...s.water,[today()]:Math.max(0,amount+(water.dataset.wellnessWater==='add'?glass:-glass))}});return}
   if(e.target.closest('[data-wellness-save-settings]')){const w=$('wellness-weight').value,tw=$('wellness-target-weight').value,goal=num($('wellness-goal').value,250,10000),glass=num($('wellness-glass').value,50,1000);if(write({weight:w?num(w,1,400):'',targetWeight:tw?num(tw,1,400):'',goal,glass}))message('تنظیمات ذخیره شد.');return}
   const go=e.target.closest('[data-wellness-home]');if(go){window.ElaraOpen?.('exercise');return}
 });
 window.addEventListener('elara:profile-private-changed',refresh);
}
window.ElaraWellnessTest={defaults,lineChart,sleepMinutes,normalizeWorkout,normalizeCycle,weeklyAnalysis};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
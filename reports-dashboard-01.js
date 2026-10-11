/* REPORTS-01: read-only, account-aware cosmic reports overview. */
(()=>{'use strict';
const $=id=>document.getElementById(id),A=x=>Array.isArray(x)?x:[],N=x=>Number.isFinite(Number(x))?Number(x):0;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x).toLocaleString('fa-IR',{maximumFractionDigits:1});
const valid=d=>window.ElaraSchedule?.validDate?.(d)===true;
const iso=d=>window.ElaraSchedule?.iso?.(d)||[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>iso(new Date()),shift=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)};
const uid=()=>window.ElaraAccount?window.ElaraAccount.user?.uid||null:window.ElaraSocial?.me?.uid||null;
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
const dateOf=ms=>Number.isFinite(Number(ms))&&Number(ms)>0?iso(new Date(Number(ms))):null;
const seenUnique=(xs,key)=>{const seen=new Set();return xs.filter(x=>{const k=key(x);if(!k||seen.has(k))return false;seen.add(k);return true})};
const icon=(name)=>'<span class="elara-reports-icon" aria-hidden="true">'+name+'</span>';
const periodOptions=[['7','هفتگی'],['30','ماهانه'],['90','سه‌ماهه'],['365','سالانه']];
let days=30,rendering=false;
function bucket(date,n){if(n===365)return date.slice(0,7)+'-01';if(n===90){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()-(d.getDay()+1)%7);return iso(d)}return date}
function data(n=days){
 const now=today(),start=shift(now,-n+1),cloudBusy=!!window.ElaraAccount&&!window.ElaraAccount.user&&!document.body.classList.contains('cloud-offline');
 const allowed=!cloudBusy&&!document.body.classList.contains('cloud-locked');
 const state=allowed?read('elara_space_v1',{}):{},who=allowed?uid():null;
 const history=who?A(read('elara_report_history_v1_'+who,[])):[];
 const wellness=who?read('elara_private_wellness_v1_'+who,{}):{};
 const tasks=A(state.tasks),books=A(state.books),focus=A(state.focusSessions);
 const completion=seenUnique(A(state.taskCompletionHistory).filter(r=>r&&valid(r.date)),r=>String(r.taskId||r.key||'')+':'+r.date);
 const taskEvents=completion.map(r=>({date:r.date,at:Number(r.completedAt)||0,label:r.title||'تسک انجام‌شده',kind:'tasks',route:'reports-productivity',value:1}));
 const focusEvents=seenUnique(focus.filter(s=>s&&s.completed!==false&&Number(s.endedAt)>0&&Number(s.durationMin)>0&&Number(s.durationMin)<=180&&dateOf(s.endedAt)),s=>String(s.id||s.endedAt+':'+s.durationMin))
 .map(s=>({date:dateOf(s.endedAt),at:Number(s.endedAt),label:'جلسه تمرکز تکمیل‌شده',kind:'focus',route:'reports-productivity',value:N(s.durationMin)}));
 const words=seenUnique(history.filter(r=>r&&r.type==='wordsReviewed'&&valid(r.date)&&N(r.value)>0&&N(r.value)<=100&&N(r.at)>0),r=>'review:'+r.at+':'+r.date+':'+(r.id||''))
 .map(r=>({date:r.date,at:N(r.at),label:'مرور لایتنر',kind:'words',route:'language-reports',value:N(r.value)}));
 const reading=seenUnique(books.flatMap(b=>A(b.readingLogs).filter(r=>valid(r?.date)&&Number.isInteger(Number(r.pagesRead))&&N(r.pagesRead)>0&&N(r.timestamp)>0&&N(r.toPage)-N(r.fromPage)===N(r.pagesRead)).map(r=>({...r,bookTitle:b.title||'کتاب',bookId:b.id||''}))),r=>r.bookId+':'+r.timestamp+':'+r.fromPage+':'+r.toPage)
 .map(r=>({date:r.date,at:N(r.timestamp),label:'مطالعه «'+r.bookTitle+'»',kind:'reading',route:'library-reports',value:N(r.pagesRead)}));
 const exercise=seenUnique(A(wellness.workouts).filter(w=>valid(w?.date)&&N(w.minutes)>0),w=>String(w.id||w.date+':'+w.minutes+':'+(w.type||'')))
 .map(w=>({date:w.date,at:Number(w.timestamp)||0,label:'ورزش ثبت‌شده',kind:'exercise',route:'wellness-reports',value:N(w.minutes)}));
 const habits=seenUnique(A(state.habits).flatMap(h=>A(h.days).filter(valid).map(date=>({date,id:h.id||h.title||'',label:h.title||'عادت تکمیل‌شده'}))),r=>r.id+':'+r.date)
 .map(r=>({date:r.date,at:0,label:r.label,kind:'habits',route:'reports-productivity',value:1}));
 const events=[...taskEvents,...focusEvents,...words,...reading,...exercise,...habits];
 const inRange=e=>e.date>=start&&e.date<=now;
 const current=events.filter(inRange);
 const daily={};for(let d=start;d<=now;d=shift(d,1))daily[d]={tasks:0,focus:0,words:0,reading:0,exercise:0,habits:0,due:0,doneDue:0};
 const doneKeys=new Set(completion.map(x=>String(x.taskId||'')+':'+x.date));
 for(const ev of current)if(daily[ev.date]&&ev.kind in daily[ev.date])daily[ev.date][ev.kind]+=ev.value;
 // The only percentage in REPORTS-01: completed / scheduled task instances.
 // Never use static goal snapshots to manufacture historic denominators.
 for(const t of tasks.slice(0,3000)){
   if(!t||!t.id||(!valid(t.date)&&!t.recurrenceRule))continue;
   for(const date of Object.keys(daily)){
     const due=window.ElaraSchedule?.taskDue?.(t,date)===true;
     if(!due)continue;
     daily[date].due++;
     if(doneKeys.has(t.id+':'+date))daily[date].doneDue++;
   }
 }
 const rows=Object.entries(daily).map(([date,v])=>({date,...v,pct:v.due?Math.round(100*v.doneDue/v.due):null}));
 const pct=(items)=>{const due=items.reduce((s,r)=>s+r.due,0);return due?Math.round(100*items.reduce((s,r)=>s+r.doneDue,0)/due):null};
 const sum=(items,key)=>items.reduce((s,x)=>s+N(x[key]),0);
 const activeDates=new Set(current.map(e=>e.date));
 const aggregates={tasks:sum(rows,'tasks'),focus:sum(rows,'focus'),words:sum(rows,'words'),reading:sum(rows,'reading'),exercise:sum(rows,'exercise'),habits:sum(rows,'habits'),active:activeDates.size,books:books.filter(b=>b.shelf==='reading').length,pct:pct(rows)};
 // Current-book count is a current-state snapshot, not a historical time series.
 const prevStart=shift(start,-n),previous=events.filter(e=>e.date>=prevStart&&e.date<start);
 const prev={tasks:previous.filter(e=>e.kind==='tasks').length,focus:previous.filter(e=>e.kind==='focus').reduce((s,e)=>s+e.value,0),words:previous.filter(e=>e.kind==='words').reduce((s,e)=>s+e.value,0)};
 return {now,start,n,rows,agg:aggregates,today:daily[now],todayPct:pct(rows.slice(-1)),current,previous,prev,books,events,who,allowed,historyAvailable:!!who};
}
function spark(rows,key){const vals=rows.map(r=>N(r[key]));if(!vals.some(Boolean))return '<span class="elara-reports-no-trend">بدون روند تاریخی</span>';const max=Math.max(1,...vals),take=vals.slice(-20),w=84,h=23;return '<svg class="elara-reports-spark" viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="2" points="'+take.map((v,i)=>[i*(w/Math.max(1,take.length-1)),h-3-(v/max)*(h-7)].join(',')).join(' ')+'"/></svg>'}
function kpi(title,value,unit,symbol,color,trend,foot){return '<article class="elara-reports-kpi" style="--accent:'+color+'"><div class="elara-reports-kpi-icon">'+icon(symbol)+'</div><div><span>'+title+'</span><strong>'+value+'</strong><small>'+unit+'</small></div><footer>'+trend+'<small>'+foot+'</small></footer></article>'}
function topKpis(d){
 const a=d.agg,known=d.allowed,history=d.historyAvailable;
 const f=key=>spark(d.rows,key);
 return '<section class="elara-reports-kpis" aria-label="شاخص‌های اصلی">'+
 kpi('میانگین پیشرفت کل',a.pct===null?'—':fmt(a.pct)+'٪',a.pct===null?'بدون هدف زمان‌دار':'تکمیل برنامه‌های زمان‌دار','◎','#ca6bff',f('doneDue'),'در بازه انتخابی')+
 kpi('کتاب‌های در حال مطالعه',known?fmt(a.books):'—','کتاب فعال در حال حاضر','▤','#a587ff',f('reading'),'وضعیت فعلی کتابخانه')+
 kpi('واژه‌های مرورشده',history?fmt(a.words):'—',history?'مرور معتبر':'نیاز به حساب','▣','#39c6ff',f('words'),'تاریخچه همین دستگاه')+
 kpi('تسک‌های انجام‌شده',known?fmt(a.tasks):'—','تسک','☑','#50e8dd',f('tasks'),'تکمیل ثبت‌شده')+
 kpi('زمان تمرکز',known?fmt(Math.round(a.focus/60*10)/10):'—','ساعت تکمیل‌شده','◷','#665dff',f('focus'),'جلسه کامل')+
 kpi('روزهای فعال',known?fmt(a.active):'—','روز یکتا','▦','#23d3ff',f('tasks'),'فعالیت ثبت‌شده')+'</section>';
}
function trend(d){
 const map=new Map(),now=d.now;
 for(const row of d.rows){
  const key=bucket(row.date,d.n),v=map.get(key)||{date:key,tasks:0,focus:0,due:0,doneDue:0};
  v.tasks+=row.tasks;v.focus+=row.focus;v.due+=row.due;v.doneDue+=row.doneDue;map.set(key,v);
 }
 const rows=[...map.values()].map(v=>({...v,pct:v.due?Math.round(100*v.doneDue/v.due):null}));
 const hasActivity=rows.some(r=>r.tasks||r.focus||r.pct!==null);
 if(!hasActivity)return '<div class="elara-reports-empty">هنوز دادهٔ تاریخ‌دار کافی برای نمایش روند در این بازه ندارید.</div>';
 const W=880,H=302,x0=50,x1=816,top=35,bot=197,lowerTop=236,lowerBot=279;
 const step=(x1-x0)/Math.max(1,rows.length),maxTask=Math.max(1,...rows.map(r=>r.tasks)),maxFocus=Math.max(1,...rows.map(r=>r.focus));
 const px=i=>x0+(i+.5)*step,sy=(v,max)=>bot-(v/max)*(bot-top);
 const bars=rows.map((r,i)=>r.tasks?'<rect class="elara-reports-hit" tabindex="0" data-report-point="'+i+'" x="'+(px(i)-Math.min(15,step*.30))+'" y="'+sy(r.tasks,maxTask)+'" rx="4" width="'+Math.min(30,step*.60)+'" height="'+(bot-sy(r.tasks,maxTask))+'" fill="#7756ee"><title>'+esc(r.date)+' · '+fmt(r.tasks)+' تسک</title></rect>':'').join('');
 const line=(key,max,color)=>{
  const points=rows.map((r,i)=>[px(i),sy(r[key],max)]).map(p=>p.join(',')).join(' ');
  return '<polyline points="'+points+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+
   rows.map((r,i)=>'<circle class="elara-reports-hit" tabindex="0" data-report-point="'+i+'" cx="'+px(i)+'" cy="'+sy(r[key],max)+'" r="4" fill="'+color+'"><title>'+esc(r.date)+' · '+fmt(r[key])+' دقیقه</title></circle>').join('')
 };
 let progress='';let segment=[];
 const flush=()=>{if(segment.length>1)progress+='<polyline fill="none" stroke="#e26bfe" stroke-width="2.5" points="'+segment.join(' ')+'"/>';segment=[]};
 rows.forEach((r,i)=>{if(r.pct===null){flush()}else segment.push(px(i)+','+(lowerBot-(r.pct/100)*(lowerBot-lowerTop)))});flush();
 const dots=rows.map((r,i)=>r.pct===null?'':'<circle tabindex="0" class="elara-reports-hit" data-report-point="'+i+'" cx="'+px(i)+'" cy="'+(lowerBot-r.pct/100*(lowerBot-lowerTop))+'" r="4" fill="#e26bfe"><title>'+esc(r.date)+' · '+r.pct+'٪</title></circle>').join('');
 const grids=[0,.5,1].map(v=>'<line x1="'+x0+'" y1="'+sy(v*maxTask,maxTask)+'" x2="'+x1+'" y2="'+sy(v*maxTask,maxTask)+'" stroke="#7a98e7" stroke-opacity=".14" stroke-dasharray="3 5"/><text x="'+(x0-7)+'" y="'+(sy(v*maxTask,maxTask)+4)+'" text-anchor="end">'+fmt(v*maxTask)+'</text><text x="'+(x1+8)+'" y="'+(sy(v*maxFocus,maxFocus)+4)+'">'+fmt(Math.round(v*maxFocus))+'</text>').join('');
 const labels=rows.map((r,i)=>i%Math.max(1,Math.ceil(rows.length/9))===0?'<text x="'+px(i)+'" y="218" text-anchor="middle">'+esc(r.date.slice(5))+'</text>':'').join('');
 return '<div class="elara-reports-legend"><span><i class="tasks"></i>تسک (تعداد)</span><span><i class="focus"></i>تمرکز (دقیقه)</span><span><i class="progress"></i>پیشرفت برنامه (٪)</span></div>'+
 '<div class="elara-reports-plot-scroll"><svg class="elara-reports-plot" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="نمودار ترکیبی: ستون‌های تسک، خط دقیقه تمرکز و نوار مستقل درصد برنامه. جدول جزئیات در ادامه قرار دارد.">'+
 '<text x="50" y="16">تعداد تسک</text><text x="816" y="16" text-anchor="end">دقیقه تمرکز</text>'+grids+bars+(rows.some(r=>r.focus>0)?line('focus',maxFocus,'#38caff'):'')+
 '<line x1="'+x0+'" y1="'+lowerBot+'" x2="'+x1+'" y2="'+lowerBot+'" stroke="#a77dff" stroke-opacity=".5"/><text x="15" y="'+lowerTop+'">۱۰۰٪</text><text x="22" y="'+lowerBot+'">۰٪</text>'+progress+dots+labels+
 '</svg></div><p class="elara-reports-plot-status" aria-live="polite">برای دیدن عدد و تاریخ، روی نقطه نمودار لمس یا با Tab انتخاب کنید.</p>'+
 '<details class="elara-reports-table"><summary>جدول داده‌های نمودار و مقیاس‌ها</summary><div class="elara-reports-table-scroll"><table><thead><tr><th>شروع بازه</th><th>تسک (تعداد)</th><th>تمرکز (دقیقه)</th><th>تکمیل برنامه</th></tr></thead><tbody>'+
 rows.map(r=>'<tr><td>'+esc(r.date)+'</td><td>'+fmt(r.tasks)+'</td><td>'+fmt(r.focus)+'</td><td>'+(r.pct===null?'نامشخص':fmt(r.pct)+'٪')+'</td></tr>').join('')+
 '</tbody></table></div></details>';
}
function summary(d){
 const t=d.today||{},p=d.todayPct;
 return '<article class="elara-reports-panel elara-reports-today"><header><div><h2>خلاصه امروز</h2><p>'+esc(new Date(d.now+'T12:00:00').toLocaleDateString('fa-IR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}))+'</p></div><span class="elara-reports-heading-icon">▦</span></header>'+
 '<div class="elara-reports-ring" style="--progress:'+(p??0)+'"><strong>'+(p===null?'—':fmt(p)+'٪')+'</strong><small>'+(p===null?'بدون مبنای روزانه':'پیشرفت امروز')+'</small></div>'+
 (p===null?'<p class="elara-reports-note">هنوز مبنای کافی برای محاسبه پیشرفت امروز ثبت نشده است.</p>':'')+
 '<div class="elara-reports-today-rows">'+[['◷','زمان تمرکز',fmt(t.focus||0)+' دقیقه'],['☑','تسک‌های انجام‌شده',fmt(t.tasks||0)+' تسک'],['▤','واژه‌های مرورشده',d.historyAvailable?fmt(t.words||0)+' مرور':'بدون سابقه حساب'],['⌁','ورزش ثبت‌شده',fmt(t.exercise||0)+' دقیقه']].map(x=>'<div><b>'+x[0]+'</b><span>'+x[1]+'</span><strong>'+x[2]+'</strong></div>').join('')+'</div>'+
 '<button type="button" class="elara-reports-button" data-reports-route="reports-today">مشاهده جزئیات امروز ←</button>'+
 '<p class="elara-reports-note">'+(d.current.some(e=>e.date===d.now)?'فعالیت‌های ثبت‌شده امروز در گزارش جزئیات قابل مشاهده است.':'هنوز فعالیتی برای امروز ثبت نشده است.')+'</p></article>';
}
const sectionDefs=[
 ['زبان','▤','words','مرور ثبت‌شده','language-reports','#38caff'],
 ['کتابخانه','◫','reading','صفحات مطالعه‌شده','library-reports','#6d9bff'],
 ['تسک‌ها','☑','tasks','تکمیل ثبت‌شده','reports-productivity','#52e2aa'],
 ['اتاق تمرکز','◎','focus','دقیقه تکمیل‌شده','reports-productivity','#9e60ff'],
 ['ورزش و سلامتی','⌁','exercise','دقیقه ورزش','wellness-reports','#ffa45a'],
 ['آزادی','✧',null,'داده گزارش‌پذیر در دسترس نیست','freedom','#42d5f6']
];
function sections(d){
 return '<section class="elara-reports-panel elara-reports-sections"><header><div><h2>◈ گزارش بخش‌ها</h2><p>عملکرد شما در هر بخش از الارا</p></div></header><div class="elara-reports-sections-grid">'+
 sectionDefs.map(def=>'<button type="button" class="elara-reports-section" style="--accent:'+def[5]+'" data-reports-route="'+def[4]+'"><span class="elara-reports-section-top">'+icon(def[1])+'<strong>'+def[0]+'</strong><b aria-hidden="true">←</b></span><strong class="elara-reports-section-value">'+(def[2]===null?'—':fmt(d.agg[def[2]]))+' <small>'+def[3]+'</small></strong>'+
 (def[2]&&d.agg[def[2]]?spark(d.rows,def[2]):'<span class="elara-reports-no-trend">دادهٔ روند موجود نیست</span>')+'</button>').join('')+'</div></section>';
}
function insights(d){
 const cards=[],p=d.prev,a=d.agg;
 const percent=(cur,prev)=>prev>0?Math.round((cur-prev)/prev*100):null;
 const taskChange=percent(a.tasks,p.tasks),focusChange=percent(a.focus,p.focus);
 if(taskChange!==null&&taskChange>0)cards.push(['↗','بهترین عملکرد','تعداد تکمیل تسک‌ها '+fmt(taskChange)+'٪ بیشتر از بازه قبل است.','reports-productivity']);
 if(focusChange!==null&&focusChange<0)cards.push(['↘','نیاز به توجه','دقیقه تمرکز '+fmt(-focusChange)+'٪ نسبت به بازه قبل کمتر است.','reports-productivity']);
 const book=d.books.find(b=>b.shelf==='reading'&&N(b.totalPages)>N(b.currentPage));
 if(book)cards.push(['✦','پیشنهاد امروز','ادامه مطالعه «'+book.title+'»؛ '+fmt(N(book.totalPages)-N(book.currentPage))+' صفحه باقی مانده است.','library-reports']);
 if(!cards.length)cards.push(['✧','داده کافی نیست','برای تحلیل روند، به ثبت معتبر در دو بازه یا کتاب در حال مطالعه نیاز است.','reports-productivity']);
 return '<section class="elara-reports-panel elara-reports-insights"><header><div><h2>✧ بینش‌ها و پیشنهادها</h2><p>پیشنهادهای مبتنی بر قواعد و داده‌های واقعی</p></div></header><div class="elara-reports-insight-grid">'+cards.slice(0,3).map(c=>'<button type="button" data-reports-route="'+c[3]+'"><b>'+c[0]+'</b><strong>'+c[1]+'</strong><small>'+esc(c[2])+'</small><span>مشاهده بخش ←</span></button>').join('')+'</div></section>';
}
function activities(d,todaysOnly=false){
 const events=d.current.filter(e=>!todaysOnly||e.date===d.now).sort((a,b)=>b.date.localeCompare(a.date)||(b.at-a.at)).slice(0,todaysOnly?50:7);
 return '<section class="elara-reports-panel elara-reports-activities"><header><div><h2>◷ آخرین فعالیت‌ها</h2><p>رویدادهای ثبت‌شده در بازه انتخابی</p></div></header>'+
 (events.length?'<div class="elara-reports-activity-list">'+events.map(e=>'<button type="button" data-reports-route="'+e.route+'"><span class="elara-reports-activity-symbol">'+({focus:'◷',tasks:'☑',words:'▤',reading:'◫',exercise:'⌁',habits:'✓'}[e.kind]||'✧')+'</span><span><strong>'+esc(e.label)+'</strong><small>'+esc(e.date)+(e.at?' · '+esc(new Date(e.at).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})):'')+'</small></span><b>'+fmt(e.value)+' '+({focus:'دقیقه',reading:'صفحه',exercise:'دقیقه',words:'مرور',tasks:'تسک',habits:'بار'}[e.kind]||'')+'</b></button>').join('')+'</div>':'<p class="elara-reports-empty">فعالیت معتبری برای نمایش در این بازه ثبت نشده است.</p>')+'</section>';
}
function render(){
 if(rendering)return;
 const panel=$('panel-reports');if(!panel)return;
 rendering=true;
 try{
 const d=data();
 let hero=panel.querySelector(':scope > .feature-hub-hero, :scope > .elara-global-hero');
 if(!hero){hero=document.createElement('section');hero.className='feature-hub-hero';hero.dataset.hubHero='reports';panel.prepend(hero)}
 hero.dataset.hubHero='reports';hero.dataset.elaraPageHero='reports';hero.classList.add('feature-hub-hero','elara-reports-hero');hero.innerHTML='<div class="elara-reports-hero-content"><small>خانه ‹ گزارش‌ها</small><h1>گزارش‌های کل</h1><p>مروری جامع بر عملکرد و پیشرفت شما در تمام بخش‌های الارا</p></div>';
 let root=$('elara-reports-overview');if(!root){root=document.createElement('div');root.id='elara-reports-overview';root.className='elara-reports-dashboard';panel.append(root)}
 root.innerHTML=topKpis(d)+
 '<div class="elara-reports-main"><section class="elara-reports-panel elara-reports-trends"><header><div><h2>▥ روند کلی پیشرفت</h2><p>نمای کلی فعالیت‌های شما در سراسر الارا</p></div><div class="elara-reports-periods" role="group" aria-label="بازه گزارش">'+periodOptions.map(o=>'<button type="button" data-reports-days="'+o[0]+'" aria-pressed="'+(Number(o[0])===days)+'">'+o[1]+'</button>').join('')+'</div></header>'+trend(d)+'</section>'+summary(d)+'</div>'+
 '<div class="elara-reports-lower"><div>'+sections(d)+insights(d)+'</div>'+activities(d)+'</div>'+
 '<p class="elara-reports-source">منابع: تسک، مطالعه و پومودوروی تکمیل‌شده از داده‌های حسابِ بارگذاری‌شده؛ تاریخچه مرور لایتنر از حافظه همین دستگاه. گزارش‌ها فقط خواندنی‌اند. درصد کل و امروز = تکمیل‌های دارای تاریخچه / تسک‌های زمان‌بندی‌شده همان بازه. روز بدون برنامه در مخرج وارد نمی‌شود.</p>';
 panel.querySelectorAll(':scope > .feature-hub-launchers[data-hub-kind="reports"]').forEach(x=>x.remove());
 const todayPanel=$('panel-reports-today');if(todayPanel){
   todayPanel.classList.add('elara-reports-today-page');
   todayPanel.innerHTML='<header class="elara-reports-detail-head"><button type="button" data-reports-route="reports">→ بازگشت به گزارش‌های کل</button><h1>گزارش امروز</h1><p>'+esc(new Date(d.now+'T12:00:00').toLocaleDateString('fa-IR'))+'</p></header><div class="elara-reports-detail-grid">'+summary(d)+activities(d,true)+'</div>';
 }
 }finally{rendering=false}
}
function normalizeHomeReportsEntry(){
 const home=$('panel-home');if(!home)return;
 const choices=[...home.querySelectorAll('.ref-hero-actions')];
 const canonical=choices.find(g=>g.querySelector('.ref-hero-reports')&&g.querySelector('.ref-hero-continue')&&!g.closest('[hidden],.hidden'))||choices.find(g=>g.querySelector('.ref-hero-reports')&&g.querySelector('.ref-hero-continue'))||choices[0];
 for(const cls of ['ref-hero-reports','ref-hero-continue']){
  const nodes=[...home.querySelectorAll('.'+cls)];
  if(nodes.length<2)continue;
  const keep=(canonical&&nodes.find(b=>canonical.contains(b)))||nodes[0];
  for(const node of nodes)if(node!==keep)node.remove();
 }
}
function open(route){window.ElaraOpen?.(route,{history:'push'})}
document.addEventListener('click',e=>{
 const range=e.target.closest('#elara-reports-overview [data-reports-days]');
 if(range){e.preventDefault();days=Number(range.dataset.reportsDays);render();return}
 const route=e.target.closest('#panel-reports [data-reports-route],#panel-reports-today [data-reports-route]');
 if(route){e.preventDefault();open(route.dataset.reportsRoute);return}
});
function pointText(node){
 const root=node.closest('.elara-reports-trends'),i=Number(node.dataset.reportPoint);if(!root||!Number.isInteger(i))return;
 const d=data(),rows=new Map();for(const row of d.rows){const key=bucket(row.date,d.n),r=rows.get(key)||{date:key,tasks:0,focus:0,due:0,doneDue:0};r.tasks+=row.tasks;r.focus+=row.focus;r.due+=row.due;r.doneDue+=row.doneDue;rows.set(key,r)}
 const item=[...rows.values()][i],status=root.querySelector('.elara-reports-plot-status');if(!item||!status)return;
 status.textContent=item.date+' · '+fmt(item.tasks)+' تسک · '+fmt(item.focus)+' دقیقه تمرکز · '+(item.due?fmt(Math.round(item.doneDue/item.due*100))+'٪ برنامه':'پیشرفت نامشخص');
}
document.addEventListener('pointerdown',e=>{const point=e.target.closest?.('.elara-reports-hit');if(point)pointText(point)});
document.addEventListener('focusin',e=>{const point=e.target.closest?.('.elara-reports-hit');if(point)pointText(point)});
for(const ev of ['elara:open','elara:hydrate','elara:data-changed','elara:state-committed','elara:account-ready','elara:logout','elara:auth-changed','elara:wellness-saved'])
 window.addEventListener(ev,()=>{if(location.hash==='#home')queueMicrotask(normalizeHomeReportsEntry);if(location.hash==='#reports'||location.hash==='#reports-today'||ev==='elara:hydrate')queueMicrotask(render)});
window.ElaraReportsDashboard={render,data,getRange:()=>days};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{render();normalizeHomeReportsEntry()},0));else setTimeout(()=>{render();normalizeHomeReportsEntry()},0);
})();
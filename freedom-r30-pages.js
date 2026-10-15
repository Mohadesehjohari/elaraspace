/* Freedom R30: four reference-led, data-backed RTL dashboards. No fabricated private entries or social counts. */
(()=>{'use strict';
const P=()=>document.getElementById('panel-freedom'),A='assets/ui/';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=(f)=>A+encodeURIComponent(f);
const safeImage=x=>{const s=String(x||'');return /^(data:image\/(webp|jpeg|png);base64,|https?:\/\/|assets\/ui\/)/i.test(s)?s:''};
const name=x=>String(x?.title||x?.text||x?.body||'').trim().split('\n')[0].slice(0,90)||'بدون عنوان';
const id=()=>crypto.randomUUID?.()||'f'+Date.now()+Math.random().toString(36).slice(2);
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fa=n=>Number(n||0).toLocaleString('fa-IR');
const date=x=>{const d=new Date(x||Date.now());return Number.isNaN(d.getTime())?'':d.toLocaleDateString('fa-IR')};
const freedom=()=>window.ElaraFreedomEnhancements?.read?.()||window.ElaraFreedom?.read?.()||{};
function saveFreedom(d){if(window.ElaraFreedom?.save)window.ElaraFreedom.save(d);else{const uid=window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'local';localStorage.setItem('elara_freedom_v1_'+uid,JSON.stringify(d));window.dispatchEvent(new Event('elara:freedom-changed'))}}
const space=()=>{try{const s=JSON.parse(localStorage.getItem('elara_space_v1')||'{}');if(!Array.isArray(s.diaryEntries))s.diaryEntries=[];return s}catch{return{diaryEntries:[]}}};
function saveSpace(s){try{localStorage.setItem('elara_space_v1',JSON.stringify(s))}catch{alert('فضای ذخیره‌سازی کافی نیست.');return false}window.dispatchEvent(new Event('elara:data-changed'));window.dispatchEvent(new Event('elara:state-committed'));return true}
const cats=[['all','همه جرقه‌ها','✥'],['شخصی','نجواهای شخصی','♙'],['تحصیلی','افق‌های دانایی','♧'],['شغلی','رؤیاهای حرفه‌ای','▣'],['خلاقانه','الهام‌های آفرینش','◉'],['سفر','ماجراجویی‌های سفر','✈'],['سبک زندگی','نغمه‌های زندگی','♧']];
const insCats=['همه الهام‌ها','موفقیت','زندگی بهتر','خلاقیت','مطالعه و یادگیری','ذهن‌آگاهی','روابط','سلامتی','آینده و رؤیاها','فناوری','هنر و زیبایی','طبیعت'];
const dreamCats=['همه','زندگی','سفر','یادگیری','کار و خلاقیت','سلامت','رابطه‌ها'];
const moods=[['عالی','😊','#41d7bb'],['خوب','🙂','#e4c65b'],['معمولی','😐','#9471ef'],['غمگین','😢','#5ba6fc'],['اضطراب','😟','#c566ef'],['عصبانیت','😠','#f06489']];
const cfg={
 ideas:{title:'جرقه‌های من',lead:'جایی برای جرقه‌های ذهن تو؛ هر فکر کوچک می‌تواند آغاز یک دنیای بزرگ باشد.',quote:'«ایده‌ها، بذرهای فردای بهترند.»',hero:'banner_city_of_stars.webp',symbol:'✦'},
 inspiration:{title:'تالار الهام',lead:'جرقه‌هایی برای فکر کردن، ساختن و بهتر زندگی کردن.',quote:'«الهام را در میان کارها، روزمره و نگاه متفاوت به جهان پیدا کن.»',hero:'banner_new_dawn.webp',symbol:'☼'},
 vision:{title:'باغ رؤیاها',lead:'رؤیاهایت را ببین، لمس کن و به مسیرهای واقعی تبدیل کن.',quote:'«از همین امروز آغاز می‌شود.»',hero:'freedom_banner.webp',symbol:'✧'},
 diary:{title:'دفتر نجواها',lead:'جایی برای ثبت احساسات، خاطرات و لحظه‌های زندگی تو.',quote:'«هر احساسی ارزش نوشتن دارد.»',hero:'banner_moon_lake.webp',symbol:'▣'}
};
let active='',category='all',inspirationCategory=insCats[0],dreamCategory='همه',selectedBoard='all',selectedMood='خوب',diaryTab='همه یادداشت‌ها',monthOffset=0,selectedDay='',editingIdea='',ideaImage='',renderQueued=false;
const card=(title,body,extra='')=>'<section class="r30-panel '+extra+'"><h2>'+title+'</h2>'+body+'</section>';
function empty(message,cta=''){return '<div class="r30-empty"><span aria-hidden="true">✧</span><p>'+message+'</p>'+(cta?'<button class="r30-mini-action" type="button" '+cta+'>+ مورد جدید</button>':'')+'</div>'}
const header=kind=>{const c=cfg[kind];return '<header class="r30-hero r30-hero-'+kind+'" style="--r30-hero:url(&quot;'+img(c.hero)+'&quot;)">'+
 '<button class="r30-back" type="button" data-r30-back aria-label="بازگشت به آزادی">→ بازگشت</button>'+
 '<div class="r30-hero-copy"><span class="r30-hero-mark">'+c.symbol+'</span><h1>'+c.title+'</h1><p>'+c.lead+'</p><small>'+c.quote+'</small></div></header>'};
const bar=(options,selected,attr)=>'<nav class="r30-tabs" aria-label="دسته‌بندی">'+options.map(x=>{const v=Array.isArray(x)?x[0]:x,label=Array.isArray(x)?x[1]:x,symbol=Array.isArray(x)?x[2]:'✧';return '<button type="button" '+attr+'="'+E(v)+'" class="'+(selected===v?'selected':'')+'" aria-pressed="'+(selected===v)+'">'+symbol+' <span>'+E(label)+'</span></button>'}).join('')+'</nav>';
const ordered=a=>(Array.isArray(a)?a:[]).slice().sort((a,b)=>Number(b.updatedAt||b.at||b.createdAt||0)-Number(a.updatedAt||a.at||a.createdAt||0));
function recordImage(x,alt=''){let src=safeImage(x.image);return src?'<img src="'+E(src)+'" alt="'+E(alt)+'" loading="lazy">':''}
function ideasView(){
 const data=freedom(),list=ordered(data.ideas),filtered=category==='all'?list:list.filter(x=>(x.category||'شخصی')===category);
 const starred=list.find(x=>x.featured)||list[0];
 const counts=cats.map(c=>({name:c[1],icon:c[2],total:c[0]==='all'?list.length:list.filter(x=>(x.category||'شخصی')===c[0]).length,category:c[0]}));
 let rows=filtered.length?filtered.slice(0,8).map(x=>'<article class="r30-entry">'+(recordImage(x,name(x))||'<img src="'+img('Ideas.webp')+'" alt="" loading="lazy">')+
 '<div class="r30-entry-copy"><strong dir="auto">'+E(name(x))+'</strong><small dir="auto">'+E(String(x.text||'').slice(0,110))+'</small><span class="r30-chips"><i>'+E(x.category||'شخصی')+'</i><i>خصوصی</i></span></div>'+
 '<div class="r30-entry-meta"><time>'+date(x.updatedAt||x.at)+'</time><button type="button" data-r30-feature="'+E(x.id)+'" aria-label="نشان‌دار کردن ایده" aria-pressed="'+!!x.featured+'">'+(x.featured?'★':'☆')+'</button><button type="button" data-r30-edit-idea="'+E(x.id)+'">ویرایش</button></div></article>').join(''):empty('در این دسته هنوز ایده‌ای ثبت نکرده‌ای. ایده‌های واقعی تو اینجا نمایش داده می‌شوند.');
 const featured=starred?'<div class="r30-highlight"><div><strong>'+E(name(starred))+'</strong><p>'+E(String(starred.text||'').slice(0,180))+'</p><button type="button" data-r30-edit-idea="'+E(starred.id)+'">مشاهده و ویرایش ←</button></div><div class="r30-highlight-art">'+(recordImage(starred,name(starred))||'<img src="'+img('banner_new_dawn.webp')+'" alt="">')+'</div></div>':empty('با ثبت نخستین ایده، ایده منتخب خودت در این بخش دیده می‌شود.');
 return bar(cats,category,'data-r30-ideas-cat')+'<div class="r30-ideas-intro">'+
 '<section class="r30-panel r30-compose"><h2>⚡ جرقه‌ی تازه</h2><form data-r30-idea-form><input name="title" maxlength="120" placeholder="عنوان کوتاه ایده (اختیاری)" aria-label="عنوان ایده"><textarea name="text" maxlength="2200" required placeholder="ایده‌ات را اینجا بنویس…"></textarea><div class="r30-compose-actions"><label class="r30-upload">▧ تصویر<input name="image" type="file" accept="image/png,image/jpeg,image/webp"></label><select name="category" aria-label="دسته‌بندی">'+cats.slice(1).map(c=>'<option value="'+E(c[0])+'">'+E(c[1])+'</option>').join('')+'</select><span class="r30-privacy">♧ خصوصی</span><button type="submit" class="r30-primary">✈ '+(editingIdea?'ذخیره تغییرات':'ثبت ایده')+'</button></div><div data-r30-upload-preview></div></form></section>'+
 card('☆ ستاره‌ی امروز',featured,'r30-featured')+'</div>'+
 '<div class="r30-ideas-lower">'+card('◈ کهکشان دسته‌بندی‌ها','<div class="r30-category-list">'+counts.map(x=>'<button type="button" data-r30-ideas-cat="'+E(x.category)+'"><b>'+x.icon+' '+E(x.name)+'</b><span>'+fa(x.total)+'</span></button>').join('')+'</div>','r30-cat-panel')+
 card('◷ آخرین جرقه‌ها','<div class="r30-entry-list">'+rows+'</div>','r30-recent')+
 card('◈ نقشه ذهنی رؤیاها','<div class="r30-mind"><div class="r30-mind-core">✦<small>'+fa(list.length)+' ایده واقعی</small></div>'+counts.slice(1).map(x=>'<button type="button" data-r30-ideas-cat="'+E(x.category)+'"><span>'+x.icon+'</span>'+E(x.name)+' <small>'+fa(x.total)+'</small></button>').join('')+'</div>','r30-mind-panel')+'</div>';
}
function inspirationView(){
 const d=freedom(),list=ordered(d.inspirations);
 const filtered=inspirationCategory===insCats[0]?list:list.filter(x=>(x.category||'موفقیت')===inspirationCategory);
 const favorite=list.filter(x=>x.favorite),featured=filtered[0]||list[0];
 const quote=String(d.quote?.text||'').trim();
 const group=insCats.slice(1).map(cat=>({name:cat,rows:list.filter(x=>(x.category||'موفقیت')===cat)})).filter(g=>g.rows.length);
 let story=featured?'<div class="r30-insp-spot" style="--spot-image:url(&quot;'+E(safeImage(featured.image)||img('banner_new_dawn.webp'))+'&quot;)"><strong dir="auto">'+E(name(featured))+'</strong><p>'+E(String(featured.text||'').slice(0,190))+'</p><button type="button" data-r30-insp-edit="'+E(featured.id)+'">مشاهده و ویرایش ←</button></div>':empty('برای دریافت الهام امروز، نخستین الهام خودت را ثبت کن.');
 const gallery=filtered.length?filtered.slice(0,8).map(x=>'<article class="r30-insp-card"><button class="r30-insp-tile" type="button" data-r30-insp-edit="'+E(x.id)+'"><div class="r30-tile-art">'+(recordImage(x,name(x))||'<img src="'+img('banner_moon_lake.webp')+'" alt="">')+'</div><strong dir="auto">'+E(name(x))+'</strong><small dir="auto">'+E(String(x.text||'').slice(0,95))+'</small><span>'+E(x.category||'الهام شخصی')+'</span></button><button class="r30-insp-fave" type="button" aria-pressed="'+!!x.favorite+'" aria-label="ذخیره الهام در علاقه‌مندی‌ها" data-r30-insp-fave="'+E(x.id)+'">'+(x.favorite?'♥':'♡')+'</button></article>').join(''):empty('در این بخش هنوز الهامی ثبت نکرده‌ای.');
 return bar(insCats,inspirationCategory,'data-r30-insp-cat')+
 '<div class="r30-insp-top">'+card('✧ الهام تصادفی امروز',story,'r30-insp-feature')+
 card('▤ تالارهای الهام‌بخش',group.length?'<div class="r30-insp-groups">'+group.slice(0,5).map(g=>'<button type="button" data-r30-insp-cat="'+E(g.name)+'"><img src="'+img(['banner_new_dawn.webp','Ideas.webp','banner_moon_lake.webp','Inspirations.webp'][group.indexOf(g)%4])+'" alt=""><b>'+E(g.name)+'</b><small>'+fa(g.rows.length)+' نوشته</small></button>').join('')+'</div>':empty('با ذخیره الهام‌ها و دسته‌بندی آن‌ها، مجموعه‌های شخصی ساخته می‌شوند.'),'r30-insp-collections')+
 card('❞ جملات برگزیده',quote?'<blockquote>'+E(quote)+'</blockquote><p class="r30-muted">— '+E(d.quote?.author||'')+'</p>':empty('نقل‌قول الهام‌بخش خودت را اضافه کن.'),'r30-insp-quotes')+'</div>'+
 '<div class="r30-insp-bottom">'+card('☷ فیلتر پیشرفته','<label>موضوع<select data-r30-insp-select>'+insCats.map(x=>'<option '+(x===inspirationCategory?'selected':'')+'>'+x+'</option>').join('')+'</select></label><button class="r30-primary" type="button" data-r30-new-inspiration>+ الهام جدید</button>','r30-insp-filters')+
 card('⚡ جدیدترین الهام‌ها','<div class="r30-insp-gallery">'+gallery+'</div>','r30-insp-latest')+
 card('☆ الهام‌های ذخیره‌شده',favorite.length?'<div class="r30-saved">'+favorite.slice(0,5).map(x=>'<button type="button" data-r30-insp-edit="'+E(x.id)+'">'+E(name(x))+'</button>').join('')+'</div>':empty('روی علامت علاقه‌مندی یک الهام بزن تا اینجا دیده شود.'),'r30-insp-faves')+'</div>';
}
function visionView(){
 const d=freedom(),dreams=ordered(d.dreams),boards=Array.isArray(d.visionBoards)?d.visionBoards:[];
 const base=selectedBoard==='all'?dreams:dreams.filter(x=>x.boardId===selectedBoard);
 const filtered=dreamCategory==='همه'?base:base.filter(x=>(x.category||'زندگی')===dreamCategory);
 const done=dreams.filter(x=>x.completed).length,percent=dreams.length?Math.round(100*done/dreams.length):0;
 const items=filtered.length?filtered.map((x,i)=>'<article class="r30-dream-card r30-dream-'+i%4+'"><button type="button" data-r30-dream-edit="'+E(x.id)+'" class="r30-dream-open">'+(recordImage(x,name(x))||'<img src="'+img(['banner_dream_tree.webp','banner_city_of_stars.webp','Lavender Moonrise Over Misty Meadows.webp','banner_new_dawn.webp'][i%4])+'" alt="">')+'<b dir="auto">'+E(name(x))+'</b><small>'+E(x.category||'زندگی')+(x.target?' · '+E(x.target):'')+'</small></button><label class="r30-done"><input type="checkbox" data-r30-dream-complete="'+E(x.id)+'" '+(x.completed?'checked':'')+'> تکمیل شده</label></article>').join(''):empty('هنوز رؤیایی در این تابلو نداری. اولین رؤیایت را اضافه کن.','data-r30-new-dream');
 return '<div class="r30-vision-actions"><button type="button" class="r30-primary" data-r30-new-board>+ ایجاد تابلو جدید</button><button type="button" data-r30-new-dream>+ افزودن رؤیا</button><button type="button" data-r30-new-dream>▧ افزودن تصویر به رؤیا</button></div>'+
 '<div class="r30-vision-wrap"><main class="r30-vision-main">'+bar(dreamCats,dreamCategory,'data-r30-dream-cat')+
 '<div class="r30-board-selection"><button type="button" data-r30-board="all" class="'+(selectedBoard==='all'?'selected':'')+'">همه رؤیاها</button>'+boards.map(b=>'<button type="button" data-r30-board="'+E(b.id)+'" class="'+(selectedBoard===b.id?'selected':'')+'">'+E(b.title)+'</button>').join('')+'</div>'+
 '<div class="r30-vision-canvas"><div class="r30-vision-board">'+items+'</div></div>'+
 card('▦ تابلوهای من','<div class="r30-board-list"><button type="button" data-r30-new-board>＋ ایجاد تابلو</button>'+boards.map(b=>'<button type="button" data-r30-board="'+E(b.id)+'">'+E(b.title)+'<small>'+fa(dreams.filter(x=>x.boardId===b.id).length)+' رؤیا</small></button>').join('')+'</div>')+
 '</main><aside class="r30-vision-side">'+card('☀ رؤیای امروز','<img class="r30-side-art" src="'+img('banner_new_dawn.webp')+'" alt="">'+(dreams.length?'<p>'+E(name(dreams[0]))+'</p>':'<p>رویای اولت را ثبت کن تا اینجا نمایش داده شود.</p>'))+
 card('◉ پیشرفت رؤیاها','<div class="r30-ring" style="--r30-percent:'+percent+'%"><span>'+fa(percent)+'٪</span><small>از '+fa(dreams.length)+' رؤیا</small></div><p>تکمیل شده: '+fa(done)+'</p>')+
 card('♧ دسته‌بندی‌ها','<div class="r30-vision-cats">'+dreamCats.slice(1).map(c=>'<button type="button" data-r30-dream-cat="'+E(c)+'">'+E(c)+' <small>'+fa(dreams.filter(x=>x.category===c).length)+'</small></button>').join('')+'</div>')+'</aside></div>';
}
function calendarData(){
 const now=new Date(),first=new Date(now.getFullYear(),now.getMonth()+monthOffset,1),days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
 const start=(first.getDay()+1)%7;
 const entries=space().diaryEntries;
 return {first,days,start,entries};
}
function diaryView(){
 const s=space(),items=ordered(s.diaryEntries),d=freedom(),cal=calendarData();
 const matching=diaryTab==='همه یادداشت‌ها'?items:diaryTab==='امروز'?items.filter(x=>(x.noteDate||new Date(x.createdAt||Date.now()).toISOString().slice(0,10))===today()):diaryTab==='برچسب‌ها'?items.filter(x=>(x.tags||[]).length):diaryTab==='نوشته‌های خصوصی'?items:diaryTab==='تقویم'?items.filter(x=>!selectedDay||(x.noteDate||'')===selectedDay):items;
 const last=items[0],lastMood=items.find(x=>x.mood)?.mood;
 const dayMap={};for(const item of items){const day=item.noteDate||new Date(item.createdAt||Date.now()).toISOString().slice(0,10);dayMap[day]=(dayMap[day]||0)+1}
 const dow=['ش','ی','د','س','چ','پ','ج'],monthName=cal.first.toLocaleDateString('fa-IR',{month:'long',year:'numeric'});
 const dayGrid=dow.map(x=>'<b>'+x+'</b>').join('')+Array.from({length:cal.start},()=>'<span class="r30-day-empty"></span>').join('')+
 Array.from({length:cal.days},(_,i)=>{const n=i+1,k=cal.first.getFullYear()+'-'+String(cal.first.getMonth()+1).padStart(2,'0')+'-'+String(n).padStart(2,'0');return '<button type="button" class="'+(dayMap[k]?'has-note ':'')+(selectedDay===k?'selected':'')+'" data-r30-day="'+k+'">'+fa(n)+(dayMap[k]?'<i></i>':'')+'</button>'}).join('');
 const entries=matching.slice(0,6).map(x=>'<article class="r30-diary-entry"><img src="'+E(safeImage(x.backgroundImage)||img(({night:'Celestial Mirror Lake at Night.webp',paper:'Sunlit Botanical Shadows on Parchment.webp',lavender:'Lavender Moonrise Over Misty Meadows.webp',forest:'Misty Mountain Lake at Dawn.webp'})[x.themeId]||'free_notes.webp'))+'" alt=""><button type="button" data-r30-diary-edit="'+E(x.id)+'"><strong dir="auto">'+E(name(x))+'</strong><small dir="auto">'+E(String(x.body||'').slice(0,100))+'</small></button><div><small>'+date(x.updatedAt||x.createdAt)+'</small><span>'+E(x.mood||'خصوصی')+'</span></div></article>').join('');
 const noteDays=Object.keys(dayMap).length,calMonth=cal.first.getMonth(),calYear=cal.first.getFullYear();
 const heat=Array.from({length:56},(_,i)=>{const day=new Date();day.setDate(day.getDate()-(55-i));const key=day.getFullYear()+'-'+String(day.getMonth()+1).padStart(2,'0')+'-'+String(day.getDate()).padStart(2,'0');const count=dayMap[key]||0;return '<span class="r30-heat-'+Math.min(3,count)+'" title="'+key+': '+fa(count)+' یادداشت"></span>'}).join('');
 const photos=items.filter(x=>x.backgroundImage||x.themeId||x.image).slice(0,5);
 return bar([['همه یادداشت‌ها','همه یادداشت‌ها','▣'],['امروز','امروز','☀'],['تقویم','تقویم','▦'],['حال روحی','حال روحی','♥'],['نوشته‌های خصوصی','نوشته‌های خصوصی','♙'],['برچسب‌ها','برچسب‌ها','◇']],diaryTab,'data-r30-diary-tab')+
 '<div class="r30-diary-grid"><div class="r30-diary-main">'+
 card('✎ امروز چه حسی داری؟','<form data-r30-diary-form><input type="text" name="title" maxlength="120" placeholder="عنوان یادداشت (اختیاری)"><textarea name="body" required maxlength="2200" placeholder="احساسات، فکرها و اتفاقات امروزت را بنویس…"></textarea><div class="r30-moods"><small>حال‌وهوای امروز:</small>'+moods.map(m=>'<button type="button" data-r30-mood="'+m[0]+'" class="'+(selectedMood===m[0]?'selected':'')+'">'+m[1]+' '+m[0]+'</button>').join('')+'</div><div class="r30-compose-actions"><button type="button" data-r30-diary-full>▧ ویرایشگر تمام‌صفحه</button><span class="r30-privacy">♙ خصوصی</span><button class="r30-primary" type="submit">✈ ثبت یادداشت</button></div></form>','r30-diary-compose')+
 card('▣ آخرین یادداشت‌ها','<div class="r30-diary-list">'+(entries||empty('هنوز یادداشتی برای این فیلتر ثبت نشده است.'))+'</div><button type="button" class="r30-link" data-r30-diary-full>+ نوشتن یادداشت جدید</button>','r30-diary-recent')+
 card('◷ سفر در زمان','<div class="r30-history"><b>'+fa(noteDays)+' روز ثبت‌شده</b><span>تمام نوشته‌های واقعی شما به ترتیب تاریخ قابل مشاهده‌اند.</span></div>','r30-diary-time')+'</div>'+
 '<div class="r30-diary-middle">'+card('▦ تقویم خاطرات','<div class="r30-cal-nav"><button type="button" data-r30-cal-prev aria-label="ماه قبل">→</button><b>'+monthName+'</b><button type="button" data-r30-cal-next aria-label="ماه بعد">←</button></div><div class="r30-calendar">'+dayGrid+'</div><small class="r30-muted">'+fa(items.length)+' یادداشت ذخیره‌شده</small>','r30-calendar-panel')+
 card('▤ نقشه احساسات','<p class="r30-muted">۵۶ روز گذشته · بر اساس یادداشت‌های واقعی</p><div class="r30-heatmap">'+heat+'</div><p class="r30-muted">'+fa(noteDays)+' روز متفاوت با خاطره</p>')+
 card('▥ مسیر نجواها','<div class="r30-writing-stats"><strong>'+fa(items.length)+'</strong> یادداشت <strong>'+fa(noteDays)+'</strong> روز ثبت‌شده</div>')+'</div>'+
 '<div class="r30-diary-side">'+card('♥ حال‌وهوای امروز','<div class="r30-mood-display">✧<strong>'+E(lastMood||'هنوز ثبت نشده')+'</strong><p>'+(lastMood?'آخرین احساس ثبت‌شده در خاطرات تو':'اولین احساس امروزت را با یک یادداشت ثبت کن.')+'</p></div>')+
 card('❞ نقل‌قول امروز','<blockquote>'+E(d.quote?.text||'هر احساس ارزش نوشتن دارد.')+'</blockquote><small>— '+E(d.quote?.author||'Elara')+'</small>')+
 card('▧ آلبوم خاطرات','<div class="r30-album">'+(photos.length?photos.map(x=>'<button type="button" data-r30-diary-edit="'+E(x.id)+'"><img src="'+E(safeImage(x.backgroundImage)||img(({night:'Celestial Mirror Lake at Night.webp',paper:'Sunlit Botanical Shadows on Parchment.webp',lavender:'Lavender Moonrise Over Misty Meadows.webp',forest:'Misty Mountain Lake at Dawn.webp'})[x.themeId]||'free_notes.webp'))+'" alt="'+E(name(x))+'"></button>').join(''):empty('هنوز تصویری برای آلبوم ثبت نشده است.'))+'</div>')+'</div></div>';
}
function render(){
 const host=P()?.querySelector('[data-r30-body]');if(!host||!active)return;
 host.innerHTML=active==='ideas'?ideasView():active==='inspiration'?inspirationView():active==='vision'?visionView():diaryView();
}
function schedule(){if(renderQueued)return;renderQueued=true;queueMicrotask(()=>{renderQueued=false;if(active)render()})}
function open(kind,fromHistory=false){
 if(!cfg[kind])return;
 const p=P();if(!p)return;active=kind;category='all';inspirationCategory=insCats[0];dreamCategory='همه';diaryTab='همه یادداشت‌ها';selectedDay='';editingIdea='';ideaImage='';monthOffset=0;
 p.querySelector('.freedom-subpage-shell')?.remove();p.classList.add('freedom-subpage-open');
 const shell=document.createElement('section');shell.className='freedom-subpage-shell r30-shell';shell.dataset.freedomView=kind;shell.dir='rtl';shell.innerHTML=header(kind)+'<div class="r30-content" data-r30-body></div>';p.append(shell);render();
 if(!fromHistory)history.pushState({...history.state,elaraFreedomView:kind},'',location.href);
 shell.scrollIntoView({block:'start',behavior:'auto'});
}
function close(){
 active='';const p=P();p?.querySelector('.r30-shell')?.remove();p?.classList.remove('freedom-subpage-open');if(history.state?.elaraFreedomView)history.back();
}
async function upload(file){
 if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5*1024*1024)throw Error('تصویر JPG، PNG یا WebP تا ۵ مگابایت انتخاب کن.');
 return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),i=new Image();i.onerror=()=>{URL.revokeObjectURL(u);reject(Error('تصویر قابل خواندن نیست.'))};i.onload=()=>{const c=document.createElement('canvas'),s=Math.min(1,1000/Math.max(i.width,i.height));c.width=Math.round(i.width*s);c.height=Math.round(i.height*s);c.getContext('2d').drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);resolve(c.toDataURL('image/webp',.72))};i.src=u});
}
async function promptBoard(){
 const form=document.createElement('form');form.innerHTML='<label>نام تابلوی جدید<input name="title" maxlength="65" placeholder="مثلاً رؤیاهای سال آینده" required></label>';
 const result=await window.ElaraDialog.open({title:'ایجاد تابلوی رؤیاها',content:form,actions:[{label:'انصراف',value:false},{label:'ساخت تابلو',value:true,kind:'primary'}]});
 if(result!==true)return;const title=form.elements.title.value.trim();if(!title)return;
 const d=freedom();if(!Array.isArray(d.visionBoards))d.visionBoards=[];const value=id();d.visionBoards.push({id:value,title,createdAt:Date.now()});saveFreedom(d);selectedBoard=value;schedule();
}
async function confirmRemove(text){return await window.ElaraDialog?.confirm?.(text,{title:'تأیید',confirmText:'حذف'})===true}
document.addEventListener('submit',e=>{
 if(!P()?.contains(e.target)||!active)return;
 if(e.target.matches('[data-r30-idea-form]')){
  e.preventDefault();const f=e.target,title=f.elements.title.value.trim(),text=f.elements.text.value.trim(),cat=f.elements.category.value;
  if(!text)return;const d=freedom();if(!Array.isArray(d.ideas))d.ideas=[];
  let item=editingIdea&&d.ideas.find(x=>x.id===editingIdea);if(item){Object.assign(item,{title,text,category:cat,updatedAt:Date.now()});if(ideaImage)item.image=ideaImage}
  else d.ideas.unshift({id:id(),title,text,category:cat,image:ideaImage,visibility:'private',at:Date.now(),updatedAt:Date.now()});
  saveFreedom(d);editingIdea='';ideaImage='';schedule();return;
 }
 if(e.target.matches('[data-r30-diary-form]')){
  e.preventDefault();const f=e.target,body=f.elements.body.value.trim(),title=f.elements.title.value.trim();if(!body)return;
  const s=space(),time=Date.now();s.diaryEntries.unshift({id:id(),title,body,noteDate:today(),mood:selectedMood,tags:[],createdAt:time,updatedAt:time,themeId:'night'});
  if(saveSpace(s)){f.reset();schedule()}return;
 }
},true);
document.addEventListener('change',async e=>{
 if(!P()?.contains(e.target)||!active)return;
 if(e.target.matches('[data-r30-idea-form] input[type=file]')){
  try{ideaImage=await upload(e.target.files[0]);const host=P()?.querySelector('[data-r30-upload-preview]');if(host)host.innerHTML='<img src="'+E(ideaImage)+'" alt="تصویر انتخاب‌شده">' }catch(err){alert(err.message)}return;
 }
 if(e.target.matches('[data-r30-insp-select]')){inspirationCategory=e.target.value;schedule();return}
 if(e.target.matches('[data-r30-dream-complete]')){const d=freedom(),x=(d.dreams||[]).find(x=>x.id===e.target.dataset.r30DreamComplete);if(x){x.completed=e.target.checked;x.updatedAt=Date.now();saveFreedom(d);schedule()}return}
});
document.addEventListener('click',async e=>{
 const shell=P()?.querySelector('.r30-shell');if(!shell||!shell.contains(e.target))return;
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-r30-back')){e.preventDefault();close();return}
 if(b.dataset.r30IdeasCat!==undefined){category=b.dataset.r30IdeasCat;schedule();return}
 if(b.dataset.r30Feature){const d=freedom(),x=(d.ideas||[]).find(x=>x.id===b.dataset.r30Feature);if(x){x.featured=!x.featured;x.updatedAt=Date.now();saveFreedom(d);schedule()}return}
 if(b.dataset.r30EditIdea){const x=(freedom().ideas||[]).find(x=>x.id===b.dataset.r30EditIdea),f=shell.querySelector('[data-r30-idea-form]');if(x&&f){editingIdea=x.id;ideaImage=safeImage(x.image);f.elements.title.value=x.title||'';f.elements.text.value=x.text||'';f.elements.category.value=x.category||'شخصی';f.querySelector('[type=submit]').textContent='ذخیره تغییرات';f.scrollIntoView({block:'center',behavior:'smooth'});f.elements.text.focus()}return}
 if(b.dataset.r30InspCat!==undefined){inspirationCategory=b.dataset.r30InspCat;schedule();return}
 if(b.dataset.r30InspFave){const d=freedom(),x=(d.inspirations||[]).find(x=>x.id===b.dataset.r30InspFave);if(x){x.favorite=!x.favorite;x.updatedAt=Date.now();saveFreedom(d);schedule()}return}
 if(b.hasAttribute('data-r30-new-inspiration')){window.ElaraFreedomEnhancements?.entry?.('inspiration');return}
 if(b.dataset.r30InspEdit){const d=freedom(),x=(d.inspirations||[]).find(x=>x.id===b.dataset.r30InspEdit);if(x)window.ElaraFreedomEnhancements?.edit?.('inspiration',x.id);return}
 if(b.dataset.r30DreamCat!==undefined){dreamCategory=b.dataset.r30DreamCat;schedule();return}
 if(b.dataset.r30Board!==undefined){selectedBoard=b.dataset.r30Board;schedule();return}
 if(b.hasAttribute('data-r30-new-board')){void promptBoard();return}
 if(b.hasAttribute('data-r30-new-dream')){window.ElaraFreedomEnhancements?.dream?.();return}
 if(b.dataset.r30DreamEdit){window.ElaraFreedomEnhancements?.dreamDetail?.(b.dataset.r30DreamEdit);return}
 if(b.dataset.r30DiaryTab!==undefined){diaryTab=b.dataset.r30DiaryTab;selectedDay='';schedule();return}
 if(b.dataset.r30Mood!==undefined){selectedMood=b.dataset.r30Mood;shell.querySelectorAll('[data-r30-mood]').forEach(x=>x.classList.toggle('selected',x===b));return}
 if(b.dataset.r30Day!==undefined){selectedDay=b.dataset.r30Day;diaryTab='تقویم';schedule();return}
 if(b.hasAttribute('data-r30-cal-prev')){monthOffset--;schedule();return}
 if(b.hasAttribute('data-r30-cal-next')){monthOffset++;schedule();return}
 if(b.hasAttribute('data-r30-diary-full')){window.ElaraFreedomMediaDiary?.openDiary?.();return}
 if(b.dataset.r30DiaryEdit){window.ElaraFreedomMediaDiary?.openDiary?.(b.dataset.r30DiaryEdit);return}
});
for(const name of ['elara:freedom-changed','elara:data-changed','elara:state-committed','elara:account-ready'])window.addEventListener(name,schedule);
window.addEventListener('popstate',()=>{if(!history.state?.elaraFreedomView){active='';P()?.querySelector('.r30-shell')?.remove()}});
window.ElaraFreedomR30={open,render,get active(){return active},get selectedBoard(){return selectedBoard}};
})();
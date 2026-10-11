(()=>{'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>document.documentElement.lang==='en'?'en':'fa';
const tx=(fa,en)=>lang()==='en'?en:fa;
const articles=[
 {id:'plan-week',cat:'planning',min:6,fa:{title:'هفته‌ات را سبک ولی دقیق بچین',desc:'یک روش ساده برای اینکه برنامه‌ریزی به لیست آرزوها تبدیل نشود.',body:['اول سه نتیجهٔ مهم هفته را بنویس؛ نه سی کار ریز.','هر نتیجه را به یک قدم ۲۰ تا ۴۵ دقیقه‌ای تبدیل کن و فقط همان قدم بعدی را وارد تسک‌ها کن.','برای کارهای غیرضروری یک لیست «بعداً» داشته باش تا برنامهٔ امروز خفه نشود.']},en:{title:'Plan a lighter, sharper week',desc:'A simple way to stop planning from becoming a wish list.',body:['Write the three outcomes that matter most this week—not thirty tiny tasks.','Turn each outcome into one 20–45 minute next action and put only that next action in Tasks.','Keep a Later list for non-essential work so Today stays breathable.']}},
 {id:'focus-reset',cat:'focus',min:5,fa:{title:'وقتی تمرکزت پخش شده، از صفر ریست کن',desc:'ریست کوتاه پنج‌دقیقه‌ای قبل از Pomodoro بعدی.',body:['همهٔ تب‌های غیرضروری را ببند و فقط یک مقصد روی صفحه نگه دار.','یک جمله بنویس: «تا پایان این جلسه فقط …».','تایمر را کوتاه‌تر از حد معمول شروع کن؛ شروع دوباره مهم‌تر از طول جلسه است.']},en:{title:'Reset when your focus is scattered',desc:'A five-minute reset before the next Pomodoro.',body:['Close every unnecessary tab and leave one destination on screen.','Write one sentence: “Until this session ends, I only …”.','Start with a shorter timer than usual; restarting matters more than session length.']}},
 {id:'habit-small',cat:'habits',min:7,fa:{title:'عادت را آن‌قدر کوچک کن که بهانه جا نشود',desc:'چطور نسخهٔ حداقلی عادت را طراحی کنی و زنجیره را زنده نگه داری.',body:['حداقل موفقیت را تعریف کن: یک صفحه، پنج حرکت، یک لیوان آب.','بعد از انجام حداقل، ادامه دادن اختیاری است؛ این کار مقاومت شروع را کم می‌کند.','اگر سه روز پشت سر هم حداقل را انجام دادی، اندازهٔ عادت را خیلی کم بالا ببر.']},en:{title:'Make the habit too small to dodge',desc:'Design a minimum version that keeps the chain alive.',body:['Define the minimum win: one page, five reps, one glass of water.','After the minimum, continuing is optional; this lowers starting resistance.','After three consistent days, increase the habit only a little.']}},
 {id:'read-better',cat:'reading',min:8,fa:{title:'کمتر بخوان، بیشتر به خاطر بسپار',desc:'سه حرکت برای مطالعه‌ای که بعداً واقعاً یادت بماند.',body:['قبل از فصل یک سؤال مشخص بساز تا ذهنت دنبال جواب بگردد.','بعد از هر بخش، بدون نگاه‌کردن دو خط از حافظه بنویس.','یک بریده یا یادداشت را به Book Clips بفرست تا بعداً راحت‌تر برگردی.']},en:{title:'Read less, remember more',desc:'Three moves that make reading stick.',body:['Create one concrete question before the chapter so your mind looks for an answer.','After each section, write two lines from memory without looking back.','Save one quote or note to Book Clips so you can revisit it later.']}},
 {id:'energy-day',cat:'wellbeing',min:6,fa:{title:'روزت را با انرژی مدیریت کن، نه فقط با ساعت',desc:'کارهای سنگین را وقتی بگذار که مغزت واقعاً توانش را دارد.',body:['دو بازه‌ای را که معمولاً انرژی بیشتری داری پیدا کن.','کار عمیق را به یکی از همان بازه‌ها بده و کارهای سبک را به زمان افت انرژی منتقل کن.','خواب، آب و تمرین را به‌عنوان سیگنال ببین، نه عدد برای قضاوت خودت.']},en:{title:'Manage energy, not only hours',desc:'Put demanding work where your brain can actually carry it.',body:['Find the two windows when your energy is usually strongest.','Place deep work in one of those windows and move shallow work to lower-energy time.','Treat sleep, water and exercise as signals—not numbers to judge yourself with.']}}
];

/* BLOG-01: standalone visual and navigation owner, reusing canonical editorial articles and official feed. */
const catDefs=[
 ['all','همه','All','✦'],['reading','مطالعه','Reading','📖'],
 ['habits','رشد فردی','Growth','🌱'],['lifestyle','سبک زندگی','Lifestyle','☕'],
 ['technology','فناوری','Technology','⚙'],['language','زبان','Language','文'],
 ['wellbeing','سلامت','Wellness','♥'],['planning','برنامه‌ریزی','Planning','✎'],
 ['focus','تمرکز','Focus','✧'],['productivity','بهره‌وری','Productivity','⚡']
];
const catName=id=>{const c=catDefs.find(x=>x[0]===id);return c?c[lang()==='en'?2:1]:id};
const catIcon=id=>(catDefs.find(x=>x[0]===id)||['','','','✦'])[3];
const catCount=id=>allArticles().filter(x=>x.cat===id).length;
const ownKey=()=>('elara.blog.drafts.v1.'+String(window.ElaraAccount?.user?.uid||'guest'));
const localBookmarkKey=()=>('elara.blog.bookmarks.v1.'+String(window.ElaraAccount?.user?.uid||'guest'));
let filter='all',query='',publishedArticles=[],publishedLoading=false,editorDirty=false,editorId='',editorCoverUrl='',activeUid=null;
const bodyParts=value=>String(value||'').split(/\n\s*\n|\n/).map(x=>x.trim()).filter(Boolean).slice(0,160);
function publishedForLocale(){
 const locale=lang();
 return publishedArticles.filter(x=>x&&x.status!=='removed'&&(x.locale==='en'?'en':'fa')===locale).map(x=>({
  id:'published:'+String(x.id),sourceId:x.id,cat:String(x.category||'productivity'),min:Math.max(1,Math.min(60,Number(x.readMinutes)||5)),
  published:true,date:x.publishedAt||x.updatedAt||null,author:tx('الارا · مقاله رسمی','Elara · official article'),
  cover:typeof x.coverUrl==='string'&&/^https:\/\//.test(x.coverUrl)?x.coverUrl:'',
  [locale]:{title:String(x.title||''),desc:String(x.excerpt||''),body:bodyParts(x.body)}
 }));
}
const allArticles=()=>[...articles,...publishedForLocale()];
const articleCopy=a=>a[lang()]||a.fa||a.en||{title:'',desc:'',body:[]};
function mode(){return new URLSearchParams(location.search).get('blogView')||'home'}
function param(name){return new URLSearchParams(location.search).get(name)||''}
function localItems(){
 try{const parsed=JSON.parse(localStorage.getItem(ownKey())||'[]');return Array.isArray(parsed)?parsed.filter(x=>x&&typeof x==='object').slice(0,100):[]}catch{return []}
}
function saveItems(items){try{localStorage.setItem(ownKey(),JSON.stringify(items.slice(0,100)));return true}catch{return false}}
function safeDate(value){
 try{const d=value?.toDate?.()||new Date(value?.seconds?value.seconds*1000:value||0);return Number.isFinite(d.getTime())&&d.getTime()>0?new Intl.DateTimeFormat(lang()==='fa'?'fa-IR':'en-US',{year:'numeric',month:'short',day:'numeric'}).format(d):''}catch{return ''}
}
const notice=(fa,en)=>'<div class="blog-state-notice" role="status">'+tx(fa,en)+'</div>';
function sectionHeader(title,icon,buttonText,action){return '<header class="blog-block-heading"><h2><span aria-hidden="true">'+icon+'</span>'+esc(title)+'</h2>'+(action?'<button type="button" data-blog-route="'+action+'">'+esc(buttonText||tx('مشاهده همه ←','View all ←'))+'</button>':'')+'</header>'}
function emptyState(fa,en,action,buttonText){return '<div class="blog-empty">'+tx(fa,en)+(action?'<div><button class="blog-main-btn" type="button" data-blog-route="'+action+'">'+esc(buttonText||tx('نوشتن اولین مقاله','Write your first article'))+'</button></div>':'')+'</div>'}
function card(a){
 const c=articleCopy(a),label=catName(a.cat),hasImage=!!a.cover,saved=bookmarks().includes(a.id);
 const info=a.published?esc(a.author||tx('الارا · رسمی','Elara · official')):tx('تحریریه الارا','Elara editorial');
 return '<article class="blog-card" data-blog-id="'+esc(a.id)+'">'+
 '<div class="blog-card-cover">'+(hasImage?'<img src="'+esc(a.cover)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="blog-art-mark" aria-hidden="true">'+esc(catIcon(a.cat))+'</span>')+
 '<span class="blog-card-tag">'+esc(label)+'</span>'+
 '<button type="button" class="blog-card-save" data-blog-bookmark="'+esc(a.id)+'" aria-label="'+(saved?tx('برداشتن نشان مقاله','Remove bookmark'):tx('نشان کردن مقاله','Bookmark article'))+'" aria-pressed="'+saved+'" title="'+tx('ذخیره مقاله روی این دستگاه','Bookmark on this device')+'">'+(saved?'♥':'♧')+'</button></div>'+
 '<div class="blog-card-copy"><h3>'+esc(c.title)+'</h3><p>'+esc(c.desc)+'</p>'+
 '<div class="blog-card-footer"><b>'+info+'</b><span>◷ '+a.min+' '+tx('دقیقه مطالعه','min read')+'</span>'+(a.date&&safeDate(a.date)?'<span>'+esc(safeDate(a.date))+'</span>':'')+'</div>'+
 '<button class="blog-open" type="button" data-blog-open="'+esc(a.id)+'">'+tx('خواندن مقاله ←','Read article →')+'</button></div></article>'
}
function rows(){const q=query.trim().toLocaleLowerCase();return allArticles().filter(a=>{
 if(filter!=='all'&&a.cat!==filter)return false;
 if(!q)return true;
 const c=articleCopy(a);return (c.title+' '+c.desc+' '+c.body.join(' ')).toLocaleLowerCase().includes(q);
})}
function categories(active=filter){return '<div class="blog-cats" role="group" aria-label="'+tx('موضوعات وبلاگ','Blog categories')+'">'+catDefs.map(c=>'<button type="button" data-blog-filter="'+c[0]+'" class="'+(active===c[0]?'is-active':'')+'" aria-pressed="'+(active===c[0])+'"><span aria-hidden="true">'+c[3]+' </span>'+esc(lang()==='en'?c[2]:c[1])+'</button>').join('')+'</div>'}
function hero(sub=false){return '<section class="blog-hero elara-global-hero'+(sub?' is-subview-hero':'')+'" data-elara-page-hero="blog" aria-label="'+tx('بنر وبلاگ الارا','Elara blog banner')+'"><div class="blog-hero-content"><small class="blog-kicker">ELARA SPACE · JOURNAL</small><h1>'+tx('وبلاگ الارا','Elara Blog')+'</h1><p>'+tx('اینجا داستان‌های واقعی، تجربه‌های ارزشمند و ایده‌های الهام‌بخش به اشتراک گذاشته می‌شوند.','A home for real stories, meaningful experiences and inspiring ideas.')+'</p><button class="blog-main-btn" type="button" data-blog-route="write">'+tx('✎ نوشتن در بلاگ من','✎ Write my post')+'</button></div><div class="blog-quote">✦<br>'+tx('هر نوشته<br>یک ستاره است<br>در کهکشان تجربه‌های ما!','Every story is a star in our shared universe!')+'</div></section>'}
function quick(){return '<section class="blog-quick" aria-label="'+tx('شروع نوشتن','Start writing')+'"><div class="blog-quick-mark" aria-hidden="true">🪶</div><div class="blog-quick-copy"><h2>'+tx('امروز می‌خواهی درباره چه چیزی بنویسی؟','What would you like to write today?')+'</h2><p>'+tx('تجربه، ایده یا داستانی که می‌تواند به دیگران کمک کند…','An experience, idea or story worth sharing…')+'</p></div><div class="blog-quick-actions"><button type="button" class="blog-quiet-btn" data-blog-route="drafts">▤ '+tx('پیش‌نویس','Drafts')+'</button><button type="button" class="blog-quiet-btn" data-blog-route="write" data-blog-focus="category">◇ '+tx('انتخاب موضوع','Choose topic')+'</button><button type="button" class="blog-quiet-btn" data-blog-route="write" data-blog-focus="cover">▧ '+tx('افزودن تصویر','Add image')+'</button><button type="button" class="blog-main-btn" data-blog-route="write">➤ '+tx('نوشتن مقاله','Write article')+'</button></div></section>'}
function personalList(short=false,onlyDrafts=false){
 const items=localItems().filter(x=>!onlyDrafts||x.status==='draft').sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 if(!items.length)return emptyState('هنوز نوشته‌ای روی این دستگاه ذخیره نکرده‌ای.','No drafts are saved on this device yet.','write');
 return '<div class="blog-my-list">'+items.slice(0,short?3:100).map(x=>'<article class="blog-my-card"><span class="blog-my-thumb" aria-hidden="true">✎</span><div><strong>'+esc(x.title||tx('بدون عنوان','Untitled'))+'</strong><small><span class="blog-status-chip">'+tx('پیش‌نویس محلی','Local draft')+'</span> · '+esc(safeDate(x.updatedAt)||'')+'</small><button data-blog-edit="'+esc(x.id)+'" type="button">'+tx('ویرایش','Edit')+'</button> <button type="button" data-blog-preview-draft="'+esc(x.id)+'">'+tx('پیش‌نمایش','Preview')+'</button> <button type="button" data-blog-remove="'+esc(x.id)+'">'+tx('حذف','Delete')+'</button></div></article>').join('')+'</div>'
}
function topicGrid(){
 const cats=catDefs.slice(1,7);
 return '<div class="blog-topic-grid">'+cats.map(c=>'<button type="button" data-blog-category="'+c[0]+'"><span aria-hidden="true">'+c[3]+'</span><strong>'+esc(lang()==='en'?c[2]:c[1])+'</strong><small>'+catCount(c[0])+' '+tx('مقاله','articles')+'</small></button>').join('')+'</div>'
}
function dashboard(){
 const visible=rows(),first=visible.slice(0,3),rest=visible.slice(3);
 const featured='<section class="blog-block">'+sectionHeader(tx('مقاله‌های پیشنهادی','Featured articles'),'🌟',tx('مشاهده همه ←','View all ←'),'all')+
 (first.length?'<div class="blog-grid">'+first.map(card).join('')+'</div>':emptyState('مقاله‌ای در این دسته یا جست‌وجو پیدا نشد.','No articles in this category or search.'))+'</section>';
 const more=rest.length?'<section class="blog-block">'+sectionHeader(tx('مقاله‌های بیشتر','More articles'),'✧',tx('مشاهده همه ←','View all ←'),'all')+'<div class="blog-grid">'+rest.map(card).join('')+'</div></section>':'';
 return hero()+'<div class="blog-frame"><section class="blog-top-controls">'+categories()+'<div class="blog-personal-links"><button type="button" data-blog-route="my">'+tx('بلاگ من','My blog')+'</button><button type="button" data-blog-route="published">'+tx('منتشرشده‌ها','Published')+'</button><button type="button" data-blog-route="drafts">'+tx('پیش‌نویس‌ها','Drafts')+'</button></div></section>'+
 quick()+'<label class="blog-search"><span aria-hidden="true">⌕</span><input data-blog-search type="search" value="'+esc(query)+'" placeholder="'+tx('جست‌وجو در مقاله‌ها…','Search articles…')+'" aria-label="'+tx('جست‌وجو در مقاله‌ها','Search articles')+'"></label>'+
 '<div class="blog-content-layout"><main class="blog-feed">'+featured+
 '<section class="blog-block">'+sectionHeader(tx('نوشته‌های من','My writing'),'✎',tx('مشاهده همه ←','View all ←'),'my')+personalList(true)+'</section>'+more+'</main>'+
 '<aside class="blog-side"><section class="blog-block">'+sectionHeader(tx('نویسندگان برتر این ماه','Top authors this month'),'👑')+
 emptyState('هنوز داده معتبر و کافی برای رتبه‌بندی ماهانه نویسندگان در دسترس نیست.','Verified monthly author ranking data is not available yet.')+'</section>'+
 '<section class="blog-block">'+sectionHeader(tx('موضوعات محبوب','Popular topics'),'🔥',tx('همه موضوعات ←','All topics ←'),'categories')+topicGrid()+'</section></aside></div></div>';
}
function subhead(title,description){return '<div class="blog-subhead"><button class="blog-quiet-btn" type="button" data-blog-back data-blog-route="home">'+tx('→ بازگشت','← Back')+'</button><div><h1>'+esc(title)+'</h1><p>'+esc(description||'')+'</p></div></div>'}
function listPage(kind){
 const isPub=kind==='published',drafts=kind==='drafts';
 const title=isPub?tx('نوشته‌های منتشرشده من','My published posts'):drafts?tx('پیش‌نویس‌ها','Drafts'):tx('بلاگ من','My blog');
 const desc=tx('نوشته‌های این دستگاه؛ انتشار عمومی هنوز فعال نیست.','Posts saved on this device; public publishing is not enabled yet.');
 return '<div class="blog-frame"><section class="blog-block">'+subhead(title,desc)+(isPub?emptyState('برای حساب‌های عادی هنوز Backend امن انتشار عمومی فعال نشده است؛ مقالهٔ منتشرشده‌ای در این بخش نمایش داده نمی‌شود.','Secure public publishing for personal accounts is not available yet.'):personalList(false,drafts))+'</section></div>';
}
function listCategoryPage(){
 const id=param('category')||'all',items=allArticles().filter(x=>id==='all'||x.cat===id);
 return '<div class="blog-frame"><section class="blog-block">'+subhead(catName(id),tx('مقاله‌های واقعی این موضوع','Real articles in this topic'))+categories(id)+(items.length?'<div class="blog-grid">'+items.map(card).join('')+'</div>':emptyState('هنوز مقاله‌ای در این موضوع منتشر نشده است.','No articles are published in this topic yet.'))+'</section></div>';
}
function topicsPage(){
 return '<div class="blog-frame"><section class="blog-block">'+subhead(tx('همه موضوعات','All topics'),tx('موضوعی را برای خواندن مقاله‌های همان دسته انتخاب کن.','Choose a topic to browse its articles.'))+'<div class="blog-topic-index">'+topicGrid()+'</div></section></div>';
}
function allPage(){
 const items=allArticles();
 return '<div class="blog-frame"><section class="blog-block">'+subhead(tx('همه مقاله‌ها','All articles'),tx('مقاله‌های موجود الارا و محتوای رسمی منتشرشده.','Available Elara editorial and official articles.'))+categories('all')+(items.length?'<div class="blog-grid">'+items.map(card).join('')+'</div>':emptyState('هنوز مقاله‌ای برای نمایش وجود ندارد.','No articles available yet.'))+'</section></div>';
}
function searchPage(){
 const items=rows();
 return '<div class="blog-frame"><section class="blog-block">'+subhead(tx('نتایج جست‌وجو','Search results'),tx('جست‌وجو در مقاله‌های موجود','Search published articles'))+
 '<label class="blog-search"><span aria-hidden="true">⌕</span><input data-blog-search type="search" value="'+esc(query)+'" placeholder="'+tx('عنوان یا متن مقاله…','Article title or text…')+'" aria-label="'+tx('جست‌وجو','Search')+'"></label>'+
 (items.length?'<div class="blog-grid">'+items.map(card).join('')+'</div>':emptyState('مقاله‌ای با این عبارت پیدا نشد.','No articles matched the search.'))+'</section></div>';
}
function reader(){
 const a=allArticles().find(x=>x.id===param('article')),c=a&&articleCopy(a);
 if(!a)return '<div class="blog-frame">'+subhead(tx('مقاله پیدا نشد','Article not found'))+emptyState('این مقاله موجود نیست یا در دسترس نیست.','This article is not available.')+'</div>';
 const bookmarked=bookmarks().includes(a.id);
 return '<div class="blog-frame"><article class="blog-block blog-reader blog-article-detail" data-blog-article="'+esc(a.id)+'">'+subhead(tx('مطالعه مقاله','Read article'))+
 '<div class="blog-reader-banner" aria-hidden="true">'+(a.cover?'<img src="'+esc(a.cover)+'" alt="" referrerpolicy="no-referrer">':'')+'</div><div class="blog-reader-inner"><small class="blog-status-chip">'+esc(catName(a.cat))+'</small><h1>'+esc(c.title)+'</h1>'+
 '<div class="blog-reader-meta">'+esc(a.author||tx('تحریریه الارا','Elara editorial'))+' · '+a.min+' '+tx('دقیقه مطالعه','min read')+(a.date&&safeDate(a.date)?' · '+esc(safeDate(a.date)):'')+'</div>'+
 '<p>'+esc(c.desc)+'</p>'+c.body.map((p,i)=>'<section><h2>'+tx('بخش ','Part ')+(i+1)+'</h2><p>'+esc(p)+'</p></section>').join('')+
 '<div class="blog-form-actions"><button type="button" class="blog-quiet-btn" data-blog-share>'+tx('↗ اشتراک‌گذاری','↗ Share')+'</button><button type="button" class="blog-quiet-btn" data-blog-bookmark="'+esc(a.id)+'" aria-pressed="'+bookmarked+'">'+(bookmarked?tx('♥ حذف نشان','♥ Remove bookmark'):tx('♧ ذخیره در این دستگاه','♧ Bookmark on this device'))+'</button></div>'+
 '<p id="blog-share-message" role="status" class="blog-editor-words"></p>'+
 '</div></article></div>';
}
function editor(draft,preview=false){
 const val=draft||{title:'',excerpt:'',body:'',category:'reading'};
 const wordCount=String(val.body||'').trim().split(/\s+/).filter(Boolean).length;
 const title=preview?tx('پیش‌نمایش مقاله','Article preview'):tx('نوشتن مقاله','Write an article');
 return '<div class="blog-frame"><section class="blog-block">'+subhead(title,tx('ذخیره فقط روی این دستگاه؛ بدون انتشار ابری','Saved on this device only; no cloud publishing'))+
 (preview?'<article class="blog-reader blog-reader-inner"><h1>'+esc(val.title||tx('بدون عنوان','Untitled'))+'</h1><div class="blog-reader-meta">'+esc(catName(val.category))+'</div><p>'+esc(val.excerpt||'')+'</p>'+bodyParts(val.body).map(x=>'<p>'+esc(x)+'</p>').join('')+'<button class="blog-quiet-btn" type="button" data-blog-back-editor>'+tx('بازگشت به ویرایشگر','Back to editor')+'</button></article>':
 '<form class="blog-form" id="blog-editor" autocomplete="off">'+
 '<label>'+tx('عنوان مقاله','Title')+'<input maxlength="160" name="title" required value="'+esc(val.title)+'" placeholder="'+tx('عنوانی برای داستان تو…','A title for your story…')+'"></label>'+
 '<label>'+tx('خلاصه کوتاه','Short summary')+'<textarea name="excerpt" maxlength="450" rows="3">'+esc(val.excerpt||'')+'</textarea></label>'+
 '<label>'+tx('موضوع','Topic')+'<select name="category">'+catDefs.slice(1).map(x=>'<option value="'+x[0]+'" '+(val.category===x[0]?'selected':'')+'>'+esc(lang()==='en'?x[2]:x[1])+'</option>').join('')+'</select></label>'+
 '<label>'+tx('متن مقاله','Article body')+'<textarea name="body" maxlength="45000" rows="12" required>'+esc(val.body||'')+'</textarea></label>'+
 '<label>'+tx('تصویر کاور (پیش‌نمایش محلی، بدون آپلود)','Cover image (local preview, not uploaded)')+'<input name="cover" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<div id="blog-cover-preview"></div><div class="blog-editor-words" id="blog-word-count">'+wordCount+' '+tx('کلمه','words')+'</div>'+
 notice('انتشار عمومی فعلاً غیرفعال است. «ذخیره پیش‌نویس» فقط متن را در مرورگر همین دستگاه نگه می‌دارد.','Public publishing is not available. Save Draft stores text in this browser only.')+
 '<div class="blog-form-actions"><button type="button" data-blog-save class="blog-main-btn">'+tx('ذخیره پیش‌نویس روی دستگاه','Save local draft')+'</button><button type="button" data-blog-preview class="blog-quiet-btn">'+tx('پیش‌نمایش','Preview')+'</button><button type="button" class="blog-quiet-btn" disabled title="'+tx('Backend انتشار عمومی هنوز آماده نیست','Public publishing backend is not ready')+'">'+tx('انتشار عمومی (غیرفعال)','Publish (unavailable)')+'</button></div><p id="blog-save-status" class="blog-editor-words" role="status"></p></form>')+'</section></div>';
}
function render(){
 const host=document.getElementById('elara-blog-view');if(!host)return;
 const panel=document.getElementById('panel-blog');
 panel?.querySelectorAll(':scope > .blog-hero').forEach(x=>x.remove());
 host.classList.add('blog01-root');
 const uid=String(window.ElaraAccount?.user?.uid||'guest');
 if(activeUid!==uid){if(editorCoverUrl)URL.revokeObjectURL(editorCoverUrl);editorCoverUrl='';editorId='';editorDirty=false;activeUid=uid}
 const view=mode();let body;
 if(view==='home')body=dashboard();
 else if(view==='all')body=hero(true)+allPage();
 else if(view==='search'){query=param('q');body=hero(true)+searchPage()}
 else if(view==='article')body=hero(true)+reader();
 else if(view==='write')body=hero(true)+editor(localItems().find(x=>x.id===param('draftId')),false);
 else if(view==='preview'){
  const draft=localItems().find(x=>x.id===param('draftId'));
  body=hero(true)+(draft?editor(draft,true):'<div class="blog-frame"><section class="blog-block">'+subhead(tx('پیش‌نمایش پیدا نشد','Preview unavailable'))+emptyState('پیش‌نویس ذخیره‌شده‌ای با این شناسه پیدا نشد.','No saved draft was found for this preview.')+'</section></div>');
 }
 else if(view==='category')body=hero(true)+listCategoryPage();
 else if(view==='categories')body=hero(true)+topicsPage();
 else body=hero(true)+listPage(['my','drafts','published'].includes(view)?view:'my');
 host.innerHTML=body;
 const cover=document.getElementById('blog-cover-preview');
 if(cover&&editorCoverUrl)cover.innerHTML='<img class="blog-local-cover" alt="'+tx('پیش‌نمایش تصویر انتخابی','Selected cover preview')+'" src="'+esc(editorCoverUrl)+'"><small>'+tx('تصویر فقط برای همین پیش‌نمایش است و در پیش‌نویس ذخیره نمی‌شود.','Cover is preview-only and is not stored with your draft.')+'</small>';
 if(view==='write'){editorId=param('draftId');editorDirty=false}
}
let editorSnapshot=null;
function beforeLeave(){if(mode()==='write'&&editorDirty)return window.confirm(tx('تغییرات ذخیره‌نشده را کنار بگذارم؟','Discard unsaved changes?'));return true}
function navigate(view='home',extra={},replace=false){
 if(!beforeLeave())return;
 const url=new URL(location.href),from=url.pathname+url.search+url.hash;
 ['blogView','article','category','draftId','q'].forEach(k=>url.searchParams.delete(k));
 if(view!=='home')url.searchParams.set('blogView',view);
 Object.entries(extra).forEach(([k,v])=>url.searchParams.set(k,v));
 url.hash='blog';
 history[replace?'replaceState':'pushState']({...history.state,elaraTab:'blog',blogFrom:replace?history.state?.blogFrom:from},'',url.pathname+url.search+url.hash);
 if(document.getElementById('panel-blog')?.classList.contains('hidden'))window.ElaraOpen?.('blog',{history:'none'});
 render();window.scrollTo({top:0,behavior:'instant'});
}
function openArticle(id){navigate('article',{article:id})}
function saveDraft(){
 const form=document.getElementById('blog-editor');if(!form)return;
 const data=new FormData(form),now=new Date().toISOString(),draft={
  id:editorId||('local-'+Date.now()),title:String(data.get('title')||'').trim().slice(0,160),
  excerpt:String(data.get('excerpt')||'').trim().slice(0,450),category:String(data.get('category')||'reading'),
  body:String(data.get('body')||'').slice(0,45000),status:'draft',updatedAt:now
 };
 if(!draft.title||!draft.body.trim()){form.reportValidity();return}
 const all=localItems(),i=all.findIndex(x=>x.id===draft.id);if(i>=0)all[i]=draft;else all.unshift(draft);
 const status=document.getElementById('blog-save-status');
 if(saveItems(all)){editorId=draft.id;editorDirty=false;history.replaceState({...history.state,elaraTab:'blog'},'',(()=>{const u=new URL(location.href);u.searchParams.set('draftId',draft.id);return u.pathname+u.search+u.hash})());if(status)status.textContent=tx('✓ پیش‌نویس روی این دستگاه ذخیره شد · ','✓ Saved on this device · ')+safeDate(now)}
 else if(status)status.textContent=tx('ذخیره انجام نشد؛ حافظه مرورگر در دسترس نیست.','Save failed; browser storage is unavailable.');
}
function preview(){
 const form=document.getElementById('blog-editor');if(!form)return;
 const data=new FormData(form);const title=String(data.get('title')||''),excerpt=String(data.get('excerpt')||''),body=String(data.get('body')||''),cat=String(data.get('category')||'reading');
 const aside=document.createElement('div');aside.className='blog-preview-layer';aside.setAttribute('role','dialog');aside.setAttribute('aria-modal','true');aside.setAttribute('aria-label',tx('پیش‌نمایش مقاله','Article preview'));
 aside.innerHTML='<div class="blog-reader blog-reader-inner"><button type="button" class="blog-quiet-btn" data-blog-close-preview>'+tx('بازگشت به نوشتن','Back to writing')+'</button><h1>'+esc(title||tx('بدون عنوان','Untitled'))+'</h1><small class="blog-status-chip">'+esc(catName(cat))+'</small><p>'+esc(excerpt)+'</p>'+bodyParts(body).map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>';
 form.after(aside);form.hidden=true;
}
async function loadPublished(){
 if(publishedLoading||!window.ElaraPublicContent?.listBlogArticles)return;
 publishedLoading=true;
 try{const data=await window.ElaraPublicContent.listBlogArticles();if(Array.isArray(data)){publishedArticles=data;render()}}
 catch(error){console.error('Elara published blog:',error)}
 finally{publishedLoading=false}
}
function bookmarks(){try{const data=JSON.parse(localStorage.getItem(localBookmarkKey())||'[]');return Array.isArray(data)?data.filter(x=>typeof x==='string').slice(0,300):[]}catch{return []}}
function bookmark(id){
 const prev=bookmarks(),next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id],saved=next.includes(id);
 try{
  localStorage.setItem(localBookmarkKey(),JSON.stringify(next));
  document.querySelectorAll('[data-blog-bookmark]').forEach(el=>{
   if(el.dataset.blogBookmark!==id)return;
   el.setAttribute('aria-pressed',String(saved));
   if(el.classList.contains('blog-card-save')){el.textContent=saved?'♥':'♧';el.setAttribute('aria-label',saved?tx('برداشتن نشان مقاله','Remove bookmark'):tx('نشان کردن مقاله','Bookmark article'))}
   else el.textContent=saved?tx('♥ حذف نشان','♥ Remove bookmark'):tx('♧ ذخیره در این دستگاه','♧ Bookmark on this device');
  });
  const el=document.getElementById('blog-share-message');if(el)el.textContent=saved?tx('روی این دستگاه ذخیره شد.','Saved on this device.'):tx('از نشان‌شده‌ها حذف شد.','Bookmark removed.');
 }catch{const el=document.getElementById('blog-share-message');if(el)el.textContent=tx('نشان‌کردن مقاله ممکن نشد.','Bookmark could not be saved.')}
}
document.addEventListener('click',e=>{
 const target=e.target;
 if(!(target instanceof Element))return;
 const f=target.closest('[data-blog-filter]');if(f){filter=f.dataset.blogFilter;query='';if(mode()==='category')navigate('category',{category:filter});else if(mode()==='all')navigate('category',{category:filter});else render();return}
 const c=target.closest('[data-blog-category]');if(c){filter=c.dataset.blogCategory;navigate('category',{category:filter});return}
 const read=target.closest('[data-blog-open]');if(read){openArticle(read.dataset.blogOpen);return}
 const back=target.closest('[data-blog-back]');if(back){if(history.state?.blogFrom){history.back()}else navigate('home');return}
 const r=target.closest('[data-blog-route]');if(r){const selected=r.dataset.blogFocus;navigate(r.dataset.blogRoute);if(selected==='category')document.querySelector('#blog-editor [name="category"]')?.focus();if(selected==='cover')document.querySelector('#blog-editor [name="cover"]')?.click();return}
 const edit=target.closest('[data-blog-edit]');if(edit){navigate('write',{draftId:edit.dataset.blogEdit});return}
 const draftPreview=target.closest('[data-blog-preview-draft]');if(draftPreview){navigate('preview',{draftId:draftPreview.dataset.blogPreviewDraft});return}
 const remove=target.closest('[data-blog-remove]');if(remove){if(window.confirm(tx('این پیش‌نویس را از این دستگاه حذف می‌کنی؟','Delete this local draft?'))){if(!saveItems(localItems().filter(x=>x.id!==remove.dataset.blogRemove)))alert(tx('حذف انجام نشد.','Delete failed.'));render()}return}
 if(target.closest('[data-blog-save]')){saveDraft();return}
 if(target.closest('[data-blog-preview]')){if(document.querySelector('.blog-preview-layer'))return;preview();return}
 if(target.closest('[data-blog-close-preview]')){target.closest('.blog-preview-layer')?.remove();const form=document.getElementById('blog-editor');if(form)form.hidden=false;return}
 if(target.closest('[data-blog-back-editor]')){navigate('write',{draftId:param('draftId')});return}
 const b=target.closest('[data-blog-bookmark]');if(b){bookmark(b.dataset.blogBookmark);return}
 if(target.closest('[data-blog-share]')){
  const url=location.href,el=document.getElementById('blog-share-message');
  const copied=()=>{if(el)el.textContent=tx('لینک مقاله کپی شد.','Article link copied.')};
  const failure=()=>{if(el)el.textContent=tx('اشتراک‌گذاری ممکن نشد؛ لینک را از نوار آدرس کپی کن.','Sharing is unavailable; copy the link from the address bar.')};
  if(navigator.share)navigator.share({url}).catch(failure);
  else if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).then(copied).catch(failure);
  else failure();
  return;
 }
});
document.addEventListener('input',e=>{
 if(e.target.matches('[data-blog-search]')){
  query=e.target.value;filter='all';const cursor=e.target.selectionStart;
  const url=new URL(location.href);url.searchParams.set('blogView','search');url.searchParams.set('q',query);url.hash='blog';
  history.replaceState({...history.state,elaraTab:'blog'},'',url.pathname+url.search+url.hash);
  render();const next=document.querySelector('[data-blog-search]');next?.focus();try{next?.setSelectionRange(cursor,cursor)}catch{}
 }
 if(e.target.closest('#blog-editor')){editorDirty=true;const body=document.querySelector('#blog-editor [name="body"]');const label=document.getElementById('blog-word-count');if(body&&label)label.textContent=body.value.trim().split(/\s+/).filter(Boolean).length+' '+tx('کلمه','words')}
});
document.addEventListener('change',e=>{
 if(!e.target.matches('#blog-editor [name="cover"]'))return;
 const file=e.target.files?.[0];if(!file)return;
 if(!['image/webp','image/png','image/jpeg'].includes(file.type)||file.size>5*1024*1024){e.target.value='';alert(tx('فقط تصویر WebP، PNG یا JPEG تا ۵ مگابایت مجاز است.','Use a WebP, PNG or JPEG image under 5 MB.'));return}
 if(editorCoverUrl)URL.revokeObjectURL(editorCoverUrl);
 editorCoverUrl=URL.createObjectURL(file);editorDirty=true;const node=document.getElementById('blog-cover-preview');if(node)node.innerHTML='<img class="blog-local-cover" alt="" src="'+esc(editorCoverUrl)+'"><small>'+tx('فقط پیش‌نمایش؛ آپلود و ذخیره تصویر انجام نشده است.','Preview only; image is not uploaded or saved.')+'</small>';
});
window.addEventListener('beforeunload',e=>{if(editorDirty&&mode()==='write'){e.preventDefault();e.returnValue=''}});
window.addEventListener('popstate',()=>{editorDirty=false;render()});
for(const event of ['elara:locale-changed','elara:open'])window.addEventListener(event,e=>{if(event==='elara:open'&&e.detail?.tab!=='blog')return;setTimeout(()=>{render();void loadPublished()},0)});
window.addEventListener('elara:account-ready',()=>setTimeout(()=>{render();void loadPublished()},0));
const style=document.createElement('link');style.rel='stylesheet';style.href='blog01-dashboard.css?v=20261012-blog-fidelity-02';document.head.append(style);
const img=new Image();img.src='assets/ui/weblog_banner_main.webp';img.decode?.().then(()=>{document.documentElement.dataset.elaraBlogBannerReady='true'},()=>{document.documentElement.dataset.elaraBlogBannerReady='false'});
const start=()=>{render();void loadPublished()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ElaraBlog={articles,render,openArticle,reloadPublished:loadPublished,get published(){return publishedArticles.slice()},get drafts(){return localItems()},navigate};
})();
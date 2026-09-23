/* Private profile + three-dot account drawer for desktop and mobile. */
(() => {
  'use strict';
  const KEY='elara_space_v1', PREF='elara_preferences_v2', NOTIF='elara_notifications_v1', $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>window.ElaraIcons?.icon?.(name)||'<span class="elara-icon" aria-hidden="true"></span>';
  const makeId=()=>crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
  const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}};
  const write=data=>{localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:data}));window.dispatchEvent(new Event('elara:data-changed'))};
  const pref=()=>{try{return {mode:'dark',color:'violet',style:'default',language:'fa',...JSON.parse(localStorage.getItem(PREF)||'{}')}}catch{return {mode:'dark',color:'violet',style:'default',language:'fa'}}};
  const savePref=patch=>{const p={...pref(),...patch};localStorage.setItem(PREF,JSON.stringify(p));return p};
  let root,panel,current='home';

  function ensureData(d){for(const k of ['tasks','folders','tags','missionRewardClaims'])if(!Array.isArray(d[k]))d[k]=[];return d}
  function profile(){return window.ElaraSocial?.me||window.ElaraAccount?.profile||{}}
  const privacyUid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
  const privacyKey=()=>`elara_privacy_local_v1_${privacyUid()||'guest'}`;
  function readPrivacy(){try{return {showWellnessHome:true,...JSON.parse(localStorage.getItem(privacyKey())||'{}')}}catch{return{showWellnessHome:true}}}
  function writePrivacy(patch){try{localStorage.setItem(privacyKey(),JSON.stringify({...readPrivacy(),...patch}));return true}catch{return false}}
  function wellnessHomeVisible(){return readPrivacy().showWellnessHome!==false}
  window.ElaraPrivacyLocal={read:readPrivacy,write:writePrivacy,wellnessHomeVisible};
  function topOverlayOpen(){
    const dialog=document.getElementById('elara-dialog-root'),wardrobe=document.querySelector('.approved-wardrobe');
    return !!(dialog&&!dialog.hidden&&!dialog.classList.contains('hidden')||wardrobe&&!wardrobe.hidden);
  }
  function closeInternal(){root?.classList.add('hidden');document.body.classList.remove('elara-private-drawer-open')}
  function clearDrawerHistoryMarker(){if(history.state?.elaraDrawer)history.replaceState({...history.state,elaraDrawer:false},'',location.href)}
  function close(){if(!root||root.classList.contains('hidden'))return;if(history.state?.elaraDrawer){history.back();return}closeInternal()}
  function open(section='home'){if(!root)return;const wasClosed=root.classList.contains('hidden');if(wasClosed&&!history.state?.elaraDrawer)history.pushState({...history.state,elaraDrawer:true},'',location.href);root.classList.remove('hidden');document.body.classList.add('elara-private-drawer-open');renderProfile();show(section)}
  function show(section='home'){
    current=section;
    panel?.querySelectorAll('[data-drawer-section]').forEach(x=>x.classList.toggle('hidden',x.dataset.drawerSection!==section));
    panel?.querySelectorAll('[data-drawer-nav]').forEach(x=>x.classList.toggle('active',x.dataset.drawerNav===section));
    if(section==='home')renderHub();
    if(section==='account')renderAccount();
    if(section==='privacy')renderPrivacy();
    if(section==='folders')renderFolders();
    if(section==='notifications')renderNotifications();
    if(section==='appearance')renderAppearance();
    if(section==='language')renderLanguage();
    if(section==='help')renderHelp();
    if(section==='calendar')renderCalendar();
  }

  function medalsFor(level){
    const out=[];if(level>=1)out.push('برنز');if(level>=4)out.push('نقره');if(level>=7)out.push('طلا');if(level>=10)out.push('الماس');return out;
  }
  function profileView(){const system=window.ElaraProfileSystem;return system?.viewModel?.(profile(),{self:true})||null}
  function renderProfile(){
    const host=$('drawer-profile-summary'),head=host?.closest('.drawer-profile-head'),view=profileView();
    if(!host||!view)return;
    host.innerHTML=window.ElaraProfileSystem.composition(view,{compact:true});
    if(head)head.style.backgroundImage=`linear-gradient(color-mix(in srgb,var(--surface) 42%,transparent),color-mix(in srgb,var(--surface) 82%,transparent)),url('${view.bannerSrc}')`;
  }

  function sectionHead(title,sub){
    return `<div class="drawer-section-head"><button type="button" data-drawer-nav="home" aria-label="بازگشت">→</button><div><strong>${esc(title)}</strong><small>${esc(sub||'')}</small></div></div>`;
  }
  function renderHub(){
    const host=panel?.querySelector('[data-drawer-section="home"]');if(!host)return;const view=profileView(),person=profile();
    const name=esc(view?.name||person?.name||'Elara'),level=Number(view?.level||1),title=esc(view?.title||'مسیر شخصی تو');
    host.innerHTML=`<section class="pass5-drawer-hub"><div class="pass5-drawer-hub-copy"><span class="eyebrow">ELARA SPACE</span><h2>حساب و تنظیمات</h2><p>سلام ${name}؛ از اینجا ظاهر، حریم خصوصی و هویت پروفایلت را مدیریت کن.</p><div class="pass5-drawer-hub-meta"><span>Level ${level}</span><span>${title}</span></div></div><div class="pass5-drawer-hub-grid"><button type="button" data-drawer-nav="account">${icon('user')}<span><b>پروفایل من</b><small>نمایش و ویرایش هویت</small></span></button><button type="button" data-drawer-nav="appearance">${icon('spark')}<span><b>ظاهر و تم‌ها</b><small>Neon، Mode و Accent</small></span></button><button type="button" data-drawer-nav="privacy">${icon('shield')}<span><b>حریم خصوصی</b><small>پروفایل و امنیت حساب</small></span></button><button type="button" data-approved-wardrobe>${icon('wardrobe')}<span><b>کمد</b><small>آواتار، فریم و بنر</small></span></button></div></section>`;
  }
  function renderAccount(){
    const host=$('drawer-account-area');if(!host)return;const view=profileView(),person=profile();
    if(!view){host.innerHTML=`${sectionHead('حساب کاربری','پروفایل خصوصی خودت را اینجا مدیریت کن.')}<p class="muted">اطلاعات حساب هنوز آماده نیست.</p>`;return}
    host.innerHTML=`${sectionHead('حساب کاربری','نمای پروفایل خصوصی و آیتم‌های انتخابی این حساب.')}<section class="pass4-account-card">${window.ElaraProfileSystem.composition(view)}<p class="pass4-account-bio">${esc(person.bio||'هنوز Bio ثبت نشده است.')}</p><div class="pass4-profile-facts"><span>Level ${view.level}</span><span>${esc(view.title)}</span><span>${Number(view.xp||0).toLocaleString('fa-IR')} XP</span><span>فریم: ${esc(view.frameLabel)}</span><span>بنر: ${esc(view.bannerLabel)}</span></div><div class="pass4-account-actions"><button type="button" class="primary-button" data-profile-edit>${icon('user')} ویرایش پروفایل</button><button type="button" class="quiet-button" data-approved-wardrobe>${icon('wardrobe')} کمد</button></div><p class="muted pass4-account-note">آیتم‌های کمد فعلاً روی همین مرورگر و جدا برای UID این حساب ذخیره می‌شوند؛ همگام‌سازی و قفل سروری هنوز فعال نیست.</p></section>`;
  }
  function privacyRow(title,sub,control,status=''){
    return `<div class="pass2-privacy-row"><div><strong>${esc(title)}</strong><small>${esc(sub)}</small></div><div class="pass2-privacy-control">${control}${status?`<em>${esc(status)}</em>`:''}</div></div>`;
  }
  function renderPrivacy(){
    const host=$('drawer-privacy-area');if(!host)return;
    const p=profile(),id=privacyUid(),activity=!!id&&localStorage.getItem('elara_share_activity_'+id)==='yes',local=readPrivacy();
    const locked=(title,sub)=>privacyRow(title,sub,'<span class="pass2-private-lock">خصوصی</span>','اشتراک‌گذاری عمومی برای این بخش فعال نیست');
    host.innerHTML=`${sectionHead('مرکز حریم خصوصی و امنیت','دسترسی عمومی، اشتراک فعالیت و امنیت حساب را یکجا مدیریت کن.')}<div class="pass2-privacy-list">${privacyRow('پروفایل عمومی','نمایش پروفایل برای کاربران واردشده',`<label class="pass2-switch"><input type="checkbox" data-drawer-privacy="profile" ${p.profilePublic!==false?'checked':''}><span></span></label>`)}${privacyRow('فعالیت دوستان','اشتراک خلاصه فعالیت فقط با دوستات',`<label class="pass2-switch"><input type="checkbox" data-drawer-privacy="activity" ${activity?'checked':''}><span></span></label>`)}${locked('تسک‌ها','عنوان و جزئیات تسک‌ها')}${locked('عادت‌ها','داده‌های عادت و تداوم')}${locked('اهداف','هدف‌ها و مراحل')}${locked('مأموریت‌ها','پیشرفت مأموریت‌ها')}${locked('کتابخانه','کتاب‌ها و قفسه‌های شخصی')}${locked('زبان / گزارش یادگیری','واژه‌ها و دفتر گزارش زبان')}${locked('Ranking / Social','فقط داده‌های اجتماعی‌ای که سرویس واقعی پشتیبانی کند نمایش داده می‌شوند')}${privacyRow('ورزش و سلامت','وزن، آب، خواب، چرخه و تمرین هرگز عمومی نمی‌شوند',`<label class="pass2-switch"><input type="checkbox" data-drawer-privacy="wellness-home" ${local.showWellnessHome!==false?'checked':''}><span></span></label>`,'این سوییچ فقط خلاصه آب/خواب در Home را کنترل می‌کند؛ داده‌ها همیشه خصوصی‌اند')}</div><section class="pass2-security"><h3>امنیت حساب</h3><form id="drawer-password-form" class="drawer-form"><label>رمز فعلی<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>رمز جدید<input name="newPassword" type="password" autocomplete="new-password" minlength="6" required></label><label>تکرار رمز جدید<input name="confirmPassword" type="password" autocomplete="new-password" minlength="6" required></label><button class="primary-button" type="submit">تغییر رمز عبور</button><button class="quiet-button" type="button" data-drawer-reset-password>ارسال لینک بازیابی به ایمیل</button><p class="muted wide" data-privacy-status></p></form></section>`;
  }
  function renderFolders(){
    const host=$('drawer-folder-area');if(!host)return;const data=ensureData(read());
    const cards=data.folders.map(name=>{
      const tasks=data.tasks.filter(t=>t.folder===name);
      return `<section class="drawer-folder-card" data-folder-card="${esc(name)}"><header><div><strong>${icon('folder')} ${esc(name)}</strong><small>${tasks.length.toLocaleString('fa-IR')} تسک</small></div><button type="button" class="mini-button" data-folder-toggle="${esc(name)}">باز/بسته</button></header><div class="drawer-folder-body"><form data-folder-task-form="${esc(name)}"><input maxlength="180" required placeholder="تسک جدید داخل این پوشه…"><button class="primary-button" type="submit">+ تسک</button></form><div class="drawer-folder-tasks">${tasks.length?tasks.map(t=>`<button type="button" data-open-task="${esc(t.id)}"><span>${t.completed?'✓':'○'}</span><span><strong>${esc(t.text)}</strong>${t.shortDescription?`<small>${esc(t.shortDescription)}</small>`:''}</span></button>`).join(''):'<p class="muted">هنوز تسکی داخل این پوشه نیست.</p>'}</div></div></section>`;
    }).join('');
    host.innerHTML=`${sectionHead('پوشه‌ها و تگ‌ها','هر پوشه را باز کن و همان‌جا تسک بساز.')}<div class="drawer-manage-actions"><button type="button" class="primary-button" data-drawer-add="folder">+ پوشه</button><button type="button" class="quiet-button" data-drawer-add="tag">+ برچسب</button></div><div class="drawer-tags">${data.tags.map(t=>`<span>#${esc(t)}</span>`).join('')||'<small class="muted">هنوز برچسبی نداری.</small>'}</div><div class="drawer-folders">${cards||'<p class="muted">اولین پوشه را اضافه کن.</p>'}</div>`;
  }
  function notificationRows(){
    const data=ensureData(read()),local=(()=>{try{return JSON.parse(localStorage.getItem(NOTIF)||'[]')}catch{return[]}})();
    const claims=data.missionRewardClaims.slice(-30).reverse().map(key=>{
      const text=String(key),parts=text.split(':');
      return {title:'پاداش مأموریت دریافت شد',meta:parts.length>1?`${parts[0]} · ${parts.slice(1).join(':')}`:text};
    });
    return [...local.slice(-30).reverse(),...claims].slice(0,50);
  }
  function renderNotifications(){
    const host=$('drawer-notification-area');if(!host)return;const rows=notificationRows();
    host.innerHTML=`${sectionHead('نوتیف و پیام‌ها','اعلان‌ها و تاریخچهٔ سیستم.')}<div class="drawer-notifications">${rows.length?rows.map(x=>`<div><strong>${esc(x.title||x.message||'پیام')}</strong><small>${esc(x.meta||x.createdAt||'')}</small></div>`).join(''):'<p class="muted">هنوز اعلان ثبت‌شده‌ای وجود ندارد.</p>'}</div>`;
  }
  function renderAppearance(){
    const host=$('drawer-appearance-area');if(!host)return;const p=pref(),style=p.style||'default',amoled=localStorage.getItem('elara_amoled')==='yes',mode=amoled?'amoled':p.mode;
    const modeTile=(key,label,iconName,desc)=>`<button type="button" class="pass4-theme-tile ${mode===key?'active':''}" data-drawer-mode="${key}" aria-pressed="${mode===key}"><span class="pass4-theme-preview mode-${key}">${icon(iconName)}</span><b>${label}</b><small>${desc}</small></button>`;
    const styleTile=(key,label,desc)=>`<button type="button" class="pass4-theme-tile ${style===key?'active':''}" data-drawer-style="${key}" aria-pressed="${style===key}"><span class="pass4-theme-preview style-${key}"><i></i><i></i><i></i></span><b>${label}</b><small>${desc}</small></button>`;
    const colors=[['violet','یاسی'],['blue','آبی'],['pink','صورتی'],['red','قرمز'],['orange','نارنجی'],['green','سبز'],['black','مشکی']];
    host.innerHTML=`${sectionHead('ظاهر و تم‌ها','Mode، Style و Accent را با پیش‌نمایش فوری انتخاب کن.')}<section class="pass4-appearance-group"><header><strong>Mode</strong><small>روشنایی و پس‌زمینه</small></header><div class="pass4-theme-grid">${modeTile('dark','Dark','moon','تاریک استاندارد')}${modeTile('light','Light','sun','روشن و خوانا')}${modeTile('system','System','settings','هماهنگ با دستگاه')}${modeTile('amoled','AMOLED','moon','مشکی خالص')}</div></section><section class="pass4-appearance-group"><header><strong>Style</strong><small>فرم کارت‌ها و بافت رابط</small></header><div class="pass4-theme-grid">${styleTile('default','Elara Neon','فضایی، نئونی و سینمایی')}${styleTile('minimal','Minimal','ساده و سبک')}${styleTile('rugged','Rugged','زاویه‌دار و پرقدرت')}${styleTile('anime','Anime','گرد و درخشان')}</div></section><section class="pass4-appearance-group"><header><strong>Accent</strong><small>رنگ تأکیدی رابط</small></header><div class="pass4-accent-grid">${colors.map(([key,label])=>`<button type="button" data-drawer-color="${key}" class="pass4-accent-tile ${p.color===key?'active':''}" aria-pressed="${p.color===key}"><span class="pass4-accent-dot accent-${key}"></span><b>${label}</b></button>`).join('')}</div></section>`;
  }
  function renderLanguage(){
    const host=$('drawer-language-area');if(!host)return;const p=pref(),language=p.language||'fa';
    host.innerHTML=`${sectionHead('زبان برنامه','زبان رابط را بدون خروج از منو تغییر بده.')}<div class="drawer-language-options"><button type="button" data-drawer-language="fa" class="${language==='fa'?'active':''}"><b>FA</b> فارسی</button><button type="button" data-drawer-language="en" class="${language==='en'?'active':''}"><b>EN</b> English</button><button type="button" data-drawer-language="tr" class="${language==='tr'?'active':''}"><b>TR</b> Türkçe</button></div><p class="muted">تغییر زبان روی منو و بخش‌های جدید اعمال می‌شود؛ ترجمهٔ کامل متن‌های قدیمی هنوز در رودمپ است.</p>`;
  }
  function renderHelp(){
    const host=$('drawer-help-area');if(!host)return;
    host.innerHTML=`${sectionHead('راهنما','راهنمای سریع بخش‌های اصلی Elara.')}<div class="drawer-help-list"><details open><summary>تسک‌ها</summary><p>روی عنوان تسک بزن تا توضیحات و همهٔ جزئیات را ببینی و همان‌جا ویرایش کنی.</p></details><details><summary>پوشه‌ها و تگ‌ها</summary><p>از همین منو پوشه بساز و داخل هر پوشه مستقیم تسک اضافه کن.</p></details><details><summary>پروفایل و دوستان</summary><p>پروفایل خودت در همین پنل است؛ پروفایل دوستان به شکل Popup وسط صفحه باز می‌شود.</p></details><details><summary>حریم خصوصی</summary><p>رمز عبور و نمایش عمومی پروفایل را از بخش امنیت و حساب مدیریت کن.</p></details></div>`;
  }
  function calendarLabel(){return (localStorage.getItem('elara_calendar_pref')||'persian')==='persian'?'شمسی':'میلادی'}
  function updateCalendarLabels(){
    const type=localStorage.getItem('elara_calendar_pref')||'persian';document.documentElement.dataset.calendar=type;
    const locale=type==='persian'?'fa-IR-u-ca-persian':'fa-IR-u-ca-gregory',value=new Intl.DateTimeFormat(locale,{weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(new Date());
    if($('today-date'))$('today-date').textContent=value;if($('sidebar-date'))$('sidebar-date').textContent=value;if($('drawer-calendar-label'))$('drawer-calendar-label').textContent=calendarLabel();
  }
  function renderCalendar(){
    const host=$('drawer-calendar-area');if(!host)return;const current=localStorage.getItem('elara_calendar_pref')||'persian';
    host.innerHTML=`${sectionHead('تقویم','نوع نمایش تاریخ در رابط کاربری.')}<div class="drawer-choice-grid"><button data-drawer-calendar="persian" class="${current==='persian'?'active':''}">شمسی / فارسی</button><button data-drawer-calendar="gregorian" class="${current==='gregorian'?'active':''}">میلادی</button></div>`;
  }

  async function addNamed(kind){
    const data=ensureData(read()),key=kind==='folder'?'folders':'tags';
    const value=await window.ElaraDialog.prompt(kind==='folder'?'نام پوشه را بنویس.':'نام برچسب را بنویس.',{title:kind==='folder'?'افزودن پوشه':'افزودن برچسب',label:'نام',maxLength:60,confirmText:'افزودن'});
    const name=String(value||'').trim().slice(0,60);if(!name)return;
    if(data[key].some(x=>x.toLocaleLowerCase()===name.toLocaleLowerCase()))return;
    data[key].push(name);write(data);renderFolders();
  }
  function addTask(folder,text){
    const data=ensureData(read()),title=String(text||'').trim().slice(0,180);if(!title)return;
    data.tasks.unshift({id:makeId(),text:title,shortDescription:'',description:'',date:'',time:'',priority:'4',folder,tag:'',completed:false,doneAt:null,xpAwarded:false,createdAt:Date.now(),recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{}});
    write(data);renderFolders();
  }
  function setStyle(style){savePref({style});document.body.dataset.elaraStyle=style;renderAppearance()}
  function setMode(mode){
    if(mode==='amoled'){localStorage.setItem('elara_amoled','yes');document.querySelector('[data-mode="dark"]')?.click();savePref({mode:'dark'});document.body.classList.add('amoled')}
    else{localStorage.setItem('elara_amoled','no');document.body.classList.remove('amoled');document.querySelector(`[data-mode="${CSS.escape(mode)}"]`)?.click();savePref({mode})}
    renderAppearance();
  }
  function setColor(color){document.querySelector(`[data-color="${CSS.escape(color)}"]`)?.click();savePref({color});renderAppearance()}
  function removeLegacyMore(){
    document.getElementById('elara-more-drawer')?.remove();
    document.querySelectorAll('[data-elara-more],.elara-more-trigger').forEach(x=>x.remove());
  }

  function build(){
    if(document.querySelector('.elara-private-drawer'))return;
    removeLegacyMore();
    document.getElementById('elara-account-menu-trigger')?.remove();
    const trigger=document.createElement('button');trigger.id='elara-account-menu-trigger';trigger.type='button';trigger.className='icon-button elara-top-more';trigger.setAttribute('aria-label','باز کردن منوی حساب و تنظیمات');trigger.title='منوی حساب و تنظیمات';trigger.innerHTML='<span class="elara-menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>';trigger.addEventListener('click',()=>open('home'));
    const mountTrigger=()=>{const theme=document.getElementById('theme-toggle'),actions=document.querySelector('.topbar-actions');if(!actions)return false;if(theme){theme.insertAdjacentElement('afterend',trigger)}else actions.append(trigger);return true};
    mountTrigger();setTimeout(mountTrigger,0);setTimeout(mountTrigger,250);setTimeout(mountTrigger,1000);
    root=document.createElement('div');root.className='elara-private-drawer hidden';
    root.innerHTML=`<button type="button" class="elara-private-drawer-scrim" aria-label="بستن"></button><aside class="elara-private-drawer-panel" aria-label="پروفایل و تنظیمات"><header class="drawer-profile-head"><div id="drawer-profile-summary" class="drawer-profile-summary"></div><button type="button" class="drawer-theme-toggle" data-drawer-theme title="دارک / روشن">${icon('moon')}</button><button type="button" class="drawer-close" data-drawer-close>×</button></header><nav class="drawer-menu"><button data-drawer-nav="account">${icon('user')}<b>حساب کاربری</b><small>پروفایل و اطلاعات</small></button><button data-drawer-nav="privacy">${icon('shield')}<b>حریم خصوصی</b><small>امنیت و رمز عبور</small></button><button data-drawer-nav="folders">${icon('folder')}<b>پوشه‌ها و تگ‌ها</b><small>مدیریت و تسک داخل پوشه</small></button><button data-drawer-nav="notifications">${icon('notification')}<b>نوتیف و پیام‌ها</b><small>اعلان‌ها و تاریخچه</small></button><button data-drawer-nav="appearance">${icon('spark')}<b>ظاهر و تم‌ها</b><small>Mode، Style و رنگ‌ها</small></button><button data-drawer-nav="help">${icon('help')}<b>راهنما</b><small>راهنمای استفاده</small></button><button data-drawer-nav="calendar">${icon('calendar')}<b>تقویم</b><small id="drawer-calendar-label">${calendarLabel()}</small></button><button type="button" data-approved-wardrobe>${icon('wardrobe')}<b>کمد</b><small>آواتار، فریم و بنر</small></button><button data-drawer-nav="language">${icon('course')}<b>زبان برنامه</b><small>فارسی / English / Türkçe</small></button><button class="danger" data-drawer-action="logout">${icon('logout')}<b>خروج از حساب</b><small>خروج امن از Elara</small></button></nav><section data-drawer-section="home"></section><section data-drawer-section="account" class="hidden"><div id="drawer-account-area"></div></section><section data-drawer-section="privacy" class="hidden"><div id="drawer-privacy-area"></div></section><section data-drawer-section="folders" class="hidden"><div id="drawer-folder-area"></div></section><section data-drawer-section="notifications" class="hidden"><div id="drawer-notification-area"></div></section><section data-drawer-section="appearance" class="hidden"><div id="drawer-appearance-area"></div></section><section data-drawer-section="language" class="hidden"><div id="drawer-language-area"></div></section><section data-drawer-section="help" class="hidden"><div id="drawer-help-area"></div></section><section data-drawer-section="calendar" class="hidden"><div id="drawer-calendar-area"></div></section></aside>`;
    document.body.append(root);panel=root.querySelector('.elara-private-drawer-panel');
    root.querySelector('.elara-private-drawer-scrim').addEventListener('click',close);root.querySelector('[data-drawer-close]').addEventListener('click',close);
    document.addEventListener('keydown',event=>{if(event.key!=='Escape'||!root||root.classList.contains('hidden')||topOverlayOpen())return;event.preventDefault();event.stopPropagation();close()},true);
    window.addEventListener('popstate',()=>{if(root&&!root.classList.contains('hidden')&&!history.state?.elaraDrawer)closeInternal()});
    removeLegacyMore();setTimeout(removeLegacyMore,0);setTimeout(removeLegacyMore,250);setTimeout(removeLegacyMore,1000);
    const p=pref();document.body.dataset.elaraStyle=p.style||'default';document.body.classList.toggle('amoled',localStorage.getItem('elara_amoled')==='yes');
    renderProfile();renderHub();updateCalendarLabels();
  }

  document.addEventListener('click',async e=>{
    if(e.target.closest('[data-drawer-theme]')){document.getElementById('theme-toggle')?.click();return}
    const nav=e.target.closest('[data-drawer-nav]');if(nav){show(nav.dataset.drawerNav);return}
    const route=e.target.closest('[data-drawer-route]');if(route){clearDrawerHistoryMarker();closeInternal();window.ElaraOpen?.(route.dataset.drawerRoute);return}
    const language=e.target.closest('[data-drawer-language]');if(language){const lang=language.dataset.drawerLanguage;savePref({language:lang});window.ElaraSetLanguage?.(lang);renderLanguage();return}
    const add=e.target.closest('[data-drawer-add]');if(add){await addNamed(add.dataset.drawerAdd);return}
    const toggle=e.target.closest('[data-folder-toggle]');if(toggle){toggle.closest('.drawer-folder-card')?.classList.toggle('collapsed');return}
    const task=e.target.closest('[data-open-task]');if(task){clearDrawerHistoryMarker();closeInternal();window.ElaraOpen?.('tasks');setTimeout(()=>document.querySelector(`[data-phase2-action="view-task"][data-id="${CSS.escape(task.dataset.openTask)}"]`)?.click(),100);return}
    const edit=e.target.closest('[data-profile-edit]');if(edit){await window.ElaraProfileSystem?.openEditor?.();return}
    const mode=e.target.closest('[data-drawer-mode]');if(mode){setMode(mode.dataset.drawerMode);return}
    const color=e.target.closest('[data-drawer-color]');if(color){setColor(color.dataset.drawerColor);return}
    const style=e.target.closest('[data-drawer-style]');if(style){setStyle(style.dataset.drawerStyle);return}
    const cal=e.target.closest('[data-drawer-calendar]');if(cal){localStorage.setItem('elara_calendar_pref',cal.dataset.drawerCalendar);updateCalendarLabels();renderCalendar();return}
    if(e.target.closest('[data-drawer-reset-password]')){
      const status=panel.querySelector('[data-privacy-status]');try{await window.ElaraAccount?.sendPasswordReset?.();status.textContent='لینک بازیابی به ایمیل حساب ارسال شد.'}catch(err){status.textContent=err.message||String(err)}return;
    }
    const action=e.target.closest('[data-drawer-action]');if(!action)return;
    if(action.dataset.drawerAction==='logout'&&await window.ElaraDialog.confirm('از حساب Elara خارج می‌شوی؟',{title:'خروج از حساب',confirmText:'خروج',danger:true})){clearDrawerHistoryMarker();closeInternal();await window.ElaraAccount?.logout?.()}
  });

  document.addEventListener('change',async e=>{
    const control=e.target.closest?.('[data-drawer-privacy]');if(!control)return;
    const kind=control.dataset.drawerPrivacy,status=$('drawer-privacy-area')?.querySelector('[data-privacy-status]');
    if(kind==='activity'){
      const id=privacyUid();if(!id){control.checked=false;if(status)status.textContent='ابتدا وارد حساب شو.';return}
      localStorage.setItem('elara_share_activity_'+id,control.checked?'yes':'no');
      const mirror=$('elara-share-activity');if(mirror)mirror.checked=control.checked;
      if(status)status.textContent='تنظیم اشتراک فعالیت روی این دستگاه ذخیره شد.';return;
    }
    if(kind==='wellness-home'){
      if(!writePrivacy({showWellnessHome:control.checked})){control.checked=!control.checked;if(status)status.textContent='ذخیرهٔ تنظیم محلی انجام نشد.';return}
      window.dispatchEvent(new Event('elara:privacy-local-changed'));
      if(status)status.textContent='نمایش خلاصه سلامت در خانه به‌روزرسانی شد.';return;
    }
    if(kind==='profile'){
      const p=profile();if(typeof window.ElaraSocial?.saveProfileValues!=='function'){control.checked=!control.checked;if(status)status.textContent='سرویس پروفایل هنوز آماده نیست.';return}
      control.disabled=true;
      try{const result=await window.ElaraSocial.saveProfileValues({name:p.name,username:p.username,bio:p.bio,profilePublic:control.checked});if(status)status.textContent=result?.warnings?.join(' ')||'تنظیم پروفایل ذخیره شد.'}
      catch(err){control.checked=!control.checked;if(status)status.textContent=err?.message||'ذخیره انجام نشد.'}
      finally{control.disabled=false}
    }
  });

  document.addEventListener('submit',async e=>{
    const folderForm=e.target.closest('[data-folder-task-form]');
    if(folderForm){e.preventDefault();const input=folderForm.querySelector('input');addTask(folderForm.dataset.folderTaskForm,input.value);input.value='';return}
    if(e.target.id==='drawer-password-form'){
      e.preventDefault();const form=e.target,status=form.querySelector('[data-privacy-status]'),button=form.querySelector('[type=submit]');if(form.elements.newPassword.value!==form.elements.confirmPassword.value){status.textContent='تکرار رمز جدید یکسان نیست.';return}button.disabled=true;
      try{await window.ElaraAccount?.changePassword?.(form.elements.currentPassword.value,form.elements.newPassword.value);status.textContent='✓ رمز عبور تغییر کرد.';form.reset()}
      catch(err){status.textContent=window.ElaraAccount?.errorMessage?.(err)||err.message||String(err)}
      finally{button.disabled=false}return;
    }
  });

  window.addEventListener('elara:social-updated',()=>{renderProfile();if(current==='account')renderAccount()});
  window.addEventListener('elara:profile-saved',()=>{renderProfile();if(current==='home')renderHub();if(current==='account')renderAccount()});
  window.addEventListener('elara:wardrobe-changed',()=>{renderProfile();if(current==='account')renderAccount()});
  window.addEventListener('elara:data-changed',()=>{if(root&&!root.classList.contains('hidden')){renderProfile();if(current==='account')renderAccount();if(current==='folders')renderFolders();if(current==='notifications')renderNotifications()}});
  window.addEventListener('elara:account-ready',()=>{renderProfile();if(current==='home')renderHub();if(current==='account')renderAccount()});
  window.ElaraPrivateDrawer={open,close,renderProfile,renderAccount,renderAppearance};
  window.ElaraDrawerTest={pref,savePref,setMode,setStyle,setColor,renderAppearance};
  window.ElaraPrivatePanel=window.ElaraPrivateDrawer;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
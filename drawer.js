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

  function ensureData(d){for(const k of ['tasks','taskLists','folders','tags','missionRewardClaims'])if(!Array.isArray(d[k]))d[k]=[];return d}
  function profile(){return window.ElaraSocial?.me||window.ElaraAccount?.profile||{}}
  const privacyUid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||null;
  const privacyKey=()=>`elara_privacy_local_v1_${privacyUid()||'guest'}`;
  const SHARE_KEYS=['task','habit','goal','mission','reading','language','exercise','focus','streak','ranking'];
  const validVisibility=value=>['private','friends','public'].includes(value)?value:null;
  function legacyActivityVisibility(){const id=privacyUid();if(!id)return'private';const explicit=validVisibility(localStorage.getItem('elara_activity_visibility_'+id));if(explicit)return explicit;return localStorage.getItem('elara_share_activity_'+id)==='no'?'private':'friends'}
  function readPrivacy(){let stored={};try{stored=JSON.parse(localStorage.getItem(privacyKey())||'{}')||{}}catch{}const fallback=legacyActivityVisibility(),base={showWellnessHome:true,cycle:'private'};for(const key of SHARE_KEYS)base[key]=fallback;return {...base,...stored,cycle:'private'}}
  function writePrivacy(patch){try{localStorage.setItem(privacyKey(),JSON.stringify({...readPrivacy(),...patch,cycle:'private'}));return true}catch{return false}}
  function privacyVisibility(kind){const value=validVisibility(readPrivacy()[kind]);return value||legacyActivityVisibility()}
  function wellnessHomeVisible(){return true}
  window.ElaraPrivacyLocal={read:readPrivacy,write:writePrivacy,wellnessHomeVisible,visibility:privacyVisibility,categories:SHARE_KEYS.slice()};
  function topOverlayOpen(){
    const dialog=document.getElementById('elara-dialog-root'),wardrobe=document.querySelector('.approved-wardrobe'),notifications=document.getElementById('elara-notification-popover');
    return !!(dialog&&!dialog.hidden&&!dialog.classList.contains('hidden')||wardrobe&&!wardrobe.hidden||notifications&&!notifications.classList.contains('hidden'));
  }
  function drawerFocusables(){
    if(!panel)return[];
    return [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);
  }
  function focusDrawer(){
    if(!panel||root?.classList.contains('hidden'))return;
    const active=panel.querySelector('[data-drawer-section]:not(.hidden)'),target=active?.querySelector('[data-drawer-nav="home"],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')||panel.querySelector('[data-drawer-close]');
    target?.focus?.({preventScroll:true});
  }
  function trapDrawerKey(event){
    if(!root||root.classList.contains('hidden')||topOverlayOpen())return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return}
    if(event.key!=='Tab')return;
    const items=drawerFocusables();if(!items.length){event.preventDefault();panel?.focus?.({preventScroll:true});return}
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus({preventScroll:true})}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus({preventScroll:true})}
  }
  function closeInternal(){
    if(!root)return;
    root.classList.add('hidden');root.hidden=true;root.setAttribute('inert','');
    root.style.setProperty('display','none','important');root.style.setProperty('pointer-events','none','important');
    document.body.classList.remove('elara-private-drawer-open')
  }
  function clearDrawerHistoryMarker(){if(history.state?.elaraDrawer)history.replaceState({...history.state,elaraDrawer:false},'',location.href)}
  function close(){
    if(!root||root.classList.contains('hidden'))return;
    /* Explicit UI close must be synchronous. Using history.back() here could land on
       another drawer-marked entry after hash/navigation changes and leave the overlay
       intercepting the mobile nav. Browser Back still closes via the popstate handler. */
    clearDrawerHistoryMarker();
    closeInternal();
  }
  function open(section='home'){
    if(!root)return;
    root.dataset.mobileSection=section;window.ElaraOverlayStack?.next?.(root);
    const wasClosed=root.classList.contains('hidden')||root.hidden;
    if(wasClosed&&!history.state?.elaraDrawer)history.pushState({...history.state,elaraDrawer:true},'',location.href);
    root.hidden=false;root.removeAttribute('inert');root.style.removeProperty('display');root.style.removeProperty('pointer-events');root.classList.remove('hidden');
    document.body.classList.add('elara-private-drawer-open');renderProfile();show(section);setTimeout(focusDrawer,0)
  }
  function placeMobileSection(section){
    if(!panel)return;
    const mobile=window.matchMedia?.('(max-width:700px)')?.matches;
    const props=['position','inset','top','right','bottom','left','transform','width','height','max-height','margin','overflow','border-radius','align-self','justify-self'];
    if(!mobile){for(const name of props)panel.style.removeProperty(name);return}
    panel.style.setProperty('position','relative','important');
    panel.style.setProperty('inset','auto','important');
    panel.style.setProperty('top','auto','important');
    panel.style.setProperty('left','auto','important');
    panel.style.setProperty('right','auto','important');
    panel.style.setProperty('bottom','auto','important');
    panel.style.setProperty('transform','none','important');
    panel.style.setProperty('align-self','center','important');
    panel.style.setProperty('justify-self','center','important');
    panel.style.setProperty('width','min(94vw,480px)','important');
    panel.style.setProperty('height','min(90dvh,780px)','important');
    panel.style.setProperty('max-height','90dvh','important');
    panel.style.setProperty('margin','0','important');
    panel.style.setProperty('overflow',section==='home'?'auto':'hidden','important');
    panel.style.setProperty('border-radius','20px','important');
  }
  function show(section='home'){
    current=section;
    if(root)root.dataset.mobileSection=section;
    if(panel)panel.dataset.mobileSection=section;
    placeMobileSection(section);
    panel?.querySelectorAll('[data-drawer-section]').forEach(x=>{const active=x.dataset.drawerSection===section;x.classList.toggle('hidden',!active);x.toggleAttribute('hidden',!active);x.setAttribute('aria-hidden',active?'false':'true');if(active)x.removeAttribute('inert');else x.setAttribute('inert','')});
    panel?.querySelectorAll('[data-drawer-nav]').forEach(x=>x.classList.toggle('active',x.dataset.drawerNav===section));
    if(section==='home')renderHub();
    if(section==='settings')renderSettings();
    if(section==='blocked')renderBlocked();
    if(section==='account')renderAccount();
    if(section==='privacy')renderPrivacy();
    if(section==='security')renderSecurity();
    if(section==='folders')renderFolders();
    if(section==='notifications'){markNotificationsRead();renderNotifications();}
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
    const host=panel?.querySelector('[data-drawer-section="home"]');if(!host)return;
    /* Desktop profile home is intentionally empty below the banner.
       Profile / Blocked / Wardrobe / Store already live in the left rail, so
       duplicating them here only makes the drawer noisy. */
    host.replaceChildren();
  }
  function renderSettings(){
    const host=$('drawer-settings-area');if(!host)return;
    host.innerHTML=sectionHead('تنظیمات پروفایل','حساب، حریم خصوصی و تجربهٔ Elara را از همین پروفایل مدیریت کن.')+
      '<div class="drawer-settings-grid">'+
      '<button type="button" data-drawer-nav="security">'+icon('lock')+'<span><b>حساب کاربری</b><small>ایمیل، رمز و امنیت</small></span></button>'+
      '<button type="button" data-drawer-nav="privacy">'+icon('shield')+'<span><b>حریم خصوصی</b><small>نمایش و اشتراک فعالیت</small></span></button>'+
      '<button type="button" data-drawer-nav="blocked">'+icon('shield')+'<span><b>بلاک‌شده‌ها</b><small>مدیریت حساب‌های مسدود</small></span></button>'+
      '<button type="button" data-drawer-nav="language">'+icon('course')+'<span><b>زبان برنامه</b><small>فارسی / English</small></span></button>'+
      '<button type="button" data-drawer-nav="calendar">'+icon('calendar')+'<span><b>تقویم</b><small>'+esc(calendarLabel())+'</small></span></button>'+
      '<button type="button" data-drawer-nav="help">'+icon('help')+'<span><b>راهنما</b><small>راهنمای استفاده</small></span></button>'+
      '<button type="button" data-drawer-nav="appearance">'+icon('spark')+'<span><b>ظاهر و تم‌ها</b><small>Mode، Style و Accent</small></span></button>'+
      '<button type="button" data-drawer-nav="folders">'+icon('folder')+'<span><b>پوشه‌ها و تگ‌ها</b><small>مدیریت ساختار تسک‌ها</small></span></button>'+
      '<button type="button" data-approved-wardrobe>'+icon('wardrobe')+'<span><b>کمد</b><small>آواتار، قاب و بنر</small></span></button>'+
      '<button type="button" data-drawer-action="store">'+icon('spark')+'<span><b>فروشگاه</b><small>تم، پروفایل، قاب و بنر</small></span></button>'+
      '<button type="button" class="danger" data-drawer-action="logout">'+icon('logout')+'<span><b>خروج از حساب</b><small>خروج امن از Elara</small></span></button>'+
      '</div>';
  }
  function renderBlocked(){
    const host=$('drawer-blocked-area');if(!host)return;const blocked=Array.isArray(window.ElaraSocial?.blocked)?window.ElaraSocial.blocked:[];
    const rows=blocked.map(row=>'<div class="pass2-blocked-row"><span><strong>'+esc(row.targetName||row.targetUsername||'کاربر')+'</strong><small>'+(row.targetUsername?'@'+esc(row.targetUsername):'')+'</small></span><button type="button" class="quiet-button" data-social-unblock="'+esc(row.target)+'">رفع مسدودیت</button></div>').join('');
    host.innerHTML=sectionHead('بلاک‌شده‌ها','رفع بلاک، دوستی قبلی را خودکار برنمی‌گرداند.')+'<section class="pass2-blocked-list"><div>'+(rows||'<p class="muted">فعلاً کسی مسدود نشده است.</p>')+'</div><p class="muted" data-privacy-status></p></section>';
  }
  function renderAccount(){
    const host=$('drawer-account-area');if(!host)return;const view=profileView(),person=profile();
    if(!view){host.innerHTML=`${sectionHead('پروفایل من','هویت و اطلاعات پروفایل خودت را اینجا مدیریت کن.')}<p class="muted">اطلاعات حساب هنوز آماده نیست.</p>`;return}
    host.innerHTML=`${sectionHead('پروفایل من','نمای هویت، آواتار و آیتم‌های انتخابی این پروفایل.')}<section class="pass4-account-card">${window.ElaraProfileSystem.composition(view)}<p class="pass4-account-bio">${esc(person.bio||'هنوز Bio ثبت نشده است.')}</p><div class="pass4-profile-facts"><span>Level ${view.level}</span><span>${esc(view.title)}</span><span>${Number(view.xp||0).toLocaleString('fa-IR')} XP</span><span>فریم: ${esc(view.frameLabel)}</span><span>بنر: ${esc(view.bannerLabel)}</span></div><div class="pass4-account-actions"><button type="button" class="primary-button" data-profile-edit>${icon('user')} ویرایش پروفایل</button><button type="button" class="quiet-button" data-approved-wardrobe>${icon('wardrobe')} کمد</button></div><p class="muted pass4-account-note">آیتم‌های کمد فعلاً روی همین مرورگر و جدا برای UID این حساب ذخیره می‌شوند؛ همگام‌سازی و قفل سروری هنوز فعال نیست.</p></section>`;
  }
  function privacyRow(title,sub,control,status=''){
    return `<div class="pass2-privacy-row"><div><strong>${esc(title)}</strong><small>${esc(sub)}</small></div><div class="pass2-privacy-control">${control}${status?`<em>${esc(status)}</em>`:''}</div></div>`;
  }
  function renderPrivacy(){
    const host=$('drawer-privacy-area');if(!host)return;
    const p=profile(),fallback=legacyActivityVisibility(),local=readPrivacy(),blocked=Array.isArray(window.ElaraSocial?.blocked)?window.ElaraSocial.blocked:[];
    const blockedRows=blocked.map(row=>`<div class="pass2-blocked-row"><span><strong>${esc(row.targetName||row.targetUsername||'کاربر')}</strong><small>${row.targetUsername?'@'+esc(row.targetUsername):''}</small></span><button type="button" class="quiet-button" data-social-unblock="${esc(row.target)}">رفع مسدودیت</button></div>`).join('');
    const select=(key,value)=>`<select data-drawer-privacy="${key}" aria-label="سطح نمایش ${key}"><option value="private" ${value==='private'?'selected':''}>خصوصی</option><option value="friends" ${value==='friends'?'selected':''}>فقط دوستان</option><option value="public" ${value==='public'?'selected':''}>عمومی</option></select>`;
    host.innerHTML=`${sectionHead('مرکز حریم خصوصی و امنیت','برای هر نوع فعالیت جداگانه انتخاب کن چه کسی آن را ببیند.')}<div class="pass2-privacy-list">
      ${privacyRow('پروفایل عمومی','نمایش پروفایل برای کاربران واردشده',`<label class="pass2-switch"><input type="checkbox" data-drawer-privacy="profile" ${p.profilePublic!==false?'checked':''}><span></span></label>`)}
      ${privacyRow('پیش‌فرض فعالیت دوستان','برای دسته‌هایی که تنظیم جدا ندارند',select('activity',fallback),'پیش‌فرض محصول: فقط دوستان')}
      ${privacyRow('تسک‌ها','خلاصهٔ تکمیل تسک',select('task',local.task))}
      ${privacyRow('عادت‌ها','تداوم و تکمیل عادت',select('habit',local.habit))}
      ${privacyRow('اهداف','پیشرفت هدف‌ها و مراحل',select('goal',local.goal))}
      ${privacyRow('مأموریت‌ها','تکمیل مأموریت و جایزه',select('mission',local.mission))}
      ${privacyRow('کتابخانه و مطالعه','گزارش مطالعه و تمام‌کردن کتاب',select('reading',local.reading))}
      ${privacyRow('زبان / گزارش یادگیری','فعالیت‌های بخش زبان',select('language',local.language))}
      ${privacyRow('ورزش و سلامت','فعالیت ورزشی قابل انتشار؛ کارت سلامت روی Home خودت همیشه دیده می‌شود',select('exercise',local.exercise),'وزن، آب، خواب و داده‌های سلامت خام منتشر نمی‌شوند')}
      ${privacyRow('تمرکز / Deep Work','فقط مدت جلسه و برچسب اختیاری؛ متن خصوصی دیگری منتشر نمی‌شود',select('focus',local.focus),'پیش‌فرض: فقط دوستان')}
      ${privacyRow('استریک','تداوم و استریک قابل اشتراک',select('streak',local.streak))}
      ${privacyRow('Ranking / Social','خلاصهٔ رقابت و دستاورد اجتماعی',select('ranking',local.ranking))}
      ${privacyRow('چرخه / پریود','این داده به‌صورت پیش‌فرض و اجباری خصوصی است','<span class="pass2-private-lock">خصوصی</span>','اشتراک با یک «همراه» فقط بعد از قرارداد Backend و رضایت صریح فعال می‌شود')}
    </div><section class="pass2-blocked-list"><header><strong>حساب‌های مسدودشده</strong><small>رفع مسدودیت دوستی را خودکار برنمی‌گرداند.</small></header><div>${blockedRows||'<p class="muted">فعلاً کسی مسدود نشده است.</p>'}</div></section><p class="muted wide" data-privacy-status></p>`;
  }
function renderSecurity(){
    const host=$('drawer-security-area');if(!host)return;const p=profile(),email=window.ElaraAccount?.user?.email||p.email||'',username=p.username||window.ElaraSocial?.me?.username||'';
    host.innerHTML=`${sectionHead('حساب کاربری','ایمیل، رمز عبور و امنیت حساب را جدا از حریم خصوصی مدیریت کن.')}<section class="pass2-security"><div class="pass4-profile-facts">${email?`<span>ایمیل: ${esc(email)}</span>`:''}${username?`<span>@${esc(username)}</span>`:''}</div><form id="drawer-password-form" class="drawer-form"><label>رمز فعلی<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>رمز جدید<input name="newPassword" type="password" autocomplete="new-password" minlength="6" required></label><label>تکرار رمز جدید<input name="confirmPassword" type="password" autocomplete="new-password" minlength="6" required></label><button class="primary-button" type="submit">تغییر رمز عبور</button><button class="quiet-button" type="button" data-drawer-reset-password>ارسال لینک بازیابی به ایمیل</button><p class="muted wide" data-privacy-status></p></form></section>`;
  }
  function renderFolders(){
    const host=$('drawer-folder-area');if(!host)return;const data=ensureData(read());
    const collectionCard=(kind,name)=>{
      const key=kind==='folder'?'folder':'list',tasks=data.tasks.filter(t=>String(t[key]||'')===name),label=kind==='folder'?'پوشه':'لیست';
      return `<section class="drawer-folder-card" data-collection-card="${esc(kind)}:${esc(name)}"><header><div><strong>${icon(kind==='folder'?'folder':'task')} ${esc(name)}</strong><small>${tasks.length.toLocaleString('fa-IR')} تسک · ${label}</small></div><button type="button" class="primary-button" data-open-task-collection="${esc(kind)}" data-collection-name="${esc(name)}">باز کردن صفحه</button></header><div class="drawer-folder-body"><form data-folder-task-form="${esc(name)}" data-folder-task-kind="${esc(kind)}"><input maxlength="180" required placeholder="تسک جدید داخل این ${label}…"><button class="primary-button" type="submit">+ تسک</button></form><div class="drawer-folder-tasks">${tasks.length?tasks.slice(0,5).map(t=>`<button type="button" data-open-task="${esc(t.id)}"><span>${t.completed?'✓':'○'}</span><span><strong data-elara-ugc dir="auto">${esc(t.text)}</strong>${t.shortDescription?`<small data-elara-ugc dir="auto">${esc(t.shortDescription)}</small>`:''}</span></button>`).join(''):'<p class="muted">هنوز تسکی داخل این بخش نیست.</p>'}</div></div></section>`
    };
    const lists=data.taskLists.map(name=>collectionCard('list',name)).join(''),folders=data.folders.map(name=>collectionCard('folder',name)).join('');
    host.innerHTML=`${sectionHead('لیست‌ها، پوشه‌ها و تگ‌ها','هر لیست یا پوشه صفحهٔ مستقل خودش را دارد.')}<div class="drawer-manage-actions"><button type="button" class="primary-button" data-drawer-add="list">+ لیست</button><button type="button" class="primary-button" data-drawer-add="folder">+ پوشه</button><button type="button" class="quiet-button" data-drawer-add="tag">+ برچسب</button></div><div class="drawer-tags">${data.tags.map(t=>`<span>#${esc(t)}</span>`).join('')||'<small class="muted">هنوز برچسبی نداری.</small>'}</div><div class="drawer-collection-group"><h3>لیست‌ها</h3><div class="drawer-folders">${lists||'<p class="muted">هنوز لیستی نداری.</p>'}</div></div><div class="drawer-collection-group"><h3>پوشه‌ها</h3><div class="drawer-folders">${folders||'<p class="muted">اولین پوشه را اضافه کن.</p>'}</div></div>`;
  }
  function notificationRows(){
    const data=ensureData(read()),local=(()=>{try{return JSON.parse(localStorage.getItem(NOTIF)||'[]')}catch{return[]}})();
    const claims=data.missionRewardClaims.slice(-30).reverse().map(key=>{
      const text=String(key),parts=text.split(':');
      return {title:'پاداش مأموریت دریافت شد',meta:parts.length>1?`${parts[0]} · ${parts.slice(1).join(':')}`:text};
    });
    return [...local.slice(-30).reverse(),...claims].slice(0,50);
  }
  function markNotificationsRead(){
    let rows;try{rows=JSON.parse(localStorage.getItem(NOTIF)||'[]')}catch{rows=[]}
    if(!Array.isArray(rows))return false;let changed=false;
    const next=rows.map(row=>{if(!row||typeof row!=='object')return row;const unread=row.unread===true||row.read===false||row.status==='unread';if(!unread)return row;changed=true;return {...row,read:true,unread:false,...(row.status==='unread'?{status:'read'}:{})}});
    if(changed){localStorage.setItem(NOTIF,JSON.stringify(next));window.dispatchEvent(new CustomEvent('elara:notifications-changed',{detail:{unread:0}}))}
    return changed;
  }
  function renderNotifications(){
    const host=$('drawer-notification-area');if(!host)return;const rows=notificationRows();
    host.innerHTML=`${sectionHead('نوتیف و پیام‌ها','اعلان‌ها و تاریخچهٔ سیستم.')}<div class="drawer-notifications">${rows.length?rows.map(x=>`<div><strong>${esc(x.title||x.message||'پیام')}</strong><small>${esc(x.meta||x.createdAt||'')}</small></div>`).join(''):'<p class="muted">هنوز اعلان ثبت‌شده‌ای وجود ندارد.</p>'}</div>`;
  }
  function renderAppearance(){
    const host=$('drawer-appearance-area');if(!host)return;const p=pref(),style=p.style||'default',amoled=localStorage.getItem('elara_amoled')==='yes',mode=amoled?'amoled':p.mode;
    const themeArt={mode:{dark:'assets/ui/theme_dark.webp',light:'assets/ui/theme_white.webp',system:'assets/ui/theme.webp',amoled:'assets/ui/theme_dark.webp'},style:{default:'assets/ui/theme.webp',minimal:'assets/ui/theme_minimal.webp',rugged:'assets/ui/city_theme.webp',anime:'assets/ui/theme_spring.webp'},color:{violet:'assets/ui/theme_galaxy_purple.webp',blue:'assets/ui/theme_blue.webp',pink:'assets/ui/theme_pink.webp',red:'assets/ui/theme_red.webp',orange:'assets/ui/theme_orange.webp',green:'assets/ui/theme_forest_green.webp',black:'assets/ui/theme_dark.webp',white:'assets/ui/theme_white.webp'}};
    const preview=(src,cls='')=>`<span class="pass4-theme-preview ${cls}"><img class="pass4-theme-art" src="${src}" alt="" loading="eager" decoding="async" fetchpriority="low"></span>`;
    const modeTile=(key,label,desc)=>`<button type="button" class="pass4-theme-tile ${mode===key?'active':''}" data-drawer-mode="${key}" aria-pressed="${mode===key}">${preview(themeArt.mode[key],'mode-'+key)}<b>${label}</b><small>${desc}</small></button>`;
    const styleTile=(key,label,desc)=>`<button type="button" class="pass4-theme-tile ${style===key?'active':''}" data-drawer-style="${key}" aria-pressed="${style===key}">${preview(themeArt.style[key],'style-'+key)}<b>${label}</b><small>${desc}</small></button>`;
    const colors=[['violet','کهکشان یاسی'],['blue','مهتاب نیلی'],['pink','شفق صورتی'],['red','کسوف سرخ'],['orange','سپیده‌ی آتش'],['green','جنگل زمردی'],['black','شب بی‌انتها'],['white','برفِ مهتاب']];
    host.innerHTML=`${sectionHead('ظاهر و تم‌ها','Mode، Style و Accent را با پیش‌نمایش واقعی انتخاب کن.')}<section class="pass4-appearance-group"><header><strong>Mode</strong><small>روشنایی و پس‌زمینه</small></header><div class="pass4-theme-grid">${modeTile('dark','Dark','تاریک استاندارد')}${modeTile('light','Light','روشن و خوانا')}${modeTile('system','System','هماهنگ با دستگاه')}${modeTile('amoled','AMOLED','مشکی خالص')}</div></section><section class="pass4-appearance-group"><header><strong>Style</strong><small>فرم کارت‌ها و بافت رابط</small></header><div class="pass4-theme-grid">${styleTile('default','کهکشان الارا','فضایی، نئونی و سینمایی')}${styleTile('minimal','مهِ ستاره‌ای','ساده، نرم و آرام')}${styleTile('rugged','شهر نیمه‌شب','شهری، عمیق و پرقدرت')}${styleTile('anime','شکوفه‌های رؤیایی','روشن، لطیف و جادویی')}</div></section><section class="pass4-appearance-group"><header><strong>Accent</strong><small>رنگ تأکیدی رابط</small></header><div class="pass4-accent-grid">${colors.map(([key,label])=>`<button type="button" data-drawer-color="${key}" class="pass4-accent-tile ${p.color===key?'active':''}" aria-pressed="${p.color===key}"><img class="pass4-accent-art" src="${themeArt.color[key]}" alt="" loading="lazy" decoding="async"><b>${label}</b></button>`).join('')}</div></section>`;
  }
  function renderLanguage(){
    const host=$('drawer-language-area');if(!host)return;const p=pref(),language=(p.language==='en'?'en':'fa');
    host.innerHTML=`${sectionHead('زبان برنامه','زبان رابط را بدون خروج از منو تغییر بده.')}<div class="drawer-language-options"><button type="button" data-drawer-language="fa" class="${language==='fa'?'active':''}"><b>FA</b> فارسی</button><button type="button" data-drawer-language="en" class="${language==='en'?'active':''}"><b>EN</b> English</button></div><p class="muted">فارسی و English برای همهٔ صفحه‌ها، پنجره‌ها و متن‌های پویا اعمال می‌شوند.</p>`;
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
    const data=ensureData(read()),key=kind==='folder'?'folders':kind==='list'?'taskLists':'tags',label=kind==='folder'?'پوشه':kind==='list'?'لیست':'برچسب';
    const value=await window.ElaraDialog.prompt('نام '+label+' را بنویس.',{title:'افزودن '+label,label:'نام',maxLength:60,confirmText:'افزودن'});
    const name=String(value||'').trim().slice(0,60);if(!name)return;
    if(data[key].some(x=>x.toLocaleLowerCase()===name.toLocaleLowerCase()))return;
    data[key].push(name);write(data);renderFolders();
  }
  function addTask(collection,text,kind='folder'){
    const data=ensureData(read()),title=String(text||'').trim().slice(0,180);if(!title)return;
    data.tasks.unshift({id:makeId(),text:title,shortDescription:'',description:'',date:'',time:'',priority:'4',folder:kind==='folder'?collection:'',list:kind==='list'?collection:'',tag:'',completed:false,doneAt:null,xpAwarded:false,createdAt:Date.now(),recurrenceRule:null,occurrenceDone:[],occurrenceRewardDays:[],skippedDates:[],occurrenceOverrides:{}});
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
    root.innerHTML=`<button type="button" class="elara-private-drawer-scrim" aria-label="بستن"></button><aside class="elara-private-drawer-panel" aria-label="پروفایل و تنظیمات"><header class="drawer-profile-head"><div id="drawer-profile-summary" class="drawer-profile-summary"></div><button type="button" class="drawer-settings-gear" data-drawer-nav="settings" title="تنظیمات" aria-label="تنظیمات">${icon('settings')}</button><button type="button" class="drawer-close" data-drawer-close aria-label="بستن">×</button></header><nav class="drawer-menu"><button data-drawer-nav="account">${icon('user')}<b>پروفایل</b><small>نمایش و ویرایش هویت</small></button><button data-drawer-nav="blocked">${icon('shield')}<b>بلاک‌شده‌ها</b><small>مدیریت حساب‌های مسدود</small></button><button type="button" data-approved-wardrobe>${icon('wardrobe')}<b>کمد</b><small>آواتار، فریم و بنر</small></button><button type="button" data-drawer-action="store">${icon('spark')}<b>فروشگاه</b><small>تم، پروفایل، قاب و بنر</small></button><button type="button" class="drawer-mobile-reports" data-drawer-action="reports">${icon('chart')}<b>گزارش‌ها</b><small>میانبر گزارش‌ها در موبایل</small></button></nav><section data-drawer-section="home"></section><section data-drawer-section="settings" class="hidden"><div id="drawer-settings-area"></div></section><section data-drawer-section="blocked" class="hidden"><div id="drawer-blocked-area"></div></section><section data-drawer-section="account" class="hidden"><div id="drawer-account-area"></div></section><section data-drawer-section="privacy" class="hidden"><div id="drawer-privacy-area"></div></section><section data-drawer-section="security" class="hidden"><div id="drawer-security-area"></div></section><section data-drawer-section="folders" class="hidden"><div id="drawer-folder-area"></div></section><section data-drawer-section="appearance" class="hidden"><div id="drawer-appearance-area"></div></section><section data-drawer-section="language" class="hidden"><div id="drawer-language-area"></div></section><section data-drawer-section="help" class="hidden"><div id="drawer-help-area"></div></section><section data-drawer-section="calendar" class="hidden"><div id="drawer-calendar-area"></div></section></aside>`;
    document.body.append(root);panel=root.querySelector('.elara-private-drawer-panel');
    root.querySelector('.elara-private-drawer-scrim').addEventListener('click',close);root.querySelector('[data-drawer-close]').addEventListener('click',close);
    panel.tabIndex=-1;document.addEventListener('keydown',trapDrawerKey,true);
    window.addEventListener('popstate',()=>{if(root&&!root.classList.contains('hidden')&&!history.state?.elaraDrawer)closeInternal()});
    removeLegacyMore();setTimeout(removeLegacyMore,0);setTimeout(removeLegacyMore,250);setTimeout(removeLegacyMore,1000);
    const p=pref();document.body.dataset.elaraStyle=p.style||'default';document.body.classList.toggle('amoled',localStorage.getItem('elara_amoled')==='yes');
    const locale=p.language==='en'?'en':'fa';localStorage.setItem('elara_locale_v1',locale);window.ElaraI18n?.set?.(locale);
    renderProfile();renderHub();updateCalendarLabels();
    window.addEventListener('resize',()=>{if(root&&!root.classList.contains('hidden'))placeMobileSection(current)},{passive:true});
    window.visualViewport?.addEventListener?.('resize',()=>{if(root&&!root.classList.contains('hidden'))placeMobileSection(current)},{passive:true});
  }

  document.addEventListener('click',async e=>{
    if(e.target.closest('[data-drawer-theme]')){document.getElementById('theme-toggle')?.click();return}
    const wardrobeButton=e.target.closest('[data-approved-wardrobe]');
    if(wardrobeButton){e.preventDefault();window.ElaraWardrobeUI?.open?.();return}
    const nav=e.target.closest('[data-drawer-nav]');if(nav){show(nav.dataset.drawerNav);return}
    const route=e.target.closest('[data-drawer-route]');if(route){clearDrawerHistoryMarker();closeInternal();window.ElaraOpen?.(route.dataset.drawerRoute);return}
    const language=e.target.closest('[data-drawer-language]');if(language){const lang=language.dataset.drawerLanguage==='en'?'en':'fa';savePref({language:lang});localStorage.setItem('elara_locale_v1',lang);window.ElaraI18n?.set?.(lang);renderLanguage();return}
    const add=e.target.closest('[data-drawer-add]');if(add){await addNamed(add.dataset.drawerAdd);return}
    const unblock=e.target.closest('[data-social-unblock]');if(unblock){unblock.disabled=true;try{await window.ElaraSocial?.unblockUser?.(unblock.dataset.socialUnblock);renderPrivacy();renderBlocked()}catch(err){const status=$('drawer-privacy-area')?.querySelector('[data-privacy-status]');if(status)status.textContent=err?.message||'رفع مسدودیت انجام نشد.'}finally{unblock.disabled=false}return}
    const collection=e.target.closest('[data-open-task-collection]');if(collection){clearDrawerHistoryMarker();closeInternal();window.ElaraTaskCollections?.open?.(collection.dataset.openTaskCollection,collection.dataset.collectionName);return}
    const toggle=e.target.closest('[data-folder-toggle]');if(toggle){toggle.closest('.drawer-folder-card')?.classList.toggle('collapsed');return}
    const task=e.target.closest('[data-open-task]');if(task){clearDrawerHistoryMarker();closeInternal();window.ElaraOpen?.('tasks');setTimeout(()=>document.querySelector(`[data-phase2-action="view-task"][data-id="${CSS.escape(task.dataset.openTask)}"]`)?.click(),100);return}
    const edit=e.target.closest('[data-profile-edit]');if(edit){await window.ElaraProfileSystem?.openEditor?.();return}
    const mode=e.target.closest('[data-drawer-mode]');if(mode){setMode(mode.dataset.drawerMode);return}
    const color=e.target.closest('[data-drawer-color]');if(color){setColor(color.dataset.drawerColor);return}
    const style=e.target.closest('[data-drawer-style]');if(style){setStyle(style.dataset.drawerStyle);return}
    const cal=e.target.closest('[data-drawer-calendar]');if(cal){localStorage.setItem('elara_calendar_pref',cal.dataset.drawerCalendar);updateCalendarLabels();renderCalendar();return}
    if(e.target.closest('[data-drawer-reset-password]')){
      const area=e.target.closest('[data-drawer-section]'),status=area?.querySelector('[data-privacy-status]')||panel.querySelector('[data-privacy-status]');try{await window.ElaraAccount?.sendPasswordReset?.();if(status)status.textContent='لینک بازیابی به ایمیل حساب ارسال شد.'}catch(err){if(status)status.textContent=err.message||String(err)}return;
    }
    const action=e.target.closest('[data-drawer-action]');if(!action)return;
    if(action.dataset.drawerAction==='reports'){clearDrawerHistoryMarker();closeInternal();window.ElaraOpen?.('reports');return}
    if(action.dataset.drawerAction==='store'){clearDrawerHistoryMarker();closeInternal();window.ElaraOpen?.('store');return}
    if(action.dataset.drawerAction==='logout'&&await window.ElaraDialog.confirm('از حساب Elara خارج می‌شوی؟',{title:'خروج از حساب',confirmText:'خروج',danger:true})){clearDrawerHistoryMarker();closeInternal();await window.ElaraAccount?.logout?.()}
  });

  document.addEventListener('change',async e=>{
    const control=e.target.closest?.('[data-drawer-privacy]');if(!control)return;
    const kind=control.dataset.drawerPrivacy,status=$('drawer-privacy-area')?.querySelector('[data-privacy-status]');
    if(kind==='activity'){
      const id=privacyUid();if(!id){control.value='private';if(status)status.textContent='ابتدا وارد حساب شو.';return}
      const value=['private','friends','public'].includes(control.value)?control.value:'private';
      localStorage.setItem('elara_activity_visibility_'+id,value);
      localStorage.setItem('elara_share_activity_'+id,value==='private'?'no':'yes');
      const mirror=$('elara-share-activity');if(mirror)mirror.checked=value!=='private';
      if(status)status.textContent=value==='private'?'فعالیت‌ها خصوصی ماندند.':value==='friends'?'خلاصهٔ فعالیت فقط برای دوستان قابل انتشار است.':'خلاصهٔ فعالیت می‌تواند عمومی منتشر شود.';return;
    }
    if(SHARE_KEYS.includes(kind)){
      const value=validVisibility(control.value)||'friends';
      if(!writePrivacy({[kind]:value})){if(status)status.textContent='ذخیرهٔ تنظیم حریم خصوصی انجام نشد.';return}
      window.dispatchEvent(new CustomEvent('elara:privacy-local-changed',{detail:{category:kind,visibility:value}}));
      if(status)status.textContent=value==='private'?'این دسته خصوصی است.':value==='friends'?'این دسته فقط برای دوستان قابل انتشار است.':'این دسته می‌تواند عمومی منتشر شود.';return;
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
    if(folderForm){e.preventDefault();const input=folderForm.querySelector('input');addTask(folderForm.dataset.folderTaskForm,input.value,folderForm.dataset.folderTaskKind||'folder');input.value='';return}
    if(e.target.id==='drawer-password-form'){
      e.preventDefault();const form=e.target,status=form.querySelector('[data-privacy-status]'),button=form.querySelector('[type=submit]');if(form.elements.newPassword.value!==form.elements.confirmPassword.value){status.textContent='تکرار رمز جدید یکسان نیست.';return}button.disabled=true;
      try{await window.ElaraAccount?.changePassword?.(form.elements.currentPassword.value,form.elements.newPassword.value);status.textContent='✓ رمز عبور تغییر کرد.';form.reset()}
      catch(err){status.textContent=window.ElaraAccount?.errorMessage?.(err)||err.message||String(err)}
      finally{button.disabled=false}return;
    }
  });

  window.addEventListener('elara:social-updated',()=>{renderProfile();if(current==='account')renderAccount();if(current==='privacy')renderPrivacy();if(current==='blocked')renderBlocked()});
  window.addEventListener('elara:profile-saved',()=>{renderProfile();if(current==='home')renderHub();if(current==='account')renderAccount()});
  window.addEventListener('elara:wardrobe-changed',()=>{renderProfile();if(current==='account')renderAccount()});
  window.addEventListener('elara:data-changed',()=>{if(root&&!root.classList.contains('hidden')){renderProfile();if(current==='account')renderAccount();if(current==='folders')renderFolders();if(current==='notifications')renderNotifications()}});
  window.addEventListener('elara:account-ready',()=>{renderProfile();if(current==='home')renderHub();if(current==='account')renderAccount();if(current==='security')renderSecurity()});
  window.ElaraPrivateDrawer={open,close,renderProfile,renderAccount,renderAppearance};
  window.ElaraDrawerTest={pref,savePref,setMode,setStyle,setColor,renderAppearance};
  window.ElaraPrivatePanel=window.ElaraPrivateDrawer;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
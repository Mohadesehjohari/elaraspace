/* Private profile + three-dot account drawer for desktop and mobile. */
(() => {
  'use strict';
  const KEY='elara_space_v1', PREF='elara_preferences_v2', NOTIF='elara_notifications_v1', $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const makeId=()=>crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
  const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}};
  const write=data=>{localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:data}));window.dispatchEvent(new Event('elara:data-changed'))};
  const pref=()=>{try{return {mode:'dark',color:'violet',style:'default',...JSON.parse(localStorage.getItem(PREF)||'{}')}}catch{return {mode:'dark',color:'violet',style:'default'}}};
  const savePref=patch=>{const p={...pref(),...patch};localStorage.setItem(PREF,JSON.stringify(p));return p};
  let root,panel,current='home';

  function ensureData(d){for(const k of ['tasks','folders','tags','missionRewardClaims'])if(!Array.isArray(d[k]))d[k]=[];return d}
  function profile(){return window.ElaraSocial?.me||window.ElaraAccount?.profile||{}}
  function close(){root?.classList.add('hidden');document.body.classList.remove('elara-private-drawer-open')}
  function open(section='home'){if(!root)return;root.classList.remove('hidden');document.body.classList.add('elara-private-drawer-open');renderProfile();show(section)}
  function show(section='home'){
    current=section;
    panel?.querySelectorAll('[data-drawer-section]').forEach(x=>x.classList.toggle('hidden',x.dataset.drawerSection!==section));
    panel?.querySelectorAll('[data-drawer-nav]').forEach(x=>x.classList.toggle('active',x.dataset.drawerNav===section));
    if(section==='account')renderAccount();
    if(section==='privacy')renderPrivacy();
    if(section==='folders')renderFolders();
    if(section==='notifications')renderNotifications();
    if(section==='appearance')renderAppearance();
    if(section==='help')renderHelp();
    if(section==='calendar')renderCalendar();
  }

  function medalsFor(level){
    const out=[];if(level>=1)out.push('برنز');if(level>=4)out.push('نقره');if(level>=7)out.push('طلا');if(level>=10)out.push('الماس');return out;
  }
  function renderProfile(){
    const person=profile(),name=person.name||person.username||'پروفایل من',bio=person.bio||'بیوگرافی هنوز ثبت نشده.';
    const xp=Number(person.xp||read().xp||0),level=window.ElaraLevels?.level?.(xp)||1,title=window.ElaraLevels?.title?.(xp)||'جوینده';
    const av=$('drawer-profile-avatar'),nm=$('drawer-profile-name'),bi=$('drawer-profile-bio'),meta=$('drawer-profile-meta'),medals=$('drawer-profile-medals');
    if(av){
      const url=window.ElaraAccount?.user?.photoURL;
      av.innerHTML=url?`<img src="${esc(url)}" alt="">`:esc((name.trim()[0]||'E').toUpperCase());
    }
    if(nm)nm.textContent=name;
    if(bi)bi.textContent=bio;
    if(meta)meta.textContent=`@${person.username||'—'} · ${title} · Level ${level} · ${xp.toLocaleString('fa-IR')} XP`;
    if(medals)medals.innerHTML=medalsFor(level).map(x=>`<span>${x}</span>`).join('')||'<span>مدال بعدی در مسیر پیشرفت</span>';
  }

  function sectionHead(title,sub){
    return `<div class="drawer-section-head"><button type="button" data-drawer-nav="home" aria-label="بازگشت">→</button><div><strong>${esc(title)}</strong><small>${esc(sub||'')}</small></div></div>`;
  }
  function renderAccount(){
    const host=$('drawer-account-area');if(!host)return;const p=profile();
    host.innerHTML=`${sectionHead('حساب کاربری','پروفایل خصوصی خودت را اینجا مدیریت کن.')}<form id="drawer-account-form" class="drawer-form"><label>نام نمایشی<input name="name" maxlength="60" required value="${esc(p.name||'')}"></label><label>نام کاربری<input name="username" maxlength="20" pattern="[a-z][a-z0-9_]{2,19}" required value="${esc(p.username||'')}"></label><label class="wide">بیوگرافی<textarea name="bio" maxlength="300" rows="4" placeholder="دربارهٔ خودت…">${esc(p.bio||'')}</textarea></label><label class="drawer-check wide"><input name="profilePublic" type="checkbox" ${p.profilePublic!==false?'checked':''}> پروفایل عمومی من برای کاربران واردشده قابل مشاهده باشد</label><button class="primary-button" type="submit">ذخیره پروفایل</button><p class="muted" data-account-status></p></form>`;
  }
  function renderPrivacy(){
    const host=$('drawer-privacy-area');if(!host)return;
    host.innerHTML=`${sectionHead('حریم خصوصی و امنیت','رمز عبور و تنظیمات امنیتی حساب.')}<form id="drawer-password-form" class="drawer-form"><label>رمز فعلی<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>رمز جدید<input name="newPassword" type="password" autocomplete="new-password" minlength="6" required></label><label>تکرار رمز جدید<input name="confirmPassword" type="password" autocomplete="new-password" minlength="6" required></label><button class="primary-button" type="submit">تغییر رمز عبور</button><button class="quiet-button" type="button" data-drawer-reset-password>ارسال لینک بازیابی به ایمیل</button><p class="muted wide" data-privacy-status></p></form>`;
  }
  function renderFolders(){
    const host=$('drawer-folder-area');if(!host)return;const data=ensureData(read());
    const cards=data.folders.map(name=>{
      const tasks=data.tasks.filter(t=>t.folder===name);
      return `<section class="drawer-folder-card" data-folder-card="${esc(name)}"><header><div><strong>▤ ${esc(name)}</strong><small>${tasks.length.toLocaleString('fa-IR')} تسک</small></div><button type="button" class="mini-button" data-folder-toggle="${esc(name)}">باز/بسته</button></header><div class="drawer-folder-body"><form data-folder-task-form="${esc(name)}"><input maxlength="180" required placeholder="تسک جدید داخل این پوشه…"><button class="primary-button" type="submit">+ تسک</button></form><div class="drawer-folder-tasks">${tasks.length?tasks.map(t=>`<button type="button" data-open-task="${esc(t.id)}"><span>${t.completed?'✓':'○'}</span><span><strong>${esc(t.text)}</strong>${t.shortDescription?`<small>${esc(t.shortDescription)}</small>`:''}</span></button>`).join(''):'<p class="muted">هنوز تسکی داخل این پوشه نیست.</p>'}</div></div></section>`;
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
    const host=$('drawer-appearance-area');if(!host)return;const p=pref(),style=p.style||'default';
    host.innerHTML=`${sectionHead('ظاهر و تم‌ها','ظاهر Elara را بدون خروج از پنل تغییر بده.')}<div class="drawer-appearance-block"><strong>حالت نمایش</strong><div class="drawer-choice-grid"><button data-drawer-mode="dark" class="${p.mode==='dark'?'active':''}">☾ تاریک</button><button data-drawer-mode="light" class="${p.mode==='light'?'active':''}">☀ روشن</button><button data-drawer-mode="system" class="${p.mode==='system'?'active':''}">◐ سیستم</button><button data-drawer-amoled class="${localStorage.getItem('elara_amoled')==='yes'?'active':''}">● AMOLED</button></div></div><div class="drawer-appearance-block"><strong>Style Family</strong><div class="drawer-choice-grid"><button data-drawer-style="default" class="${style==='default'?'active':''}">Elara Default</button><button data-drawer-style="minimal" class="${style==='minimal'?'active':''}">Minimal</button><button data-drawer-style="rugged" class="${style==='rugged'?'active':''}">Rugged</button><button data-drawer-style="anime" class="${style==='anime'?'active':''}">Anime</button></div></div><div class="drawer-appearance-block"><strong>رنگ Accent</strong><div class="drawer-color-grid">${[['violet','یاسی'],['blue','آبی'],['pink','صورتی'],['red','قرمز'],['orange','نارنجی'],['green','سبز'],['black','مشکی']].map(([k,l])=>`<button data-drawer-color="${k}" class="${p.color===k?'active':''}">${l}</button>`).join('')}</div></div>`;
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
  function setMode(mode){document.querySelector(`[data-mode="${CSS.escape(mode)}"]`)?.click();savePref({mode});renderAppearance()}
  function setColor(color){document.querySelector(`[data-color="${CSS.escape(color)}"]`)?.click();savePref({color});renderAppearance()}
  function toggleAmoled(){const on=localStorage.getItem('elara_amoled')==='yes';localStorage.setItem('elara_amoled',on?'no':'yes');document.body.classList.toggle('amoled',!on);renderAppearance()}
  function rebuildMobileNav(){
    const bottom=document.querySelector('.bottom-nav');if(!bottom)return;
    const items=[['home','⌂','خانه'],['tasks','☑','تسک'],['habits','♧','عادت'],['goals','◎','هدف'],['focus','◷','تمرکز'],['books','▤','کتاب'],['words','◇','زبان'],['missions','✦','مأموریت'],['social','♧','دوستان'],['ranking','♛','رنکینگ']];
    bottom.innerHTML=items.map(([key,icon,label])=>`<button type="button" data-elara-tab="${key}"><span>${icon}</span><small>${label}</small></button>`).join('');
  }
  function removeLegacyMore(){
    document.getElementById('elara-more-drawer')?.remove();
    document.querySelectorAll('[data-elara-more],.elara-more-trigger').forEach(x=>x.remove());
  }

  function build(){
    if(document.querySelector('.elara-private-drawer'))return;
    removeLegacyMore();
    document.getElementById('elara-account-menu-trigger')?.remove();
    const trigger=document.createElement('button');trigger.id='elara-account-menu-trigger';trigger.type='button';trigger.className='icon-button elara-top-more';trigger.setAttribute('aria-label','باز کردن حساب و تنظیمات');trigger.title='حساب و تنظیمات';trigger.textContent='⋮';trigger.addEventListener('click',()=>open('home'));
    const mountTrigger=()=>{const theme=document.getElementById('theme-toggle'),actions=document.querySelector('.topbar-actions');if(!actions)return false;if(theme){theme.insertAdjacentElement('afterend',trigger)}else actions.append(trigger);return true};
    mountTrigger();setTimeout(mountTrigger,0);setTimeout(mountTrigger,250);setTimeout(mountTrigger,1000);
    root=document.createElement('div');root.className='elara-private-drawer hidden';
    root.innerHTML=`<button type="button" class="elara-private-drawer-scrim" aria-label="بستن"></button><aside class="elara-private-drawer-panel" aria-label="پروفایل و تنظیمات"><header class="drawer-profile-head"><div class="drawer-avatar" id="drawer-profile-avatar">E</div><div class="drawer-profile-text"><strong id="drawer-profile-name">پروفایل من</strong><small id="drawer-profile-meta"></small><p id="drawer-profile-bio"></p><div id="drawer-profile-medals" class="drawer-medals"></div></div><button type="button" class="drawer-theme-toggle" data-drawer-theme title="دارک / روشن">◐</button><button type="button" class="drawer-close" data-drawer-close>×</button></header><nav class="drawer-menu"><button data-drawer-nav="account"><span>⚙</span><b>حساب کاربری</b><small>پروفایل و اطلاعات</small></button><button data-drawer-nav="privacy"><span>🔒</span><b>حریم خصوصی</b><small>امنیت و رمز عبور</small></button><button data-drawer-nav="folders"><span>▤</span><b>پوشه‌ها و تگ‌ها</b><small>مدیریت و تسک داخل پوشه</small></button><button data-drawer-nav="notifications"><span>◉</span><b>نوتیف و پیام‌ها</b><small>اعلان‌ها و تاریخچه</small></button><button data-drawer-nav="appearance"><span>✦</span><b>ظاهر و تم‌ها</b><small>Mode، Style و رنگ‌ها</small></button><button data-drawer-nav="help"><span>؟</span><b>راهنما</b><small>راهنمای استفاده</small></button><button data-drawer-nav="calendar"><span>◫</span><b>تقویم</b><small id="drawer-calendar-label">${calendarLabel()}</small></button><button class="danger" data-drawer-action="logout"><span>↪</span><b>خروج از حساب</b><small>خروج امن از Elara</small></button></nav><section data-drawer-section="home"></section><section data-drawer-section="account" class="hidden"><div id="drawer-account-area"></div></section><section data-drawer-section="privacy" class="hidden"><div id="drawer-privacy-area"></div></section><section data-drawer-section="folders" class="hidden"><div id="drawer-folder-area"></div></section><section data-drawer-section="notifications" class="hidden"><div id="drawer-notification-area"></div></section><section data-drawer-section="appearance" class="hidden"><div id="drawer-appearance-area"></div></section><section data-drawer-section="help" class="hidden"><div id="drawer-help-area"></div></section><section data-drawer-section="calendar" class="hidden"><div id="drawer-calendar-area"></div></section></aside>`;
    document.body.append(root);panel=root.querySelector('.elara-private-drawer-panel');
    root.querySelector('.elara-private-drawer-scrim').addEventListener('click',close);root.querySelector('[data-drawer-close]').addEventListener('click',close);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root&&!root.classList.contains('hidden'))close()});
    removeLegacyMore();setTimeout(removeLegacyMore,0);setTimeout(removeLegacyMore,250);setTimeout(removeLegacyMore,1000);
    rebuildMobileNav();
    const p=pref();document.body.dataset.elaraStyle=p.style||'default';document.body.classList.toggle('amoled',localStorage.getItem('elara_amoled')==='yes');
    renderProfile();updateCalendarLabels();
  }

  document.addEventListener('click',async e=>{
    if(e.target.closest('[data-drawer-theme]')){document.getElementById('theme-toggle')?.click();return}
    const nav=e.target.closest('[data-drawer-nav]');if(nav){show(nav.dataset.drawerNav);return}
    const add=e.target.closest('[data-drawer-add]');if(add){await addNamed(add.dataset.drawerAdd);return}
    const toggle=e.target.closest('[data-folder-toggle]');if(toggle){toggle.closest('.drawer-folder-card')?.classList.toggle('collapsed');return}
    const task=e.target.closest('[data-open-task]');if(task){close();window.ElaraOpen?.('tasks');setTimeout(()=>document.querySelector(`[data-phase2-action="view-task"][data-id="${CSS.escape(task.dataset.openTask)}"]`)?.click(),100);return}
    const mode=e.target.closest('[data-drawer-mode]');if(mode){setMode(mode.dataset.drawerMode);return}
    const color=e.target.closest('[data-drawer-color]');if(color){setColor(color.dataset.drawerColor);return}
    const style=e.target.closest('[data-drawer-style]');if(style){setStyle(style.dataset.drawerStyle);return}
    if(e.target.closest('[data-drawer-amoled]')){toggleAmoled();return}
    const cal=e.target.closest('[data-drawer-calendar]');if(cal){localStorage.setItem('elara_calendar_pref',cal.dataset.drawerCalendar);updateCalendarLabels();renderCalendar();return}
    if(e.target.closest('[data-drawer-reset-password]')){
      const status=panel.querySelector('[data-privacy-status]');try{await window.ElaraAccount?.sendPasswordReset?.();status.textContent='لینک بازیابی به ایمیل حساب ارسال شد.'}catch(err){status.textContent=err.message||String(err)}return;
    }
    const action=e.target.closest('[data-drawer-action]');if(!action)return;
    if(action.dataset.drawerAction==='logout'&&await window.ElaraDialog.confirm('از حساب Elara خارج می‌شوی؟',{title:'خروج از حساب',confirmText:'خروج',danger:true})){close();await window.ElaraAccount?.logout?.()}
  });

  document.addEventListener('submit',async e=>{
    const folderForm=e.target.closest('[data-folder-task-form]');
    if(folderForm){e.preventDefault();const input=folderForm.querySelector('input');addTask(folderForm.dataset.folderTaskForm,input.value);input.value='';return}
    if(e.target.id==='drawer-account-form'){
      e.preventDefault();const form=e.target,status=form.querySelector('[data-account-status]'),button=form.querySelector('[type=submit]');button.disabled=true;
      try{const result=await window.ElaraSocial?.saveProfileValues?.({name:form.elements.name.value,username:form.elements.username.value,bio:form.elements.bio.value,profilePublic:form.elements.profilePublic.checked});status.textContent=result?.warnings?.length?result.warnings.join(' '):'✓ پروفایل ذخیره شد.';renderProfile()}
      catch(err){status.textContent=err?.code==='permission-denied'?'این تغییر به انتشار Firestore Rules جدید نیاز دارد.':(err.message||String(err))}
      finally{button.disabled=false}return;
    }
    if(e.target.id==='drawer-password-form'){
      e.preventDefault();const form=e.target,status=form.querySelector('[data-privacy-status]'),button=form.querySelector('[type=submit]');if(form.elements.newPassword.value!==form.elements.confirmPassword.value){status.textContent='تکرار رمز جدید یکسان نیست.';return}button.disabled=true;
      try{await window.ElaraAccount?.changePassword?.(form.elements.currentPassword.value,form.elements.newPassword.value);status.textContent='✓ رمز عبور تغییر کرد.';form.reset()}
      catch(err){status.textContent=window.ElaraAccount?.errorMessage?.(err)||err.message||String(err)}
      finally{button.disabled=false}return;
    }
  });

  window.addEventListener('elara:social-updated',()=>{renderProfile();if(current==='account')renderAccount()});
  window.addEventListener('elara:profile-saved',()=>{renderProfile();if(current==='account')renderAccount()});
  window.addEventListener('elara:data-changed',()=>{if(root&&!root.classList.contains('hidden')){renderProfile();if(current==='folders')renderFolders();if(current==='notifications')renderNotifications()}});
  window.addEventListener('elara:account-ready',renderProfile);
  window.ElaraPrivateDrawer={open,close,renderProfile};
  window.ElaraPrivatePanel=window.ElaraPrivateDrawer;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
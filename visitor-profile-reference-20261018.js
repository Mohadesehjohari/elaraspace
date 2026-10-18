/* ELARA visitor profile — presentation only. Canonical social actions and profile data remain owned by elara-social.js. */
(()=>{'use strict';
const rootId='elara-profile-page';
const icon=(paths)=>'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
const icons={
 user:icon('<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'),
 spark:icon('<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>'),
 chart:icon('<path d="M4 20V11m5 9V5m5 15v-7m5 7V8"/>'),
 heart:icon('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>'),
 info:icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/>'),
 shield:icon('<path d="m12 22 8-4V6l-8-4-8 4v12l8 4Z"/><path d="m9 12 2 2 4-4"/>')
};
const nav=[['overview','پروفایل','user'],['progress','پیشرفت','chart'],['about','دربارهٔ کاربر','info'],['connect','ارتباط','heart']];
function tile(label,source,symbol){
 const node=document.createElement('div');node.className='visitor-profile-stat';
 const ico=document.createElement('span');ico.className='visitor-profile-stat-icon';ico.innerHTML=icons[symbol]||icons.spark;
 const copy=document.createElement('span');copy.className='visitor-profile-stat-copy';
 const value=document.createElement('strong');value.className='visitor-profile-stat-value';
 if(source)value.append(source);else value.textContent='—';
 const name=document.createElement('small');name.textContent=label;
 copy.append(value,name);node.append(ico,copy);return node;
}
function decorate(dialog){
 if(!(dialog instanceof Element)||dialog.dataset.visitorDesigned==='true')return;
 const card=dialog.querySelector('.pass4-public-profile-card');
 const summary=card?.querySelector('.pass4-public-profile-summary');
 const composition=summary?.querySelector('.elara-profile-composition[data-profile-self="0"]');
 if(!card||!summary||!composition)return;
 const target=composition.dataset.profileUid;
 if(!target)return;
 const facts=card.querySelector('.pass4-profile-facts');
 const bio=card.querySelector('.elara-profile-bio');
 const social=dialog.querySelector('.pass4-profile-grid > .elara-card:not(.pass4-public-profile-card)');
 const actions=card.querySelector('.timer-actions');
 const priorNote=dialog.querySelector('.profile-private-relation');
 const restricted=!bio;
 const relationText=social?.querySelector('p')?.textContent?.trim()||'';
 const link=composition.querySelector('.elara-profile-page-entry');
 // Pin the existing public Page action to the scenic cover (not the narrow name column).
 // Preserve its data attributes so the site's canonical page navigation still handles clicks.
 if(link){
  if(restricted)link.remove();
  else composition.append(link);
 }
 const panel=dialog.closest('.elara-dialog-panel');
 if(!panel)return;
 const shell=document.createElement('div');shell.className='visitor-profile-shell';
 const rail=document.createElement('aside');rail.className='visitor-profile-rail';rail.setAttribute('aria-label','بخش‌های پروفایل');
 rail.innerHTML='<div class="visitor-profile-rail-brand"><span>✦</span><strong>ELARA</strong><small>PROFILE</small></div><nav class="visitor-profile-navigation" aria-label="پیمایش پروفایل">'+nav.map(([id,label,glyph],index)=>'<button type="button" data-visitor-section="'+id+'" aria-current="'+(index===0?'true':'false')+'">'+icons[glyph]+'<span>'+label+'</span></button>').join('')+'</nav><div class="visitor-profile-rail-note">✧ <span>فضای شخصی الارا</span></div>';
 const main=document.createElement('main');main.className='visitor-profile-content';
 const hero=document.createElement('section');hero.id='visitor-overview';hero.className='visitor-profile-hero pass4-public-profile-card';hero.setAttribute('aria-label','معرفی کاربر');
 hero.append(summary);if(priorNote)hero.append(priorNote);
 const progress=document.createElement('section');progress.id='visitor-progress';progress.className='visitor-profile-progress';
 const progressHead=document.createElement('header');progressHead.innerHTML='<div><span>✧</span><h3>پیشرفت در الارا</h3></div><small>بر اساس اطلاعات قابل نمایش این کاربر</small>';progress.append(progressHead);
 if(facts&&!restricted){
   const wrap=document.createElement('div');wrap.className='visitor-profile-stats';
   const spans=[...facts.querySelectorAll('span')];
   if(spans[0])wrap.append(tile('سطح',spans[0],'spark'));
   if(spans[2])wrap.append(tile('امتیاز تجربه',spans[2],'chart'));
   if(spans[1])wrap.append(tile('عنوان',spans[1],'shield'));
   const status=document.createElement('span');status.textContent=relationText||'وضعیت نامشخص';
   wrap.append(tile('ارتباط شما',status,'heart'));
   progress.append(wrap);
 }else{
   const privateInfo=document.createElement('p');privateInfo.className='visitor-profile-restricted';privateInfo.textContent='نمایش اطلاعات این پروفایل محدود شده است.';progress.append(privateInfo);
 }
 const details=document.createElement('div');details.className='visitor-profile-details';
 const about=document.createElement('section');about.id='visitor-about';about.className='visitor-profile-about';
 const aboutHeader=document.createElement('h3');aboutHeader.innerHTML=icons.info+'<span>دربارهٔ من</span>';about.append(aboutHeader);
 if(bio)about.append(bio);
 else {
  const note=card.querySelector('.muted');if(note)about.append(note);
 }
 const relation=document.createElement('section');relation.className='visitor-profile-relation';
 const relationHeader=document.createElement('h3');relationHeader.innerHTML=icons.heart+'<span>وضعیت اجتماعی</span>';relation.append(relationHeader);
 if(social){const h=social.querySelector('h2');h?.remove();relation.append(...social.childNodes);}
 else {const p=document.createElement('p');p.textContent=restricted?'پروفایل خصوصی':'اطلاعات ارتباطی در دسترس نیست.';relation.append(p);}
 details.append(about,relation);
 const connect=document.createElement('section');connect.id='visitor-connect';connect.className='visitor-profile-connect';
 const connectTitle=document.createElement('h3');connectTitle.innerHTML=icons.spark+'<span>دسترسی سریع</span>';connect.append(connectTitle);
 if(actions){
  actions.classList.add('visitor-profile-actions');
  // Messaging uses the existing friend-only DM service. No synthetic chat is created.
  const isFriend=window.ElaraSocial?.friends?.some(person=>String(person.uid)===String(target));
  if(isFriend&&window.ElaraSocial?.dm){
   const message=document.createElement('button');message.type='button';message.className='quiet-button visitor-profile-message';message.dataset.socialOpenDm=target;message.innerHTML=icons.heart+'<span>پیام دادن</span>';actions.append(message);
  }
  connect.append(actions);
 }
 const foot=document.createElement('p');foot.className='visitor-profile-privacy';foot.innerHTML=icons.shield+'<span>فقط اطلاعاتی نمایش داده می‌شود که کاربر اجازهٔ نمایش آن‌ها را داده است.</span>';connect.append(foot);
 main.append(hero,progress,details,connect);shell.append(rail,main);
 const more=dialog.querySelector('.profile-more-button');
 dialog.replaceChildren(shell);if(more)dialog.append(more);
 dialog.classList.add('elara-visitor-profile');
 dialog.dataset.visitorDesigned='true';dialog.dataset.visitorUid=target;
 panel.classList.add('elara-visitor-profile-panel');
 window.ElaraProfileRelations?.decorate?.(dialog);
}
const observer=new MutationObserver(mutations=>{
 for(const mutation of mutations)for(const node of mutation.addedNodes){
  if(node.nodeType!==1)continue;
  if(node.matches?.('.elara-profile-dialog'))queueMicrotask(()=>decorate(node));
  else if(node.querySelector?.('.elara-profile-dialog'))queueMicrotask(()=>node.querySelectorAll('.elara-profile-dialog').forEach(decorate));
 }
});
observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',event=>{
 const btn=event.target.closest?.('.elara-visitor-profile [data-visitor-section]');
 if(!btn)return;
 const dialog=btn.closest('.elara-visitor-profile'),id=btn.dataset.visitorSection,section=dialog?.querySelector('#visitor-'+id),scroller=dialog?.closest('.elara-dialog-body');
 if(!section||!scroller)return;
 dialog.querySelectorAll('[data-visitor-section]').forEach(node=>node.setAttribute('aria-current',String(node===btn)));
 const offset=section.getBoundingClientRect().top-scroller.getBoundingClientRect().top;
 scroller.scrollTo({top:scroller.scrollTop+offset-12,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});
document.addEventListener('click',event=>{
 if(!event.target.closest?.('.elara-visitor-profile [data-social-open-dm]'))return;
 window.ElaraDialog?.close?.();
},true);
// Refresh the open visitor surface when the canonical social service re-renders it.
window.addEventListener('elara:social-updated',()=>{
 const active=document.querySelector('#elara-dialog-root .elara-visitor-profile[data-visitor-uid]'),stage=document.getElementById(rootId);
 if(!active||!stage)return;
 const fresh=stage.querySelector('.pass4-profile-grid');
 const newUid=fresh?.querySelector('.elara-profile-composition')?.dataset.profileUid;
 if(!fresh||newUid!==active.dataset.visitorUid)return;
 active.replaceChildren(fresh);active.dataset.visitorDesigned='false';
 queueMicrotask(()=>decorate(active));
});
window.ElaraVisitorProfile={decorate};
})();
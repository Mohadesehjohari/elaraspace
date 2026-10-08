(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(fa,en)=>window.ElaraI18n?.t?.(fa,en)||(document.documentElement.lang==='en'?en:fa);
let renderToken=0;
const api=()=>window.ElaraSocial?.groups,current=()=>window.ElaraSocial?.me||null,friends=()=>window.ElaraSocial?.friends||[];
function when(ms){if(!ms)return'';try{return new Date(ms).toLocaleTimeString(document.documentElement.lang==='en'?'en-US':'fa-IR',{hour:'2-digit',minute:'2-digit'})}catch{return''}}
function avatar(p){const src=window.ElaraProfileSystem?.viewModel?.(p,{self:p?.uid===current()?.uid})?.avatarSrc;return src?'<img src="'+esc(src)+'" alt="">':'<span>'+esc((p?.name||p?.username||'?').slice(0,1))+'</span>'}
function activeGroupsTab(root){return !!root?.querySelector('[data-social-view="groups"][aria-selected="true"]')}
async function mount(){
 const root=document.getElementById('elara-social-page'),service=api();if(!root||!service)return;
 if(!activeGroupsTab(root)){root.querySelector('.social-groups-section')?.remove();return}
 const grid=root.querySelector('.social-reference-grid');if(!grid)return;
 let section=root.querySelector('.social-groups-section');if(!section){section=document.createElement('section');section.className='elara-card social-section social-groups-section';section.dataset.elaraI18n='off';const dm=root.querySelector('.social-dm-section');if(dm)dm.insertAdjacentElement('afterend',section);else grid.prepend(section)}
 const token=++renderToken;
 section.innerHTML='<header class="social-groups-head"><div><small>ELARA · GROUPS</small><h2>'+t('گروه‌ها','Groups')+'</h2><p>'+t('با رفیق‌هات گروه بساز و باهم پیش برو 👊🔥','Create a group with friends and move together 👊🔥')+'</p></div><button type="button" class="primary-button" data-social-create-group>'+t('گروه جدید','New group')+'</button></header><p class="social-groups-loading">'+t('در حال بارگذاری گروه‌ها…','Loading groups…')+'</p>';
 let groups=[];try{groups=await service.list()}catch(error){if(token!==renderToken)return;section.querySelector('.social-groups-loading').textContent=t('گروه‌ها بارگذاری نشدند.','Groups could not be loaded.')+' '+String(error?.message||'');return}
 if(token!==renderToken||!section.isConnected)return;
 const cards=groups.map(g=>'<button type="button" class="social-group-row" data-social-open-group="'+esc(g.id)+'" data-group-role="'+esc(g.role||'member')+'"><span class="social-group-icon">👥</span><span class="social-group-copy"><strong>'+esc(g.title||t('گروه','Group'))+'</strong><small>'+esc(g.lastText||t('هنوز پیامی نیست؛ شروعش کن 😎','No messages yet — start it 😎'))+'</small></span><time>'+when(g.updatedAt)+'</time></button>').join('');
 section.innerHTML='<header class="social-groups-head"><div><small>ELARA · GROUPS</small><h2>'+t('گروه‌ها','Groups')+'</h2><p>'+t('با رفیق‌هات گروه بساز و باهم پیش برو 👊🔥','Create a group with friends and move together 👊🔥')+'</p></div><button type="button" class="primary-button" data-social-create-group>'+t('گروه جدید','New group')+'</button></header><div class="social-groups-scroll">'+(cards||'<p class="ref-empty">'+t('هنوز گروهی نداری؛ یکی بساز 🌝','No groups yet — make one 🌝')+'</p>')+'</div>';
 // The read-only group list remains available during strict-Rules cutover.
 section.insertAdjacentHTML('afterbegin','<p class="social-cutover-notice" role="status">بخش اجتماعی در حال ارتقاست؛ چند دقیقه دیگر دوباره امتحان کن.</p>');
 section.querySelectorAll('[data-social-create-group]').forEach(button=>{button.disabled=true;button.title='در حال ارتقا';});
}
async function createGroup(){
 if(window.ElaraSocial?.socialCutover?.active){const el=document.getElementById('toast');if(el){el.textContent=window.ElaraSocial.socialCutover.message;el.classList.remove('hidden')}return}
 const service=api(),people=friends();if(!service)return;
 if(!people.length){const el=document.getElementById('toast');if(el){el.textContent=t('اول حداقل یک دوست اضافه کن.','Add at least one friend first.');el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),3200)}return}
 const wrap=document.createElement('div');wrap.className='social-group-create';wrap.dataset.elaraI18n='off';
 wrap.innerHTML='<label>'+t('اسم گروه','Group name')+'<input name="title" maxlength="80" autocomplete="off" placeholder="'+t('مثلاً تیم شب‌زنده‌دارها 🌚','e.g. Night Owls 🌚')+'"></label><fieldset><legend>'+t('دوست‌ها را انتخاب کن','Choose friends')+'</legend><div class="social-group-friend-picker">'+people.map(p=>'<label><input type="checkbox" value="'+esc(p.uid)+'"><span class="social-dm-avatar">'+avatar(p)+'</span><span><strong>'+esc(p.name||p.username||t('دوست','Friend'))+'</strong><small>'+esc(p.username?'@'+p.username:'')+'</small></span></label>').join('')+'</div></fieldset><p class="social-group-create-status" role="status"></p>';
 const ok=await window.ElaraDialog.open({title:t('ساخت گروه','Create group'),content:wrap,wide:true,actions:[{label:t('انصراف','Cancel'),value:false},{label:t('ساخت گروه','Create group'),value:true,kind:'primary'}]});if(ok!==true)return;
 const title=wrap.querySelector('input[name="title"]').value.trim(),members=[...wrap.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value),status=wrap.querySelector('.social-group-create-status');
 try{const id=await service.create(title,members);await mount();setTimeout(()=>openGroup(id),0)}catch(error){status.textContent=String(error?.message||error);await window.ElaraDialog.open({title:t('گروه ساخته نشد','Could not create group'),message:String(error?.message||error),actions:[{label:t('باشه','OK'),value:true,kind:'primary'}]})}
}
function renderMessages(host,messages){
 const me=current();host.innerHTML=(messages||[]).map(m=>'<div class="social-chat-message '+(m.sender===me?.uid?'is-me':'is-them')+'"><div><p data-elara-ugc dir="auto">'+esc(m.text||'')+'</p><time>'+when(m.ms)+'</time></div></div>').join('')||'<div class="social-chat-empty"><span>👥</span><p>'+t('گروه تازه‌ست؛ یکی یه سلام آتیشی بده 🔥','Fresh group — somebody drop a fiery hello 🔥')+'</p></div>';host.scrollTop=host.scrollHeight
}
async function openGroup(id){
 const service=api();if(!service)return;const rows=await service.list(),group=rows.find(x=>x.id===id)||{id,title:t('گروه','Group'),role:'member'};
 const wrap=document.createElement('div');wrap.className='social-chat-dialog social-group-chat-dialog';wrap.dataset.elaraI18n='off';
 wrap.innerHTML='<header class="social-chat-head social-group-chat-head"><span class="social-group-icon">👥</span><div><strong>'+esc(group.title)+'</strong><small data-group-member-count>'+t('گروه دوستان','Friends group')+'</small></div></header><div class="social-group-members" aria-label="'+t('اعضای گروه','Group members')+'"></div><div class="social-chat-messages" aria-live="polite"></div><div class="social-group-quick"><button type="button" data-group-quick="بزن بریم 🔥">بزن بریم 🔥</button><button type="button" data-group-quick="ریز می‌بینمت 👀">ریز می‌بینمت 👀</button><button type="button" data-group-quick="کم نیار 😎">کم نیار 😎</button><button type="button" data-group-quick="آماده‌ام 👊">آماده‌ام 👊</button></div><form class="social-chat-compose"><textarea name="text" maxlength="2000" rows="1" data-elara-ugc dir="auto" placeholder="'+t('پیامت را بنویس…','Write a message…')+'" required></textarea><button class="primary-button" type="submit">'+t('ارسال','Send')+'</button></form><p class="social-chat-status" role="status"></p>';
 if(window.ElaraSocial?.socialCutover?.active){wrap.querySelector('.social-chat-compose button[type=submit]').disabled=true;wrap.querySelector('.social-chat-status').textContent=window.ElaraSocial.socialCutover.message;}
 const messagesHost=wrap.querySelector('.social-chat-messages'),status=wrap.querySelector('.social-chat-status'),membersHost=wrap.querySelector('.social-group-members');
 try{const members=await service.members(id);membersHost.innerHTML=members.map(m=>'<span title="'+esc(m.role)+'"><span class="social-dm-avatar">'+avatar(m.person)+'</span>'+esc(m.person?.name||m.person?.username||t('عضو','Member'))+'</span>').join('');wrap.querySelector('[data-group-member-count]').textContent=members.length.toLocaleString(document.documentElement.lang==='en'?'en-US':'fa-IR')+' '+t('عضو','members')}catch(error){membersHost.textContent=String(error?.message||error)}
 try{renderMessages(messagesHost,await service.messages(id))}catch(error){status.textContent=String(error?.message||error)}
 let stop=null;try{stop=service.listen(id,m=>renderMessages(messagesHost,m),error=>status.textContent=String(error?.message||error))}catch(error){status.textContent=String(error?.message||error)}
 wrap.querySelector('.social-group-quick').addEventListener('click',e=>{const b=e.target.closest('[data-group-quick]');if(!b)return;wrap.querySelector('textarea').value=b.dataset.groupQuick;wrap.querySelector('textarea').focus()});
 wrap.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const input=e.currentTarget.elements.text,value=input.value.trim();if(!value)return;const btn=e.currentTarget.querySelector('button');btn.disabled=true;status.textContent=t('در حال ارسال…','Sending…');try{await service.send(id,value);input.value='';status.textContent=''}catch(error){status.textContent=String(error?.message||error)}finally{btn.disabled=false}});
 const actions=[{label:t('بستن','Close'),value:false}];if(group.role!=='owner'&&!window.ElaraSocial?.socialCutover?.active)actions.unshift({label:t('خروج از گروه','Leave group'),value:'leave',kind:'danger'});
 try{const result=await window.ElaraDialog.open({title:t('گفتگوی گروهی','Group chat'),content:wrap,wide:true,actions});if(result==='leave'&&await window.ElaraDialog.confirm(t('از این گروه خارج شوی؟','Leave this group?'),{title:t('خروج از گروه','Leave group'),danger:true,confirmText:t('خروج','Leave')})){await service.leave(id)}}finally{try{stop?.()}catch{};setTimeout(mount,0)}
}
document.addEventListener('click',e=>{if(e.target.closest('[data-social-create-group]')){e.preventDefault();void createGroup();return}const row=e.target.closest('[data-social-open-group]');if(row){e.preventDefault();void openGroup(row.dataset.socialOpenGroup);return}if(e.target.closest('[data-social-view]'))setTimeout(mount,40)});
for(const event of ['elara:social-updated','elara:locale-changed'])window.addEventListener(event,()=>setTimeout(mount,40));
window.addEventListener('elara:open',e=>{if(e.detail?.tab==='social')setTimeout(mount,80)});
window.addEventListener('hashchange',()=>setTimeout(mount,120));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,220),{once:true});else setTimeout(mount,220);
window.ElaraSocialGroupsUI={mount,createGroup,openGroup};
})();
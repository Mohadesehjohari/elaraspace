/* Freedom AI: signed-in user's private, opt-in cloud memory and local chat fallback. */
(()=>{'use strict';
const host=()=>document.querySelector('.elara-home-fox-popover [data-f-ai-host],.freedom-fox-overlay [data-f-ai-host],#panel-freedom [data-f-ai-host]');
const uid=()=>window.ElaraAccount?.user?.uid||'guest';
const persona=()=>window.ElaraFreedomChatPage?.mode==='character'?'character':'fox';
const key=()=>persona()==='character'?'elara_character_ai_chat_v1_'+uid():'elara_freedom_ai_chat_v1_'+uid();
const newChatCuts=new Map();
const visibleRows=()=>read().slice(newChatCuts.get(key())||0);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sessionChats=new Map();
const ramOnly=()=>window.ElaraPrivateState?.active===true;
const read=()=>{try{
  if(ramOnly())return (sessionChats.get(key())||[]).slice(-60);
  const x=JSON.parse(localStorage.getItem(key())||'[]');
  return Array.isArray(x)?x.slice(-60):[];
}catch{return[]}};
const write=rows=>{const recent=rows.slice(-60);
  if(ramOnly())sessionChats.set(key(),recent);
  else try{localStorage.setItem(key(),JSON.stringify(recent))}catch{console.warn('Local conversation storage unavailable')}
  window.dispatchEvent(new Event('elara:chat-updated'));
};
const clearChat=()=>{if(ramOnly())sessionChats.delete(key());else localStorage.removeItem(key());
 newChatCuts.delete(key());window.dispatchEvent(new Event('elara:chat-updated'));};
window.ElaraPrivateChatMemory={reset:()=>{sessionChats.clear();newChatCuts.clear()}};
// The only local preference here is a boolean, NEVER profile content or Gemini secrets.
const personalizationKey=()=> 'elara_ai_context_consent_v1_'+uid();
const personalizeEnabled=()=>{try{return localStorage.getItem(personalizationKey())==='yes'}catch{return false}};
function ownProfileContext(){
 const u=window.ElaraAccount?.user,uid=u?.uid;
 if(!uid)return {};
 const account=window.ElaraAccount?.profile||{};
 const social=window.ElaraSocial?.me?.uid===uid?window.ElaraSocial.me:{};
 const name=String(account.name||social.name||u.displayName||account.username||social.username||'').trim().slice(0,60);
 if(!personalizeEnabled()||!window.ElaraAccount?.loaded||!document.body.classList.contains('cloud-ready')||
    document.body.classList.contains('cloud-offline'))return {name};
 const bio=String(account.bio||social.bio||'').trim().slice(0,350);
 let local={};try{local=JSON.parse(localStorage.getItem('elara_space_v1')||'{}')||{}}catch{}
 const isMine=row=>row&&!row.shared&&!row.collabSpaceId&&!row.collabOwnerUid&&!row.sourceManaged&&
    !(row.sourceGroup&&row.sourceGroup!=='personal');
 const tasks=(Array.isArray(local.tasks)?local.tasks:[]).filter(x=>isMine(x)&&!x.completed)
   .slice(0,6).map(x=>({title:String(x.text||'').slice(0,110),date:String(x.date||'').slice(0,10)}))
   .filter(x=>x.title);
 const goals=(Array.isArray(local.goals)?local.goals:[]).filter(isMine)
   .slice(0,5).map(x=>({title:String(x.title||'').slice(0,110)})).filter(x=>x.title);
 return {name,bio,tasks,goals};
}
const remote=()=>String(window.ELARA_AI_API_URL||'').trim().replace(/\/+$/,'');
const aiEndpoint=()=>{const base=remote();if(!base&&location.hostname.endsWith('.github.io'))throw new Error('هوش مصنوعی هنوز به سرور امن متصل نشده است.');return base?base+'/ai':'ai.php'};
let memory={enabled:false,notes:[],history:[],summary:''},memoryUid='',memoryMessage='',memoryBusy=false,chatBusy=false,chatError='';
function memoryControls(){
  if(!remote()||!window.ElaraAccount?.user)return '';
  const notes=(memory.notes||[]).map(n=>'<li><span>'+esc(n.text)+'</span><button type="button" class="quiet-button" data-f-ai-delete-note="'+esc(n.id)+'" aria-label="فراموش کردن این یادداشت" '+(memoryBusy||chatBusy?'disabled':'')+'>حذف</button></li>').join('');
  return '<section class="freedom-ai-memory" aria-label="حافظه شخصی الارا" style="margin:12px 0;padding:12px;border:1px solid #40517a;border-radius:12px">'
    +'<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" data-f-ai-memory-toggle '+(memory.enabled?'checked ':'')+(memoryBusy||chatBusy?'disabled':'')+'> <strong>حافظه شخصی الارا</strong></label>'
    +'<p class="muted" style="font-size:12px">اختیاری: با روشن‌کردن، گفتگو در فضای ابری رمزگذاری می‌شود و در دستگاه‌های دیگر هم در دسترس خواهد بود. فقط برای حساب خودت.</p>'
    +(memory.enabled?'<div class="freedom-ai-rolling-memory" style="margin:12px 0;padding:10px;border:1px solid #445273;border-radius:9px"><details><summary style="cursor:pointer;font-weight:600">خلاصه خودکار گفتگوهای قبلی</summary><p class="muted" style="white-space:pre-wrap;line-height:1.8">'+esc(memory.summary||'هنوز خلاصه‌ای ساخته نشده؛ الارا قبل از قدیمی‌شدن پیام‌ها نکته‌های مهم را خلاصه می‌کند.')+'</p><button type="button" class="quiet-button" data-f-ai-clear-summary '+((!memory.summary||memoryBusy||chatBusy)?'disabled':'')+'>پاک‌کردن خلاصه خودکار</button></details></div><form data-f-ai-note-form style="display:flex;gap:8px;flex-wrap:wrap"><input name="note" maxlength="350" placeholder="چیزی که الارا همیشه باید یادش بماند…" aria-label="یادداشت حافظه" required style="flex:1;min-width:160px" '+(memoryBusy||chatBusy?'disabled':'')+'><button type="submit" class="quiet-button" '+(memoryBusy||chatBusy?'disabled':'')+'>به خاطر بسپار</button></form><ul style="display:grid;gap:8px;padding:8px 0;list-style:none">'+notes+'</ul><button type="button" class="quiet-button" data-f-ai-forget '+(memoryBusy||chatBusy?'disabled':'')+'>حذف کامل حافظه ابری</button>':'')
    +(memoryMessage?'<p role="status" class="muted">'+esc(memoryMessage)+'</p>':'')
    +'</section>';
}
function render(){
  const h=host();if(!h)return;
  const user=window.ElaraAccount?.user,signed=!!user,rows=visibleRows(),identity=signed?user.uid+':'+persona():'';
  const personalize=signed&&personalizeEnabled();
  const needsMemoryLoad=!!(signed&&remote()&&memoryUid!==identity);
  if(!signed&&memoryUid||needsMemoryLoad){memoryUid=needsMemoryLoad?identity:'';memory={enabled:false,notes:[],history:[],summary:''};memoryMessage=needsMemoryLoad?'در حال بارگذاری حافظه شخصی…':'';memoryBusy=false;chatBusy=false;chatError='';}
  h.innerHTML='<div class="freedom-ai-thread">'+(rows.length?rows.map(r=>'<article data-f-ai-at="'+Number(r.at||0)+'" class="freedom-ai-message '+(r.role==='model'?'model':'user')+'"><small>'+esc(r.role==='model'?(r.name||'Elara AI'):'تو')+'</small><p dir="auto">'+esc(r.text)+'</p></article>').join(''):'<div class="freedom-ai-empty"><strong>Elara AI</strong><span>ایده‌ات را بنویس؛ پاسخ فقط وقتی ارسال می‌شود که خودت دکمهٔ ارسال را بزنی.</span></div>')+'</div>'
    +memoryControls()
    +'<form class="freedom-ai-form" data-f-ai-form><label class="elara-ai-personalize" style="display:flex;align-items:center;gap:7px;color:#bcb8e5;padding:3px 4px;cursor:pointer"><input data-f-ai-personalize type="checkbox" aria-label="اجازه استفاده از بیو و هدف‌های شخصی برای پیشنهادهای بهتر" '+(personalize?'checked ':'')+(signed?'':'disabled')+'> با اجازه من، الارا از بیو و هدف‌های شخصی‌ام برای برنامه‌ریزی استفاده کنه</label><textarea name="message" rows="2" maxlength="8000" placeholder="'+(signed?'با Elara حرف بزن…':'برای استفاده از AI وارد حساب شو')+'" '+(signed&&!chatBusy?'':'disabled')+'></textarea><div><button type="button" class="quiet-button" data-f-ai-clear '+(rows.length?'':'disabled')+'>پاک‌کردن گفتگو</button><button type="button" class="quiet-button" data-f-ai-task-plan '+(signed&&!chatBusy?'':'disabled')+' title="هدف، عادت، ریزقدم و تسک را بعد از تأیید تو مدیریت می‌کند">اجرای دستور در سایت</button><button type="submit" class="freedom-neon-button" '+(signed&&!chatBusy?'':'disabled')+'>ارسال پیام</button></div></form><p class="freedom-ai-status" data-f-ai-status>'+esc(chatError)+'</p>';
  window.ElaraAIPlans?.mount?.(h);
  const thread=h.querySelector('.freedom-ai-thread');if(thread)thread.scrollTop=thread.scrollHeight;
  if(needsMemoryLoad)void loadMemory(user.uid,persona());
}
async function memoryRequest(method='GET',body=null){
  const user=window.ElaraAccount?.user;if(!user)throw new Error('ابتدا وارد حساب شو.');
  // On an old Worker, persona would be ignored and might write Character history
  // into the existing Fox memory. Verify mode support before ANY mutation.
  if(persona()==='character'&&method!=='GET')await memoryRequest('GET');
  const token=await user.getIdToken();
  const headers={'Accept':'application/json','Authorization':'Bearer '+token};
  if(body!==null)headers['Content-Type']='application/json';
  const currentPersona=persona();
  const response=await fetch(remote()+'/ai/memory?persona='+encodeURIComponent(currentPersona),
    {method,headers,cache:'no-store',body:body===null?undefined:JSON.stringify({...body,persona:currentPersona})});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true)throw new Error(data?.error||'اتصال حافظه برقرار نشد؛ کد جدید Worker را Deploy کن.');
  if(persona()==='character'&&data.data?.persona!=='character')
    throw new Error('برای حافظه مستقل کاراکتر، ابتدا کد جدید Cloudflare Worker را Deploy کن.');
  return data.data||{};
}
async function loadMemory(expectedUid,expectedPersona){
  try{
    const data=await memoryRequest();
    if(uid()!==expectedUid||persona()!==expectedPersona)return;
    memory={enabled:data.enabled===true,notes:data.notes||[],history:data.history||[],summary:String(data.summary||'')};
    if(memory.enabled)write(memory.history);
    memoryMessage='';
  }catch(err){if(uid()!==expectedUid||persona()!==expectedPersona)return;memoryMessage=err.message||'بارگذاری حافظه ناموفق بود.';}
  if(uid()===expectedUid&&persona()===expectedPersona)render();
}
async function saveMemoryAction(method,body,success){
  if(memoryBusy)return;
  memoryBusy=true;memoryMessage='در حال ذخیره…';render();
  const expectedUid=uid(),expectedPersona=persona();
  try{
    const data=await memoryRequest(method,body);
    if(uid()!==expectedUid||persona()!==expectedPersona)return;
    memory={enabled:data.enabled===true,notes:data.notes||[],history:data.history||[],summary:String(data.summary||'')};
    if(memory.enabled&&body?.enabled===true)write(memory.history);
    memoryMessage=success;
  }catch(error){if(uid()===expectedUid&&persona()===expectedPersona)memoryMessage=error.message||'ذخیره حافظه ناموفق بود.';}
  finally{if(uid()===expectedUid&&persona()===expectedPersona){memoryBusy=false;render();}}
}
async function submit(form){
  const user=window.ElaraAccount?.user;if(!user||chatBusy)return;
  const message=String(form.elements.message.value||'').trim();if(!message)return;
  window.ElaraAIPlans?.invalidate?.();
  chatBusy=true;chatError='';
  const expectedPersona=persona();
  const before=read(),next=[...before,{role:'user',text:message,at:Date.now()}];
  write(next);render();
  const status=host()?.querySelector('[data-f-ai-status]');if(status)status.textContent='Elara در حال فکر کردن…';
  const expectedUid=user.uid;
  try{
    if(expectedPersona==='character')await memoryRequest('GET');
    const token=await user.getIdToken(),history=before.slice(newChatCuts.get(key())||0).slice(-10).map(x=>({role:x.role,text:x.text}));
    const profileContext=ownProfileContext(),firstMessage=!before.some(x=>x.role==='user');
    const response=await fetch(aiEndpoint(),{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'Accept':'application/json'},cache:'no-store',credentials:'same-origin',body:JSON.stringify({
      message,history,persona:expectedPersona,first_message:firstMessage,
      allow_profile_context:personalizeEnabled(),profile_context:profileContext
    })});
    const payload=await response.json().catch(()=>null);
    if(!response.ok||payload?.ok!==true)throw new Error(payload?.error||('AI HTTP '+response.status));
    if(uid()!==expectedUid||persona()!==expectedPersona)return;
    const data=payload.data||{};
    if(expectedPersona==='character'&&data.persona!=='character')
      throw new Error('برای گفتگو با کاراکتر باید نسخه جدید Cloudflare Worker را Deploy کنی.');
    write([...next,{role:'model',text:String(data.text||'').trim(),name:expectedPersona==='character'?'الارا · کاراکتر':'الارا فاکس',at:Date.now()}]);
    if(window.ElaraAIPlans?.isPlanning?.(message)){
      const recent=[...next,{role:'model',text:String(data.text||''),at:Date.now()}];
      void window.ElaraAIPlans.consider(message,recent);
    }
    if(memory.enabled&&data.memory_saved===true&&typeof data.memory_summary==='string')memory.summary=data.memory_summary;
    if(memory.enabled&&data.memory_saved===false)memoryMessage='پاسخ آمد، اما ذخیره‌سازی حافظه ناموفق بود. دوباره تلاش کن.';
    render();
  }catch(error){
    if(uid()!==expectedUid||persona()!==expectedPersona)return;
    write(before);render();
    chatError=error.message||'پاسخ AI در دسترس نیست.';render();
  }finally{
    if(uid()===expectedUid&&persona()===expectedPersona){chatBusy=false;render();const f=host()?.querySelector('[data-f-ai-form]');if(f){f.elements.message.value='';f.elements.message.focus();}}
  }
}
document.addEventListener('submit',e=>{
  if(e.target.matches?.('[data-f-ai-form]')){e.preventDefault();void submit(e.target);return;}
  if(e.target.matches?.('[data-f-ai-note-form]')){
    e.preventDefault();const note=String(e.target.elements.note.value||'').trim();
    if(note)void saveMemoryAction('POST',{note},'یادداشت در حافظه الارا ذخیره شد.');
  }
},true);
document.addEventListener('change',e=>{
  if(e.target.matches?.('[data-f-ai-personalize]')){
    if(!window.ElaraAccount?.user){e.target.checked=false;return;}
    if(e.target.checked){
      if(!confirm('اجازه می‌دی الارا برای شخصی‌سازی پاسخ‌ها، نام نمایشی، بیو و چند هدف و تسک شخصی رو به Gemini بفرسته؟ داده‌های اشتراکی ارسال نمی‌شن.')){
        e.target.checked=false;return;
      }
    }
    try{if(e.target.checked)localStorage.setItem(personalizationKey(),'yes');
      else localStorage.removeItem(personalizationKey());}catch{}
    render();
    return;
  }
  if(!e.target.matches?.('[data-f-ai-memory-toggle]'))return;
  const checked=e.target.checked;
  if(checked){
    if(!confirm('می‌خواهی گفتگوهای این حساب به‌صورت رمزگذاری‌شده در Cloudflare ذخیره شوند تا الارا در دستگاه‌های دیگر هم یادش بماند؟')){e.target.checked=false;return;}
    void saveMemoryAction('POST',{enabled:true,history:read()},'حافظه شخصی فعال شد.');
  }else{
    if(!confirm('با خاموش‌کردن حافظه، نسخه ابری گفتگوها و یادداشت‌ها حذف می‌شود. ادامه بدهیم؟')){e.target.checked=true;return;}
    void saveMemoryAction('DELETE',null,'حافظه ابری خاموش و حذف شد.');
  }
},true);
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-f-ai-task-plan]')){
    e.preventDefault();
    const f=host()?.querySelector('[data-f-ai-form]'),message=String(f?.elements.message?.value||'').trim();
    if(!window.ElaraAIActions?.run){const el=host()?.querySelector('[data-f-ai-status]');if(el)el.textContent='دستیار مدیریت سایت هنوز بارگذاری نشده؛ صفحه را تازه کن.';return}
    if(window.ElaraAIPlans?.isPlanning?.(message))void window.ElaraAIPlans.propose(message,read());
    else void window.ElaraAIActions.run(message);
    return;
  }
  if(e.target.closest?.('[data-f-ai-clear-summary]')){
    if(confirm('خلاصه خودکار فراموش شود؟ یادداشت‌های دستی و ۱۲ پیام اخیر باقی می‌مانند.'))void saveMemoryAction('POST',{clear_summary:true},'خلاصه خودکار پاک شد.');
    return;
  }
  const noteDel=e.target.closest?.('[data-f-ai-delete-note]');
  if(noteDel){if(confirm('این یادداشت از حافظه پاک شود؟'))void saveMemoryAction('POST',{remove_note:noteDel.dataset.fAiDeleteNote},'یادداشت حذف شد.');return;}
  if(e.target.closest?.('[data-f-ai-forget]')){
    if(confirm('تمام گفتگوها و یادداشت‌های ذخیره‌شده در حافظه ابری پاک شوند؟')){
      clearChat();
      void saveMemoryAction('DELETE',null,'حافظه ابری کامل حذف شد.');
    }
    return;
  }
  if(!e.target.closest?.('[data-f-ai-clear]'))return;
  if(!confirm('گفتگوهای اخیر پاک شوند؟ یادداشت‌های ذخیره‌شده در حافظه باقی می‌مانند.'))return;
  clearChat();
  if(memory.enabled)void saveMemoryAction('POST',{clear_history:true},'گفتگوهای اخیر پاک شدند.');
  else render();
},true);
for(const n of ['elara:freedom-rendered','elara:account-ready','elara:logout'])window.addEventListener(n,()=>setTimeout(render,0));
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,0),{once:true}):setTimeout(render,0);
window.ElaraFreedomAI={
  render,
  recent:()=>read(),
  showFromMessage:(at)=>{
    newChatCuts.set(key(),0);
    render();
    const node=[...(host()?.querySelectorAll('[data-f-ai-at]')||[])].find(x=>Number(x.dataset.fAiAt)===at);
    if(node){node.scrollIntoView?.({behavior:'smooth',block:'center'});node.classList.add('ef-history-active');}
    return !!node;
  },
  startNewChat:()=>{
    if(chatBusy||memoryBusy)return false;
    // Start a fresh visible thread without deleting old conversations or cloud memory.
    newChatCuts.set(key(),read().length);
    chatError='';render();return true;
  },
  get mode(){return persona();}
};
})();

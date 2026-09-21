/* Elara themed dialog system: centered, accessible and theme-token aware. */
(() => {
  'use strict';
  let root=null,body=null,titleEl=null,footer=null,resolveActive=null,lastFocus=null,scrollLock=null;

  function lockViewport(){
    if(scrollLock)return;
    const html=document.documentElement,bodyEl=document.body,scrollY=window.scrollY||html.scrollTop||0;
    scrollLock={
      scrollY,
      htmlOverflow:html.style.overflow,
      htmlOverscroll:html.style.overscrollBehavior,
      bodyOverflow:bodyEl.style.overflow,
      bodyPosition:bodyEl.style.position,
      bodyTop:bodyEl.style.top,
      bodyLeft:bodyEl.style.left,
      bodyRight:bodyEl.style.right,
      bodyWidth:bodyEl.style.width
    };
    html.style.overflow='hidden';
    html.style.overscrollBehavior='none';
    bodyEl.style.overflow='hidden';
    bodyEl.style.position='fixed';
    bodyEl.style.top=`-${scrollY}px`;
    bodyEl.style.left='0';
    bodyEl.style.right='0';
    bodyEl.style.width='100%';
  }

  function unlockViewport(){
    if(!scrollLock)return;
    const html=document.documentElement,bodyEl=document.body,snapshot=scrollLock;
    scrollLock=null;
    html.style.overflow=snapshot.htmlOverflow;
    html.style.overscrollBehavior=snapshot.htmlOverscroll;
    bodyEl.style.overflow=snapshot.bodyOverflow;
    bodyEl.style.position=snapshot.bodyPosition;
    bodyEl.style.top=snapshot.bodyTop;
    bodyEl.style.left=snapshot.bodyLeft;
    bodyEl.style.right=snapshot.bodyRight;
    bodyEl.style.width=snapshot.bodyWidth;
    window.scrollTo(0,snapshot.scrollY);
  }

  function ensure(){
    if(root)return;
    root=document.createElement('div');
    root.id='elara-dialog-root';
    root.className='elara-dialog-root hidden';
    root.hidden=true;
    root.innerHTML='<button class="elara-dialog-scrim" type="button" aria-label="بستن پنجره"></button><section class="elara-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="elara-dialog-title"><header class="elara-dialog-head"><div><span class="elara-dialog-kicker">ELARA</span><h2 id="elara-dialog-title"></h2></div><button type="button" class="elara-dialog-close" aria-label="بستن">×</button></header><div class="elara-dialog-body"></div><footer class="elara-dialog-actions"></footer></section>';
    document.body.append(root);
    Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'12000',display:'grid',placeItems:'center',width:'100vw',height:'100dvh',padding:'18px',overflow:'hidden'});
    body=root.querySelector('.elara-dialog-body');
    titleEl=root.querySelector('#elara-dialog-title');
    footer=root.querySelector('.elara-dialog-actions');
    root.querySelector('.elara-dialog-scrim').addEventListener('click',()=>finish(null));
    root.querySelector('.elara-dialog-close').addEventListener('click',()=>finish(null));
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();finish(null);return}
      if(event.key!=='Tab')return;
      const focusable=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    });
  }

  function finish(value){
    if(!root||root.hidden||root.classList.contains('hidden'))return;
    root.hidden=true;
    root.classList.add('hidden');
    document.body.classList.remove('elara-dialog-open');
    const done=resolveActive;resolveActive=null;
    body.replaceChildren();footer.replaceChildren();
    unlockViewport();
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
    lastFocus=null;
    if(done)done(value);
  }

  function buttonFor(action){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=action.label;
    button.className=action.kind==='primary'?'primary-button':action.kind==='danger'?'elara-dialog-danger':'quiet-button';
    if(action.disabled)button.disabled=true;
    button.addEventListener('click',()=>finish(action.value));
    return button;
  }

  function open({title='پیام Elara',message='',content=null,actions=null,wide=false}={}){
    ensure();
    if(resolveActive)finish(null);
    lastFocus=document.activeElement;
    titleEl.textContent=String(title||'پیام Elara');
    const panel=root.querySelector('.elara-dialog-panel');
    panel.classList.toggle('wide',!!wide);
    body.replaceChildren();
    footer.replaceChildren();
    if(message){
      const p=document.createElement('p');p.className='elara-dialog-message';p.textContent=String(message);body.append(p);
    }
    if(content instanceof Node)body.append(content);
    const list=Array.isArray(actions)&&actions.length?actions:[{label:'بستن',value:true,kind:'primary'}];
    list.forEach(action=>footer.append(buttonFor(action)));
    lockViewport();
    root.hidden=false;
    root.classList.remove('hidden');
    document.body.classList.add('elara-dialog-open');
    const preferred=footer.querySelector('.primary-button')||body.querySelector('input,textarea,select,button')||footer.querySelector('button');
    setTimeout(()=>preferred?.focus({preventScroll:true}),0);
    return new Promise(resolve=>{resolveActive=resolve});
  }

  async function confirm(message,{title='تأیید',confirmText='تأیید',cancelText='لغو',danger=false}={}){
    return (await open({
      title,message,
      actions:[
        {label:cancelText,value:false},
        {label:confirmText,value:true,kind:danger?'danger':'primary'}
      ]
    }))===true;
  }

  async function prompt(message,{title='ورودی',label='',value='',placeholder='',maxLength=180,confirmText='ثبت'}={}){
    const wrap=document.createElement('div');wrap.className='elara-dialog-field';
    if(label){const l=document.createElement('label');l.textContent=label;wrap.append(l)}
    const input=document.createElement('input');input.type='text';input.value=String(value||'');input.placeholder=placeholder;input.maxLength=maxLength;input.autocomplete='off';wrap.append(input);
    const result=await open({
      title,message,content:wrap,
      actions:[{label:'لغو',value:false},{label:confirmText,value:true,kind:'primary'}]
    });
    return result===true?input.value:null;
  }

  async function choice({title='انتخاب',message='',options=[]}={}){
    const actions=options.map(option=>({label:option.label,value:option.value,kind:option.kind||''}));
    actions.unshift({label:'لغو',value:null});
    return open({title,message,actions});
  }

  window.ElaraDialog={open,confirm,prompt,choice,close:()=>finish(null)};
})();
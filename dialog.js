/* Elara themed dialog system: centered, stackable, accessible and theme-token aware. */
(() => {
  'use strict';
  const overlay=window.ElaraOverlayStack||(window.ElaraOverlayStack=(()=>{let z=100000;return{next(root){z+=20;if(root?.style)root.style.setProperty('--elara-overlay-z',String(z));return z},peek(){return z}}})());
  let root=null,scrollLock=null,serial=0;
  const stack=[];

  function lockViewport(){
    if(scrollLock)return;
    const html=document.documentElement,bodyEl=document.body,scrollY=window.scrollY||html.scrollTop||0;
    scrollLock={scrollY,htmlOverflow:html.style.overflow,htmlOverscroll:html.style.overscrollBehavior,bodyOverflow:bodyEl.style.overflow,bodyPosition:bodyEl.style.position,bodyTop:bodyEl.style.top,bodyLeft:bodyEl.style.left,bodyRight:bodyEl.style.right,bodyWidth:bodyEl.style.width};
    html.style.overflow='hidden';html.style.overscrollBehavior='none';bodyEl.style.overflow='hidden';
    bodyEl.style.position='';bodyEl.style.top='';bodyEl.style.left='';bodyEl.style.right='';bodyEl.style.width='';
  }

  function unlockViewport(){
    if(!scrollLock)return;
    const html=document.documentElement,bodyEl=document.body,snapshot=scrollLock;scrollLock=null;
    html.style.overflow=snapshot.htmlOverflow;html.style.overscrollBehavior=snapshot.htmlOverscroll;
    bodyEl.style.overflow=snapshot.bodyOverflow;bodyEl.style.position=snapshot.bodyPosition;bodyEl.style.top=snapshot.bodyTop;bodyEl.style.left=snapshot.bodyLeft;bodyEl.style.right=snapshot.bodyRight;bodyEl.style.width=snapshot.bodyWidth;
    window.scrollTo(0,snapshot.scrollY);
  }

  function ensure(){
    if(root)return;
    root=document.createElement('div');root.id='elara-dialog-root';root.className='elara-dialog-root hidden';root.hidden=true;
    document.body.append(root);
    Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'100020',display:'block',width:'100vw',height:'100dvh',padding:'0',overflow:'hidden'});
    root.addEventListener('keydown',event=>{
      const entry=stack.at(-1);if(!entry)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(null);return}
      if(event.key!=='Tab')return;
      const focusable=[...entry.layer.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);
      if(!focusable.length){event.preventDefault();entry.panel.focus({preventScroll:true});return}
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    });
  }

  function revealTop(){
    stack.forEach((entry,index)=>{
      const top=index===stack.length-1;
      entry.layer.style.pointerEvents=top?'auto':'none';
      entry.layer.setAttribute('aria-hidden',top?'false':'true');
      entry.panel.setAttribute('aria-modal',top?'true':'false');
    });
  }

  function finish(value){
    const entry=stack.pop();if(!entry)return;
    entry.layer.remove();
    if(entry.resolve)entry.resolve(value);
    if(stack.length){
      revealTop();
      const previous=stack.at(-1);
      setTimeout(()=>previous.panel.focus({preventScroll:true}),0);
      return;
    }
    root.hidden=true;root.classList.add('hidden');document.body.classList.remove('elara-dialog-open');unlockViewport();
    if(entry.lastFocus?.isConnected)entry.lastFocus.focus({preventScroll:true});
  }

  function actionButton(action){
    const button=document.createElement('button');button.type='button';button.textContent=action.label;
    button.className=action.kind==='primary'?'primary-button':action.kind==='danger'?'elara-dialog-danger':'quiet-button';
    if(action.disabled)button.disabled=true;button.addEventListener('click',()=>finish(action.value));return button;
  }

  function open({title='پیام Elara',message='',content=null,actions=null,wide=false}={}){
    ensure();lockViewport();
    const id='elara-dialog-title-'+(++serial),layer=document.createElement('div');
    layer.className='elara-dialog-layer';
    Object.assign(layer.style,{position:'absolute',inset:'0',display:'grid',placeItems:'center',width:'100%',height:'100%',padding:'18px',overflow:'hidden',zIndex:String(100+serial)});
    layer.innerHTML='<button class="elara-dialog-scrim" type="button" aria-label="بستن پنجره"></button><section class="elara-dialog-panel" role="dialog" aria-modal="true" tabindex="-1"><header class="elara-dialog-head"><button type="button" class="elara-dialog-back" aria-label="بازگشت">←</button><div><span class="elara-dialog-kicker">ELARA</span><h2></h2></div><button type="button" class="elara-dialog-close" aria-label="بستن">×</button></header><div class="elara-dialog-body"></div><footer class="elara-dialog-actions"></footer></section>';
    const panel=layer.querySelector('.elara-dialog-panel'),body=layer.querySelector('.elara-dialog-body'),footer=layer.querySelector('.elara-dialog-actions'),titleEl=layer.querySelector('h2');
    panel.setAttribute('aria-labelledby',id);titleEl.id=id;titleEl.textContent=String(title||'پیام Elara');panel.classList.toggle('wide',!!wide);
    if(message){const p=document.createElement('p');p.className='elara-dialog-message';p.textContent=String(message);body.append(p)}
    if(content instanceof Node)body.append(content);
    const list=Array.isArray(actions)&&actions.length?actions:[{label:'بستن',value:true,kind:'primary'}];list.forEach(action=>footer.append(actionButton(action)));
    layer.querySelector('.elara-dialog-scrim').addEventListener('click',()=>finish(null));
    layer.querySelector('.elara-dialog-back').addEventListener('click',()=>finish(null));
    layer.querySelector('.elara-dialog-close').addEventListener('click',()=>finish(null));
    const entry={layer,panel,lastFocus:document.activeElement,resolve:null};stack.push(entry);root.append(layer);
    overlay.next(root);root.hidden=false;root.classList.remove('hidden');document.body.classList.add('elara-dialog-open');revealTop();
    setTimeout(()=>panel.focus({preventScroll:true}),0);
    return new Promise(resolve=>{entry.resolve=resolve});
  }

  async function confirm(message,{title='تأیید',confirmText='تأیید',cancelText='لغو',danger=false}={}){
    return (await open({title,message,actions:[{label:cancelText,value:false},{label:confirmText,value:true,kind:danger?'danger':'primary'}]}))===true;
  }
  async function prompt(message,{title='ورودی',label='',value='',placeholder='',maxLength=180,confirmText='ثبت'}={}){
    const wrap=document.createElement('div');wrap.className='elara-dialog-field';
    if(label){const l=document.createElement('label');l.textContent=label;wrap.append(l)}
    const input=document.createElement('input');input.type='text';input.value=String(value||'');input.placeholder=placeholder;input.maxLength=maxLength;input.autocomplete='off';wrap.append(input);
    const result=await open({title,message,content:wrap,actions:[{label:'لغو',value:false},{label:confirmText,value:true,kind:'primary'}]});
    return result===true?input.value:null;
  }
  async function choice({title='انتخاب',message='',options=[]}={}){
    const actions=options.map(option=>({label:option.label,value:option.value,kind:option.kind||''}));actions.unshift({label:'لغو',value:null});return open({title,message,actions});
  }
  window.ElaraDialog={open,confirm,prompt,choice,close:()=>finish(null),depth:()=>stack.length};
})();
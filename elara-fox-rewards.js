/* Elara Fox rewards — display-only reactions to canonical saved progress. No XP writes. */
(()=>{'use strict';
 const $=s=>document.querySelector(s);
 const en=()=>document.documentElement.lang==='en';
 const tx=(fa,english)=>en()?english:fa;
 const images=Object.freeze({celebrate:'assets/mascot/fox-celebrate.webp',thoughtful:'assets/mascot/fox-thoughtful.webp'});
 const queue=[];let current=null,focusReturn=null,lastLeitner='',lastXp=null,account='';
 function who(){return String(window.ElaraAccount?.user?.uid||'local')}
 function readXp(){try{return Math.max(0,Number(JSON.parse(localStorage.getItem('elara_space_v1')||'{}').xp)||0)}catch{return 0}}
 function n(value){return Number(value||0).toLocaleString(en()?'en-US':'fa-IR')}
 function make(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el}
 function resetBaseline(){account=who();lastXp=readXp();lastLeitner='';queue.length=0}
 function close(){if(!current)return;const box=current;current=null;box.remove();if(focusReturn?.isConnected)focusReturn.focus({preventScroll:true});focusReturn=null;while(queue.length&&!current){const next=queue.shift();show(next)}}
 function show(data){
  if(current){if(queue.length<4)queue.push(data);return}
  if(document.querySelector('[data-elara-reward-modal]'))return;
  focusReturn=document.activeElement;
  const backdrop=make('div','elara-fox-overlay');backdrop.dataset.elaraRewardModal='';const panel=make('section','elara-fox-dialog');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.tabIndex=-1;
  const headingId='elara-fox-heading';panel.setAttribute('aria-labelledby',headingId);
  const x=make('button','elara-fox-close','×');x.type='button';x.setAttribute('aria-label',tx('بستن','Close'));x.onclick=close;panel.append(x);
  const img=make('img','elara-fox-image');img.src=images[data.image]||images.celebrate;img.alt='';img.width=208;img.height=208;img.decoding='async';panel.append(img);
  panel.append(make('div','elara-fox-eyebrow',data.eyebrow||'ELARA SPACE'));
  const h=make('h2','',data.title);h.id=headingId;panel.append(h);
  panel.append(make('p','',data.description));
  if(data.tags?.length){const meta=make('div','elara-fox-meta');data.tags.forEach(t=>meta.append(make('span','',t)));panel.append(meta)}
  const actions=make('div','elara-fox-actions');
  const later=make('button','elara-fox-action',data.secondary||tx('بستن','Close'));later.type='button';later.onclick=close;
  const primary=make('button','elara-fox-action primary',data.primary||tx('ادامه','Continue'));primary.type='button';primary.onclick=()=>{close();if(data.goTo==='leitner')document.querySelector('#l3-review-scene [data-l3-exit]')?.click()};
  actions.append(later,primary);panel.append(actions);backdrop.append(panel);document.body.append(backdrop);current=backdrop;primary.focus({preventScroll:true});
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
 }
 function onWord(e){
  const d=e.detail||{};if(!d.wasDue||!(d.dueBefore>0)||d.dueRemaining!==0)return;
  const key=who()+':'+String(d.wordId||'');
  if(key===lastLeitner)return;lastLeitner=key;
  show({image:'celebrate',eyebrow:tx('مسیر یادگیری','LEARNING PATH'),title:tx('مرور امروز کامل شد!','Today’s review is complete!'),
   description:tx('همهٔ واژه‌های سررسیدشده را مرور کردی. فردا هم با هم ادامه می‌دهیم.','You reviewed every due word. We’ll keep going together tomorrow.'),
   tags:[tx('واژهٔ باقی‌مانده: ۰','Words remaining: 0'),...(d.xpAwarded>0?['+'+n(d.xpAwarded)+' XP']:[])],
   primary:tx('بازگشت به لایتنر','Back to Leitner'),secondary:tx('همین‌جا بمان','Stay here'),goTo:'leitner'});
 }
 function onXp(){
  const scope=who();const xp=readXp();if(account!==scope){resetBaseline();return}
  if(lastXp===null){lastXp=xp;return}
  const before=lastXp;lastXp=xp;if(xp<=before)return;
  const registry=window.ElaraLevels;if(!registry?.level)return;
  const previous=registry.level(before),now=registry.level(xp);if(now<=previous)return;
  show({image:'celebrate',eyebrow:tx('سفر کهکشانی تو','YOUR COSMIC JOURNEY'),title:tx('سطح جدید باز شد!','Level up!'),
    description:tx('پیشرفت واقعی‌ات تو را به سطح '+n(now)+' رساند. عالی ادامه می‌دهی!','Your progress brought you to level '+n(now)+'. Keep going!'),
    tags:[tx('سطح ','Level ')+n(now),registry.titleForLevel?.(now)||''],primary:tx('ادامهٔ مسیر','Keep going')});
 }
 function onKey(e){if(!current)return;if(e.key==='Escape'){e.preventDefault();close();return}if(e.key==='Tab'){
  const list=[...current.querySelectorAll('button:not([disabled])')];if(!list.length)return;const first=list[0],last=list[list.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }}
 window.addEventListener('elara:leitner-review-committed',onWord);
 window.addEventListener('elara:data-changed',onXp);
 window.addEventListener('elara:state-committed',onXp);
 window.addEventListener('elara:account-ready',resetBaseline);
 window.addEventListener('elara:hydrate',resetBaseline);
 window.addEventListener('elara:logout',()=>{if(current)close();resetBaseline()});
 document.addEventListener('keydown',onKey,true);
 resetBaseline();
 window.ElaraFoxRewards={show,close,get active(){return !!current}};
})();

/* Incremental DOM reconciliation. Unchanged artwork, controls and focus stay mounted. */
(()=>{'use strict';
const key=n=>n.nodeType===1?(n.id||n.getAttribute('data-key')||n.getAttribute('data-ref-task')||n.getAttribute('data-ref-habit')||n.getAttribute('data-home-date')||''):'';
function same(a,b){return a.nodeType===b.nodeType&&a.nodeName===b.nodeName&&key(a)===key(b)}
function sync(a,b){
 if(a.nodeType!==1){if(a.nodeValue!==b.nodeValue)a.nodeValue=b.nodeValue;return}
 for(const attr of [...a.attributes])if(!b.hasAttribute(attr.name)&&!(attr.name==='open'&&a.tagName==='DETAILS'))a.removeAttribute(attr.name);
 for(const attr of b.attributes)if(a.getAttribute(attr.name)!==attr.value)a.setAttribute(attr.name,attr.value);
 children(a,b);
}
function children(parent,next){
 let cursor=parent.firstChild;
 for(const desired of [...next.childNodes]){
  let live=cursor;
  if(!live||!same(live,desired)){
   live=[...parent.childNodes].find(n=>n!==cursor&&key(desired)&&same(n,desired));
   if(live)parent.insertBefore(live,cursor);else{live=desired.cloneNode(true);parent.insertBefore(live,cursor)}
  }
  sync(live,desired);cursor=live.nextSibling;
 }
 while(cursor){const old=cursor;cursor=cursor.nextSibling;old.remove()}
}
function patch(host,html){if(!host)return;if(host.__elaraMarkup===html)return;const template=document.createElement('template');template.innerHTML=html;children(host,template.content);host.__elaraMarkup=html}
window.ElaraDOM={patch};
})();

/* Preserve a legacy read-only timer mirror for the core renderer after Focus moves to Library. No second timer/session. */
(()=>{'use strict';
function ensureMirror(){if(document.getElementById('elara-mirror-timer'))return;const mirror=document.createElement('span');mirror.id='elara-mirror-timer';mirror.hidden=true;mirror.setAttribute('aria-hidden','true');document.body.append(mirror)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureMirror,{once:true});else ensureMirror();
})();

/* FOCUS-01: approved focus entry navigates to the dedicated room.
   Never move the canonical #timer-start or its listeners into a dialog. */
(()=>{'use strict';
window.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-approved-focus]');
 if(!trigger)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 window.ElaraOpen?.('focus-pomodoro',{history:'push'});
},true);
})();

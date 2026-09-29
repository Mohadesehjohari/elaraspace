/* Elara phase 2: recurrence, inline folder/tag creation, priority semantics and persistent Focus sessions. */
(() => {
  'use strict';
  const KEY='elara_space_v1', $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today=()=>iso(new Date());
  const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v??''))&&!Number.isNaN(new Date(`${v}T12:00:00`).getTime());
  const timezone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return'UTC'}};
  const dayOf=v=>new Date(`${v}T12:00:00`).getDay();
  const daysBetween=(a,b)=>Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000);
  const makeId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fa=n=>Number(n||0).toLocaleString('fa-IR');
  const labelDate=v=>{try{return new Intl.DateTimeFormat('fa-IR',{year:'numeric',month:'short',day:'numeric'}).format(new Date(`${v}T12:00:00`))}catch{return v}};
  const weekNames={0:'ÛŒÚ©Ø´Ù†Ø¨Ù‡',1:'Ø¯ÙˆØ´Ù†Ø¨Ù‡',2:'Ø³Ù‡â€ŒØ´Ù†Ø¨Ù‡',3:'Ú†Ù‡Ø§Ø±Ø´Ù†Ø¨Ù‡',4:'Ù¾Ù†Ø¬Ø´Ù†Ø¨Ù‡',5:'Ø¬Ù…Ø¹Ù‡',6:'Ø´Ù†Ø¨Ù‡'};
  const weekOrder=[6,0,1,2,3,4,5];
  const priorityMeta={
    '1':{label:'ÙÙˆØ±ÛŒ',className:'priority-red'},
    '2':{label:'Ø¨Ø§Ù„Ø§',className:'priority-yellow'},
    '3':{label:'Ù…ØªÙˆØ³Ø·',className:'priority-blue'},
    '4':{label:'Ø¹Ø§Ø¯ÛŒ',className:'priority-gray'}
  };
  let editingTask=null,editingTaskScope='series',editingHabit=null,editingHabitScope='series',focusInterval=null;

  const readState=()=>{try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');return s&&typeof s==='object'?s:{}}catch{return{}}};
  const ensureState=s=>{
    s.version=1;
    for(const key of ['tasks','habits','goals','books','words','taskLists','folders','tags','focusSessions','taskCompletionHistory'])if(!Array.isArray(s[key]))s[key]=[];
    if(!Number.isFinite(Number(s.xp)))s.xp=0;
    return s;
  };
  const notify=message=>{
    const el=$('toast');if(!el)return;el.textContent=message;el.classList.remove('hidden');
    clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.add('hidden'),3200);
  };
  const writeState=(state,{hydrate=true}={})=>{
    ensureState(state);
    localStorage.setItem(KEY,JSON.stringify(state));
    if(hydrate)window.dispatchEvent(new CustomEvent('elara:hydrate',{detail:state}));
    window.dispatchEvent(new Event('elara:data-changed'));
  };
  const dateList=v=>Array.isArray(v)?[...new Set(v.filter(validDate))]:[];
  const safeRule=(rule,fallback=today())=>window.ElaraSchedule.normalize(rule,fallback);
  const applies=(item,date)=>window.ElaraSchedule.applies(item,date);
  const recurrenceLabel=rule=>{
    const r=safeRule(rule);if(!r)return'';
    const days=r.frequency==='monthly'?`Ù‡Ø± ${fa(r.interval)} Ù…Ø§Ù‡`:r.frequency==='daily'?`Ù‡Ø± ${fa(r.interval)} Ø±ÙˆØ²`:r.weekdays.length===7?'Ù‡Ø± Ø±ÙˆØ²':weekOrder.filter(d=>r.weekdays.includes(d)).map(d=>weekNames[d]).join('ØŒ ');
    return `ØªÚ©Ø±Ø§Ø±: ${days}${r.endDate?' Â· ØªØ§ '+labelDate(r.endDate):' Â· Ø¨Ø¯ÙˆÙ† Ù¾Ø§ÛŒØ§Ù†'}`;
  };
  const completionKey=(taskId,date)=>String(taskId||'')+':'+String(date||'');
  const ensureCompletionHistory=state=>{
    state.taskCompletionHistory=Array.isArray(state.taskCompletionHistory)?state.taskCompletionHistory:[];
    const map=new Map();
    for(const entry of state.taskCompletionHistory){
      if(!entry||!validDate(entry.date))continue;
      const taskId=String(entry.taskId||'').slice(0,100),key=String(entry.key||'').slice(0,240)||(taskId?completionKey(taskId,entry.date):'');
      if(key)map.set(key,{key,taskId,date:entry.date,title:String(entry.title||'').slice(0,180),completedAt:Number(entry.completedAt)||0});
    }
    for(const task of state.tasks){
      if(task.recurrenceRule){
        for(const date of dateList(task.occurrenceDone)){const key=completionKey(task.id,date);if(!map.has(key))map.set(key,{key,taskId:task.id,date,title:task.text||'',completedAt:0})}
      }else if(task.completed&&validDate(task.doneAt)){
        const key=completionKey(task.id,task.doneAt);if(!map.has(key))map.set(key,{key,taskId:task.id,date:task.doneAt,title:task.text||'',completedAt:0});
      }
    }
    state.taskCompletionHistory=[...map.values()].slice(-20000);
    return state.taskCompletionHistory;
  };
  const recordCompletion=(state,task,date)=>{
    const list=ensureCompletionHistory(state),key=completionKey(task.id,date);
    if(!list.some(x=>x.key===key))list.push({key,taskId:task.id,date,title:task.text||'',completedAt:Date.now()});
  };
  const removeCompletion=(state,task,date)=>{
    const key=completionKey(task.id,date);ensureCompletionHistory(state);state.taskCompletionHistory=state.taskCompletionHistory.filter(x=>x.key!==key);
  };
  const completedTodayCount=(state,date=today())=>ensureCompletionHistory(state).filter(x=>x.date===date).length;
  const taskDone=(task,date=today())=>task.recurrenceRule?dateList(task.occurrenceDone).includes(date):!!task.completed;
  const taskView=(task,date=today())=>{
    if(!task.recurrenceRule||!applies(task,date))return task;
    const o=task.occurrenceOverrides&&typeof task.occurrenceOverrides==='object'?task.occurrenceOverrides[date]:null;
    return o&&typeof o==='object'?{...task,...o}:task;
  };
  const habitDone=(habit,date=today())=>dateList(habit.days).includes(date);
  const habitView=(habit,date=today())=>{
    if(!habit.recurrenceRule||!applies(habit,date))return habit;
    const o=habit.occurrenceOverrides&&typeof habit.occurrenceOverrides==='object'?habit.occurrenceOverrides[date]:null;
    return o&&typeof o==='object'?{...habit,...o}:habit;
  };
  const habitScheduled=(habit,date=today())=>habit.recurrenceRule?applies(habit,date):true;
  const scheduledStreak=habit=>{
    let d=new Date(`${today()}T12:00:00`),count=0,started=false;
    for(let i=0;i<3650;i++){
      const key=iso(d),scheduled=habitScheduled(habit,key);
      if(scheduled){
        if(habitDone(habit,key)){count++;started=true}
        else if(started||key<=today())break;
      }
      d.setDate(d.getDate()-1);
    }
    return count;
  };
  const ruleFromForm=(prefix,startFallback)=>{
    const enabled=$(`${prefix}-recurrence`)?.checked;
    if(!enabled)return null;
    const start=validDate(startFallback)?startFallback:today();
    const weekdays=[...document.querySelectorAll(`input[name="${prefix}-weekday"]:checked`)].map(x=>Number(x.value));
    const frequency=$(`${prefix}-frequency`)?.value||'weekly',interval=Number($(`${prefix}-interval`)?.value)||1;if(!Number.isInteger(interval)||interval<1||interval>365)throw new Error('ÙØ§ØµÙ„Ù‡Ù” ØªÚ©Ø±Ø§Ø± Ø¨Ø§ÛŒØ¯ Ø¨ÛŒÙ† Û± Ùˆ Û³Û¶Ûµ Ø¨Ø§Ø´Ø¯.');
    if(frequency==='weekly'&&!weekdays.length)throw new Error('Ø­Ø¯Ø§Ù‚Ù„ ÛŒÚ© Ø±ÙˆØ² Ù‡ÙØªÙ‡ Ø±Ø§ Ø¨Ø±Ø§ÛŒ ØªÚ©Ø±Ø§Ø± Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†.');
    const noEnd=$(`${prefix}-recurrence-no-end`)?.checked;
    const rawEnd=$(`${prefix}-recurrence-end`)?.value||'';
    const end=noEnd?'':rawEnd;
    if(end&&!validDate(end))throw new Error('ØªØ§Ø±ÛŒØ® Ù¾Ø§ÛŒØ§Ù† ØªÚ©Ø±Ø§Ø± Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.');
    if(end&&end<start)throw new Error('ØªØ§Ø±ÛŒØ® Ù¾Ø§ÛŒØ§Ù† Ù†Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ù‚Ø¨Ù„ Ø§Ø² ØªØ§Ø±ÛŒØ® Ø´Ø±ÙˆØ¹ Ø¨Ø§Ø´Ø¯.');
    if(end&&daysBetween(start,end)>1830)throw new Error('Ø¨Ø§Ø²Ù‡Ù” Ø²È="24XÚ™\Ù]ÊZ[]\ÊNÜ™[™\‘›ØÝ\Ò\ÝÜžJ
NÂˆBˆ[˜Ý[Ûˆ™[™\‘›ØÝ\Ò\ÝÜžJ
^ÂˆÛÛœÝÜÝI
	Ù›ØÝ\Ë\Ù\ÜÚ[ÛœÉÊNÚYŠZÜÝ
\™]\›ŽØÛÛœÝ›ÝÜÏY›ØÝ\ÔÝ]J
K™›ØÝ\ÔÙ\ÜÚ[ÛœËœÛXÙJN
Kœ™]™\œÙJ
NÂˆÜÝš[›™\’S\›ÝÜË›[™ÝÜ›ÝÜË›X\
ÏO˜]ˆÛ\ÜÏH™[\˜KZ][H]Ý›Û™Ï‰ÜËYÏÙ\ØÊËYÊN‰ö*¶av,vªv,ˆ6.vavb6avã	ßOÜÝ›Û™ÏÛX[‰Ó˜]\‘\ØØ\YOÜÛX[Ù]Ü[‰Ù˜JË™\˜][Û“Z[Š_H6+ö`¶ã6`¶!H0­ø +H	Û™]È]JË™[™Y]ËœÝ\Y]
KÓØØ[Q]TÝš[™Ê	Ù˜KRT‰Ê_OÜÜ[Ù]˜
Kš›Ú[Š	ÉÊN‰ÏÛ\ÜÏH›]]Y¶aöa¶b6,ˆ6+6a6,öaø #6)öã6*¶av,vªv,¶ã6*¶av)öa8 #6-6+öaø #6)öã6a¶+ö)ö,vãÜ‰ÎÂˆBˆ[˜Ý[Ûˆ[Y\•^
ÙXÊ^Ü™]\›ˆ	ÔÝš[™ÊX]™›ÛÜŠÙXËÍŒ
JKœYÝ\
‹	Ì	Ê_N‰ÔÝš[™ÊX]›X^
ÙXÉMŒ
JKœYÝ\
‹	Ì	Ê_XBˆ[˜Ý[Ûˆš[š\Ú›ØÝ\ÊXÝ]™J^ÂˆÛX\’[\˜[
›ØÝ\Ò[\˜[
NÙ›ØÝ\Ò[\˜[[[ØÛÛœÝÝ]OY›ØÝ\ÔÝ]J
KÝ\œ™[\Ý]K˜XÝ]™Q›ØÝ\ÎÂˆYŠXÝ\œ™[Ý\œ™[šYOOXXÝ]™KšY
\™]\›ŽÂˆYŠ\Ý]K™›ØÝ\ÔÙ\ÜÚ[ÛœËœÛÛYJÏOœËšYOOXXÝ]™KšY
J^ÜÝ]K™›ØÝ\ÔÙ\ÜÚ[ÛœËœ\Ú
ÚY˜XÝ]™KšYÝ\Y]˜XÝ]™KœÝ\Y][™Y]‘]K››ÝÊ
K\˜][Û“Z[Ž˜XÝ]™K™\˜][Û“Z[‹YÎ˜XÝ]™KYß	ÉËÛÛ\]YY_JNÜÝ]K™›ØÝ\ÔÙ\ÜÚ[ÛœÏ\Ý]K™›ØÝ\ÔÙ\ÜÚ[ÛœËœÛXÙJLŒ
NÜÝ]KžS[X™\ŠÝ]Kž
JÌM_BˆÝ]K˜XÝ]™Q›ØÝ\Ï[[ÝÜš]TÝ]JÝ]JNÛ›ÝYžJ	Ù˜JXÝ]™K™\˜][Û“Z[Š_H6+ö`¶ã6`¶aÈ6*¶av,vªv,ˆ6ªv)öava6-6+ÎÈ6ìvíH6«ö,v`v*¶ã˜
NÂˆBˆ[˜Ý[Ûˆ\]Q›ØÝ\Ñ\Ü^J
^ÂˆÛÛœÝÝ]OY›ØÝ\ÔÝ]J
KO\Ý]K˜XÝ]™Q›ØÝ\Ë\Ü^OI
	Ý[Y\‹Y\Ü^IÊNÚYŠY\Ü^J\™]\›ŽÂˆYŠXJ^ØÛÛœÝÙXÏY›ØÝ\ÔÙ[XÝYZ[]\Ê
JŒÙ\Ü^K^ÛÛ[][Y\•^
ÙXÊNÉ
	Ù›ØÝ\Ë\Ý]\ÉÊK^ÛÛ[Iö(¶av)ö+öaöe6*¶av,vªv,‰ÎÉ
	Ý[Y\‹\Ý\	ÊK^ÛÛ[Iö-6,vb6.IÎÙ›ØÝ\ÐÛÛ›ÛÊ˜[ÙJNÜ™]\›ŸBˆÛÛœÝÙXÏXKœÝ]\ÏOOIÜ[›š[™ÉÏÓX]›X^
X]˜ÙZ[

[X™\ŠK™[™]
KQ]K››ÝÊ
JKÌL
JN“X]›X^
[X™\ŠKœ™[XZ[š[™ÔÙXÊ_
NÂˆ\Ü^K^ÛÛ[][Y\•^
ÙXÊNÉ
	Ù›ØÝ\Ë\Ý]\ÉÊK^ÛÛ[XKœÝ]\ÏOOIÜ[›š[™ÉÏØ6+ö,H6+v)öa6*¶av,vªv,‰ØKYÏÉÈ0­ÈÉÊØKYÎ‰ÉßX‰öavªv*ÉÎÉ
	Ý[Y\‹\Ý\	ÊK^ÛÛ[XKœÝ]\ÏOOIÜ[›š[™ÉÏÉöavªv*ÉÎ‰ö)ö+ö)öavaÉÎÙ›ØÝ\ÐÛÛ›ÛÊYJNÂˆYŠKœÝ]\ÏOOIÜ[›š[™ÉÉ‰œÙXÏL
Yš[š\Ú›ØÝ\ÊJNÂˆBˆ[˜Ý[Ûˆ™\ÝÜ™Q›ØÝ\Ê
^ÂˆÛX\’[\˜[
›ØÝ\Ò[\˜[
NÙ›ØÝ\Ò[\˜[[[ØÛÛœÝÝ]OY›ØÝ\ÔÝ]J
KO\Ý]K˜XÝ]™Q›ØÝ\ÎÂˆÞ[˜ÔÙ[XÝÜœÊ
NÚYŠJ^ÚYŠ	
	Ù›ØÝ\ËY\˜][Û‰ÊJI
	Ù›ØÝ\ËY\˜][Û‰ÊK˜[YOXK™\˜][Û“Z[ŸNÚYŠ	
	Ù›ØÝ\Ë]YÉÊJI
	Ù›ØÝ\Ë]YÉÊK˜[YOXKYß	ÉßBˆ\]Q›ØÝ\Ñ\Ü^J
NÚYŠOËœÝ]\ÏOOIÜ[›š[™ÉÉ‰“[X™\ŠK™[™]
O‘]K››ÝÊ
JY›ØÝ\Ò[\˜[\Ù][\˜[
\]Q›ØÝ\Ñ\Ü^KL
NÜ™[™\‘›ØÝ\Ò\ÝÜžJ
NÂˆBˆ[˜Ý[ÛˆÙÙÛQ›ØÝ\Ê
^ÂˆÛÛœÝÝ]OY›ØÝ\ÔÝ]J
KO\Ý]K˜XÝ]™Q›ØÝ\ÎÂˆYŠOËœÝ]\ÏOOIÜ[›š[™ÉÊ^ØKœ™[XZ[š[™ÔÙXÏSX]›X^
X]˜ÙZ[

[X™\ŠK™[™]
KQ]K››ÝÊ
JKÌL
JNØK™[™]LØKœÝ]\ÏIÜ]\ÙY	ÎÝÜš]TÝ]JÝ]JNÜ™]\›ŸBˆYŠOËœÝ]\ÏOOIÜ]\ÙY	Ê^ØK™[™]Q]K››ÝÊ
JÓX]›X^
K[X™\ŠKœ™[XZ[š[™ÔÙXÊ_JJŒLØKœÝ]\ÏIÜ[›š[™ÉÎÝÜš]TÝ]JÝ]JNÜ™]\›ŸBˆÛÛœÝ\˜][Û“Z[Y›ØÝ\ÔÙ[XÝYZ[]\Ê
KYÏI
	Ù›ØÝ\Ë]YÉÊOË˜[Y_	ÉËY[XZÙRY

KÝ\Y]Q]K››ÝÊ
NÂˆÝ]K˜XÝ]™Q›ØÝ\Ï^ÚY\˜][Û“Z[‹YËÝ\Y][™]œÝ\Y]
Ù\˜][Û“Z[ŠŒ™[XZ[š[™ÔÙXÎ™\˜][Û“Z[ŠŒÝ]\Î‰Ü[›š[™ÉßNÝÜš]TÝ]JÝ]JNÂˆBˆ\Þ[˜È[˜Ý[Ûˆ™\Ù]›ØÝ\Ê
^ÂˆÛÛœÝÝ]OY›ØÝ\ÔÝ]J
KXÝ]™O\Ý]K˜XÝ]™Q›ØÝ\ÎÂˆYŠXXÝ]™J^Ý\]Q›ØÝ\Ñ\Ü^J
NÜ™]\›ŸBˆÛÛœÝÛÛ™š\›YYX]ØZ]Ú[™ÝË‘[\˜QX[ÙË˜ÛÛ™š\›J	ö+6a6,öaöe6`v.va6ã6o¶)öã6)öaˆ6+ö)ö+öaÈ6-6b6+È6b6,¶av)öa¸ #6,öa¶+6*6,v)öã6-6,vb6.H6+öb6*6)ö,vaÈ6(¶av)ö+öaÈ6-6b6+ö'ÉËÝ]N‰ö-6,vb6.H6+öb6*6)ö,vaöe6*¶av,vªv,‰ËÛÛ™š\›U^‰ö-6,vb6.H6+öb6*6)ö,vaÉËØ[˜Ù[^‰ö)ö+ö)öavaöe6+6a6,öaÉË[™Ù\ŽY_JNÂˆYŠXÛÛ™š\›YY
\™]\›ŽÂˆÛX\’[\˜[
›ØÝ\Ò[\˜[
NÙ›ØÝ\Ò[\˜[[[ÂˆÝ]K˜XÝ]™Q›ØÝ\Ï[[ÂˆÜš]TÝ]JÝ]JNÂˆ›ÝYžJ	ö,¶av)öa¸ #6,öa¶+6*6,v)öã6+6a6,öaöe6+6+öã6+È6(¶av)ö+öaÈ6-6+Ë‰ÊNÂˆBˆ[˜Ý[Ûˆ™Yœ™\Ú[

^ÜÞ[˜ÔÙ[XÝÜœÊ
NÜ™[™\•\ÚÜÊ
NÜ™[™\’Xš]Ê
NÜ™[™\‘›ØÝ\Ò\ÝÜžJ
NÝ\]Q›ØÝ\Ñ\Ü^J
_B‚ˆ[˜Ý[Ûˆš[™

^Âˆ[š™XÝRJ
NÜ™\Ù]\ÚÑ›Ü›J
NÜ™\Ù]Xš]›Ü›J
NÜ™Yœ™\Ú[

NÜ™\ÝÜ™Q›ØÝ\Ê
NÂˆØÝ[Y[˜Y]™[\Ý[™\Š	ÜÝX›Z]	Ë]™[OžÂˆYŠ]™[\™Ù]ËšYOOIÝ\ÚËY›Ü›IÊ^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NÜÝX›Z]\ÚÊ
_BˆYŠ]™[\™Ù]ËšYOOIÚXš]Y›Ü›IÊ^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NÜÝX›Z]Xš]

_BˆKYJNÂˆØÝ[Y[˜Y]™[\Ý[™\Š	ØÛXÚÉË\Þ[˜È]™[OžÂˆÛÛœÝYXZ[Y]™[\™Ù]˜ÛÜÙ\Ý
	ÈÙ[\˜K]\ÚËXY[XZ[‰ÊNÚYŠYXZ[Š^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NÛÜ[•\ÚÐÛÛ\ÜÙ\Š
NÜ™]\›ŸBˆÛÛœÝÛÛÕÙÙÛOY]™[\™Ù]˜ÛÜÙ\Ý
	ÈÙ[\˜K]\ÚË]ÛÛË]ÙÙÛIÊNÚYŠÛÛÕÙÙÛJ^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NÝÙÙÛU\ÚÕÛÛÊ
NÜ™]\›ŸBˆÛÛœÝY]OY]™[\™Ù]˜ÛÜÙ\Ý
	ÖÙ]K[Y]KYY]KÙ]K[Y]K\™[[Ý™WIÊNÚYŠY]J^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NØ]ØZ]X[˜YÙSY]Y]JY]JNÜ™]\›ŸBˆÛÛœÝÛÛÐXÝ[ÛY]™[\™Ù]˜ÛÜÙ\Ý
	ÖÙ]K]\ÚË]ÛÛ×IÊNÚYŠÛÛÐXÝ[ÛŠ^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NØ]ØZ][™U\ÚÕÛÛÊÛÛÐXÝ[Û‹™]\Ù]\ÚÕÛÛÊNÜ™]\›ŸBˆYŠI
	Ù[\˜K]\ÚË]ÛÛË[Y[IÊOËšY[‰‰ˆY]™[\™Ù]˜ÛÜÙ\Ý
	ÈÙ[\˜K]\ÚË]ÛÛË[Y[IÊJXÛÜÙU\ÚÕÛÛÊ
NÂˆÛÛœÝÜ™X]OY]™[\™Ù]˜ÛÜÙ\Ý
	ÖÙ]K\\ÙL‹XÜ™X]WIÊNÚYŠÜ™X]J^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NØ]ØZ][›[™PÜ™X]JÜ™X]K™]\Ù]œ\ÙLÜ™X]KÜ™X]K™]\Ù]œ\ÙL•\™Ù]
NÜ™]\›ŸBˆÛÛœÝ[Y]™[\™Ù]˜ÛÜÙ\Ý
	ÖÙ]K]ÙYZÙ^\ËX[IÊNÚYŠ[
^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NÙØÝ[Y[œ]Y\žTÙ[XÝÜ[
[œ]Û˜[YOH‰Ø[™]\Ù]ÙYZÙ^\Ð[K]ÙYZÙ^H—X
K™›Ü‘XXÚ
Ož˜ÚXÚÙY]YJNÜ™]\›ŸBˆÛÛœÝ™\Ù]Y]™[\™Ù]˜ÛÜÙ\Ý
	ÖÙ]KY›ØÝ\Ë\™\Ù]IÊNÚYŠ™\Ù]
^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NÚYŠI
	Ù›ØÝ\ËY\˜][Û‰ÊOË™\ØX›Y
^É
	Ù›ØÝ\ËY\˜][Û‰ÊK˜[YO\™\Ù]™]\Ù]™›ØÝ\Ô™\Ù]Ý\]Q›ØÝ\Ñ\Ü^J
_\™]\›ŸBˆYŠ]™[\™Ù]˜ÛÜÙ\Ý
	ÈÝ[Y\‹\Ý\	ÊJ^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NÝÙÙÛQ›ØÝ\Ê
NÜ™]\›ŸBˆYŠ]™[\™Ù]˜ÛÜÙ\Ý
	ÈÝ[Y\‹\™\Ù]	ÊJ^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NØ]ØZ]™\Ù]›ØÝ\Ê
NÜ™]\›ŸBˆYŠ]™[\™Ù]˜ÛÜÙ\Ý
	ÈÝ\ÚËXØ[˜Ù[	ÊJ^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NÜ™\Ù]\ÚÑ›Ü›J
NÜ™]\›ŸBˆYŠ]™[\™Ù]˜ÛÜÙ\Ý
	ÈÚXš]XØ[˜Ù[	ÊJ^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NÜ™\Ù]Xš]›Ü›J
NÜ™]\›ŸBˆÛÛœÝXÝ[ÛY]™[\™Ù]˜ÛÜÙ\Ý
	ÖÙ]K\\ÙL‹XXÝ[Û—IÊNÚYŠXÝ[ÛŠ^Ù]™[œ™]™[Y˜][

NÙ]™[œÝÜ[[YYX]T›ÜYØ][ÛŠ
NØÛÛœÝ\OXXÝ[Û‹™]\Ù]œ\ÙLXÝ[ÛŽÚYŠ\K™[™ÕÚ]
	Ý\ÚÉÊJX]ØZ]\ÚÐXÝ[ÛŠ\KXÝ[Û‹™]\Ù]šY
NÙ[ÙH]ØZ]Xš]XÝ[ÛŠ\KXÝ[Û‹™]\Ù]šY
NÜ™]\›ŸBˆKYJNÂˆ›ÜŠÛÛœÝ™Yš^ÙˆÉÝ\ÚÉË	ÚXš]	×J^Âˆ	
	Ü™Yš^K\™XÝ\œ™[˜ÙX
OË˜Y]™[\Ý[™\Š	ØÚ[™ÙIË

OOœÞ[˜Ô™XÝ\œ™[˜ÙUš\ÚXš[]J™Yš^
JNÂˆ	
	Ü™Yš^K\™XÝ\œ™[˜ÙK[›ËY[™
OË˜Y]™[\Ý[™\Š	ØÚ[™ÙIËOOžØÛÛœÝ[™I
	Ü™Yš^K\™XÝ\œ™[˜ÙKY[™
NÚYŠ[™
^Ù[™™\ØX›YYK\™Ù]˜ÚXÚÙYÚYŠK\™Ù]˜ÚXÚÙY
Y[™˜[YOIÉß_JNÂˆBˆ›ÜŠÛÛœÝYÙˆÉÝ\ÚË\ÙX\˜Ú	Ë	Ý\ÚËYš[\‰Ë	Ý\ÚË[\ÝYš[\‰Ë	Ý\ÚËY›Û\‹Yš[\‰Ë	Ý\ÚË]YËYš[\‰Ë	Ý\ÚË\š[Üš]KYš[\‰×JI
Y
OË˜Y]™[\Ý[™\ŠYOOIÝ\ÚË\ÙX\˜Ú	ÏÉÚ[œ]	Î‰ØÚ[™ÙIË™[™\•\ÚÜÊNÂˆØÝ[Y[˜Y]™[\Ý[™\Š	ÚÙ^YÝÛ‰Ë]™[OžÚYŠ]™[šÙ^OOOIÑ\ØØ\IÊ^ØÛÜÙU\ÚÕÛÛÊ
NÚYŠØÝ[Y[˜XÝ]™Q[[Y[Ë˜ÛÜÙ\ÝËŠ	ÈÝ\ÚËY›Ü›IÊJXÛÜÙPÛÛ\ÜÙ\Š
__KYJNÂˆ	
	Ù›ØÝ\ËY\˜][Û‰ÊOË˜Y]™[\Ý[™\Š	Ú[œ]	Ë

OOžÚYŠY›ØÝ\ÔÝ]J
K˜XÝ]™Q›ØÝ\Ê]\]Q›ØÝ\Ñ\Ü^J
_JNÂˆÚ[™ÝË˜Y]™[\Ý[™\Š	Ù[\˜NšY˜]IË

OOœÙ][Y[Ý]


OOžÜ™Yœ™\Ú[

NÜ™\ÝÜ™Q›ØÝ\Ê
_K
JNÂˆÚ[™ÝË˜Y]™[\Ý[™\Š	Ù[\˜N™]KXÚ[™ÙY	Ë

OOœÙ][Y[Ý]
™Yœ™\Ú[
JNÂˆBˆÚ[™ÝË‘[\˜U\ÚÜÏ^Ý\ÚÐXÝ[Û‹Xš]XÝ[Û‹\ÚÕšY]ËXš]šY]Ë\ÚÑÛ™KXš]ØÚY[YÜ[ÛÛ\ÜÙ\Ž›Ü[•\ÚÐÛÛ\ÜÙ\‹™[™\Žœ™[™\•\ÚÜË™\Ù]œ™\Ù]\ÚÑ›Ü›_NÂˆYŠØÝ[Y[œ™XYTÝ]OOOIÛØY[™ÉÊYØÝ[Y[˜Y]™[\Ý[™\Š	ÑÓPÛÛ[ØYY	Ëš[™ÛÛ˜ÙNY_JNÙ[ÙHš[™

NÂŸJJ
NÂ
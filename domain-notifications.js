/* Local domain milestone notifications. First observation establishes a baseline; only later real changes notify. */
(()=>{'use strict';
const STORE='elara_space_v1',PREFIX='elara_domain_notif_cursor_v1_',arr=v=>Array.isArray(v)?v:[];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const uid=()=>window.ElaraAccount?.user?.uid||window.ElaraSocial?.me?.uid||'guest';
const key=()=>PREFIX+uid();
function state(){try{const v=JSON.parse(localStorage.getItem(STORE)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}}
function streakOf(h){const days=new Set(arr(h?.days)),d=new Date();d.setHours(12,0,0,0);let n=0;if(!days.has(today()))d.setDate(d.getDate()-1);while(n<3650){const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;if(!days.has(k))break;n++;d.setDate(d.getDate()-1)}return n}
function wellness(){const me=uid();if(me==='guest')return{};try{return JSON.parse(localStorage.getItem('elara_private_wellness_v1_'+me)||'{}')||{}}catch{return{}}}
function snap(){
 const s=state(),day=today(),w=wellness(),goal=Math.max(250,Number(w.goal)||2000),water=Number(w.water?.[day]||0),workout=arr(w.workouts).filter(x=>x?.date===day).reduce((n,x)=>n+Math.max(0,Number(x.minutes)||0),0);
 return{
  finishedBooks:arr(s.books).filter(b=>b?.shelf==='finished').map(b=>String(b.id)).sort(),
  completedGoals:arr(s.goals).filter(g=>arr(g?.steps).length&&arr(g.steps).every(x=>x?.done)).map(g=>String(g.id)).sort(),
  habitMilestones:Object.fromEntries(arr(s.habits).map(h=>[String(h.id),streakOf(h)])),
  taskToday:arr(s.taskCompletionHistory).filter(x=>x?.date===day).length,
  waterGoal:water>=goal,
  workoutMinutes:workout
 }
}
function readCursor(){try{return JSON.parse(localStorage.getItem(key())||'null')}catch{return null}}
function saveCursor(v){try{localStorage.setItem(key(),JSON.stringify(v))}catch{}}
function tt(fa,en){return window.ElaraI18n?.t?.(fa,en)||fa}
function notify(input){window.ElaraNotify?.push?.(input)}
function compare(prev,next){
 const s=state(),bookMap=new Map(arr(s.books).map(x=>[String(x.id),x])),goalMap=new Map(arr(s.goals).map(x=>[String(x.id),x])),habitMap=new Map(arr(s.habits).map(x=>[String(x.id),x]));
 for(const id of next.finishedBooks)if(!prev.finishedBooks?.includes(id)){const b=bookMap.get(id);notify({type:'book',title:tt('کتاب تموم شد 😍📚','Book finished 😍📚'),message:tt('دمت گرم! «','Nice! “')+String(b?.title||tt('یک کتاب','a book'))+tt('» رفت تو قفسهٔ خوانده‌شده.','” moved to Finished.'),dedupeKey:'book-finished:'+id})}
 for(const id of next.completedGoals)if(!prev.completedGoals?.includes(id)){const g=goalMap.get(id);notify({type:'goal',title:tt('هدف کامل شد ⚡','Goal complete ⚡'),message:String(g?.title||tt('هدفت','Your goal'))+tt(' رو کامل کردی؛ این یکی واقعاً حساب می‌شه 👊',' is complete — that one counts 👊'),dedupeKey:'goal-complete:'+id})}
 const milestones=[3,7,14,30,60,100,365];for(const [id,n] of Object.entries(next.habitMilestones||{})){const before=Number(prev.habitMilestones?.[id]||0),hit=milestones.find(m=>before<m&&n>=m);if(hit){const h=habitMap.get(id);notify({type:'habit',title:tt('استریک عادت 🔥','Habit streak 🔥'),message:String(h?.title||tt('عادتت','Your habit'))+' · '+hit+' '+tt('روز پشت‌سرهم. ادامه بده 😎','days in a row. Keep it going 😎'),dedupeKey:'habit-streak:'+id+':'+hit})}}
 for(const m of [1,3,5,10])if(Number(prev.taskToday||0)<m&&Number(next.taskToday||0)>=m)notify({type:'task',title:tt('پیشروی امروز ✅','Today’s progress ✅'),message:m===1?tt('اولین کار امروز بسته شد. شروع خوبیه 🫡','First task of the day is done 🫡'):tt('امروز ','You’ve completed ')+m+tt(' تسک رو بستی. محکم ادامه بده 💥',' tasks today. Keep pushing 💥'),dedupeKey:'task-today:'+today()+':'+m});
 if(!prev.waterGoal&&next.waterGoal)notify({type:'system',title:tt('هدف آب امروز 💧','Water goal 💧'),message:tt('هدف آب امروزت کامل شد. خوب پیش رفتی 🤝','You hit today’s water goal. Nice work 🤝'),dedupeKey:'water-goal:'+today()});
 for(const m of [20,45,60])if(Number(prev.workoutMinutes||0)<m&&Number(next.workoutMinutes||0)>=m)notify({type:'system',title:tt('تمرین امروز 💥','Today’s workout 💥'),message:tt('امروز ','You logged ')+m+tt(' دقیقه تمرین ثبت کردی.',' minutes of exercise today.'),dedupeKey:'workout:'+today()+':'+m});
}
let busy=false;
function check(){if(busy)return;busy=true;queueMicrotask(()=>{try{const next=snap(),prev=readCursor();if(prev)compare(prev,next);saveCursor(next)}finally{busy=false}})}
for(const event of ['elara:state-committed','elara:data-changed','elara:wellness-saved'])window.addEventListener(event,check);
window.addEventListener('elara:account-ready',check);
window.addEventListener('elara:logout',()=>{busy=false});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
window.ElaraDomainNotifications={check,snapshot:snap};
})();
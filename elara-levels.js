(()=>{'use strict';
const TITLES=Object.freeze([
 {min:1,max:1,fa:'کادت فضا',en:'Space Cadet'},{min:2,max:2,fa:'دیده‌بان ستاره',en:'Star Watcher'},{min:3,max:3,fa:'کاوشگر ماه',en:'Moon Explorer'},{min:4,max:4,fa:'مسافر مریخ',en:'Mars Traveler'},{min:5,max:5,fa:'مهندس کهکشانی',en:'Galactic Engineer'},{min:6,max:6,fa:'فرمانده ناوگان',en:'Fleet Commander'},{min:7,max:7,fa:'ناوبر کیهانی',en:'Cosmic Navigator'},{min:8,max:8,fa:'ارباب ستاره‌ها',en:'Star Lord'},{min:9,max:9,fa:'نگهبان کهکشان',en:'Galaxy Guardian'},{min:10,max:10,fa:'اسطورهٔ کیهان',en:'Cosmic Myth'},
 {min:11,max:15,fa:'جستجوگر سحابی',en:'Nebula Seeker'},{min:16,max:20,fa:'شکارچی شهاب',en:'Meteor Hunter'},{min:21,max:25,fa:'معمار مدار',en:'Orbit Architect'},{min:26,max:30,fa:'ناخدای ستاره‌ای',en:'Star Captain'},
 {min:31,max:39,fa:'پیشتاز کهکشان',en:'Galaxy Vanguard'},{min:40,max:49,fa:'استاد مدار',en:'Orbit Master'},{min:50,max:59,fa:'فرمانده نوا',en:'Nova Commander'},{min:60,max:69,fa:'نگهبان سحابی',en:'Nebula Guardian'},{min:70,max:79,fa:'افسانهٔ ستاره‌ها',en:'Star Legend'},{min:80,max:89,fa:'الیت کیهانی',en:'Cosmic Elite'},{min:90,max:99,fa:'اسطورهٔ اعظم',en:'Grand Mythic'},{min:100,max:119,fa:'تایتان کیهانی',en:'Cosmic Titan'},{min:120,max:Infinity,fa:'لجند بی‌کران',en:'Infinite Legend'}
].map(Object.freeze));
const RANKS=Object.freeze([
 {min:1,max:9,id:'rookie',fa:'تازه‌وارد',en:'Rookie'},{min:10,max:19,id:'bronze',fa:'برنز',en:'Bronze'},{min:20,max:29,id:'silver',fa:'نقره',en:'Silver'},{min:30,max:39,id:'gold',fa:'طلا',en:'Gold'},{min:40,max:49,id:'crystal',fa:'کریستال',en:'Crystal'},{min:50,max:59,id:'diamond',fa:'الماس',en:'Diamond'},{min:60,max:69,id:'master',fa:'مستر',en:'Master'},{min:70,max:79,id:'grandmaster',fa:'گرندمستر',en:'Grandmaster'},{min:80,max:89,id:'elite',fa:'الیت',en:'Elite'},{min:90,max:99,id:'mythic',fa:'میثیک',en:'Mythic'},{min:100,max:Infinity,id:'legendary',fa:'لجندری',en:'Legendary'}
].map(Object.freeze));
const MEDALS=Object.freeze([
 {id:'first-step',fa:'اولین قدم',en:'First Step',test:c=>(c.totalDone||0)>=1},
 {id:'task-10',fa:'ده قدم محکم',en:'Ten Strong Steps',test:c=>(c.totalDone||0)>=10},
 {id:'task-100',fa:'صد قدم جلوتر',en:'One Hundred Steps',test:c=>(c.totalDone||0)>=100},
 {id:'word-10',fa:'ذهن واژه‌ساز',en:'Word Builder',test:c=>(c.words||0)>=10},
 {id:'book-1',fa:'اولین جهان تمام‌شده',en:'First Finished World',test:c=>(c.books||0)>=1},
 {id:'book-5',fa:'کتاب‌گرد حرفه‌ای',en:'Book Voyager',test:c=>(c.books||0)>=5},
 {id:'level-5',fa:'پنج‌ستاره',en:'Five-Star',test:(c,l)=>l>=5},
 {id:'level-10',fa:'ده‌گانهٔ کیهانی',en:'Cosmic Ten',test:(c,l)=>l>=10},
 {id:'level-30',fa:'مرز سی',en:'Level Thirty',test:(c,l)=>l>=30},
 {id:'level-50',fa:'نیمهٔ افسانه',en:'Halfway to Legend',test:(c,l)=>l>=50},
 {id:'level-80',fa:'الیت ۸۰',en:'Elite 80',test:(c,l)=>l>=80},
 {id:'level-100',fa:'باشگاه ۱۰۰',en:'Century Club',test:(c,l)=>l>=100}
].map(Object.freeze));
function threshold(level){
 const l=Math.max(1,Math.floor(Number(level)||1));
 if(l<=30)return (l-1)*70;
 const n=l-30;
 return 2030 + 70*n + 25*n*n;
}
function level(xp){
 const value=Math.max(0,Number(xp)||0);
 let lo=1,hi=32;while(threshold(hi)<=value&&hi<100000)hi*=2;
 while(lo+1<hi){const mid=Math.floor((lo+hi)/2);if(threshold(mid)<=value)lo=mid;else hi=mid}
 return lo;
}
function titleForLevel(l,locale=document.documentElement.lang){const n=Math.max(1,Math.floor(Number(l)||1)),row=TITLES.find(x=>n>=x.min&&n<=x.max)||TITLES.at(-1);return locale==='en'?row.en:row.fa}
function title(xp,locale){return titleForLevel(level(xp),locale)}
function rankForLevel(l,locale=document.documentElement.lang){const n=Math.max(1,Math.floor(Number(l)||1)),row=RANKS.find(x=>n>=x.min&&n<=x.max)||RANKS.at(-1);return {...row,label:locale==='en'?row.en:row.fa}}
function rank(xp,locale){return rankForLevel(level(xp),locale)}
function progress(xp){const value=Math.max(0,Number(xp)||0),l=level(value),min=threshold(l),max=threshold(l+1);return {level:l,min,max,current:value-min,needed:max-min,percent:Math.max(0,Math.min(100,(value-min)/(max-min)*100))}}
function medals(counts={},xp=0,locale=document.documentElement.lang){const l=level(xp);return MEDALS.map(m=>({id:m.id,label:locale==='en'?m.en:m.fa,earned:!!m.test(counts,l),level:l}))}
const registry=Object.freeze({VERSION:'20261003-infinite-v2',threshold,level,title,titleForLevel,rank,rankForLevel,progress,medals,TITLES,RANKS,MEDALS});
Object.defineProperty(window,'ElaraLevels',{configurable:false,enumerable:true,get(){return registry},set(value){
 if(value===registry)return;
 const row={at:Date.now(),incomingVersion:value?.VERSION||'',incomingLevel820:typeof value?.level==='function'?value.level(820):null,stack:(new Error('ElaraLevels owner collision')).stack||''};
 (window.__elaraLevelOwnerCollisions||(window.__elaraLevelOwnerCollisions=[])).push(row);
 console.warn('Ignored legacy ElaraLevels reassignment',row);
}});
window.dispatchEvent(new Event('elara:levels-ready'));
})();
/* Shared calendar rules. Existing weekday rules remain valid; new frequency fields are additive. */
(function(root){'use strict';
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>iso(new Date());
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00').valueOf())&&iso(new Date(s+'T12:00:00'))===s;
const ordinal=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000};
function normalize(rule,fallback=today()){
 if(!rule||typeof rule!=='object')return null;
 const frequency=['daily','weekly','monthly'].includes(rule.frequency)?rule.frequency:'weekly';
 const weekdays=[...new Set((Array.isArray(rule.weekdays)?rule.weekdays:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))];
 if(frequency==='weekly'&&!weekdays.length)return null;
 const startDate=validDate(rule.startDate)?rule.startDate:validDate(fallback)?fallback:today();
 return {weekdays,frequency,interval:Math.max(1,Math.min(365,Math.floor(Number(rule.interval)||1))),startDate,endDate:validDate(rule.endDate)&&rule.endDate>=startDate?rule.endDate:null,timezone:String(rule.timezone||'UTC').slice(0,80)};
}
function applies(item,date){
 if(!validDate(date))return false;const r=normalize(item.recurrenceRule,item.date);if(!r||date<r.startDate||r.endDate&&date>r.endDate||(item.skippedDates||[]).includes(date))return false;
 const d=new Date(date+'T12:00:00'),start=new Date(r.startDate+'T12:00:00'),delta=ordinal(date)-ordinal(r.startDate);
 if(r.frequency==='daily')return delta%r.interval===0;
 if(r.frequency==='monthly'){const months=(d.getFullYear()-start.getFullYear())*12+d.getMonth()-start.getMonth();return months%r.interval===0&&d.getDate()===start.getDate()}
 const offset=(start.getDay()+1)%7;return Math.floor((delta+offset)/7)%r.interval===0&&r.weekdays.includes(d.getDay());
}
const taskDue=(t,d)=>t.recurrenceRule?applies(t,d):!t.date||t.date===d;
const habitDue=(h,d)=>h.recurrenceRule?applies(h,d):true;
const api={iso,today,validDate,normalize,applies,taskDue,habitDue};root.ElaraSchedule=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

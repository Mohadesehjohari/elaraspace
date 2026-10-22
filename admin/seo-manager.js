// SEO Studio never receives Search Console credentials or private Firestore records.
const el=id=>document.getElementById(id);
const valid=s=>/^[a-z0-9][a-z0-9-]{1,79}$/.test(String(s||''));
const locale=r=>r.locale==='en'?'en':'fa';
const slug=(r,k)=>String(k==='blog'?(r.seoSlug||r.id):(r.slug||r.id)||'');
const path=(r,k)=>(k==='blog'?'blog':'pages')+'/'+locale(r)+'/'+slug(r,k)+'/';
const indexable=r=>r.status==='published'&&r.seoNoindex!==true;
const title=r=>String(r.seoTitle||r.title||'').trim();
const descr=r=>String(r.seoDescription||r.excerpt||'').trim();
const rows=s=>[...(s?.articles||[]).map(r=>({kind:'blog',row:r})),...(s?.pages||[]).map(r=>({kind:'page',row:r}))];
let state={articles:[],pages:[]},actions=null;
function siteUrl(){
  const url=new URL(el('seo-base-url').value.trim());
  if(url.protocol!=='https:'||!url.hostname||url.username||url.password||url.search||url.hash)throw Error('آدرس اصلی سایت باید HTTPS و بدون query/hash یا اطلاعات ورود باشد.');
  url.pathname=url.pathname.replace(/\/+$/,'')+'/';
  return url.href;
}
function linkFor(r,k){try{return new URL(path(r,k),siteUrl()).href}catch{return 'آدرس اصلی سایت را اصلاح کنید'}}
function issues(r,k){
  const problems=[],t=title(r),d=descr(r);
  if(!valid(slug(r,k)))problems.push('Slug لاتین معتبر لازم است');
  if(t.length<20||t.length>70)problems.push('خوانایی و طول عنوان بررسی شود');
  if(d.length<65||d.length>180)problems.push('توضیح صفحه بهتر است اختصاصی و مفصل باشد');
  if(String(r.body||'').trim().length<300)problems.push('کامل‌بودن متن محتوا بررسی شود');
  if(!String(r.seoKeyword||'').trim())problems.push('عبارت هدف برای برنامه محتوا ثبت نشده');
  if(r.seoNoindex===true)problems.push('از خروجی قابل ایندکس حذف شده');
  return problems;
}
function make(tag,cls,value){
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  n.textContent=value||'';
  return n;
}
function btn(label,handler){
  const b=make('button','secondary',label);b.type='button';b.addEventListener('click',handler);return b;
}
function preview(k,r){
  el('seo-preview-url').textContent=linkFor(r,k);
  el('seo-preview-title').textContent=title(r)||'بدون عنوان';
  el('seo-preview-description').textContent=descr(r)||'توضیحی ثبت نشده است';
  el('seo-preview').classList.remove('hidden');
}
export function refreshSeoStudio(data){
  state=data||{articles:[],pages:[]};
  const all=rows(state),published=all.filter(x=>x.row.status==='published');
  el('seo-published-count').textContent=String(published.length);
  el('seo-ready-count').textContent=String(published.filter(x=>indexable(x.row)).length);
  el('seo-issues-count').textContent=String(published.filter(x=>issues(x.row,x.kind).length>0).length);
  el('seo-export').disabled=!(actions&&actions.canExport());
  const list=el('seo-audit-list');list.replaceChildren();
  if(!all.length){list.append(make('p','muted','هنوز مقاله یا صفحه‌ای در Firestore پیدا نشد.'));return}
  for(const {kind,row} of all){
    const wrapper=make('div','seo-audit-row',''),copy=make('div','',''),controls=make('div','actions',''),problems=issues(row,kind);
    copy.append(make('strong','',row.title||row.id||'بدون عنوان'));
    copy.append(make('small','',(kind==='blog'?'مقاله':'صفحه')+' · '+locale(row)+' · '+(row.status==='published'?'منتشرشده':'پیش‌نویس')+' · '+path(row,kind)));
    copy.append(make('span',problems.length?'seo-audit-warnings':'seo-audit-ok',problems.length?problems.join(' • '):'موارد پیشنهادی بررسی تکمیل‌اند'));
    controls.append(btn('پیش‌نمایش گوگل',()=>preview(kind,row)));
    if(actions&&actions.canExport())controls.append(btn('ویرایش',()=>actions.edit(kind,row.id)));
    wrapper.append(copy,controls);list.append(wrapper);
  }
}
function iso(v){try{return v?.toDate?.().toISOString()||null}catch{return null}}
function publicRow(r,k){
  const x={slug:slug(r,k),locale:locale(r),title:String(r.title||''),excerpt:String(r.excerpt||''),body:String(r.body||''),seoTitle:title(r),seoDescription:descr(r),seoKeyword:String(r.seoKeyword||''),updatedAt:iso(r.updatedAt),createdAt:iso(r.createdAt)};
  if(k==='blog'){x.category=String(r.category||'productivity');x.coverUrl=/^https:\/\/\S+$/i.test(r.coverUrl||'')?String(r.coverUrl):''}
  return x;
}
export function buildSeoSnapshot(source,baseUrl){
  const used=new Set(),articles=[],pages=[];
  for(const {kind,row} of rows(source)){
    if(!indexable(row))continue;
    const s=slug(row,kind),key=kind+'/'+locale(row)+'/'+s;
    if(!valid(s))throw Error('Slug نامعتبر برای '+String(row.title||row.id).slice(0,100));
    if(used.has(key))throw Error('آدرس تکراری: '+key);
    used.add(key);(kind==='blog'?articles:pages).push(publicRow(row,kind));
  }
  return {schemaVersion:1,baseUrl,exportedAt:new Date().toISOString(),articles,pages};
}
function exportJson(){
  const status=el('seo-export-status');
  if(!actions.canExport()){status.textContent='فقط مدیر مجاز به انتشار می‌تواند خروجی بگیرد.';return}
  try{
    const snapshot=buildSeoSnapshot(state,siteUrl());
    const blob=new Blob([JSON.stringify(snapshot,null,2)+'\n'],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='public-content.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='خروجی '+snapshot.articles.length+' مقاله و '+snapshot.pages.length+' صفحه عمومی آماده شد. فایل را در seo/public-content.json ریپو قرار بده.';
  }catch(e){status.textContent=e.message||'خروجی ناموفق بود'}
}
export function parseGscCsv(text){
  const src=String(text||'').replace(/^\uFEFF/,'');
  const first=src.split(/\r?\n/,1)[0]||'';
  const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<src.length;i++){
    const c=src[i];
    if(c==='"'){if(quoted&&src[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
    else if(c===delimiter&&!quoted){row.push(cell);cell=''}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&src[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}
    else cell+=c;
  }
  if(quoted)throw Error('CSV دارای کوتیشن ناتمام است.');
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  const headers=(rows.shift()||[]).map(x=>x.trim().toLowerCase().replace(/[\s_-]+/g,''));
  const col=opts=>headers.findIndex(h=>opts.includes(h));
  const c=col(['clicks','کلیک']),i=col(['impressions','نمایش']),p=col(['position','averageposition','میانگینجایگاه']),n=col(['topqueries','query','queries','topkeyword','keyword','toppages','page','pages','searchquery','جستجو']);
  if(c<0||i<0||p<0)throw Error('ستون‌های Clicks، Impressions و Position پیدا نشدند. از گزارش Performance خروجی بگیر.');
  const number=x=>{const v=Number(String(x||'').replace(/[,%\s]/g,''));return Number.isFinite(v)?v:0};
  return rows.slice(0,5000).map(r=>({name:String(r[n>=0?n:0]||'').trim().slice(0,500),clicks:number(r[c]),impressions:number(r[i]),position:number(r[p])})).filter(r=>r.name&&r.clicks>=0&&r.impressions>=0);
}
function showCsv(rows,filename){
  const summary=el('seo-gsc-summary'),result=el('seo-gsc-results');summary.replaceChildren();result.replaceChildren();
  const clicks=rows.reduce((a,x)=>a+x.clicks,0),impressions=rows.reduce((a,x)=>a+x.impressions,0);
  const average=impressions?rows.reduce((a,x)=>a+x.position*x.impressions,0)/impressions:null,format=x=>Number(x).toLocaleString('fa-IR');
  for(const [label,value] of [['کلیک در فایل',format(clicks)],['نمایش در فایل',format(impressions)],['CTR محاسبه‌شده',impressions?(100*clicks/impressions).toFixed(2)+'%':'—'],['میانگین وزنی جایگاه',average===null?'—':average.toFixed(1)]]){
    const card=make('div','seo-gsc-metric','');card.append(make('small','',label),make('strong','',value));summary.append(card);
  }
  const table=document.createElement('table'),head=document.createElement('tr');
  for(const h of ['عبارت / صفحه','کلیک','نمایش','CTR','جایگاه'])head.append(make('th','',h));
  const thead=document.createElement('thead');thead.append(head);table.append(thead);
  const body=document.createElement('tbody');
  for(const r of [...rows].sort((a,b)=>b.clicks-a.clicks).slice(0,50)){
    const tr=document.createElement('tr');
    for(const value of [r.name,format(r.clicks),format(r.impressions),r.impressions?(100*r.clicks/r.impressions).toFixed(2)+'%':'—',r.position.toFixed(1)])tr.append(make('td','',value));
    body.append(tr);
  }
  table.append(body);result.append(table);
  el('seo-gsc-message').textContent=filename+': '+rows.length+' ردیف خوانده شد. این اعداد فقط مربوط به همین فایل‌اند؛ چیزی آپلود نشده.';
}
async function loadCsv(event){
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>2*1024*1024)throw Error('حداکثر حجم فایل ۲ مگابایت است.');
    const rows=parseGscCsv(await file.text());if(!rows.length)throw Error('ردیف قابل استفاده پیدا نشد.');
    showCsv(rows,file.name);
  }catch(e){
    el('seo-gsc-message').textContent=e.message||'خواندن CSV ناموفق بود';
    el('seo-gsc-summary').replaceChildren();el('seo-gsc-results').replaceChildren();
  }finally{event.target.value=''}
}
export function setupSeoStudio(config){
  actions=config;
  const input=el('seo-base-url');
  if(input&&!input.value)input.value=new URL('../',location.href).href;
  el('seo-refresh').addEventListener('click',()=>actions.reload());
  el('seo-export').addEventListener('click',exportJson);
  el('seo-gsc-file').addEventListener('change',loadCsv);
}

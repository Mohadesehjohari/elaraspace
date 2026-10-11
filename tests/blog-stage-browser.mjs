import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
await mkdir('browser-artifacts/blog01',{recursive:true});
const browser=await chromium.launch({headless:true});
const cloud="window.ElaraAccount={user:{uid:'blog-qa'},profile:{name:'Blog QA',username:'blog_qa',profilePublic:true}};window.ElaraPublicContent={listBlogArticles:async()=>[{id:'admin-productivity',title:'مقاله ادمین',excerpt:'از Content Studio منتشر شده',body:'بخش اول\\n\\nبخش دوم',category:'productivity',locale:'fa',status:'published',readMinutes:4}]};document.body.classList.remove('cloud-locked');document.body.classList.add('cloud-ready');document.getElementById('cloud-layer')?.setAttribute('hidden','');window.dispatchEvent(new Event('elara:account-ready'));";
const social="window.ElaraSocial={me:{uid:'blog-qa',name:'Blog QA'},friends:[],requests:[],activities:[],refresh:async()=>{},publishActivity:async()=>true};window.dispatchEvent(new Event('elara:social-updated'));";
async function captureProductionBefore(width,height){
 const url=process.env.ELARA_BEFORE_URL||'https://mohadesehjohari.github.io/elaraspace';
 if(base.replace(/\/$/,'')===url.replace(/\/$/,''))return;
 const page=await browser.newPage({viewport:{width,height}});
 try{
  await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
  await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
  await page.goto(url+'/?blog-fidelity-before='+width+'#blog',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('#panel-blog:not(.hidden) .blog-card',{timeout:30000});
  await page.screenshot({path:'browser-artifacts/blog01/before-'+width+'.png',fullPage:true});
  console.log('BLOG_BEFORE_CAPTURED',width);
 }catch(err){console.warn('BLOG_BEFORE_UNAVAILABLE',width,String(err.message).slice(0,180))}
 finally{await page.close()}
}
async function run(width,height){
 const page=await browser.newPage({viewport:{width,height}});
 const issues=[];
 page.on('pageerror',e=>issues.push(e.message));
 await page.route('**/cloud.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:cloud}));
 await page.route('**/elara-social.js*',r=>r.fulfill({status:200,contentType:'application/javascript',body:social}));
 await page.goto(base+'/?blogtest='+width+'#blog',{waitUntil:'domcontentloaded',timeout:40000});
 await page.waitForFunction(()=>window.ElaraBlog&&document.querySelector('#panel-blog:not(.hidden) .blog-card')&&!document.documentElement.hasAttribute('data-elara-booting'),null,{timeout:30000});
 await page.waitForFunction(()=>document.querySelectorAll('#panel-blog .blog-card').length===6);
 await page.waitForFunction(()=>document.documentElement.dataset.elaraBlogBannerReady!==undefined,null,{timeout:25000});
 assert.equal(await page.locator('#panel-blog .blog-card').count(),6,width+': real editorial plus official content');
 assert.equal(await page.locator('#panel-blog .blog-hero').count(),1,width+': exactly one blog hero');
 assert.equal(await page.locator('#panel-blog [data-blog-id="published:admin-productivity"]').count(),1);
 assert.equal(await page.locator('.sidebar [data-elara-tab="blog"]').count(),1,width+': blog navigation missing');
 assert.equal(await page.locator('#panel-blog [data-blog-filter="reading"]').count(),1);
 assert.equal(await page.locator('#panel-blog [data-blog-filter="technology"]').count(),1);
 const geometry=await page.locator('#panel-blog .blog-card').evaluateAll(els=>els.map(el=>{
 const card=el.getBoundingClientRect(),cover=el.querySelector('.blog-card-cover').getBoundingClientRect();
 return {id:el.dataset.blogId,card:card.width,cover:cover.width,top:cover.top,height:cover.height};
}));
assert.ok(geometry.every(x=>x.cover>=x.card-4&&x.height>60),width+': full-width cover required '+JSON.stringify(geometry));
await page.locator('[data-blog-filter="focus"]').click();
 assert.equal(await page.locator('#panel-blog .blog-card').count(),1,width+': focus category must filter');
 await page.locator('[data-blog-filter="technology"]').click();
 assert.equal(await page.locator('#panel-blog .blog-card').count(),0,width+': empty technology category must not fabricate content');
 assert.match(await page.locator('#panel-blog .blog-empty').first().innerText(),/مقاله‌ای|article/i);
 await page.locator('[data-blog-filter="all"]').click();
 const search=page.locator('[data-blog-search]');
 await search.fill('مطالعه');
 assert.equal(new URL(page.url()).searchParams.get('blogView'),'search',width+': real search route');
 assert.ok(await page.locator('#panel-blog .blog-card').count()>0,width+': search must find actual reading result');
 await search.fill('');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#panel-blog [data-blog-search]',{timeout:30000});
 await page.locator('#panel-blog [data-blog-search]').fill('');
 await page.locator('#panel-blog .blog-card').first().locator('[data-blog-open]').click();
 await page.waitForSelector('#panel-blog .blog-article-detail');
 assert.ok(new URL(page.url()).searchParams.get('blogView')==='article',width+': article deep link');
 assert.equal(await page.locator('#panel-blog .blog-article-detail> .blog-reader-inner > section').count(),3,width+': original article text retained');
 assert.equal(await page.locator('.elara-dialog-root:not(.hidden) .blog-article-detail').count(),0,width+': not a dialog');
 const mark=page.locator('#panel-blog .blog-article-detail [data-blog-bookmark]');
 await mark.click();assert.equal(await mark.getAttribute('aria-pressed'),'true',width+': bookmark saved');
 await mark.click();assert.equal(await mark.getAttribute('aria-pressed'),'false',width+': bookmark removed');
 await page.locator('#panel-blog [data-blog-share]').click();
 assert.ok(page.url().includes('blogView=article'),width+': share preserves canonical URL');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#panel-blog .blog-article-detail',{timeout:30000});
 await page.locator('#panel-blog [data-blog-route="home"]').first().click();
 await page.waitForSelector('#panel-blog [data-blog-search]');
 if(!(await page.locator('#panel-blog .blog-quick').count())){
  await page.locator('#panel-blog [data-blog-route="home"]').first().click();
 }
 await page.waitForSelector('#panel-blog .blog-quick');
 await page.locator('#panel-blog .blog-quick [data-blog-route="write"]').last().click();
 await page.waitForSelector('#blog-editor');
 assert.equal(await page.locator('#blog-editor [disabled]').count(),1,width+': publish disabled honestly');
 await page.locator('#blog-editor [name="title"]').fill('متن آزمایشی');
 await page.locator('#blog-editor [name="excerpt"]').fill('خلاصه کوتاه');
 await page.locator('#blog-editor [name="body"]').fill('محتوای مقاله و بررسی ذخیرهٔ محلی');
 await page.locator('#blog-editor [data-blog-save]').click();
 assert.match(await page.locator('#blog-save-status').innerText(),/دستگاه|device/);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#blog-editor',{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#blog-editor [name="title"]')?.value==='متن آزمایشی',null,{timeout:15000});
 assert.equal(await page.locator('#blog-editor [name="title"]').inputValue(),'متن آزمایشی',width+': saved draft recovered after refresh');
 await page.locator('#panel-blog [data-blog-route="home"]').first().click();
 await page.locator('#panel-blog [data-blog-route="my"]').first().click();
 await page.locator('#panel-blog [data-blog-preview-draft]').first().click();
 await page.waitForSelector('#panel-blog .blog-reader-inner');
 assert.equal(new URL(page.url()).searchParams.get('blogView'),'preview',width+': dedicated saved preview route');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#panel-blog .blog-reader-inner',{timeout:30000});
 await page.locator('#panel-blog [data-blog-back-editor]').click();
 await page.waitForSelector('#blog-editor');
 if(width===390){
  await page.evaluate(()=>{window.ElaraAccount.user.uid='other-blog-qa';window.dispatchEvent(new Event('elara:account-ready'))});
  await page.locator('#panel-blog [data-blog-route="home"]').first().click();
  await page.waitForSelector('#panel-blog .blog-quick');
  assert.match(await page.locator('#panel-blog .blog-feed .blog-empty').first().innerText(),/هنوز|no drafts/i,width+': no cross-account draft leakage');
  await page.evaluate(()=>{window.ElaraAccount.user.uid='blog-qa';window.dispatchEvent(new Event('elara:account-ready'))});
  await page.waitForFunction(()=>document.querySelector('#panel-blog .blog-my-card'));
 }
 await page.locator('#panel-blog [data-blog-route="home"]').first().click();
 await page.waitForSelector('#panel-blog .blog-quick');
 await page.screenshot({path:'browser-artifacts/blog01/dashboard-'+width+'.png',fullPage:true});
 if(width===390||width===1440)await page.screenshot({path:'browser-artifacts/blog01/after-'+width+'.png',fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=2,width+': horizontal overflow '+overflow);
 const extraErrors=issues.filter(x=>/blog|uncaught|syntaxerror/i.test(x));
 assert.deepEqual(extraErrors,[],width+': blog runtime errors');
 await page.close();
}
for(const [w,h] of [[390,844],[1440,900]])await captureProductionBefore(w,h);
for(const [w,h] of [[320,760],[360,790],[375,812],[390,844],[412,915],[430,932],[768,1024],[1024,800],[1440,900],[1648,940]])await run(w,h);
await browser.close();
console.log('BLOG_FIDELITY_02_PASS: 10 widths, cover geometry, bookmark/share, search/deep-links, UID-scoped drafts and saved preview');

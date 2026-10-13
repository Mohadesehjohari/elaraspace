import {chromium} from 'playwright';
import {readFileSync,existsSync} from 'node:fs';
const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const seen=[];
 page.on('console',msg=>{if(msg.text().startsWith('TRACE_FILE_')){seen.push(msg.text());console.log(msg.text())}});
 page.on('pageerror',e=>console.log('TRACE_PAGEERROR '+String(e).slice(0,600)));
 await page.route('**/*.js*',route=>{
   const url=new URL(route.request().url),name=decodeURIComponent(url.pathname.split('/').pop()||'');
   if(!/^[a-zA-Z0-9._-]+\.js$/.test(name)||!existsSync(name))return route.continue();
   const body=readFileSync(name,'utf8');
   return route.fulfill({status:200,contentType:'application/javascript',
     body:"console.log('TRACE_FILE_START "+name+"');\n"+body+"\nconsole.log('TRACE_FILE_END "+name+"');"});
 });
 await page.goto(base+'/?js-execution-trace#home',{waitUntil:'commit',timeout:10000});
 try{await page.waitForLoadState('domcontentloaded',{timeout:8500});console.log('TRACE_DOMCONTENTLOADED_PASS')}
 catch(e){console.log('TRACE_DOMCONTENTLOADED_TIMEOUT')}
 console.log('TRACE_LAST_FILES '+JSON.stringify(seen.slice(-24)));
}finally{await browser.close().catch(()=>{})}

import { chromium } from 'playwright';
import {readFileSync} from 'node:fs';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const original=readFileSync('phase2.js','utf8');
const trace=original.replace(
 '  function bind(){\n    injectUI();resetTaskForm();resetHabitForm();refreshAll();restoreFocus();',
 "  function bind(){\n    console.log('P2_TRACE bind start');\n    injectUI();console.log('P2_TRACE inject complete');\n    resetTaskForm();console.log('P2_TRACE reset tasks complete');\n    resetHabitForm();console.log('P2_TRACE reset habits complete');\n    refreshAll();console.log('P2_TRACE refresh complete');\n    restoreFocus();console.log('P2_TRACE restore complete');"
).replace(
 "    taskSurfaceObserver=new MutationObserver(scheduleTaskSurfaceDecorate);taskSurfaceObserver.observe(document.body,{childList:true,subtree:true});scheduleTaskSurfaceDecorate();",
 "    console.log('P2_TRACE before observer');taskSurfaceObserver=new MutationObserver(scheduleTaskSurfaceDecorate);taskSurfaceObserver.observe(document.body,{childList:true,subtree:true});scheduleTaskSurfaceDecorate();console.log('P2_TRACE after observer');"
).replace(
 "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();",
 "  console.log('P2_TRACE register bind'); if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();"
);
if(trace===original)throw new Error('Failed to instrument Phase 2 bind');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 page.on('console',m=>{if(m.text().includes('P2_TRACE'))console.log(m.text())});
 page.on('pageerror',e=>console.log('P2_ERROR',String(e).slice(0,600)));
 await page.route('**/phase2.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:trace}));
 await page.goto(base+'/?p2-trace#home',{waitUntil:'commit',timeout:12000});
 try{await page.waitForLoadState('domcontentloaded',{timeout:8000});console.log('P2_DCL_PASS')}
 catch(e){console.log('P2_DCL_TIMEOUT')}
 await page.waitForTimeout(1000);
}finally{await browser.close().catch(()=>{})}

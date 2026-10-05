import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';

const url=process.env.ELARA_LIVE_URL||'https://mohadesehjohari.github.io/elaraspace/';
const out='browser-artifacts/live-site';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
let lastError='';
for(let attempt=1;attempt<=4;attempt++){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[],consoleErrors=[],responses=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  page.on('response',r=>{if(r.status()>=400)responses.push({status:r.status(),url:r.url()})});
  let status=0;
  try{
    const response=await page.goto(url+'?live-smoke='+Date.now()+'#home',{waitUntil:'domcontentloaded',timeout:30000});
    status=response?.status()||0;
    await page.waitForTimeout(1200);
    await page.waitForFunction(()=>{
      const workspace=document.querySelector('.workspace');
      if(!workspace)return false;
      const style=getComputedStyle(workspace),rect=workspace.getBoundingClientRect();
      return style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&rect.width>0&&rect.height>0;
    },null,{timeout:12000});
    const state=await page.evaluate(()=>{
      const workspace=document.querySelector('.workspace'),workspaceStyle=workspace?getComputedStyle(workspace):null,workspaceRect=workspace?.getBoundingClientRect();
      return {
        title:document.title,
        ready:document.body.classList.contains('cloud-ready'),
        offline:document.body.classList.contains('cloud-offline'),
        locked:document.body.classList.contains('cloud-locked'),
        workspace:!!workspace,
        workspaceVisible:!!workspace&&workspaceStyle.display!=='none'&&workspaceStyle.visibility!=='hidden'&&workspaceStyle.opacity!=='0'&&workspaceRect.width>0&&workspaceRect.height>0,
        cloudHidden:!!document.getElementById('cloud-layer')?.hidden,
        cloudForm:!!document.getElementById('cloud-form'),
        hash:location.hash,
        booting:document.documentElement.hasAttribute('data-elara-booting'),
        bootSrc:document.querySelector('script[src*="boot.js"]')?.getAttribute('src')||''
      };
    });
    await page.screenshot({path:out+'/live-'+attempt+'.png',fullPage:false});
    const report={attempt,status,state,errors,consoleErrors,responses};
    writeFileSync(out+'/live-report.json',JSON.stringify(report,null,2));
    if(status>=200&&status<400&&state.workspace&&state.workspaceVisible&&!state.booting){
      console.log('LIVE_SITE_PASS '+JSON.stringify(report));await page.close();await browser.close();process.exit(0);
    }
    lastError='site shell not usable: '+JSON.stringify(report);
  }catch(error){
    lastError=error.stack||String(error);
    const state=await page.evaluate(()=>{
      const workspace=document.querySelector('.workspace'),style=workspace?getComputedStyle(workspace):null,rect=workspace?.getBoundingClientRect();
      return {
        title:document.title,
        bodyClass:document.body?.className||'',
        ready:document.body?.classList.contains('cloud-ready')||false,
        offline:document.body?.classList.contains('cloud-offline')||false,
        locked:document.body?.classList.contains('cloud-locked')||false,
        workspace:!!workspace,
        workspaceVisible:!!workspace&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&rect.width>0&&rect.height>0,
        cloudHidden:!!document.getElementById('cloud-layer')?.hidden,
        hash:location.hash,
        booting:document.documentElement.hasAttribute('data-elara-booting'),
        bootSrc:document.querySelector('script[src*="boot.js"]')?.getAttribute('src')||''
      };
    }).catch(()=>null);
    const html=await page.content().catch(()=>'');
    writeFileSync(out+'/live-report.json',JSON.stringify({attempt,status,error:lastError,state,errors,consoleErrors,responses},null,2));
    writeFileSync(out+'/live-dom.html',html);
    console.error('LIVE_SITE_FAIL '+JSON.stringify({attempt,status,state,errors,consoleErrors,responses}));
    await page.screenshot({path:out+'/live-error-'+attempt+'.png',fullPage:false}).catch(()=>{});
  }
  await page.close();
  if(attempt<4)await new Promise(r=>setTimeout(r,10000));
}
await browser.close();
console.error(lastError);process.exit(1);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const base=(process.env.ELARA_TEST_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
fs.mkdirSync('browser-artifacts',{recursive:true});

const browser=await chromium.launch({
  headless:true,
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader']
});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));

try{
  await page.goto(base+'/#home',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.ElaraPrivateDrawer&&window.ElaraProfileSystem,{timeout:30000});

  await page.evaluate(()=>{
    window.ElaraAccount={...(window.ElaraAccount||{}),user:{uid:'avatar-qa',email:'avatar@example.test'},profile:{uid:'avatar-qa',name:'Avatar QA',username:'avatarqa',xp:980}};
    window.ElaraSocial=window.ElaraSocial||{};
    window.ElaraSocial.me={uid:'avatar-qa',name:'Avatar QA',username:'avatarqa',xp:980,profilePublic:true};
    window.ElaraProfileSystem.writePrivate({sex:'female'});
    window.ElaraPrivateDrawer.open('home');
  });

  await page.waitForSelector('[data-elara-avatar-stage]',{state:'visible',timeout:10000});
  await page.waitForSelector('.elara-avatar-canvas',{state:'visible',timeout:30000});
  await page.waitForFunction(()=>window.ElaraAvatar3D?.version==='procedural-desktop-v2',{timeout:30000});

  const stage=page.locator('[data-elara-avatar-stage]');
  const box=await stage.boundingBox();
  assert.ok(box&&box.width>300&&box.height>420,'desktop avatar stage must fill the empty profile area');
  assert.equal(await page.evaluate(()=>window.ElaraAvatar3D.base),'female','female profile must mount female base');

  const before=await page.evaluate(()=>document.querySelector('.elara-avatar-canvas')?.toDataURL().slice(0,64));
  await page.mouse.move(box.x+box.width*.70,box.y+box.height*.50);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.30,box.y+box.height*.50,{steps:12});
  await page.mouse.up();
  await page.waitForTimeout(350);
  const after=await page.evaluate(()=>document.querySelector('.elara-avatar-canvas')?.toDataURL().slice(0,64));
  assert.ok(before&&after,'WebGL canvas must be readable');

  await page.screenshot({path:'browser-artifacts/avatar-3d-female-desktop.png',fullPage:false});

  await page.evaluate(()=>window.ElaraProfileSystem.writePrivate({sex:'male'}));
  await page.waitForFunction(()=>window.ElaraAvatar3D?.base==='male',{timeout:5000});
  assert.equal(await page.evaluate(()=>window.ElaraAvatar3D.dance()),true,'dance hook must remain available');
  await page.waitForTimeout(300);
  await page.screenshot({path:'browser-artifacts/avatar-3d-male-desktop.png',fullPage:false});
  assert.equal(errors.filter(x=>/avatar-3d|three/i.test(x)).length,0,'avatar runtime must not throw');
  console.log('3D avatar browser acceptance passed',JSON.stringify({box,base:await page.evaluate(()=>window.ElaraAvatar3D.base)}));
}finally{
  await browser.close();
}
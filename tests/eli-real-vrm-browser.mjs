/* Real browser smoke with actual local VRM files + recorded dance1 VRMA; screenshots are uploaded by CI. */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.ELARA_TEST_URL||'http://127.0.0.1:4173';
mkdirSync('artifacts/eli-real-vrm',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader'
]});
try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(base+'/#home',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.ElaraLiveVRM&&window.ElaraPrivateDrawer&&window.ElaraProfileSystem,{
    timeout:45000
  });
  await page.evaluate(()=>{
    const user={uid:'eli-real-avatar-browser-qa',name:'Elara QA',xp:1000};
    window.ElaraAccount={...(window.ElaraAccount||{}),user,profile:user};
    window.ElaraSocial={...(window.ElaraSocial||{}),me:user};
    document.body.classList.remove('cloud-locked');
    document.body.classList.add('cloud-ready');
    document.documentElement.removeAttribute('data-elara-booting');
    document.getElementById('cloud-layer')?.setAttribute('hidden','');
    window.ElaraProfileSystem.writePrivate({avatarGender:'female'});
    window.ElaraPrivateDrawer.open('home');
  });
  await page.addStyleTag({content:'#cloud-layer{display:none!important}'});
  await page.waitForFunction(()=>window.ElaraLiveVRM?.current?.kind==='female'&&
    window.ElaraLiveVRM?.current?.stage?.dataset.avatarMounted==='live',{timeout:100000});
  const stage=page.locator('.elara-private-drawer:not(.hidden) [data-elara-avatar-stage]');
  const face=stage.locator('[data-avatar-focus="face"]');
  await face.click();
  await page.waitForTimeout(900);
  assert.equal(await face.getAttribute('aria-pressed'),'true','Female face focus must remain selected');
  await page.screenshot({path:'artifacts/eli-real-vrm/female-face.png'});
  const canvas=stage.locator('.elara-avatar-canvas'),rect=await canvas.boundingBox();
  assert.ok(rect&&rect.width>300&&rect.height>300);
  await page.mouse.move(rect.x+rect.width*.47,rect.y+rect.height*.57);
  await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.57,rect.y+rect.height*.77,{steps:12});
  await page.mouse.up();
  const afterDrag=await page.evaluate(()=>window.ElaraLiveVRM.current?.view);
  assert.ok(afterDrag?.pitch>.1,'Vertical pointer drag must tilt camera');
  assert.ok(Math.abs(afterDrag.panY)>.03,'Face focus vertical drag must pan across body');
  await stage.locator('[data-live-action="reset"]').click();
  const restored=await page.evaluate(()=>window.ElaraLiveVRM.current?.view);
  assert.equal(restored.focus,'full');
  assert.equal(restored.panY,0);
  assert.equal(restored.zoom,1);
  await stage.locator('[data-avatar-toggle-gender]').click();
  await page.waitForFunction(()=>window.ElaraLiveVRM?.current?.kind==='male'&&
    window.ElaraLiveVRM?.current?.stage?.dataset.avatarMounted==='live',{timeout:100000});
  await page.screenshot({path:'artifacts/eli-real-vrm/male-idle.png'});
  const loaded=await page.evaluate(()=>window.ElaraLiveVRM.current.setAction('dance1'));
  assert.equal(loaded,true,'Actual recorded dance VRMA must load (no synthetic fallback)');
  await page.waitForTimeout(1000);
  await page.screenshot({path:'artifacts/eli-real-vrm/male-dance.png'});
  await stage.locator('[data-avatar-focus="face"]').click();
  await page.waitForTimeout(400);
  assert.equal(await stage.locator('[data-avatar-focus="face"]').getAttribute('aria-pressed'),'true',
    'Face focus must persist while the real VRMA is playing');
  await page.screenshot({path:'artifacts/eli-real-vrm/male-dance-face.png'});
  // Old QA returned success while this screenshot contained only the RED BACK
  // of the head. Assert true normalized WORLD head orientation, then also
  // capture every real dance for independent human visual review.
  const assertForward=async(label)=>{
    const diagnostic=await page.evaluate(()=>window.ElaraLiveVRM?.current?.diagnostics);
    console.log('ELI_HEAD_FACING',label,JSON.stringify(diagnostic));
    assert.ok(diagnostic&&Number.isFinite(diagnostic.headFacingError)&&
      diagnostic.headFacingError<=.24,
      label+' head must remain facing forward, not show the red hair back: '+JSON.stringify(diagnostic));
  };
  await assertForward('male-dance1-face');
  for(const action of ['dance2','dance3']){
    await stage.locator('[data-live-action="reset"]').click();
    assert.equal(await page.evaluate(name=>window.ElaraLiveVRM.current.setAction(name),action),true);
    await page.waitForTimeout(900);
    await assertForward('male-'+action);
    await page.screenshot({path:'artifacts/eli-real-vrm/male-'+action+'.png'});
    await stage.locator('[data-avatar-focus="face"]').click();
    await page.waitForTimeout(500);
    await assertForward('male-'+action+'-face');
    await page.screenshot({path:'artifacts/eli-real-vrm/male-'+action+'-face.png'});
  }
  await stage.locator('[data-live-action="reset"]').click();
  await stage.locator('[data-avatar-toggle-gender]').click();
  await page.waitForFunction(()=>window.ElaraLiveVRM?.current?.kind==='female'&&
    window.ElaraLiveVRM?.current?.stage?.dataset.avatarMounted==='live',{timeout:100000});
  for(const action of ['dance1','dance2','dance3']){
    assert.equal(await page.evaluate(name=>window.ElaraLiveVRM.current.setAction(name),action),true);
    await page.waitForTimeout(1000);
    await assertForward('female-'+action);
    await page.screenshot({path:'artifacts/eli-real-vrm/female-'+action+'.png'});
    await stage.locator('[data-avatar-focus="face"]').click();
    await page.waitForTimeout(550);
    await assertForward('female-'+action+'-face');
    await page.screenshot({path:'artifacts/eli-real-vrm/female-'+action+'-face.png'});
    await stage.locator('[data-live-action="reset"]').click();
  }
  await stage.locator('[data-live-action="reset"]').click();
  assert.equal(await page.evaluate(()=>window.ElaraLiveVRM.current.action),'idle');
  console.log('ELI_ALL_SIX_REAL_VRMA_FORWARD_FACES_ORBIT_AND_RESET_PASS');
  if(errors.length)console.warn('Page errors:',errors.slice(0,8));
  await context.close();
}finally{await browser.close();}

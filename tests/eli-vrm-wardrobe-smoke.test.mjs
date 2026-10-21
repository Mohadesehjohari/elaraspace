/* Real VRM-only integration: node --test tests/eli-vrm-wardrobe-smoke.test.mjs */
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const exists=path=>existsSync(new URL('../'+path,import.meta.url));

test('actual female VRM committed; male upload destination and selection are configured',()=>{
  const c=JSON.parse(read('avatar/vrm-looks.json'));
  assert.equal(c.bases.female.src,'assets/avatar/bases/eli-female-v1.vrm');
  assert.equal(c.bases.male.src,'assets/avatar/bases/eli-male-v1.vrm');
  assert.ok(['ready','preview'].includes(c.bases.male.status));
  assert.ok(exists('assets/avatar/bases/eli-female-v1.vrm'));
});
test('legacy synthetic renderer is entirely absent from the deployed website',()=>{
  const html=read('index.html'),boot=read('boot.js'),quick=read('avatar-quick-modal.js'),gallery=read('avatar-motion-controls.js');
  assert.ok(!exists('avatar-3d.js'),'Delete the procedural renderer source');
  assert.ok(!html.includes('avatar-3d.js'),'Never load the synthetic character at boot');
  assert.ok(!quick.includes('ElaraProceduralPreview'),'No procedural quick view');
  assert.ok(!gallery.includes('ElaraProceduralPreview'),'Gallery must control real VRMs only');
  assert.ok(boot.includes('avatar-real-stage.css'),'Retain shared stage layout styles without the synthetic renderer');
});
test('live VRM and viewer scripts are syntax-safe',()=>{
  for(const name of ['avatar-live-vrm.js','avatar-quick-modal.js','avatar-motion-controls.js']){
    assert.doesNotThrow(()=>new Script(read(name),{filename:name}));
  }
});
test('gltf and VRMA import map uses a shared Three.js version',()=>{
  const html=read('index.html');
  const m=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  assert.ok(m);
  const imports=JSON.parse(m[1]).imports;
  assert.ok(imports.three.includes('three@0.180.0'));
  assert.ok(imports['@pixiv/three-vrm'].includes('@pixiv/three-vrm@3'));
  assert.ok(imports['@pixiv/three-vrm-animation']);
  assert.ok(html.includes('avatar-live-vrm.css'));
});
test('missing real model produces a clear error, not a substitute avatar',()=>{
  const live=read('avatar-live-vrm.js'),quick=read('avatar-quick-modal.js');
  assert.ok(live.includes("fetch(CONFIG,{cache:'no-cache'})"));
  assert.ok(live.includes('vrm-download-or-render-failed'));
  assert.ok(quick.includes('window.ElaraLiveVRM?.tryMount?.(stage)'));
  assert.ok(quick.includes('فایل مدل واقعی موجود نیست')||quick.includes('مدل واقعی مرد'));
  assert.ok(!live.includes('نسخهٔ آزمایشی نمایش داده می‌شود'));
});
test('existing profile menu, wardrobe and gender selection remain independent',()=>{
  const header=read('reference-home-shell-2026.js');
  const drawer=read('drawer.js'),visual=read('approved-visual.js');
  const profile=read('approved-profile-system.js');
  assert.ok(header.includes('window.ElaraAvatarQuickModal?.toggle?.(toggle)'));
  assert.ok(header.includes("account.addEventListener('click',()=>window.ElaraPrivateDrawer?.open?.('home'))"));
  assert.ok(drawer.includes('ensureAvatarStage')&&drawer.includes('restoreAvatarStage'));
  assert.ok(drawer.includes('data-elara-avatar-fullscreen'));
  assert.ok(visual.includes('data-elara-avatar-gender="male"')&&visual.includes('data-elara-avatar-gender="female"'));
  assert.ok(visual.includes('writePrivate({avatarGender:kind})'));
  assert.ok(profile.includes("avatarGender:['female','male'].includes(raw.avatarGender)"));
  assert.ok(visual.includes("slot.append(stage)"),'Character wardrobe reuses profile stage');
});
test('mobile drawer preserved; arrow opens compact, nonmodal real-VRM viewer',()=>{
  const drawer=read('drawer.js'),css=read('avatar-experience-20261020.css'),quick=read('avatar-quick-modal.js');
  assert.ok(drawer.includes("homeView='avatar'"));
  assert.ok(drawer.includes('data-elara-drawer-toggle'));
  assert.ok(css.includes('@media(max-width:700px){'));
  assert.ok(quick.includes('aria-modal="false"'));
  assert.ok(quick.includes("mode='popover'"));
  assert.ok(quick.includes("mode==='fullscreen'"));
});
test('user-selected poses require a real mounted VRM and do not fake animation',()=>{
  const live=read('avatar-live-vrm.js'),gallery=read('avatar-motion-controls.js');
  const css=read('avatar-motion-controls.css');
  assert.ok(gallery.includes('window.ElaraLiveVRM?.current?.stage!==stage'));
  assert.ok(gallery.includes('await availableModel(stage)(item.id)'));
  assert.ok(gallery.includes('این رقص دریافت نشد'));
  assert.ok(live.includes('VRMAnimationLoaderPlugin'));
  assert.ok(live.includes('createVRMAnimationClip(anim,vrm)'));
  assert.ok(live.includes('mixer?.update(dt)'));
  assert.ok(css.includes('[data-mode="popover"]'));
});
test('real recorded dance URLs do not fall back to nonexistent placeholder paths',()=>{
  const live=read('avatar-live-vrm.js');
  for(const name of ['dance_1.vrma','dance_2.vrma','dance_dab.vrma'])assert.ok(live.includes(name));
  assert.ok(!live.includes('state-alchemists/zrb-face'));
  assert.ok(live.includes('measureArmRest')&&live.includes('restoreBoneDefaults'));
});

test('dance auto-framing stays within the stage and recovers from previous face zoom',()=>{
 const live=read('avatar-live-vrm.js'),html=read('index.html');
 assert.ok(live.includes('function sampleDanceFrame(time)'),'Record moving VRM joints');
 assert.ok(live.includes("motion.startsWith('dance')"),'Only dance requires an enlarged camera fit');
 assert.ok(live.includes("anchor.worldToLocal(dancePoint)"),'Frame offsets must be in avatar space');
 assert.ok(live.includes('danceFrame.centerY'),'Camera should follow translated dance height');
 assert.ok(live.includes("selectFocus('full')"),'New dance must restore full-body view');
 assert.ok(html.includes('avatar-live-vrm.js?v=20261022-dance-autoframe-softsmile-r1'));
});
test('two separate mild smiles, visible greeting palm and purple white emote icons',()=>{
 const live=read('avatar-live-vrm.js'),gallery=read('avatar-motion-controls.js');
 const css=read('avatar-motion-controls.css'),html=read('index.html');
 assert.ok(live.includes("'softSmile'")&&gallery.includes("id:'softSmile'"),'Soft smile should be its own choice');
 assert.ok(gallery.includes("label:'لبخند ملیح'"),'Cute face must be separately selectable');
 assert.ok(live.includes('rightHand\',.10,-1.04'),'Wave wrist should rotate the palm towards viewer');
 assert.ok(live.includes("normalSmile?.075:cuteSmile?.025"),'Avoid an exaggerated happy mouth');
 assert.ok(gallery.includes('stroke="white"')&&gallery.includes('fill="white"'),'Original emote icons need white silhouette');
 assert.ok(gallery.includes('#7135d4'),'Use the unified purple theme');
 assert.ok(css.includes('linear-gradient(165deg,#6932c7,#8a4af2)'));
 assert.ok(html.includes('avatar-motion-controls.css?v=20261022-purple-emotes-r1'));
});

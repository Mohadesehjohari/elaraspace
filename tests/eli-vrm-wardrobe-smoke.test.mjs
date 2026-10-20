/* Lightweight smoke checks for the opt-in VRM integration.
   Run: node --test tests/eli-vrm-wardrobe-smoke.test.mjs */
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { Script } from 'node:vm';
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
test('catalog contains no falsely published Eli VRM', () => {
  const x=JSON.parse(read('avatar/vrm-looks.json'));
  assert.equal(x.bases.female.status,'preview');
  assert.equal(x.bases.female.src,'assets/avatar/bases/eli-female-v1.vrm');
  assert.equal(x.parts.top.length,0);
});
test('browser modules have valid JavaScript syntax', () => {
  for(const name of ['avatar-live-vrm.js','avatar-3d.js']) {
    assert.doesNotThrow(()=>new Script(read(name), {filename:name}));
  }
});
test('HTML registers the live VRM module before procedural fallback', () => {
  const html=read('index.html');
  const m=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  assert.ok(m,'missing shared Three import map');
  const map=JSON.parse(m[1]).imports;
  assert.ok(map.three.includes('three@0.180.0'));
  assert.ok(map['@pixiv/three-vrm'].includes('@pixiv/three-vrm@3'));
  assert.ok(html.indexOf('avatar-live-vrm.js')<html.indexOf('avatar-3d.js?v='));
  assert.ok(html.includes('avatar-live-vrm.css'));
});
test('missing VRM preserves existing procedural prototype', () => {
  const src=read('avatar-3d.js');
  assert.ok(src.includes('window.ElaraLiveVRM.tryMount(stage)'));
  assert.ok(src.includes('avatar=createAvatar(THREE,avatarBase())'));
});

test('3D stage is lazy and wardrobe reuses a single model/canvas', () => {
  const drawer=read('drawer.js'), visual=read('approved-visual.js'), live=read('avatar-live-vrm.js');
  assert.ok(drawer.includes('ensureAvatarStage')&&drawer.includes('restoreAvatarStage'));
  assert.ok(!drawer.includes('renderProfile();renderHub();updateCalendarLabels()'),'Do not construct the VRM at boot');
  assert.ok(visual.includes("['character','کاراکتر سه‌بعدی'"));
  assert.ok(visual.includes("slot.append(stage)"),'Character tab reuses the profile stage');
  assert.ok(live.includes('renderWardrobeControls'),'Wardrobe options must be mounted in the wardrobe tab');
  assert.ok(!live.includes('data-live-action="wardrobe"'),'Wardrobe entry belongs in the existing drawer menu only');
});
test('VRM neutral eye alignment, bounded shared gaze, relaxed arms and offscreen throttle', () => {
  const live=read('avatar-live-vrm.js');
  assert.ok(live.includes('vrm.lookAt.autoUpdate=false'),'Camera-target auto convergence must stay disabled');
  assert.ok(live.includes("poseBone('leftEye'")&&live.includes("poseBone('rightEye'"),'Eye bones should share the same bounded gaze');
  assert.ok(live.includes("poseBone('neck'")&&live.includes("poseBone('head'"));
  assert.ok(live.includes("poseBone('leftUpperArm'")&&live.includes("poseBone('rightUpperArm'"));
  assert.ok(live.includes("document.querySelector('.approved-wardrobe:not([hidden])')"),'Do not render behind wardrobe');
  assert.ok(live.includes("Math.min(2,Math.max(1.5"),'Desktop still uses sharper rendering');
});

test('mobile accordion preserves the existing desktop menu', () => {
  const drawer=read('drawer.js'),css=read('avatar-experience-20261020.css');
  const html=read('index.html');
  assert.ok(drawer.includes("homeView='avatar'"),'Mobile defaults to full-body character');
  assert.ok(drawer.includes('data-elara-drawer-toggle'),'Single arrow below profile header');
  assert.ok(drawer.includes("if(current==='home'&&(!mobile||homeView==='avatar'))renderHub()"),'Desktop always renders its original profile layout');
  assert.ok(css.includes('.elara-drawer-reveal{display:none!important}'),'Desktop arrow remains hidden');
  assert.ok(css.includes('@media(max-width:700px){'),'Styles apply to phones only');
  assert.ok(html.includes('avatar-experience-20261020.css'),'Final phone overrides present');
});
test('avatar supports focused click zoom, natural idle and on-demand phone VRM', () => {
  const live=read('avatar-live-vrm.js'),loader=read('avatar-3d.js');
  for (const feature of ["data-avatar-focus=\"face\"","data-avatar-focus=\"torso\"","data-avatar-focus=\"legs\"",
    "data-live-focus-return hidden","raycaster.intersectObject(vrm.scene,true)","selectFocus('full')",
    "const breath=Math.sin(t*1.5)","side+finger+'Proximal'"]) {
    assert.ok(live.includes(feature),'Missing '+feature);
  }
  assert.ok(loader.includes('mobileViewer()')&&live.includes('data-elara-view="avatar"'),'Phone VRM loads on request');
});

test('profile header arrow uses full-body drawer instead of static popup', () => {
  const header=read('reference-home-shell-2026.js'),drawer=read('drawer.js');
  assert.ok(header.includes('window.ElaraPrivateDrawer?.showHomeAvatar?.()'));
  assert.ok(!header.includes("popup.hidden=false;"),'Old static equipped-character popup must not open');
  assert.ok(drawer.includes("if(section==='home')homeView='avatar'"));
});

test('avatar catalogue is revalidated and fallback is clearly identified', () => {
 const live=read('avatar-live-vrm.js'),prototype=read('avatar-3d.js');
 assert.ok(live.includes("fetch(CONFIG,{cache:'no-cache'})"),'Manifest must not be frozen in a friend\'s browser cache');
 assert.ok(live.includes("kind==='male'?'male-vrm-not-ready'"),'Unavailable male export is distinct from a broken female model');
 assert.ok(live.includes("vrm-download-or-render-failed"),'Live model download/render errors are labeled');
 assert.ok(prototype.includes('fallbackMessage'),'Prototype cannot masquerade as the new VRM');
 const html=read('index.html');
 assert.ok(html.includes('avatar-live-vrm.js?v=20261020-cache-model-fix-v3'));
});

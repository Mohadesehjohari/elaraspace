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
  assert.ok(live.includes("window.ElaraWardrobeUI?.open?.('character')"));
});
test('VRM has native eye tracking, head follow, relaxed arms and offscreen throttle', () => {
  const live=read('avatar-live-vrm.js');
  assert.ok(live.includes('vrm.lookAt.target=gazeTarget'),'Native VRM lookAt must track pointer');
  assert.ok(live.includes("poseBone('neck'")&&live.includes("poseBone('head'"));
  assert.ok(live.includes("poseBone('leftUpperArm'")&&live.includes("poseBone('rightUpperArm'"));
  assert.ok(live.includes("document.querySelector('.approved-wardrobe:not([hidden])')"),'Do not render behind wardrobe');
  assert.ok(live.includes("renderer.setPixelRatio(Math.min(2,Math.max(1.5"));
});

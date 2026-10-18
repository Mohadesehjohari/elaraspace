/* Every installed accent should now have a four-hue, site-wide environment palette.
   Run: node tests/all-color-palettes.test.mjs */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const palette=read('elara-color-palettes.css');
const base=read('neon-lavender-theme.css');
const site=read('galaxy-lilac-sitewide.css');
const design=read('elara-design.js');
const drawer=read('drawer.js');
const page=read('index.html');

const themes={
  blue:['#101D42','#415EEB','#92AEFF','#4ED4E9'],
  pink:['#28142E','#C044A0','#F891C9','#7E8BFF'],
  red:['#26121D','#D7445A','#FF8998','#F6A869'],
  orange:['#291B15','#D96C32','#FFB16A','#E8C16A'],
  green:['#092B29','#198F79','#67D5B0','#E0BD74'],
  white:['#14263E','#6089C2','#D8EAFF','#9BBCCF']
};
const allIds=['violet',...Object.keys(themes)];
const gate='body[data-elara-theme]:not([data-elara-theme="default"])';
assert.equal((palette.match(/\{/g)||[]).length,(palette.match(/\}/g)||[]).length);
assert.ok(!palette.includes('body[data-elara-theme="default"]'),'Midnight must not receive a palette');
assert.ok(base.includes(gate),'Shared core skin should not be Violet-only');
assert.ok(site.includes(gate),'Module skin should not be Violet-only');
assert.ok(!site.includes('body[data-elara-theme="violet"]'),'Site-wide coverage must be shared by other themes');
assert.ok(!base.includes('body[data-elara-theme="black"]'),'Do not introduce a second Midnight variant');
assert.match(page,/elara-color-palettes\.css\?v=20261018-six-palettes-v1/);
const positions=['neon-lavender-theme.css','elara-color-palettes.css','theme-settings-organization.css','galaxy-lilac-sitewide.css'].map(x=>page.indexOf(x));
assert.ok(positions.every(n=>n>0));
assert.ok(positions.every((n,i)=>!i||n>positions[i-1]),'Shared module CSS must load after all palette definitions');

for(const [id,colors] of Object.entries(themes)){
  const block=palette.match(new RegExp('body\\[data-elara-theme="'+id+'"\\]\\{([\\s\\S]*?)\\n\\}'))?.[1];
  assert.ok(block,'Missing theme block: '+id);
  for(const [i,color] of colors.entries()){
    const role=['--theme-base','--theme-primary','--theme-highlight','--theme-secondary'][i];
    assert.ok(block.includes(role+':'+color),'Missing '+role+' for '+id);
  }
  for(const role of ['--theme-light-bg','--theme-light-surface','--theme-light-raised','--theme-light-border','--theme-light-text','--theme-light-accent'])
    assert.ok(block.includes(role+':'),'Light mode role missing for '+id+': '+role);
  assert.ok(drawer.includes("['"+id+"',"),'Existing picker has lost theme '+id);
}
for(const role of ['--neon-panel','--neon-raised','--neon-cta','--galaxy-navy','--galaxy-purple','--galaxy-lilac','--galaxy-blue'])
  assert.ok(palette.includes(role+':'),'Shared palette compatibility token missing: '+role);
for(const mode of [').light{',').dark.amoled{'])
  assert.ok(palette.includes(mode),'Missing mode styling '+mode);
assert.ok(!palette.includes('.astra-task-row')&&!palette.includes('.ref-task-row'),'Theme palettes must not recolor task rows');
assert.ok(base.includes('body[data-elara-theme="violet"].light'),'Approved Lilac design must remain');
assert.ok(base.includes('body[data-elara-theme="violet"].dark.amoled'),'Approved Lilac AMOLED must remain');

const memory=new Map([['elara_preferences_v2',JSON.stringify({mode:'dark',color:'violet'})]]);
const localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};
const classes=new Set();
const body={
  dataset:{},
  classList:{
    add:n=>classes.add(n),remove:n=>classes.delete(n),
    toggle:(n,on)=>{if(on)classes.add(n);else classes.delete(n)}
  }
};
const document={
  readyState:'loading',body,
  documentElement:{dataset:{},style:{setProperty(){}}},
  getElementById(){return null},querySelector(){return null},querySelectorAll(){return[]},addEventListener(){}
};
const window={
  dispatchEvent(){},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),
  ElaraIcons:{icon:()=>''}
};
const ctx={window,document,localStorage,matchMedia:()=>({matches:false,addEventListener(){}}),
  CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},
  Event:class{constructor(type){this.type=type}},CSS:{escape:String},NodeFilter:{SHOW_TEXT:4},
  crypto:{randomUUID:()=>'test'},setTimeout:()=>0,console};
vm.runInNewContext(design,ctx);
vm.runInNewContext(drawer,ctx);
window.ElaraApplyTheme();
assert.equal(body.dataset.elaraTheme,'default','Existing users must start with unchanged Midnight');
for(const id of allIds){
  window.ElaraDrawerTest.setColor(id);
  assert.equal(body.dataset.elaraTheme,id,'Theme picker does not activate '+id);
  assert.equal(JSON.parse(memory.get('elara_preferences_v2')).themeVariant,id);
  window.ElaraDrawerTest.setMode('light');
  assert.ok(classes.has('light')&&!classes.has('dark'),'Light selection failed on '+id);
  window.ElaraDrawerTest.setMode('dark');
  assert.ok(classes.has('dark')&&!classes.has('light'),'Dark selection failed on '+id);
  window.ElaraDrawerTest.setMode('amoled');
  assert.ok(classes.has('dark')&&classes.has('amoled'),'AMOLED selection failed on '+id);
  window.ElaraDrawerTest.setMode('dark');
  assert.ok(!classes.has('amoled'),'AMOLED must switch off on '+id);
}
window.ElaraDrawerTest.setColor('default');
assert.equal(body.dataset.elaraTheme,'default');
assert.equal(JSON.parse(memory.get('elara_preferences_v2')).color,'black','Night Endless restores the old black accent');
window.ElaraSetAppearance({themeVariant:'black',color:'black'});
assert.equal(body.dataset.elaraTheme,'default','Unknown/legacy black must keep Midnight unchanged');
console.log('PASS: 7 color-theme selections × Dark/Light/AMOLED, 6 four-color palettes, module-wide CSS, Default preserved.');

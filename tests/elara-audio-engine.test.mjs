import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../elara-audio.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const focus=fs.readFileSync(new URL('../focus-ambience.js',import.meta.url),'utf8');
const foxPrize=fs.readFileSync(new URL('../elara-fox-prize.js',import.meta.url),'utf8');
const mission=fs.readFileSync(new URL('../mission-celebration.js',import.meta.url),'utf8');
const r27=fs.readFileSync(new URL('../freedom-r27-music.js',import.meta.url),'utf8');
const dashboard=fs.readFileSync(new URL('../freedom-dashboard-r2026.js',import.meta.url),'utf8');
assert.match(index,/src="elara-audio\.js\?v=/);
assert.match(index,/href="elara-audio\.css\?v=/);
assert.match(focus,/elara:audio-settings-changed/);
assert.match(focus,/volumeFor\?\.\('focus'\)/,'focus room uses dedicated channel');
assert.match(mission,/if\(window\.ElaraAudio\)return/,'legacy mission sound cannot bypass global mute');
assert.match(foxPrize,/window\.ElaraAudio\.cue\(/,'fox award audio must use central mixer');
for(const script of [r27,dashboard])assert.match(script,/data-elara-audio-channel="profile"/);
const manifest=JSON.parse(fs.readFileSync(new URL('../deploy/production-manifest.json',import.meta.url),'utf8'));
for(const file of ['elara-audio.js','elara-audio.css']) {
 assert.ok(manifest.files.includes(file),'production file list missing '+file);
 assert.ok(manifest.required.includes(file),'production required list missing '+file);
}
assert.ok(source.includes('ui:[360,.055,.021]'),'gentle UI click waveform configuration missing');
assert.doesNotMatch(source,/ElevenLabs|voiceId|speechSynthesis|TextToSpeech/);

let starts=0;
const listeners={window:{},document:{}},store=new Map();
const param=()=>({value:0,setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v}});
class Node {
 constructor(){this.gain=param();this.frequency=param();this.type='sine'}
 connect(){return this}
 disconnect(){}
 start(){starts++}
 stop(){}
}
class Context{
 constructor(){this.destination=new Node();this.currentTime=0;this.sampleRate=8000;this.state='running'}
 createGain(){return new Node()}
 createOscillator(){return new Node()}
 createBufferSource(){return new Node()}
 createBiquadFilter(){return new Node()}
 createBuffer(_,n){return {getChannelData(){return new Float32Array(n)}}}
 resume(){this.state='running';return Promise.resolve()}
 suspend(){this.state='suspended';return Promise.resolve()}
 close(){this.state='closed';return Promise.resolve()}
}
const on=(kind)=>(name,cb)=>{(listeners[kind][name]??=[]).push(cb)};
const win={AudioContext:Context,addEventListener:on('window'),dispatchEvent(){}};
const fakeMedia={tagName:'AUDIO',dataset:{elaraAudioChannel:'profile'},volume:1,muted:false};
const doc={readyState:'loading',documentElement:{lang:'fa'},activeElement:null,addEventListener:on('document'),querySelectorAll(sel){return sel==='audio'?[fakeMedia]:[]},querySelector(){return null}};
const prefs={getItem:key=>store.get(key)??null,setItem:(key,val)=>store.set(key,val)};
const sandbox={window:win,document:doc,localStorage:prefs,console,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},performance:{now:(()=>{let t=1000;return()=>t+=400})()},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,MutationObserver:class{observe(){}}};
vm.runInNewContext(source,sandbox,{filename:'elara-audio.js'});
const engine=win.ElaraAudio;
assert.ok(engine,'engine globally available');
assert.equal(engine.read().master,75);
assert.equal(engine.read().enabled,true);
assert.equal(engine.read().volume.focus,55);
assert.equal(engine.read().volume.profile,65);
for(const channel of ['music','ambient','focus','profile','ui','rewards','timer'])assert.ok(Object.hasOwn(engine.read().volume,channel));
assert.match(source,/data-elara-audio-host/);
assert.match(source,/\['#panel-settings','page'\],\['#drawer-settings-area','drawer'\]/);
engine.cue('ui');
assert.ok(starts>0,'UI click sound generated');
assert.equal(engine.read().volume.ui,28,'soft UI click default must be quiet');
const before=starts;
engine.set({enabled:false});engine.cue('complete');
assert.equal(starts,before,'master mute blocks sounds');
engine.set({enabled:true,mute:{ui:true}});engine.cue('ui');
assert.equal(starts,before,'independent UI mute blocks button audio');
engine.set({mute:{ui:false},volume:{ambient:27}});
assert.equal(engine.read().volume.ambient,27);
assert.equal(JSON.parse(store.get('elara_audio_v1')).volume.ambient,27);
engine.cue('complete');
assert.ok(starts>before,'reward cue still plays when UI channel is muted');
await engine.playAmbient('rain');
assert.equal(engine.read().ambiencePlaying,true);
engine.stopAmbient();
assert.equal(engine.read().ambiencePlaying,false);
await engine.playMusic();
assert.equal(engine.read().musicPlaying,true);
engine.stopMusic();
assert.equal(engine.read().musicPlaying,false);
engine.set({master:50,volume:{focus:30,profile:40}});
assert.ok(Math.abs(engine.volumeFor('focus')-.15)<1e-9,'focus sound scales with master');
assert.ok(Math.abs(engine.volumeFor('profile')-.20)<1e-9,'profile audio scales with master');
assert.ok(Math.abs(fakeMedia.volume-.20)<1e-9,'HTML audio receives profile volume');
engine.set({mute:{profile:true}});
assert.equal(fakeMedia.muted,true,'profile mute actually silences native audio');
engine.set({mute:{profile:false}});
assert.equal(fakeMedia.muted,false,'unmute restores native audio');
engine.set({enabled:false});
assert.equal(fakeMedia.muted,true,'master mute silences native audio');
assert.equal(engine.volumeFor('focus'),0,'master mute silences focus room');
engine.set({enabled:true,mute:{focus:true}});
assert.equal(engine.volumeFor('focus'),0,'independent focus mute works');
engine.set({mute:{focus:false}});
assert.ok(engine.volumeFor('focus')>0);
assert.equal(JSON.parse(store.get('elara_audio_v1')).volume.profile,40,'media volume persists');
console.log('Elara audio contract PASS');

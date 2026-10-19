import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('cloud.js','utf8');
const begin=source.indexOf('const RECOVERY_FIELDS=');
const end=source.indexOf('async function recoveryStatus()');
assert.ok(begin>0&&end>begin,'Cloud recovery merge functions must be present');
const runtime=source.slice(begin,end);
const legacy={
  version:1,
  tasks:[
    {id:'shared-id',text:'should NOT replace cloud text'},
    {id:'new-task',text:'Study'},
    {id:'linked-task',text:'Generated',linkedTask:true},
    {id:'foreign-shared',text:'Shared',shared:true}
  ],
  goals:[{id:'new-goal',title:'Read 10 books'}],
  folders:['Study','Study'],
  taskCompletionHistory:[{key:'new-task:2026-10-19',taskId:'new-task',date:'2026-10-19'}]
};
const disk=new Map([['elara_precloud_backup',JSON.stringify(legacy)],['elara_space_v1','{"version":1,"tasks":[]}']]);
const window={ElaraPrivateState:{readDiskSnapshot:k=>disk.get(k)||null}};
const localStorage={getItem:k=>disk.get(k)||null};
const api=vm.runInNewContext(runtime+';({mergedRecovery,readLegacyCopy,countRecoveryDifferences,RECOVERY_FIELDS})',{
  window,localStorage,auth:{currentUser:null},user:null,loaded:false,document:{body:{classList:{contains:()=>false}}},
  structuredClone,empty:()=>({version:1,tasks:[],goals:[]})
});
const remote={version:1,tasks:[{id:'shared-id',text:'REMOTE MUST WIN'}],goals:[],folders:['Existing']};
const merged=api.mergedRecovery(remote,api.readLegacyCopy('elara_precloud_backup'));
assert.equal(remote.tasks.length,1,'merge cannot mutate the live remote snapshot');
assert.equal(merged.data.tasks.find(x=>x.id==='shared-id').text,'REMOTE MUST WIN','remote wins conflicting ids');
assert.equal(merged.data.tasks.filter(x=>x.id==='new-task').length,1);
assert.equal(merged.data.tasks.some(x=>x.id==='linked-task'),false,'linked tasks must not be auto-imported');
assert.equal(merged.data.tasks.some(x=>x.id==='foreign-shared'),false,'shared records must not be auto-imported');
assert.equal(merged.data.goals.length,1,'new goals recovered');
assert.deepEqual(Array.from(merged.data.folders),['Existing','Study'],'same-value folders deduplicated');
assert.equal(merged.data.taskCompletionHistory.length,1);
assert.match(api.countRecoveryDifferences(remote,legacy),/تسک/);
const second=api.mergedRecovery(merged.data,legacy);
assert.equal(second.changed,false,'migration must be safely repeatable');
assert.equal(Object.values(second.added).length,0);
assert.throws(()=>api.readLegacyCopy('other-users-data'),/نامعتبر/);
assert.equal(api.readLegacyCopy('elara_space_v1').tasks.length,0,'read raw disk, not currently active account RAM');
console.log('PASS: cloud owns existing records, consent-only legacy source, linked/shared exclusion, repeatable no-loss merges');

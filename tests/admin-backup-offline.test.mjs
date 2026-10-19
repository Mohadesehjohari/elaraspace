import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeValue,encrypt,decrypt} from '../tools/admin-backup/backup.mjs';

const sample={
  version:1,
  users:[{uid:'example-test-user',email:'local-test@example.invalid'}],
  firestoreDocuments:[{path:'private/example-test-user/app/main',
    data:{tasks:[{text:'test-only'}],timestamp:{$type:'firestore-timestamp',seconds:10,nanoseconds:2}}}]
};
const passphrase='Offline-test-password-123';
const plaintext=Buffer.from(JSON.stringify(sample));
const result=encrypt(plaintext,passphrase);
assert.equal(result.encrypted,true);
assert.equal(result.cipher,'aes-256-gcm');
assert.equal(decrypt(result,passphrase).toString('utf8'),plaintext.toString('utf8'));
assert.throws(()=>decrypt(result,'Wrong-password-123'));
const damaged={...result,ciphertext:Buffer.from('corrupted').toString('base64')};
assert.throws(()=>decrypt(damaged,passphrase));
const value=safeValue({date:new Date('2026-10-19T00:00:00Z'),bytes:Buffer.from([1,2,3]),
  location:{latitude:5,longitude:10},nested:[1,true,'test']});
assert.equal(value.date.$type,'date');
assert.equal(value.bytes.base64,'AQID');
assert.equal(value.nested[1],true);

const source=readFileSync('tools/admin-backup/backup.mjs','utf8');
assert.ok(source.includes('getFirestore(app)'));
assert.ok(source.includes('auth.listUsers(1000,pageToken)'));
assert.ok(source.includes('await ref.listCollections()'));
assert.ok(source.includes('await db.listCollections()'));
assert.ok(source.includes("encrypted:true"));
assert.ok(!/\b(?:setDoc|addDoc|deleteDoc|updateDoc|createUser|deleteUser|updateUser|importUsers)\s*\(/.test(source),
  'Backup script must never mutate a remote Firebase resource');
console.log('PASS: offline Firebase backup serialization, encryption, authentication, recursive discovery and read-only contract');

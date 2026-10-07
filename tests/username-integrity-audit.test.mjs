import assert from 'node:assert/strict';
import {analyzeIdentityRecords,redactAnalysis} from '../tools/username-integrity-core.mjs';

// CASE B: existing profile + missing claim is repairable only when one profile uniquely owns it.
{
  const a=analyzeIdentityRecords([{uid:'UID_A_123456',username:'nova'}],[]);
  assert.deepEqual(a.missingClaims,[{uid:'UID_A_123456',username:'nova'}]);
  assert.deepEqual(a.safeCreateClaims,[{uid:'UID_A_123456',username:'nova'}]);
}

// Duplicate legacy profiles are ambiguous: no automatic winner and no safe create claim.
{
  const a=analyzeIdentityRecords([
    {uid:'UID_A_123456',username:'nova'},
    {uid:'UID_B_123456',username:'nova'}
  ],[]);
  assert.equal(a.duplicateProfiles.length,1);
  assert.equal(a.safeCreateClaims.length,0);
  assert.equal(a.hasConflicts,true);
}

// CASE C: profile B says nova but claim belongs to A => mismatch, never a safe repair.
{
  const a=analyzeIdentityRecords(
    [{uid:'UID_A_123456',username:'alpha'},{uid:'UID_B_123456',username:'nova'}],
    [{username:'alpha',uid:'UID_A_123456'},{username:'nova',uid:'UID_A_123456'}]
  );
  assert.deepEqual(a.mismatchedClaims,[{uid:'UID_B_123456',username:'nova',claimUid:'UID_A_123456'}]);
  assert.equal(a.safeCreateClaims.length,0);
}

// Orphan and stale claims are distinguished; stale claim can be removed only when canonical claim is verified
// and no profile currently uses the stale username.
{
  const a=analyzeIdentityRecords(
    [{uid:'UID_A_123456',username:'nova2'}],
    [
      {username:'nova2',uid:'UID_A_123456'},
      {username:'nova',uid:'UID_A_123456'},
      {username:'ghost',uid:'UID_GHOST_999'}
    ]
  );
  assert.deepEqual(a.safeDeleteClaims,[{username:'nova',uid:'UID_A_123456',profileUsername:'nova2'}]);
  assert.deepEqual(a.claimProfileMissing,[{username:'ghost',uid:'UID_GHOST_999'}]);
  assert.equal(a.multipleClaimsForUid.length,1);
}

{
  const redacted=redactAnalysis(analyzeIdentityRecords(
    [{uid:'1234567890abcdef',username:'nova'},{uid:'abcdef1234567890',username:'nova'}],
    []
  ));
  assert.equal(redacted.duplicateProfiles[0].uids.every(x=>x.includes('…')),true);
  assert.equal(JSON.stringify(redacted).includes('1234567890abcdef'),false);
}

console.log('USERNAME_INTEGRITY_AUDIT_CLASSIFIER_PASS');

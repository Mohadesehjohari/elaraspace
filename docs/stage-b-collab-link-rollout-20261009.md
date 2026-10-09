# Stage B — expiring collaboration join links

This change is **independent of Stage A** and must not be shipped automatically with GitHub Pages before the Firebase Security Rules have been published.

## Security boundaries

- An owner with a verified Firebase email issues a one-time generated, 256-bit cryptographic random URL token. Each token **permits new membership for at most seven days** and may be revoked earlier; possession does not bypass Firebase Auth or explicit join confirmation.
- Firestore Security Rules (not a client-side check) require a verified email claim, unexpired active link, link owner/kind/space consistency, and no block relationship between requester and owner. No other account can forge another UID's membership.
- Owners may list/revoke their own links; a revoked token cannot be reactivated. A new token must be issued.
- The existing collaboration entity and members **do not expire** when a link expires. Revoke invalidates new joins, not accepted memberships.
- Legacy links lacking an expiry and older, non-cryptographic identifiers **cannot grant new memberships** after the new rules go live. Reissue from the owner dialog. Owners can still inspect and revoke their legacy links.

## Safe deployment order (manual Firebase step required)

1. Run the Stage B GitHub Actions emulator matrix, with negative tests for unverified users, strangers, blocks, expired/legacy links, tampering, owner-only listing, and permanent revocation.
2. Confirm the correct Firebase project and deploy the reviewed `firestore.rules` there **first** via authorized Firebase credentials. GitHub Pages deployment does not deploy Firestore Rules.
3. Then release the matching `elara-collab.js`, updated `boot.js`/index cache version and referrer policy. Expect older, cached clients to need a refresh.
4. Test two real **test accounts** (owner and member) to issue, consent to join, see membership, revoke, and verify a third account cannot redeem the revoked link. Never use actual user secrets as test data.
5. Do not merge this PR or claim Stage B deployed until the corresponding Firebase Rules deployment and real-account smoke test are verified.

## Recovery

If the app release fails, revert the JS/assets while leaving restrictive Rules active; **older join-link issuance will remain unavailable** until reissued with the compatible client. Never relax membership rules just to re-enable legacy insecure links. Existing memberships should remain readable and editable under their unchanged member permissions.

## Not included

This does not link two Firebase Auth identities, merge Google/email login providers, transfer ownership, or synchronize private data outside an explicitly joined collaboration space. Those are separate authentication/data-migration projects.

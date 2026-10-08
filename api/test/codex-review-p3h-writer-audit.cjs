'use strict'
module.exports={
 target:'b53a011',baseline:'204bed7',
 priorBlockers:{
  'P3G-B01':{closed:true,evidence:'codex-review-p3h-password-race.integration.cjs',result:'All three revocations now produce a current-identity password session, and privileged endpoint access is 403.'},
  'P3G-B02':{closed:false,evidence:['codex-review-p3h-account-role-concurrency.integration.cjs','codex-review-p3h-unseeded-role.integration.cjs'],result:'Existing-role race is 409. Supported PRESET/no-row fallback still permits a role insert after the last absent-row read and then an unauthorized assignment.'}
 },
 relatedWriters:[
  {source:'api/src/auth/users.controller.ts',result:'Existing proposed role is locked before account row. Stale account version and role bundle are rejected; create on changed existing role leaves no row. Reactivation after override elevation is 409 and leaves inactive.'},
  {source:'api/src/auth/users.controller.ts:539',result:'Temporary-password batch compare-and-write rejects a stale second member and rolls back first password, version, and audit. Proven by real HTTP promotion while batch is paused before second write.'},
  {source:'api/src/auth/roles.controller.ts:389',result:'PUT overrides still uses the pre-transaction scope and effective-permission judgement, then unconditionally replaces overrides and increments version. Three real HTTP races bypass a fresh 403.'},
  {source:'api/src/auth/roles.controller.ts:205',result:'New role insert checks its supplied permission list; it does not share a range/resource lock with the absent-row PRESET assignment case.'},
  {source:'api/src/auth/domain-sync.service.ts:402',result:'Sync plan re-reads the account, but linkExistingUser can subsequently attach the old directory identity after PATCH /users rebinds employeeId.'},
  {source:'api/src/auth/domain-login.service.ts:132',result:'GUID update only predicates id. Reproduced a new directory login and protected /auth/me as the other employee; no real LDAP used.'}
 ],
 identityBuilders:[
  {source:'api/src/auth/auth.service.ts:469',result:'Password session uses a complete fresh account row and version together.'},
  {source:'api/src/auth/auth.service.ts:538',result:'ReissueSession reads a complete fresh account row. Its only HTTP caller follows authenticated TOTP confirmation.'},
  {source:'api/src/auth/auth.service.ts:183',result:'accountPayloads builds internal notification/report identities, not JWT sessions; it does not attach a newly read tokenVersion to a stale user. Final notification/report access checks were reviewed, not fully rerun in this round.'},
  {source:'api/src/auth/auth.service.ts:473',result:'Ordinary login session keeps the version from its account row; further identity changes invalidate its token. Password, mail, and synthetic-domain activation races remain closed.'}
 ],
 lockOrder:{accountFirst:[200,200],roleFirst:[200,200],actualSqlWaitsObserved:true,timeoutClassification:'Nonblocking note: translate a database lock timeout into a retryable conflict instead of a generic 500. The prolonged artificial timeout was reported by the user; not independently prolonged in this round.'},
 unchangedNotes:['Seed script union without version bump: previously recorded nonblocking note; not executed.','Three P3C deferred notes remain nonblocking.'],
 externalSafety:'Mail send and isConfigured replaced on the app instance before init. Directory list/auth/client replaced in our independent domain test. In-process HTTP; no listening sockets, service operations, or company database writes.'
}

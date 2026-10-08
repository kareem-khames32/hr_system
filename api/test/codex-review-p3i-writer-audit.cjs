'use strict'
module.exports={
 target:'25df8dc',baseline:'706fcbe',
 priorBlockers:{
  'P3G-B02 (continued in P3H)':{closed:true,evidence:['unseeded-role','account-role-concurrency','fix-controls'],result:'Supported missing PRESET role now holds its unique-code range; POST role waits, assignment commits first, role insert increments the assigned account version. A role upgraded before the locked read rejects stale assignment and creation with 409.'},
  'P3H-B01':{closed:true,evidence:'permission-races',result:'All three real HTTP bundle/override/scope races now reject stale PUT with 409; no unexpected permission grant.'},
  'P3H-B02':{closed:true,evidence:'domain-rebinding',result:'Conditional GUID link leaves the rebound account untouched. The directory identity receives its own correctly linked account; protected /auth/me does not become the other employee.'}
 },
 remainingBlocker:{id:'P3I-B01',source:'api/src/auth/domain-login.service.ts:159',result:'createDomainOnlyUser still unconditionally inserts from a pre-read employee/account decision. Different directory GUIDs matching one employee simultaneously create two accounts and two protected sessions. A local account created and disabled via real HTTP after the initial directory lookup causes a fresh domain login to return 401, but the paused older login inserts a second active account and obtains protected access (200).',evidence:'codex-review-p3i-domain-creation.integration.cjs'},
 relatedWriters:[
  {source:'api/src/auth/role-stamp.ts:9',result:'UPDLOCK/HOLDLOCK exact-code read protects existing row or missing-key range. Both adjacent missing-code assignment and insert/assignment orderings tested with actual SQL waits.'},
  {source:'api/src/auth/roles.controller.ts:224',result:'Role creation and affected user version increments in one transaction; own role creation blocked for non-superadmin.'},
  {source:'api/src/auth/roles.controller.ts:408',result:'Overrides compare role state under range/row lock, then locked user role/version, before deleting/replacing overrides and incrementing version in the same transaction.'},
  {source:'api/src/auth/users.controller.ts:823',result:'Existing-account edit merges changed fields into fresh locked user after version and proposed-role checks. Existing controls for stale password session, reactivation, proposed-role assignment, and temporary-password batch rollback pass.'},
  {source:'api/src/auth/domain-login.service.ts:139',result:'Existing GUID link uses null-GUID, active-account and old-employee CAS; identity-related checks are appropriate without rejecting unrelated version increments.'},
  {source:'api/src/auth/domain-sync.service.ts:403',result:'Existing-link plan compares current account employee to preview identity and delegates CAS. The create plan still delegates unguarded createDomainOnlyUser (line 425).'},
  {source:'api/src/auth/users.controller.ts:371',result:'Manual account employee uniqueness is checked before transaction; a complete fix to the remaining domain creation race must coordinate competing account creation/rebinding paths, not just add another unlocked lookup.'},
  {source:'api/src/employees/employees.service.ts / api/src/requests/destinations.service.ts',result:'Reviewed existing branch/status updates: tokenVersion changes atomically with the relevant write. No new stale complete-entity writer found in these paths.'}
 ],
 notes:[
  {id:'P3I-N01',classification:'nonblocking',result:'Two first logins for the same GUID produce one account and one protected session, but the losing insert returns generic 500. Handle conflict/reload safely.'},
  {id:'previous role timeout',classification:'nonblocking',result:'Deferred retryable-error mapping remains; tested contention completes after release without a circular wait. No prolonged artificial timeout rerun.'},
  {id:'previous seed and P3C notes',classification:'nonblocking',result:'Unchanged; not executed or broadened in this round.'}
 ],
 safety:'No listeners or service operations. Mail send and isConfigured replaced on the Nest instance before init. Synthetic DirectoryService authentication/list results and throwing LDAP client in domain tests. Generated runtime passwords only. Owned temporary SQL databases only; final verification checks all removed.'
}

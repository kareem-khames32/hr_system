'use strict'
module.exports={
 target:'7b7f8d1',baseline:'ef2664b',
 verdict:{'P3I-B01':'closed',B217:'approve',phase2:'approve'},
 runtimeWriters:[
  {source:'api/src/auth/employee-account-slot.ts:10',result:'Employee update lock then current account lookup, using the caller transaction manager. All reviewed runtime create/attach paths use this slot.'},
  {source:'api/src/auth/domain-login.service.ts:174',result:'Live login and sync use the same creator. Password hashing is before the transaction; employee openness and accounts are re-read inside; the new account takes the locked current branch. Two different GUIDs for one employee result in 201/401 and one account; same GUID results in 201/201 and one account. The previously disabled-account bypass now returns 401.'},
  {source:'api/src/auth/domain-login.service.ts:66',result:'One retry only for DomainAccountChangedError. A second rejection propagates; no recursive retry. Retry begins at GUID lookup, then current employee match/account checks. Existing-link CAS still rejects a changed identity with 409; the next login after unlink succeeds safely.'},
  {source:'api/src/auth/users.controller.ts:621',result:'POST account pins proposed role then employee slot before insert. If directory creation wins or employee branch changes after judgement, manual creation is 409 with no duplicate account.'},
  {source:'api/src/auth/users.controller.ts:836',result:'PATCH changed employee link pins proposed role if needed, new employee slot, then user row/version. If directory creation wins, the old unlinked account remains unlinked. Rebind followed by archive serializes and leaves account disabled at version 2.'},
  {source:'api/src/auth/domain-login.service.ts:149',result:'Existing GUID link does not change employeeId; null-GUID/active/employee CAS still protects the earlier rebind finding.'},
  {source:'api/src/auth/domain-sync.service.ts:423',result:'Sync creation delegates to the same guarded creator; existing-link plan retains current-employee comparison plus CAS.'},
  {source:'api/src/employees/employees.service.ts:952',result:'Archive and reactivate lock employee before updating its accounts. Real SQL waits tested in both archive/creation orders; archive either prevents creation (401/no account) or disables the newly inserted account and invalidates its session.'},
  {source:'api/src/employees/employees.service.ts:936',result:'Employee profile branch/status update uses employee-first mutation order and updates account fields/version atomically. Transfer before creation produces current branch; transfer after creation waits, updates the new account and invalidates its earlier session.'},
  {source:'api/src/requests/destinations.service.ts:631',result:'Request transfer updates branch and version by employee membership; no user employeeId change. Existing attendance-calendar-transfer regression passed.'},
  {source:'api/src/offboarding/offboarding.service.ts:1160',result:'Finalize updates employee before disabling its accounts; no account creation or employee link change in this path.'}
 ],
 concurrency:{evidence:'codex-review-p3j-slot-races.integration.cjs',cases:9,actualDatabaseWaitsObserved:true,deadlockObserved:false,scope:'Tested interleavings only; no claim that every possible SQL schedule is covered.'},
 nonblocking:[
  {id:'P3I-N01',result:'Closed for same GUID: both first logins now return 201, one account and two valid sessions.'},
  {id:'P3J-N01',result:'User-declared simultaneous email uniqueness conflict may still return 500. Unique index preserves account data; retryable conflict mapping is nonblocking. This distinct-email-address race was not independently reproduced.'},
  {id:'manual seed',source:'api/src/seed/seed.ts',result:'Standalone seed still creates demo linked accounts outside the employee slot; remains within the previously deferred seed note. Not invoked. No additional HTTP/runtime create/link writer found outside the slot.'},
  {id:'deferred',result:'Previous role-lock timeout mapping and three P3C notes unchanged and remain nonblocking.'}
 ],
 safety:'Generated runtime login passwords; MailService send/isConfigured replaced on the same Nest instance before init. LDAP client blocked on the app instance before init; synthetic directory authentication/list data only. HTTP transport runs in-process without listeners. Only owned temporary databases were created/changed/dropped. Product and pre-existing tests unchanged.'
}

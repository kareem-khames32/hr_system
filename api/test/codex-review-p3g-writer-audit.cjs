'use strict'
// Static audit plus runtime proofs; product and existing tests remain untouched.
module.exports={
 target:'f0983df',baseline:'0bda600',
 oldBlockers:{
  'P3D-B17-01':{closed:true,evidence:'codex-review-p3g-version-writers.integration.cjs',detail:'Adapted barriers pause after the first unlocked controller read. User edits are refused 409 after role/override increments. Stale role-name edit is refused 409; the downgraded role remains empty.'},
  'P3D-B17-02':{closed:true,evidence:['codex-review-p3g-session-boundary.integration.cjs','codex-review-p3g-factor-paths.integration.cjs'],detail:'Password, mail, and synthetic domain factor races reject sessions opened after activation. Client-supplied factorProven cannot bypass the controller DTO. Pre-activation-row boundary remains as declared.'}
 },
 currentWriters:[
  {source:'api/src/auth/users.controller.ts:791',finding:'The locked fresh account and version check prevent stale full saves from rolling tokenVersion back; changed fields only are applied. The proposed new role is still an unprotected authorization dependency.'},
  {source:'api/src/auth/roles.controller.ts:284',finding:'Fresh role is locked and permissions/isActive compared before applying DTO fields. Bundle change and existing-member increments share a transaction.'},
  {source:'api/src/auth/roles.controller.ts',finding:'Override replacement and user increment remain in the same transaction.'},
  {source:'api/src/auth/auth.service.ts:460',finding:'Password increment is atomic, but the following reread selects only tokenVersion and reissues the old role, permissions and employee identity.'},
  {source:'api/src/employees/employees.service.ts',finding:'Branch/status changes use same-transaction updates with increments, unchanged.'},
  {source:'api/src/requests/destinations.service.ts',finding:'Transfer updates branch and version in one SQL statement, unchanged.'}
 ],
 factorProvenCallers:[
  {source:'AuthService.verifyTwoFactor',basis:'True only for the consumed TOTP-marked challenge, after its code verification.'},
  {source:'AuthService.changePassword',basis:'JWT-guarded authenticated change-password route; accepted existing-session boundary. Current-user payload consistency is a separate blocker.'},
  {source:'AuthService.reissueSession',basis:'Only controller caller follows successful TOTP confirmation under JwtAuthGuard; fresh user read before issuance.'}
 ],
 lockOrder:{evidence:'codex-review-p3g-account-role-concurrency.integration.cjs',realSqlWaitObserved:true,accountThenRole:[200,200],roleThenAccount:[200,200],subscriber:'User/role audit uses event.manager and does not acquire the opposite account/role lock.'},
 retainedNotes:[{source:'api/src/seed/seed.ts:442',classification:'nonblocking note',detail:'Manual seed can union system-role permissions without invalidating accounts; not executed.'},'The three P3C deferred notes remain unchanged.'],
 otherWritersRechecked:'Domain login/sync, employee-login account creation, login-security updates, offboarding disable, password utility and domain-sync script: no newly introduced stale full account or role writer beyond the paths above. Offboarding disable is checked by isActive on each authenticated request.'
}

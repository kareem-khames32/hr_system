'use strict'
// Read-only review conclusions. No seed or operational script was executed.
module.exports = {
 target:'419a41e',
 effectivePermissionSources:['roles.permissions/isActive','user_permission_overrides','users.role/permissions/scopeAllBranches/scopeBranchIds/branchId'],
 normalAtomicWriters:[
  {file:'api/src/auth/roles.controller.ts',line:274,behavior:'Role permissions or activation and account increment normally commit in one transaction; stale name-only role save is an uncovered exception.'},
  {file:'api/src/auth/roles.controller.ts',line:375,behavior:'Override replacement, account increment, and audit share one transaction.'},
  {file:'api/src/auth/users.controller.ts',line:783,behavior:'Security edit writes tokenVersion with the account entity; the full save can overwrite a concurrent increment even on a display-name-only edit.'},
  {file:'api/src/employees/employees.service.ts',line:937,behavior:'Account branch or employee status updates increment in the calling transaction.'},
  {file:'api/src/requests/destinations.service.ts',line:631,behavior:'Transfer updates branch and increments tokenVersion in the same SQL statement.'}
 ],
 provenExceptions:[
  {evidence:'codex-review-p3f-version-writers.integration.cjs',cases:['P3F-V-role','P3F-V-override'],result:'Full stale user save restores version 0 after promotion to version 1; old reset returns 200 and removes TOTP while fresh reset returns 403.'},
  {evidence:'codex-review-p3f-version-writers.integration.cjs',cases:['P3F-V-role-name'],result:'Full stale role save restores settings.manage with account version unchanged at 1; old reset returns 200 and removes TOTP while fresh reset returns 403.'}
 ],
 additionalNonblockingObservations:[
  {file:'api/src/seed/seed.ts',line:442,classification:'note',behavior:'The manually invoked seed unions new preset permissions into existing system roles without incrementing user tokenVersion. It is not part of server startup and was not executed.'},
  {file:'api/src/offboarding/offboarding.service.ts',lines:[290,1160],behavior:'Disables accounts without increment; not a privilege-grant writer, and JwtStrategy checks isActive on every authenticated request.'}
 ],
 reviewedOtherWriters:['api/src/auth/domain-login.service.ts (existing GUID update, new account insert)','api/src/auth/domain-sync.service.ts','api/src/auth/employee-login-account.controller.ts','api/scripts/sync-domain-users.cjs','api/scripts/set-password.cjs (password and version together)','api/src/auth/auth.service.ts (password change, last login)','api/src/auth/login-security.service.ts (failure count, lock status)']
}

# Employee history and identity naming — reviewed copy, 2026-09-11

NAM-14 is implemented and tested with a structured employee history: `changeType`, `fieldName`, `oldValue`, `newValue` and nullable `changedByUserId`. All application writers use `recordEmployeeChange`; the same employee transaction writes the audit. Direct profile changes record contract, organization, work type, salary and bank changes. Bank history keeps only `****` plus the last four account characters, including generated legacy API labels and reasons containing the known account. The live bank account remains in the authorized employee record. New lifecycle events retain normal status columns; other events use the structured columns, with the older prefixed API labels reconstructed for existing clients.

Bare `employees.view` readers receive neither the structured salary/bank values nor financial reasons through history/profile. Own employee, `payroll.view` and `employees.edit` retain authorized financial data; bank audit values remain masked for everyone. The regression covers list, detail, profile, history, branch denial, raw audit persistence, actual user ID, transaction rollback and unchanged employee bank data. Full integrity suite: 31/31; focused legacy title/contract API tests also pass. This does not certify unrelated financial endpoints or payroll.

Migration 004 adds nullable structured fields without guessing historical actors. Migration 005 classifies known legacy prefixes, keeps the original row ID, employee, date, request reference and reason, and masks the bank value in the history. Actor IDs embedded in old reasons remain in those reasons; they are not inferred as the actual executor. Request execution has a `requestId` trail and a NULL actor when the system cannot establish who performed the change. Synthetic SQL tests verify retained dates/reasons/identities, preserved legacy contract labels and repeat execution; real review-copy hashes verify the same invariants. No historical row or schema change was applied to the original database.

NAM-28 uses explicit physical column names while retaining old TypeScript/API properties for compatibility:

| Table | Physical name | Existing compatibility property | Identity |
|---|---|---|---|
| transfers | fromTeamId / toTeamId | fromTeam / toTeam | teams.id |
| custody_assignments | assignedByEmployeeId | assignedBy | employees.id |
| offboarding_cases | openedByUserId / settlementApprovedByUserId | openedBy / settlementApprovedBy | users.id |
| clearance_items | doneByUserId | doneBy | users.id |
| onboarding_tasks | doneByUserId | doneBy | users.id |

The new API aliases are additional fields; old consumers continue to work. Direct custody assignment records the actor's linked employee, or NULL for an unlinked account. Transfers preserve the source employee identity. Migration 004 performs guarded `sp_rename`, never drops and recreates an identity column. Tests check physical column values and API actor aliases. TypeScript compatibility properties are deliberately retained and can be deprecated in a future API version.

NAM-30 accepts legacy `fulltime` and `parttime` inputs through the existing DTO transform and saves `full_time`/`part_time`. Migration 005 converts only these exact aliases. Other supported codes and NULL stay unchanged; unknown codes stop migration without guessing a replacement. The review copy had one alias and no unknown values. The distinction between contract type and work type is preserved; no employment or payroll policy was reinterpreted.

All six pre-payroll versions are recorded in the review database ledger, the final metadata diff is zero, and the compiled API is running on the retained copy with `DB_SYNCHRONIZE=false`. See `README.md`, `migration-result.json`, `data-preservation-result.json` and `source-unchanged-check.json` in this directory for the reproducible workflow and its limits. Deployment to the original database remains a separate, explicitly authorized operation with a fresh tested backup.

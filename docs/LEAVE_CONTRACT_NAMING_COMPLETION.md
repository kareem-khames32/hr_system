# NAM-16, NAM-26, NAM-29 — completion evidence

Date: 2026-09-11. Scope: pre-payroll request, leave and custody contracts. Payroll behavior was not changed.

## Canonical names and preserved compatibility

- `Request.typeCode = LEAVE` identifies the leave request family. `Request.definitionCode` preserves the exact original request definition. Each definition retains its approval chain, branch overrides, audience, destination handler, custom fields, confidential flag and balance policy. `LEAVE_MODIFY_CANCEL` remains a separate action.
- The leave identifier is `payload.leaveTypeCode` and the physical `Leave.leaveTypeCode` column. The public `leaveType` alias remains readable and accepted. Conflicting explicit aliases fail validation. Legacy `LEAVE_*` input codes resolve centrally; business code no longer extracts the leave code independently across pages and handlers.
- `LeaveType.balanceType` and `LeaveBalance.balanceType` use the shared balance type. Legacy `balanceSource` input and output remain compatible. Existing stored values are preserved.
- The request catalog has one `LEAVE` family entry with permitted `leaveProfiles`. Selecting a profile selects its original definition and configuration. The wrapper never merges approval chains or infers a general policy from one profile. Submitted and returned requests retain their original definition.
- Canonical leave resources are `/leaves/types`, `/leaves/mine`, `/leaves/balances`, `/leaves/balances/mine`, employee balance/history/adjustment routes and rollover. Custody actions use `/custody/:assignmentId/{action}`. Previous routes remain aliases on the same controller methods and permission guards. The current frontend uses the canonical routes.

Implementation entry points: `api/src/common/leave-contract.ts`, `api/src/common/domain-status.ts`, request and leave entities/services/controllers, `src/lib/api.ts`, request catalog/form, requests console and employee leave page.

## Migration and data preservation

The immutable migration is `docs/migrations/20260911_006_pre_payroll_leave_request_names.sql`. It renames the two physical columns, adds the nullable definition reference and normalizes historical leave requests while preserving each configured definition. Both canonical and four older create-handler names are supported; the restoration contained the older handler names.

Preflight rejects orphan or conflicting definitions, malformed JSON, conflicting payload aliases, missing leave identifiers on submitted requests and overlength identifiers. It does not invent a leave code for incomplete drafts. The migration and its ledger entry commit atomically; replay is idempotent.

The guarded migration runner applied version 006 only to the restored review database, together with versions 004–005. The review contained 130 historical leave requests and zero conflicts. The metadata comparison was empty after application, and fourteen before/after SHA-256 invariants passed, including request profiles, chains, steps, approval records and request states/resolved steps. See `docs/prepayrollmigration/README.md`, `migration-result.json` and `data-preservation-result.json` for the retained runner evidence. The original database was not migrated.

## Verification

`node --test api/test/leave-contract.integration.cjs` passed **6/6**. It uses a disposable SQL Server database and executes the actual migration against an old-schema fixture. Coverage includes:

- Two legacy leave definitions with different chains, branch rules, audiences, handlers, required fields and balance behavior retain those differences through migration, submission and execution.
- The catalog has one unique family key, permitted child profiles only, and exact-profile confidential masking and legacy filtering.
- Legacy create inputs normalize to canonical storage; returned requests can use either payload alias and cannot switch a fixed profile's leave identity.
- Canonical and old route responses and access restrictions agree; settings aliases persist and conflicting values fail.
- Migration replay preserves data; malformed, orphaned and conflicting historical requests roll back without partial schema or row changes.

The latest related run after the request locking change passed **73/73** across leave-contract (6), recovery (36) and request-execution (31 existing tests). Two subsequently added submission concurrency tests also passed. API TypeScript compilation passed. Root integration records the final full-suite count and runtime restart.

Production migration remains a separate authorized rollout. This completion closes the code and tested review-copy migration defects; it does not claim that production has been upgraded.

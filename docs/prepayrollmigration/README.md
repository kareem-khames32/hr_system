# Pre-payroll review database — 2026-09-11

The retained review database is `hr_review_pre_payroll_20260911162404_52ee65ac`. It was restored from a unique SQL Server `COPY_ONLY, CHECKSUM` backup after `RESTORE VERIFYONLY WITH CHECKSUM`. The original database was inspected and backed up only. No synchronize, seed, reset, or migration was run against it. Credentials remain in the existing local `api/.env`; no password is written to these artifacts and the file was not rewritten.

## Evidence

- Latest update on 2026-09-12: version 007 adds three general HR document tables and four indexes independently of request letters. It committed on the retained review copy after a verified checkpoint backup; all existing table row counts stayed unchanged and the TypeORM diff remains zero. The ledger now contains seven versions. API restarted on 4001 and the existing development frontend on 3000 passed document-template browser checks. Historical six-version evidence below describes the earlier migration round. See `HR_DOCUMENT_TEMPLATES_RESTORED_2026-09-12.md` at the repository root.

- Original schema inventory: 62 existing tables. Restored row counts matched every source table before application startup (`review-database.json`). These artifacts contain schema and aggregate counts, not employee records.
- The initial pre-payroll comparison for versions 001–003 required 11 additive/default-removal DDL operations. Versions 004–006 subsequently cover history, identity and leave naming. No existing value had to be guessed to satisfy a new required field.
- Version 001 adds the independent leave balance adjustment layer and its audit table. Its zero default means no manual adjustment existed before migration; it does not recalculate leave consumption.
- Version 002 removes the implicit Egypt default for new public holidays. Existing countries remain unchanged.
- Version 003 adds the three letter template tables and nullable template/snapshot references on letter requests. Previously issued documents and their contents remain unchanged.
- Versions 001–003 committed in transactions on the review copy; their replay skipped all three with matching SHA-256 ledger hashes.
- Versions 004–006 subsequently committed on the same review copy after a new verified `COPY_ONLY` checkpoint backup of that copy. Version 004 adds structured employee change fields and renames seven identity/actor columns without changing their values. Version 005 masks the historical bank audit, preserves history identity/date/reason/request references, and converts exact `fulltime`/`parttime` work types. Version 006 renames leave identity/balance columns and adds the original request definition reference while preserving each leave profile, chain and historical approval.
- The final ledger has six versions, TypeORM pre-payroll metadata diff is zero, and existing table row counts did not change during migration (`migration-result.json`). No unknown work type, malformed leave JSON, conflicting alias, missing profile or submitted leave without its type was found in the review copy. There were 130 historical leave requests, one old work type and one prefixed bank history to review.
- Fourteen SHA-256 data invariants passed before/after migration: history identity/dates/request references, preserved reasons with the deliberate bank masking, bank values, expected work types, the seven renamed identity values grouped by table, request states/resolved steps and preserved fields, request profiles, approval chains/steps and approval records (`data-preservation-result.json`). Artifacts store hashes, never individual bank/personal values.
- Compiled API build and AppModule bootstrap passed with `DB_SYNCHRONIZE=false` (`bootstrap-result.json`). Normal application initializers subsequently added missing defaults on the review copy only.
- The detached runner was tested on port 4002 with a successful controlled stop, then rebuilt and restarted after all six versions on port 4001. `GET /api/health` returned `status: ok, db: up` at 2026-09-11 16:56 UTC. Database, backup and upload copy remain available; use `status` for current runtime state.
- SQL migration regression tests pass 2/2 for history/identity/work types, including unknown-data rejection and replay. Leave request migration/compatibility tests pass 6/6, including invalid/orphan/conflicting payload rollback and preservation of custom definitions. The full integrity suite passes 31/31; the separate renewal API tests preserve old labels while asserting structured fields and actual actor IDs. Final combined-suite results are recorded by the root integration report.

The four payroll tables (`payroll_runs`, `payroll_items`, `payroll_run_members`, `lateness_tiers`) are retained in the restored copy but excluded from entity migration comparison and from permitted migration statements. Payroll logic and certification are outside this work.

## Run the existing review copy

From the repository root, with the supported Node runtime and installed dependencies:

```powershell
node api/scripts/migrations-run.cjs verify
npm --prefix api run build
node api/scripts/migrations-review-server.cjs bootstrap
node api/scripts/migrations-review-server.cjs start
node api/scripts/migrations-review-server.cjs status
Invoke-RestMethod 'http://127.0.0.1:4001/api/health'
```

The API binds only `127.0.0.1:4001`, allows frontend origins `localhost` and `127.0.0.1` on ports `3000` and `3001` only, uses the restored database and a separate upload directory beneath `%LOCALAPPDATA%/hr-system-reviews/<database>/uploads`. Startup verifies both schema and migration ledger. A fresh review JWT secret is generated in memory on each launch, so login sessions do not survive a restart. This runner does not launch or detect the frontend; its `frontendUrl` metadata is the suggested 3001 address, not a frontend health check. Set `HR_REVIEW_API_PORT` only when intentionally testing another local API port; otherwise leave it unset.

For the currently running development frontend on `http://localhost:3000`, the local ignored `.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:4001/api`. Keep this review API address while checking the restored database. Without it, the application default targets API port 4000. Browser login and dashboard loading were verified on port 3000 after this configuration fix. Restarting an API invalidates existing review sessions; sign in again.

```powershell
node api/scripts/migrations-review-server.cjs stop
node api/scripts/migrations-review-server.cjs status
```

Stop requests graceful application shutdown through a unique local control file. It does not drop a database, overwrite backups, delete uploaded files or terminate an unrelated PID. `start` is asynchronous; check `status` and the health endpoint before opening the review UI. Private runtime logs are under the same local application-data directory. Keep the restored personal data, backup and copied uploads local.

## Reproduce on another fresh copy

Only run `clone` when a new review copy is intended: it creates another database/backup and updates the local review manifest to that copy. It never replaces an existing target.

```powershell
node api/scripts/migrations-audit.cjs
node api/scripts/migrations-clone.cjs
node api/scripts/migrations-run.cjs plan
node api/scripts/migrations-data-check.cjs before
node api/scripts/migrations-run.cjs apply
node api/scripts/migrations-data-check.cjs after
node api/scripts/migrations-run.cjs verify
node api/scripts/migrations-source-check.cjs
```

`plan` writes the complete metadata diff, checks historical data conflicts, and flags required additions on populated tables without a reviewed value strategy. `apply` refuses unknown data decisions and an active review API, verifies the source backup again, captures a fresh backup of the review copy when new versions exist, takes a transaction-owned SQL application lock per version, and atomically writes the reviewed SQL plus a checksum ledger entry. TypeORM-generated DROP+ADD operations for known identity renames are never executed; explicit `sp_rename` statements preserve values. Only the two reviewed data-transition versions permit data modifications. Applied SQL must remain immutable; introduce a new version for subsequent changes. All write targets must match the guarded `hr_review_pre_payroll_<timestamp>_<hex>` name and verified backup/restore manifest. The original database is explicitly rejected even if passed as a command argument.

This is a tested review deployment workflow, not authorization to migrate the original database. Before a future live rollout, a DBA must review the exact versioned SQL against that live schema, capture and restore-test a fresh backup plus uploads, stop application writers, resolve any newly reported data decisions, and provide an explicitly authorized production runner. Recovery uses the verified backup into a separate target and its matching upload copy; these additive migrations do not automatically roll back personal data or subsequent application actions.

`source-unchanged-check.json` compares source schema and row counts with the original backup manifest. It does not claim to detect unrelated applications changing values without changing row counts. The older standalone `2026-09-11_leave_balance_adjustments.sql` (moved to `docs/migrations/_superseded/`) is superseded by version 001 for this workflow and must not be applied again alongside it.

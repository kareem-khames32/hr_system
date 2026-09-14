# Runtime and deployment requirements — 2026-09-11

The shared runtime minimum is **Node.js 22.13.0** (Node 24.11.1 was exercised here). The PDF.js frontend preview requires this floor; Puppeteer requires at least 22.12. The frontend and API should use the same supported Node installation. The dependency versions and overrides are fixed by each package-lock.json; install with npm ci separately in the project root and api directory. Frontend predev/prebuild copies the pinned PDF worker, fonts and support assets from node_modules into public/vendor/pdfjs; include that generated directory when deploying the built frontend. No CDN is used for letter preview.

## Required environment choices

- Set NODE_ENV=production and DB_SYNCHRONIZE=false for a production instance. Startup rejects production automatic synchronization. The example environment enables synchronization only for a new disposable development database.
- Set a fresh random JWT_SECRET of at least 32 characters. The published example value is rejected in production. JWT_EXPIRES_IN accepts positive integer seconds or an integer plus s, m, h or d (for example 8h).
- Set FRONTEND_URL to the real HTTPS frontend origin. The localhost CORS default is for development.
- Set the agreed business timezone through TZ before starting the API. For example, Africa/Cairo and Asia/Riyadh differ during part of the year. The deployment must select the company timezone explicitly and verify midnight and daylight-saving boundaries.
- Set UPLOADS_ROOT to an absolute persistent directory outside temporary build/deployment folders. Back up this directory together with its stored_files database metadata. Do not place it under public static hosting.
- PDF rendering needs the bundled Arabic font at api/assets/fonts/NotoNaskhArabic.ttf and a compatible Chromium installation. Puppeteer normally provisions Chromium during dependency installation. If a managed browser is required, set PUPPETEER_EXECUTABLE_PATH to its verified executable; test Arabic PDF generation on the actual host.
- SQL Server is the database exercised by this release's integration tests. MySQL is configurable but has not been certified in this continuation.

## Upgrade validation before touching customer data

1. Restore the customer's database backup into a separate database and restore the corresponding upload directory into an isolated path.
2. Use the versioned pre-payroll migration workflow in [the review migration runbook](D:/projects/hr_system/docs/prepayrollmigration/README.md). Six versions were applied to a verified restored copy, replay was checked, the remaining pre-payroll metadata diff was zero, and data-preservation checks passed. A different live schema still requires comparison before migration. Never use seed/reset or production synchronize as a substitute.
3. Check historical employee allowances: older forms may have stored phone/work-nature totals inside otherAllowance. The corrected independent-component calculation requires a reviewed data classification; do not subtract values heuristically.
4. Build both applications and run the integration suites against disposable databases. The suites create named random test databases and remove only the databases they create; they need test-server create/drop permissions, which the production application account should not need.
5. Rehearse restoring database plus uploads, then verify login, employee scope, a request approval, attendance calculation, leave cancellation/rollover and a generated PDF. Record the backup date and restore outcome with the release.

The holiday country column no longer has a hardcoded EG default. Version 002 removes that default constraint on the restored review copy while preserving existing holiday values. The holiday API uses system.country when the caller omits country; an explicit empty string continues to mean all countries.

DocTypesDefaultsService is now registered: on API bootstrap it inserts missing base document type codes while preserving existing names and disabled states. A production upgrade therefore requires the doc_types table/schema to exist first; bootstrap is not a substitute for a migration. Existing attachment metadata also needs a reviewed reconciliation for pre-fix preliminary uploads; the new ownership linker applies to authorized new saves only.

Manual balance adjustments are installed by version 001, including the zero-default adjustment layer and its audit/unique operation key. The older standalone `2026-09-11_leave_balance_adjustments.sql` is superseded in this workflow; do not apply both. Version 003 installs letter templates/snapshots; versions 004–006 migrate structured history, actor identifiers, historical work types and leave request names while retaining compatibility contracts.

The original database was backed up and restored into a separate review database; all migrations and application writes in this continuation target that copy. The review API uses a separate upload copy, a generated session secret, loopback binding and DB_SYNCHRONIZE=false. No live production migration or deployment is claimed. The tested application configuration is one API instance; scheduler/checklist behavior with multiple API replicas remains outside this acceptance.

# P2Y evidence

Targets: CRP2X `b4d0b00`; B2.5 owner addition `3ed7b64`. Worktree HEAD `938004f`.

Run from `D:/projects/hr_system/.claude/worktrees/review-p02` in PowerShell:

```powershell
$env:REVIEW_PRELOAD='codex-review-p2y-transport-preload.cjs'
$env:REVIEW_RESULT_SUFFIX='recheck'
node api/test/codex-review-p2y-suite.cjs codex-review-p2y-retry codex-review-p2y-independent codex-review-p2y-personal-proof codex-review-p2y-feature-pool codex-review-p2y-contract-lock-order
```

Expected current product failures: personal-proof (file 200 after relinking instead of 404), feature-pool's second test (ten task edits 500 after actual settings commit/cache invalidation), contract-lock-order (existing renewal deadlock 1205 yields 500). The feature-pool warm-cache control passes. Its only changed runtime resource option is acquisition timeout 2 seconds; the original pool capacity remains 10. Pauses expose actual transaction order, without replacing authorization or SQL operations.

`results-feature-pool-http` is the definitive pool reproduction using the actual settings HTTP endpoint, paused after its transaction commits. `results-feature-pool` is earlier exploratory evidence using direct cache invalidation.

`assessment.cjs` (prefixed `codex-review-p2y-`) consolidates 113 different named cases, preferring the corrected later execution of a case. It also records setup corrections: the private .claude path transport, a synthetic year, and a notification column name. These initial setup failures are retained, but are not product findings.

The runner uses guarded random disposable databases, replaces SMTP and MailService on the application instance, uses in-process HTTP, prevents LDAP/background jobs/native process execution, and redacts output. The download preload allows only this review's own temporary upload tree through Express's dotfile filter; controller and authorization checks are unchanged. No services or live ports are used.

`static-checks.cjs` records both TypeScript checks. `final-verification.cjs` records original tracked-file hashes, absence of every owned database, temporary upload cleanup, and secret scanning. Do not run the prepare script again over a live review; its initial manifest is retained as evidence.

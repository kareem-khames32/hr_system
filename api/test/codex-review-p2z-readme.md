# P2Z evidence

Reviewed `3ed7b64` + `07d51e0` at worktree HEAD `2249f0d`. No tracked files are changed.

From `D:/projects/hr_system/.claude/worktrees/review-p02`:

```powershell
$env:REVIEW_PRELOAD='codex-review-p2z-transport-preload.cjs'
$env:REVIEW_RESULT_SUFFIX='recheck'
node api/test/codex-review-p2z-suite.cjs codex-review-p2z-personal-proof codex-review-p2z-feature-pool codex-review-p2z-contract-lock-order codex-review-p2z-retry codex-review-p2z-independent codex-review-p2z-residual
```

The five P2Y evidence files were copied with their assertions unchanged; only their review prefix and disposable DB labels changed. All nine cases now pass. The feature-pool proof uses an actual settings HTTP write, paused after SQL commit and before cache invalidation, plus the warm-cache control. Pool capacity is the original 10; acquisition timeout is shortened to two seconds only for the test.

New residual tests trace query-runner identity during real task and comment transactions, characterize detached/replacement proof authorization and bytes, and inject a retryable 1205 before renewal writes to verify that scope is re-evaluated after rollback. The actual SQL deadlock remains covered by contract-lock-order and employee-suspension tests.

Results: `results-closure` 35/35, `results-affected` 45/45, `results-residual` 3/3, all prefixed `codex-review-p2z-` and suffixed `.cjs`. Static checks are in `static-checks.cjs`; cleanup and original tracked-file hash verification are in `final-verification.cjs` with the same prefix.

The harness permits only guarded random disposable database names, substitutes MailService on the app instance before initialization, blocks real SMTP/LDAP/background jobs, and uses in-process HTTP with no listener. Download transport permits only the review's own temporary uploads through Express's .claude dotfile filter; real controller authorization stays intact.

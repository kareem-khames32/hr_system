module.exports = {
  "target": "fbd2350dea5d6d354ebea1e713e536137b77e2dd",
  "verdict": "APPROVE B5.3 and Phase 5",
  "authoritative": [
    {
      "file": "codex-review-p5e-results-closure.cjs",
      "counts": {
        "tests": 18,
        "failed": 0,
        "passed": 18,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 18,
        "suites": 0
      },
      "failures": 0
    },
    {
      "file": "codex-review-p5e-results-readpast.cjs",
      "counts": {
        "tests": 2,
        "failed": 0,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": 0
    },
    {
      "file": "codex-review-p5e-results-regression-final.cjs",
      "counts": {
        "tests": 178,
        "failed": 0,
        "passed": 178,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 178,
        "suites": 0
      },
      "failures": 0
    },
    {
      "file": "codex-review-p5e-unit-results.cjs",
      "counts": {
        "tests": 134,
        "failed": 0,
        "passed": 134,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 134,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p5e-static-checks.cjs",
      "apiExit": 0,
      "uiExit": 0
    }
  ],
  "supplementary": {
    "file": "codex-review-p5e-results-runtime-corrected.cjs",
    "counts": {
      "tests": 62,
      "failed": 0,
      "passed": 62,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 62,
      "suites": 0
    },
    "note": "Subset rerun after instrumentation correction; superseded by final 18-file regression, not additional distinct coverage."
  },
  "supersededDiagnostics": [
    {
      "file": "codex-review-p5e-results-runtime-audit.cjs",
      "useForVerdict": false,
      "reason": "Initial guard intercepted TypeORM obtainMasterConnection, which can return a pool object for an already-bound transaction. This was not a physical second connection. Corrected guard uses mssql _acquire and is validated by Q01; all tests rerun in regression-final."
    },
    {
      "file": "codex-review-p5e-results-regression.cjs",
      "useForVerdict": false,
      "reason": "Initial guard intercepted TypeORM obtainMasterConnection, which can return a pool object for an already-bound transaction. This was not a physical second connection. Corrected guard uses mssql _acquire and is validated by Q01; all tests rerun in regression-final."
    }
  ],
  "independentEvidence": {
    "T01": "Ten structural-chain submissions with all ten pool connections held: 201 each; HR control also 201.",
    "T02": "Ten simultaneous final expense approvals and ten travel advances: 201 each, exactly one effect each.",
    "L04_L05": "Ten concurrent leave gate calls with full pool: 201 each.",
    "E11": "Receipt resubmission with full pool: 201 each.",
    "Q02": "Concurrent return/resubmit respects the parent request lock and cannot reuse old-round human approval."
  },
  "auditFiles": [
    "codex-review-p5e-call-audit.cjs",
    "codex-review-p5e-deep-audit.cjs",
    "codex-review-p5e-runtime-audit-preload.cjs"
  ],
  "commands": [
    "$env:REVIEW_PRELOAD=\"codex-review-p5e-lfsql-preload.cjs\"; $env:REVIEW_RESULT_SUFFIX=\"closure\"; node api/test/codex-review-p5e-suite.cjs codex-review-p5e-expense-transitive codex-review-p5e-calendar-pool codex-review-p5e-receipt-pool codex-review-p5e-expenses codex-review-p5e-extended codex-review-p5e-expense-pool",
    "$env:REVIEW_PRELOAD=\"codex-review-p5e-runtime-audit-preload.cjs\"; $env:REVIEW_RESULT_SUFFIX=\"readpast\"; node api/test/codex-review-p5e-suite.cjs codex-review-p5e-readpast",
    "$env:REVIEW_PRELOAD=\"codex-review-p5e-runtime-audit-preload.cjs\"; $env:REVIEW_RESULT_SUFFIX=\"regression-final\"; node api/test/codex-review-p5e-suite.cjs expense-reports request-execution codex-review-p5e-decision-race request-category-chains manager-of-direct-manager administration-level approval-chain-holders approval-chain-branch-copy approval-delegations approval-delegations-migration payroll-approval-chain-disbursement holiday-work leave-contract leave-attachment-with-request leave-entitlement-tiers leave-sick-pay-attachment leave-year-end swap-consents",
    "node api/test/codex-review-p5e-units.cjs",
    "node api/test/codex-review-p5e-static.cjs"
  ],
  "notRun": [
    "Entire project integration suite",
    "Mutation testing",
    "Browser inspection",
    "fulltest-leaves-payroll (previously isolated harness failure; changed leave paths covered by current regression)"
  ],
  "safety": "Disposable databases only; in-process HTTP without listening sockets; MailService.send and isConfigured replaced on the actual app instance before init; product and existing tests unchanged.",
  "finalVerification": "codex-review-p5e-final-verification.cjs"
}

module.exports = {
  "selected": [
    "codex-review-round28-boundaries"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 10,
      "failed": 0,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 34133.3839
  },
  "results": [
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 unresolved carried placement is closed on every branch read and mutation surface",
      "ms": 7046.2259,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 carried visibility follows each recalculated snapshot and agrees with lists, reports, flags and history",
      "ms": 3529.4685,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 attachment first holds the real run lock through its response and recalculation follows",
      "ms": 2586.877,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 recalculation first denies a waiting old-branch attachment without a row or event change",
      "ms": 2513.8131,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 long contention returns busy without mutation and a retry works after release",
      "ms": 11989.1153,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 create rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 774.5556,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 approve rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 918.9676,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 reject rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 947.6857,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 revoke rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 746.1558,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 attachment rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 717.1344,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"unknown-carried-placement\",\"branchMutationChecks\":8,\"branchesClosed\":true,\"companyVisible\":true,\"companyAttachmentAllowed\":true,\"activeReports\":[0,0,1]}",
    "{\"case\":\"recalculated-carried-placement\",\"sequence\":[\"A\",\"B\",\"A\",\"B\"],\"sameEvaluationSnapshot\":true,\"parallelReadsIsolated\":true,\"branchReportExempted\":\"300.00\",\"companyNet\":\"9000.00\",\"reportDifference\":\"0.00\"}",
    "{\"case\":\"attachment-first\",\"runLock\":\"Exclusive\",\"recalculationWaited\":true,\"attachmentStatus\":201,\"recalculationStatus\":201,\"afterTransferStatus\":403,\"newEventsAfterRefusal\":0}",
    "{\"case\":\"recalculation-first\",\"runLock\":\"Exclusive\",\"attachmentWaited\":true,\"recalculationStatus\":201,\"attachmentStatus\":403,\"referenceUnchanged\":true,\"eventCountUnchanged\":true}",
    "{\"case\":\"busy-and-retry\",\"busyStatus\":409,\"failedRecalculationKeptOldMembership\":true,\"attachmentStatus\":201,\"retryStatus\":201}",
    "{\"case\":\"response-atomicity\",\"action\":\"create\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"ACTIVE\"}",
    "{\"case\":\"response-atomicity\",\"action\":\"approve\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"ACTIVE\"}",
    "{\"case\":\"response-atomicity\",\"action\":\"reject\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"REJECTED\"}",
    "{\"case\":\"response-atomicity\",\"action\":\"revoke\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"REVOKED\"}",
    "{\"case\":\"response-atomicity\",\"action\":\"attachment\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"ACTIVE\"}",
    "tests 10",
    "suites 0",
    "pass 10",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 34133.3839"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r28_boundaries_test_158446e2ac15e74e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r28_boundaries_test_158446e2ac15e74e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r28_boundaries_test_158446e2ac15e74e\"}\n"
  ]
}

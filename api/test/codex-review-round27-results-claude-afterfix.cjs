module.exports = {
  "selected": [
    "codex-review-round27-boundaries"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 1,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 23517.087
  },
  "results": [
    {
      "file": "codex-review-round27-boundaries.integration.cjs",
      "name": "CR27 unresolved carried placement is closed on every branch read and mutation surface",
      "ms": 6085.6824,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round27-boundaries.integration.cjs",
      "name": "CR27 carried visibility follows each recalculated snapshot and agrees with lists, reports, flags and history",
      "ms": 3325.9958,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round27-boundaries.integration.cjs",
      "name": "CR27 attachment authorization must remain valid until commit when membership recalculation changes scope",
      "ms": 11775.3398,
      "pass": false,
      "error": "{\"message\":\"المسير قيد التحديث؛ حاول مجددًا بعد انتهاء العملية\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "cause": "{\"message\":\"المسير قيد التحديث؛ حاول مجددًا بعد انتهاء العملية\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"المسير قيد التحديث؛ حاول مجددًا بعد انتهاء العملية\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round27-boundaries.integration.cjs:108:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round27-boundaries.integration.cjs",
      "name": "CR27 attachment authorization must remain valid until commit when membership recalculation changes scope",
      "ms": 11775.3398,
      "pass": false,
      "error": "{\"message\":\"المسير قيد التحديث؛ حاول مجددًا بعد انتهاء العملية\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "cause": "{\"message\":\"المسير قيد التحديث؛ حاول مجددًا بعد انتهاء العملية\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"المسير قيد التحديث؛ حاول مجددًا بعد انتهاء العملية\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round27-boundaries.integration.cjs:108:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"unknown-carried-placement\",\"branchMutationChecks\":8,\"branchesClosed\":true,\"companyVisible\":true,\"companyAttachmentAllowed\":true,\"activeReports\":[0,0,1]}",
    "{\"case\":\"recalculated-carried-placement\",\"sequence\":[\"A\",\"B\",\"A\",\"B\"],\"sameEvaluationSnapshot\":true,\"parallelReadsIsolated\":true,\"branchReportExempted\":\"300.00\",\"companyNet\":\"9000.00\",\"reportDifference\":\"0.00\"}",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23517.087"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r27_boundaries_test_92aaa0e059e06070\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r27_boundaries_test_92aaa0e059e06070\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r27_boundaries_test_92aaa0e059e06070\"}\n"
  ]
}

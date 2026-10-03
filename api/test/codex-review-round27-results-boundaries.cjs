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
    "duration_ms": 14358.6204
  },
  "results": [
    {
      "file": "codex-review-round27-boundaries.integration.cjs",
      "name": "CR27 unresolved carried placement is closed on every branch read and mutation surface",
      "ms": 6638.7894,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round27-boundaries.integration.cjs",
      "name": "CR27 carried visibility follows each recalculated snapshot and agrees with lists, reports, flags and history",
      "ms": 3393.3246,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round27-boundaries.integration.cjs",
      "name": "CR27 attachment authorization must remain valid until commit when membership recalculation changes scope",
      "ms": 1992.8183,
      "pass": false,
      "error": "A membership change that commits first must invalidate an old branch attachment write\n+ actual - expected\n\n+ 'racing-old-branch-reference'\n- 'initial-reference'\n",
      "cause": "A membership change that commits first must invalidate an old branch attachment write\n+ actual - expected\n\n+ 'racing-old-branch-reference'\n- 'initial-reference'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A membership change that commits first must invalidate an old branch attachment write\n+ actual - expected\n\n+ 'racing-old-branch-reference'\n- 'initial-reference'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round27-boundaries.integration.cjs:114:39)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round27-boundaries.integration.cjs",
      "name": "CR27 attachment authorization must remain valid until commit when membership recalculation changes scope",
      "ms": 1992.8183,
      "pass": false,
      "error": "A membership change that commits first must invalidate an old branch attachment write\n+ actual - expected\n\n+ 'racing-old-branch-reference'\n- 'initial-reference'\n",
      "cause": "A membership change that commits first must invalidate an old branch attachment write\n+ actual - expected\n\n+ 'racing-old-branch-reference'\n- 'initial-reference'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A membership change that commits first must invalidate an old branch attachment write\n+ actual - expected\n\n+ 'racing-old-branch-reference'\n- 'initial-reference'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round27-boundaries.integration.cjs:114:39)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"unknown-carried-placement\",\"branchMutationChecks\":8,\"branchesClosed\":true,\"companyVisible\":true,\"companyAttachmentAllowed\":true,\"activeReports\":[0,0,1]}",
    "{\"case\":\"recalculated-carried-placement\",\"sequence\":[\"A\",\"B\",\"A\",\"B\"],\"sameEvaluationSnapshot\":true,\"parallelReadsIsolated\":true,\"branchReportExempted\":\"300.00\",\"companyNet\":\"9000.00\",\"reportDifference\":\"0.00\"}",
    "{\"case\":\"attachment-scope-race\",\"recalculatedBeforeRelease\":true,\"attachmentResponse\":403,\"memberBranch\":2,\"storedAttachment\":\"racing-old-branch-reference\",\"attachmentEvents\":1}",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14358.6204"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r27_boundaries_test_500799cb06c8e2d4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r27_boundaries_test_500799cb06c8e2d4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r27_boundaries_test_500799cb06c8e2d4\"}\n"
  ]
}

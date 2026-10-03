module.exports = {
  "selected": [
    "codex-review-round32-postwrite"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 1,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 11548.3453
  },
  "results": [
    {
      "file": "codex-review-round32-postwrite.integration.cjs",
      "name": "CR32 allowance success reply does not expose a new foreign run created after its transaction committed",
      "ms": 7930.8165,
      "pass": false,
      "error": "The post-commit response must not disclose a run wholly outside the writer branch",
      "cause": "The post-commit response must not disclose a run wholly outside the writer branch",
      "stack": "AssertionError [ERR_ASSERTION]: The post-commit response must not disclose a run wholly outside the writer branch\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round32-postwrite.integration.cjs:34:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round32-postwrite.integration.cjs",
      "name": "CR32 allowance reply retains an in-scope run reference and exact amount",
      "ms": 558.123,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round32-postwrite.integration.cjs",
      "name": "CR32 allowance success reply does not expose a new foreign run created after its transaction committed",
      "ms": 7930.8165,
      "pass": false,
      "error": "The post-commit response must not disclose a run wholly outside the writer branch",
      "cause": "The post-commit response must not disclose a run wholly outside the writer branch",
      "stack": "AssertionError [ERR_ASSERTION]: The post-commit response must not disclose a run wholly outside the writer branch\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round32-postwrite.integration.cjs:34:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"allowance-postcommit-foreign-run\",\"responseStatus\":201,\"response\":{\"id\":1,\"created\":1,\"skippedDuplicates\":0,\"amount\":150.25,\"total\":150.25,\"recalculateRuns\":[{\"id\":1,\"name\":\"CR32 NEW PRIVATE B PAYROLL\",\"status\":\"CALCULATED\"}],\"lockedRuns\":[]},\"foreignRead\":403,\"foreignRunId\":1,\"foreignName\":\"CR32 NEW PRIVATE B PAYROLL\",\"memberBranchIds\":[null],\"leaked\":true}",
    "{\"case\":\"allowance-postcommit-control\",\"created\":1,\"total\":150.25,\"inScopeRunReturned\":true}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11548.3453"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r32_postwrite_test_83bc0c3067aaac5e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r32_postwrite_test_83bc0c3067aaac5e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r32_postwrite_test_83bc0c3067aaac5e\"}\n"
  ]
}

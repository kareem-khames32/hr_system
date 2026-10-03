module.exports = {
  "selected": [
    "codex-review-round28-related-race"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 2,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 6661.9719
  },
  "results": [
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 bonus cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 4124.0745,
      "pass": false,
      "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "cause": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 deduction cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 273.6417,
      "pass": false,
      "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "cause": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 bonus cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 4124.0745,
      "pass": false,
      "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "cause": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 deduction cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 273.6417,
      "pass": false,
      "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "cause": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"related-cancellation-race\",\"kind\":\"bonus\",\"transferStatus\":200,\"cancelStatus\":404,\"cancelCode\":\"BONUS_NOT_FOUND\",\"readAfterTransfer\":404,\"requestStatus\":\"CANCELLED\",\"ledgerStatus\":\"CANCELLED\",\"amount\":300}",
    "{\"case\":\"related-cancellation-race\",\"kind\":\"deduction\",\"transferStatus\":200,\"cancelStatus\":404,\"cancelCode\":\"DEDUCTION_NOT_FOUND\",\"readAfterTransfer\":404,\"requestStatus\":\"CANCELLED\",\"ledgerStatus\":\"CANCELLED\",\"amount\":300}",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6661.9719"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r28_related_test_0b92dbffa31893ba\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r28_related_test_0b92dbffa31893ba\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r28_related_test_0b92dbffa31893ba\"}\n"
  ]
}

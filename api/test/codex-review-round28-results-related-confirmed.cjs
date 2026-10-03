module.exports = {
  "selected": [
    "codex-review-round28-related-race"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 2,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 7778.0919
  },
  "results": [
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 bonus cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 4392.156,
      "pass": false,
      "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "cause": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:38:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 deduction cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 292.1582,
      "pass": false,
      "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "cause": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:38:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 bonus ordinary cancellation works and an already-transferred employee is denied without writes",
      "ms": 362.3028,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 deduction ordinary cancellation works and an already-transferred employee is denied without writes",
      "ms": 365.3862,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 bonus cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 4392.156,
      "pass": false,
      "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "cause": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:38:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 deduction cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 292.1582,
      "pass": false,
      "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "cause": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round28-related-race.integration.cjs:38:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"related-cancellation-race\",\"kind\":\"bonus\",\"transferCommittedBeforeRelease\":true,\"transferStatus\":200,\"cancelStatus\":404,\"cancelCode\":\"BONUS_NOT_FOUND\",\"readAfterTransfer\":404,\"requestStatus\":\"CANCELLED\",\"ledgerStatus\":\"CANCELLED\",\"amount\":300}",
    "{\"case\":\"related-cancellation-race\",\"kind\":\"deduction\",\"transferCommittedBeforeRelease\":true,\"transferStatus\":200,\"cancelStatus\":404,\"cancelCode\":\"DEDUCTION_NOT_FOUND\",\"readAfterTransfer\":404,\"requestStatus\":\"CANCELLED\",\"ledgerStatus\":\"CANCELLED\",\"amount\":300}",
    "{\"case\":\"related-cancellation-controls\",\"kind\":\"bonus\",\"ordinaryStatus\":201,\"afterTransferStatus\":404,\"refusalKeptRequestAndLedger\":true}",
    "{\"case\":\"related-cancellation-controls\",\"kind\":\"deduction\",\"ordinaryStatus\":201,\"afterTransferStatus\":404,\"refusalKeptRequestAndLedger\":true}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7778.0919"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r28_related_test_1f29e529697ae2c7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r28_related_test_1f29e529697ae2c7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r28_related_test_1f29e529697ae2c7\"}\n"
  ]
}

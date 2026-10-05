module.exports = {
  "selected": [
    "codex-review-p2b-screen-history"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 8668.7092
  },
  "results": [
    {
      "file": "codex-review-p2b-screen-history.integration.cjs",
      "name": "P2B B recalculation keeps all event amount columns and exact old/new hashes; default read remains full",
      "ms": 6028.6959,
      "pass": false,
      "error": "Event amount columns must match the persisted item (also checked on pre-performance baseline)\n+ actual - expected\n\n+ [\n+   {\n+     event: 123,\n+     key: 'otherAdditions',\n+     phase: 'after',\n+     stored: 123.45\n+   }\n+ ]\n- []\n",
      "cause": "Event amount columns must match the persisted item (also checked on pre-performance baseline)\n+ actual - expected\n\n+ [\n+   {\n+     event: 123,\n+     key: 'otherAdditions',\n+     phase: 'after',\n+     stored: 123.45\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Event amount columns must match the persisted item (also checked on pre-performance baseline)\n+ actual - expected\n\n+ [\n+   {\n+     event: 123,\n+     key: 'otherAdditions',\n+     phase: 'after',\n+     stored: 123.45\n+   }\n+ ]\n- []\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-screen-history.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2b-screen-history.integration.cjs",
      "name": "P2B B recalculation keeps all event amount columns and exact old/new hashes; default read remains full",
      "ms": 6028.6959,
      "pass": false,
      "error": "Event amount columns must match the persisted item (also checked on pre-performance baseline)\n+ actual - expected\n\n+ [\n+   {\n+     event: 123,\n+     key: 'otherAdditions',\n+     phase: 'after',\n+     stored: 123.45\n+   }\n+ ]\n- []\n",
      "cause": "Event amount columns must match the persisted item (also checked on pre-performance baseline)\n+ actual - expected\n\n+ [\n+   {\n+     event: 123,\n+     key: 'otherAdditions',\n+     phase: 'after',\n+     stored: 123.45\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Event amount columns must match the persisted item (also checked on pre-performance baseline)\n+ actual - expected\n\n+ [\n+   {\n+     event: 123,\n+     key: 'otherAdditions',\n+     phase: 'after',\n+     stored: 123.45\n+   }\n+ ]\n- []\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2b-screen-history.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"event-numeric-comparison\",\"ref\":\"658e15f\",\"beforeEvent\":0,\"afterEvent\":123,\"beforeStored\":0,\"afterStored\":123.45,\"eventNet\":6123.45,\"storedNet\":6123.45}",
    "{\"case\":\"calculation-event-history\",\"ref\":\"658e15f\",\"oldNet\":6000,\"newNet\":6123.45,\"oldDetailSavedInEvent\":true,\"bothHashesMatch\":false,\"defaultAndPayslipFull\":true,\"numericDifferences\":[{\"phase\":\"after\",\"key\":\"otherAdditions\",\"event\":123,\"stored\":123.45}]}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8668.7092"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"658e15f\",\"sourceFiles\":432}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2b_screen_history_test_2750de41177210cd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2b_screen_history_test_2750de41177210cd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2b_screen_history_test_2750de41177210cd\"}\n"
  ]
}

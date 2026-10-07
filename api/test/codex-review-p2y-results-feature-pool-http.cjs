module.exports = {
  "selected": [
    "codex-review-p2y-feature-pool"
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
    "duration_ms": 9722.945
  },
  "results": [
    {
      "file": "codex-review-p2y-feature-pool.integration.cjs",
      "name": "P2Y ten task edits work with the already loaded feature state",
      "ms": 4988.4477,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2y-feature-pool.integration.cjs",
      "name": "P2Y ten task edits also work across an actual feature-setting write",
      "ms": 2332.4176,
      "pass": false,
      "error": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "cause": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "stack": "AssertionError [ERR_ASSERTION]: Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500\n    at scenario (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-feature-pool.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2y-feature-pool.integration.cjs",
      "name": "P2Y ten task edits also work across an actual feature-setting write",
      "ms": 2332.4176,
      "pass": false,
      "error": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "cause": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "stack": "AssertionError [ERR_ASSERTION]: Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500\n    at scenario (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-feature-pool.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"task-feature-pool-warm-control\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0,\"featureReads\":10},\"statuses\":[200,200,200,200,200,200,200,200,200,200],\"testAcquireTimeoutMs\":2000}",
    "{\"case\":\"task-feature-pool-real-settings-write\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0,\"featureReads\":10},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"settingStatus\":500,\"testAcquireTimeoutMs\":2000}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9722.945"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2y_feature_pool_test_b118a5b2236682f1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2y_feature_pool_test_b118a5b2236682f1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2y_feature_pool_test_b118a5b2236682f1\"}\n"
  ]
}

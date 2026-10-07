module.exports = {
  "selected": [
    "codex-review-p2y-feature-pool"
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
    "duration_ms": 9690.7175
  },
  "results": [
    {
      "file": "codex-review-p2y-feature-pool.integration.cjs",
      "name": "P2Y ten task edits do not hold the entire pool while feature refresh requires another connection",
      "ms": 7168.1457,
      "pass": false,
      "error": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "cause": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "stack": "AssertionError [ERR_ASSERTION]: Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-feature-pool.integration.cjs:21:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2y-feature-pool.integration.cjs",
      "name": "P2Y ten task edits do not hold the entire pool while feature refresh requires another connection",
      "ms": 7168.1457,
      "pass": false,
      "error": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "cause": "Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "stack": "AssertionError [ERR_ASSERTION]: Task edits stalled acquiring a second connection: 500,500,500,500,500,500,500,500,500,500\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-feature-pool.integration.cjs:21:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"task-feature-pool\",\"occupied\":{\"max\":10,\"used\":10,\"free\":0,\"featureReads\":10},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"testAcquireTimeoutMs\":2000}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9690.7175"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2y_feature_pool_test_b389018fbcf7c174\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2y_feature_pool_test_b389018fbcf7c174\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2y_feature_pool_test_b389018fbcf7c174\"}\n"
  ]
}

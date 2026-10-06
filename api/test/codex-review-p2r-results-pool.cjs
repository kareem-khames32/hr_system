module.exports = {
  "selected": [
    "codex-review-p2r-pool"
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
    "duration_ms": 37262.9306
  },
  "results": [
    {
      "file": "codex-review-p2r-pool.integration.cjs",
      "name": "P2R independent account edits must not exhaust the SQL pool with lock-only transactions while their handlers wait for another connection",
      "ms": 34886.9315,
      "pass": false,
      "error": "Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "cause": "Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "stack": "AssertionError [ERR_ASSERTION]: Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2r-pool.integration.cjs:27:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2r-pool.integration.cjs",
      "name": "P2R independent account edits must not exhaust the SQL pool with lock-only transactions while their handlers wait for another connection",
      "ms": 34886.9315,
      "pass": false,
      "error": "Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "cause": "Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500",
      "stack": "AssertionError [ERR_ASSERTION]: Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: 500,500,500,500,500,500,500,500,500,500\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2r-pool.integration.cjs:27:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"pool-before-release\",\"max\":10,\"heldAccountLocks\":10,\"connectionsUsed\":10,\"connectionsFree\":0}",
    "{\"case\":\"pool-results\",\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"connectionsUsed\":0,\"connectionsFree\":10}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 37262.9306"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2r_pool_test_61ad446b5aa781ef\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2r_pool_test_61ad446b5aa781ef\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2r_pool_test_61ad446b5aa781ef\"}\n"
  ]
}

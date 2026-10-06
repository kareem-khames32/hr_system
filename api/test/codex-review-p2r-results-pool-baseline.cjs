module.exports = {
  "selected": [
    "codex-review-p2r-pool"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 6971.3293
  },
  "results": [
    {
      "file": "codex-review-p2r-pool.integration.cjs",
      "name": "P2R diagnostic baseline: the same ten paused HTTP handlers succeed without the new lock-only transaction",
      "ms": 4582.0943,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"pool-baseline-before-release\",\"connectionsUsed\":0,\"connectionsFree\":10}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6971.3293"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2r_pool_test_36c81cb1d73581e8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2r_pool_test_36c81cb1d73581e8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2r_pool_test_36c81cb1d73581e8\"}\n"
  ]
}

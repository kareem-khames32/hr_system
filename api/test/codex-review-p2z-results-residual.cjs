module.exports = {
  "selected": [
    "codex-review-p2z-residual"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 7985.374
  },
  "results": [
    {
      "file": "codex-review-p2z-residual.integration.cjs",
      "name": "P2Z task changes and not-mine comments use the current transaction connection throughout",
      "ms": 4669.0617,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-residual.integration.cjs",
      "name": "P2Z detached proof contains only original uploaded bytes and has no path into replacement proof",
      "ms": 320.1348,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2z-residual.integration.cjs",
      "name": "P2Z renewal retries re-evaluate employee scope after the failed transaction rolls back",
      "ms": 556.7548,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"all-query-runners-inside-task-transactions\",\"ownQueries\":128,\"foreign\":[]}",
    "{\"case\":\"detached-proof-policy-boundary\",\"oldUnlinkedOwnBytes\":200,\"replacement\":404,\"task\":404}",
    "{\"case\":\"renewal-rechecks-scope\",\"status\":404,\"attempts\":2,\"failures\":1,\"rolledBack\":true}",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7985.374"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2z_residual_test_e0eb45b164d45f6b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2z_residual_test_e0eb45b164d45f6b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2z_residual_test_e0eb45b164d45f6b\"}\n"
  ]
}

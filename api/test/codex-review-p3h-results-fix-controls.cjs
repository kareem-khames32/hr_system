module.exports = {
  "selected": [
    "codex-review-p3h-fix-controls"
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
    "duration_ms": 7970.2665
  },
  "results": [
    {
      "file": "codex-review-p3h-fix-controls.integration.cjs",
      "name": "P3H-F-create: existing proposed role changed before the lock rejects creation with no account row",
      "ms": 4915.8648,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-fix-controls.integration.cjs",
      "name": "P3H-F-temporary: a stale second member rolls back the entire temporary-password batch",
      "ms": 336.5974,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3h-fix-controls.integration.cjs",
      "name": "P3H-F-reactivate: promotion after the takeover check rejects reactivation and leaves the account inactive",
      "ms": 158.4667,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7970.2665"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_fix_controls_test_0c3d338a9749c5cf\"}\n",
    "REVIEW_MEASURE {\"case\":\"temporary-password-batch-rollback\",\"status\":409,\"firstVersion\":0,\"secondVersion\":1,\"passwordsUnchanged\":true,\"temporaryPasswordAudits\":0}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_fix_controls_test_0c3d338a9749c5cf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_fix_controls_test_0c3d338a9749c5cf\"}\n"
  ]
}

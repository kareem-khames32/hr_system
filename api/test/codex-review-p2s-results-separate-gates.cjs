module.exports = {
  "selected": [
    "codex-review-p2s-lock-processes"
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
    "duration_ms": 10288.2948
  },
  "results": [
    {
      "file": "codex-review-p2s-lock-processes.integration.cjs",
      "name": "P2S independent in-memory gates still serialize through the database lock on the application pool",
      "ms": 7026.0612,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10288.2948"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_process_gates_test_4bdf3ed6cb6bd37e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_process_gates_test_4bdf3ed6cb6bd37e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_process_gates_test_4bdf3ed6cb6bd37e\"}\n"
  ]
}

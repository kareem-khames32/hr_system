module.exports = {
  "selected": [
    "codex-review-p2n-concurrency"
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
    "duration_ms": 11972.2194
  },
  "results": [
    {
      "file": "codex-review-p2n-concurrency.integration.cjs",
      "name": "P2N concurrent issue, ack/cancel and late task links with RCSI=true",
      "ms": 9370.0343,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"isolation-and-late-links\",\"rcsi\":true,\"concurrentIssuers\":3,\"documents\":1,\"ackCancel\":[404,201],\"lateLinkCases\":4}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11972.2194"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2n_rcsi_test_f1d38d0346b5aff5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2n_rcsi_test_f1d38d0346b5aff5\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2n_rcsi_test_f1d38d0346b5aff5\"}\n"
  ]
}

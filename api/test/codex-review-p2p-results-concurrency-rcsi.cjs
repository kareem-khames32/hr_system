module.exports = {
  "selected": [
    "codex-review-p2p-concurrency"
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
    "duration_ms": 9132.9377
  },
  "results": [
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P two comments race for one attachment with RCSI=true",
      "ms": 6169.6439,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P task transfer while comment waits rechecks the new assignee with RCSI=true",
      "ms": 116.7073,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P late document/execution task mapping rejects comments with RCSI=true",
      "ms": 241.1617,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"rcsi\":true,\"sharedFileStatuses\":[400,201],\"comments\":1,\"mentionEvents\":1}",
    "{\"rcsi\":true,\"lateLinks\":[{\"kind\":\"document\",\"initial\":409,\"retry\":400,\"comments\":0},{\"kind\":\"execution\",\"initial\":409,\"retry\":400,\"comments\":0}]}",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9132.9377"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2p_concurrency_test_da033ba0a8f67277\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2p_concurrency_test_da033ba0a8f67277\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2p_concurrency_test_da033ba0a8f67277\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2p-independent",
    "codex-review-p2p-concurrency"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 7,
      "failed": 0,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 19148.5819
  },
  "results": [
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P internal rows cannot alter public truncation, reply references or author identity after transfer",
      "ms": 5760.1147,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P comment rollback and deadlock retry leave exactly one comment, attachment binding and outbox event",
      "ms": 681.8517,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P immediate and digest email recheck current requester identity, with active-recipient controls",
      "ms": 874.6974,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-independent.integration.cjs",
      "name": "P2P all four comment endpoints and upload remain behind the policy acknowledgement gate",
      "ms": 232.1861,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P two comments race for one attachment with RCSI=false",
      "ms": 5927.7153,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P task transfer while comment waits rechecks the new assignee with RCSI=false",
      "ms": 101.164,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2p-concurrency.integration.cjs",
      "name": "P2P late document/execution task mapping rejects comments with RCSI=false",
      "ms": 255.1931,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"emailIdentityChecks\":[{\"mode\":\"ON\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"ON\",\"revoked\":true,\"status\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"DIGEST\",\"revoked\":true,\"status\":\"SKIPPED\"}],\"realMail\":false}",
    "{\"rcsi\":false,\"sharedFileStatuses\":[400,201],\"comments\":1,\"mentionEvents\":1}",
    "{\"rcsi\":false,\"lateLinks\":[{\"kind\":\"document\",\"initial\":409,\"retry\":400,\"comments\":0},{\"kind\":\"execution\",\"initial\":409,\"retry\":400,\"comments\":0}]}",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 19148.5819"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2p_independent_test_6548f28b0e1ec08a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2p_independent_test_6548f28b0e1ec08a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2p_independent_test_6548f28b0e1ec08a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2p_concurrency_test_5f58d3797d8fb1e4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2p_concurrency_test_5f58d3797d8fb1e4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2p_concurrency_test_5f58d3797d8fb1e4\"}\n"
  ]
}

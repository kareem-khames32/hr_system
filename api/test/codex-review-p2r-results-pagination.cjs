module.exports = {
  "selected": [
    "codex-review-p2r-pagination",
    "codex-review-p2r-independent"
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
    "duration_ms": 17136.0518
  },
  "results": [
    {
      "file": "codex-review-p2r-pagination.integration.cjs",
      "name": "P2R keyset pagination deduplicates across pages and ignores concurrent new rows until the next read",
      "ms": 4855.0042,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-pagination.integration.cjs",
      "name": "P2R readable-comment memoization distinguishes internal and public comments for the same request",
      "ms": 216.3785,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-pagination.integration.cjs",
      "name": "P2R documented page cap stops at ten pages without exposing hidden links or changing stored rows",
      "ms": 131.183,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-independent.integration.cjs",
      "name": "P2R internal rows cannot alter public truncation, reply references or author identity after transfer",
      "ms": 5156.0511,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-independent.integration.cjs",
      "name": "P2R comment rollback and deadlock retry leave exactly one comment, attachment binding and outbox event",
      "ms": 684.4684,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-independent.integration.cjs",
      "name": "P2R immediate and digest email recheck current requester identity, with active-recipient controls",
      "ms": 1019.7554,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-independent.integration.cjs",
      "name": "P2R all four comment endpoints and upload remain behind the policy acknowledgement gate",
      "ms": 230.4096,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"emailIdentityChecks\":[{\"mode\":\"ON\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"ON\",\"revoked\":true,\"status\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"DIGEST\",\"revoked\":true,\"status\":\"SKIPPED\"}],\"realMail\":false}",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 17136.0518"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2r_pagination_test_ec0839f0710a0f7d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2r_pagination_test_ec0839f0710a0f7d\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2r_pagination_test_ec0839f0710a0f7d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2r_independent_test_fd0d2cfe2f5a4576\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2r_independent_test_fd0d2cfe2f5a4576\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2r_independent_test_fd0d2cfe2f5a4576\"}\n"
  ]
}

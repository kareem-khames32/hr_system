module.exports = {
  "selected": [
    "codex-review-p2r-account-lock",
    "codex-review-p2r-concurrency"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 14763.5866
  },
  "results": [
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R real SQL serialization retains intermediate employee history and hides internal text/files; RCSI=true",
      "ms": 4792.9216,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R permissions-only edit cannot overwrite a concurrent binding under the account lock; RCSI=true",
      "ms": 96.4107,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R a rejected edit releases its application lock; an unrelated account remains editable; RCSI=true",
      "ms": 80.5003,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-concurrency.integration.cjs",
      "name": "P2R two comments race for one attachment with RCSI=true",
      "ms": 4700.649,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-concurrency.integration.cjs",
      "name": "P2R task transfer while comment waits rechecks the new assignee with RCSI=true",
      "ms": 88.0042,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-concurrency.integration.cjs",
      "name": "P2R late document/execution task mapping rejects comments with RCSI=true",
      "ms": 194.9816,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"rcsi\":true,\"patchStatuses\":[200,200],\"bothIdentitiesRecorded\":true,\"tokenVersion\":2,\"internalHidden\":true}",
    "{\"rcsi\":true,\"sharedFileStatuses\":[201,400],\"comments\":1,\"mentionEvents\":1}",
    "{\"rcsi\":true,\"lateLinks\":[{\"kind\":\"document\",\"initial\":409,\"retry\":400,\"comments\":0},{\"kind\":\"execution\",\"initial\":409,\"retry\":400,\"comments\":0}]}",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14763.5866"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2r_account_lock_test_4a9c4f32bf02b5e1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2r_account_lock_test_4a9c4f32bf02b5e1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2r_account_lock_test_4a9c4f32bf02b5e1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2r_concurrency_test_8f05f5c5ef5ccf03\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2r_concurrency_test_8f05f5c5ef5ccf03\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2r_concurrency_test_8f05f5c5ef5ccf03\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2r-account-lock"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 22645.7573
  },
  "results": [
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R real SQL serialization retains intermediate employee history and hides internal text/files; RCSI=false",
      "ms": 4899.8745,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R permissions-only edit cannot overwrite a concurrent binding under the account lock; RCSI=false",
      "ms": 110.0997,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R lock timeout returns 409 without executing the waiter, keeps the active handler protected and permits a later retry",
      "ms": 15119.3426,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-account-lock.integration.cjs",
      "name": "P2R a rejected edit releases its application lock; an unrelated account remains editable; RCSI=false",
      "ms": 103.4759,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"rcsi\":false,\"patchStatuses\":[200,200],\"bothIdentitiesRecorded\":true,\"tokenVersion\":2,\"internalHidden\":true}",
    "{\"case\":\"real-lock-timeout\",\"status\":409,\"code\":409}",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 22645.7573"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2r_account_lock_test_1ffcb9e07d21d3eb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2r_account_lock_test_1ffcb9e07d21d3eb\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2r_account_lock_test_1ffcb9e07d21d3eb\"}\n"
  ]
}

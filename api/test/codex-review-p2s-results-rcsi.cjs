module.exports = {
  "selected": [
    "codex-review-p2s-transfer",
    "codex-review-p2s-account-lock",
    "codex-review-p2s-concurrency"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 10,
      "failed": 0,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 23529.2388
  },
  "results": [
    {
      "file": "codex-review-p2s-transfer.integration.cjs",
      "name": "P2S transfer audits the actual previous branch per account; same-branch accounts only revoke sessions; triggers are supported",
      "ms": 4916.6104,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-transfer.integration.cjs",
      "name": "P2S SQL predicate excludes an account rebound through PATCH while transfer is waiting",
      "ms": 200.5779,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-transfer.integration.cjs",
      "name": "P2S OUTPUT audits branch changes committed just before UPDATE and includes newly linked accounts",
      "ms": 158.7637,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-transfer.integration.cjs",
      "name": "P2S audit failure rolls back transfer, account writes and prior audit inserts; retry is complete once",
      "ms": 188.5592,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-account-lock.integration.cjs",
      "name": "P2S real SQL serialization retains intermediate employee history and hides internal text/files; RCSI=true",
      "ms": 5038.3879,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-account-lock.integration.cjs",
      "name": "P2S permissions-only edit cannot overwrite a concurrent binding under the account lock; RCSI=true",
      "ms": 102.7251,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-account-lock.integration.cjs",
      "name": "P2S a rejected edit releases its application lock; an unrelated account remains editable; RCSI=true",
      "ms": 113.3952,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-concurrency.integration.cjs",
      "name": "P2S two comments race for one attachment with RCSI=true",
      "ms": 5033.4388,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-concurrency.integration.cjs",
      "name": "P2S task transfer while comment waits rechecks the new assignee with RCSI=true",
      "ms": 88.4783,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2s-concurrency.integration.cjs",
      "name": "P2S late document/execution task mapping rejects comments with RCSI=true",
      "ms": 210.3086,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"rcsi\":true,\"changedAccounts\":4,\"auditEvents\":3,\"sameBranchAuditEvents\":0,\"reexecution\":false}",
    "{\"rcsi\":true,\"patchStatuses\":[200,200],\"bothIdentitiesRecorded\":true,\"tokenVersion\":2,\"internalHidden\":true}",
    "{\"rcsi\":true,\"sharedFileStatuses\":[400,201],\"comments\":1,\"mentionEvents\":1}",
    "{\"rcsi\":true,\"lateLinks\":[{\"kind\":\"document\",\"initial\":409,\"retry\":400,\"comments\":0},{\"kind\":\"execution\",\"initial\":409,\"retry\":400,\"comments\":0}]}",
    "tests 10",
    "suites 0",
    "pass 10",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23529.2388"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_transfer_test_f794e1e4c15288f6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_transfer_test_f794e1e4c15288f6\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_transfer_test_f794e1e4c15288f6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_account_lock_test_372a735c5d334a56\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_account_lock_test_372a735c5d334a56\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_account_lock_test_372a735c5d334a56\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2s_concurrency_test_c5e6ef82846d1302\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2s_concurrency_test_c5e6ef82846d1302\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2s_concurrency_test_c5e6ef82846d1302\"}\n"
  ]
}

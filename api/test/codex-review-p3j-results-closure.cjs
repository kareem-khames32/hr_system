module.exports = {
  "selected": [
    "codex-review-p3j-domain-creation",
    "codex-review-p3j-domain-rebinding",
    "codex-review-p3j-unseeded-role",
    "codex-review-p3j-permission-races",
    "codex-review-p3j-account-role-concurrency",
    "codex-review-p3j-range-locks"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 14,
      "failed": 0,
      "passed": 14,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 14,
      "suites": 0
    },
    "duration_ms": 24341.8781
  },
  "results": [
    {
      "file": "codex-review-p3j-domain-creation.integration.cjs",
      "name": "P3J-D-sequential: the established GUID prevents a second directory identity from claiming the same employee",
      "ms": 5039.617,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-domain-creation.integration.cjs",
      "name": "P3J-D-create-same-guid: two simultaneous first domain logins do not create duplicate employee accounts",
      "ms": 198.4299,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-domain-creation.integration.cjs",
      "name": "P3J-D-create-two-guids: two simultaneous first domain logins do not create duplicate employee accounts",
      "ms": 170.1499,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-domain-creation.integration.cjs",
      "name": "P3J-D-created-account: an existing disabled account appearing after matching is not bypassed by a stale first-login creation",
      "ms": 201.1406,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-domain-rebinding.integration.cjs",
      "name": "P3J-D-link: a sync link must not attach a directory identity to an account rebound to a different employee",
      "ms": 5141.2669,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-unseeded-role.integration.cjs",
      "name": "P3J-U-preset: a missing role row must stay pinned after the final roleStamp read",
      "ms": 6614.9614,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-permission-races.integration.cjs",
      "name": "P3J-O-bundle: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 4651.9226,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-permission-races.integration.cjs",
      "name": "P3J-O-overrides: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 98.6767,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-permission-races.integration.cjs",
      "name": "P3J-O-scope: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 83.5407,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-account-role-concurrency.integration.cjs",
      "name": "P3J-C-account: overlapping account and role transactions finish without a lock cycle",
      "ms": 5099.3269,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-account-role-concurrency.integration.cjs",
      "name": "P3J-C-role: overlapping account and role transactions finish without a lock cycle",
      "ms": 121.5393,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-account-role-concurrency.integration.cjs",
      "name": "P3J-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
      "ms": 132.738,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-range-locks.integration.cjs",
      "name": "P3J-R-gaps: two absent preset codes sharing a unique-index range serialize without a cycle",
      "ms": 4737.2133,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-range-locks.integration.cjs",
      "name": "P3J-R-create-first: assignment waits for a new role transaction and sees its committed bundle",
      "ms": 79.119,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 14",
    "suites 0",
    "pass 14",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 24341.8781"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_domain_creation_test_2c989ee430b03e76\"}\n",
    "REVIEW_MEASURE {\"case\":\"sequential-domain-control\",\"statuses\":[201,401],\"accounts\":1}\n",
    "REVIEW_MEASURE {\"case\":\"concurrent-domain-creation\",\"sameGuid\":true,\"statuses\":[201,201],\"accounts\":1,\"protectedSessions\":2}\n",
    "REVIEW_MEASURE {\"case\":\"concurrent-domain-creation\",\"sameGuid\":false,\"statuses\":[201,401],\"accounts\":1,\"protectedSessions\":1}\n",
    "REVIEW_MEASURE {\"case\":\"domain-creation-after-disabled-account\",\"freshLogin\":401,\"pendingLogin\":401,\"accounts\":1,\"employeeMatches\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_domain_creation_test_2c989ee430b03e76\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_domain_creation_test_2c989ee430b03e76\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_domain_rebinding_test_abe2d491d8b1002d\"}\n",
    "REVIEW_MEASURE {\"case\":\"domain-link-after-rebinding\",\"sync\":200,\"currentPreviewCreatesSeparateAccount\":true,\"staleGuidAttached\":false,\"login\":201,\"loggedInAsOtherEmployee\":false,\"guardedAccess\":200,\"guardedAsOtherEmployee\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_domain_rebinding_test_abe2d491d8b1002d\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_domain_rebinding_test_abe2d491d8b1002d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_unseeded_role_test_56529730176969a8\"}\n",
    "REVIEW_MEASURE {\"case\":\"unseeded-role-stamp\",\"insertWaited\":true,\"edit\":200,\"insert\":201}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_unseeded_role_test_56529730176969a8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_unseeded_role_test_56529730176969a8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_permission_races_test_ddb4f5bfbbe7d8e8\"}\n",
    "REVIEW_MEASURE {\"case\":\"permission-write-after-judgement\",\"mode\":\"bundle\",\"newJudgement\":403,\"oldRequest\":409,\"versionAtJudgement\":1,\"versionAfterInterveningChange\":2,\"finalVersion\":2,\"adminPermissionGranted\":false,\"companyScope\":false,\"employeeViewGranted\":false}\n",
    "REVIEW_MEASURE {\"case\":\"permission-write-after-judgement\",\"mode\":\"overrides\",\"newJudgement\":403,\"oldRequest\":409,\"versionAtJudgement\":0,\"versionAfterInterveningChange\":1,\"finalVersion\":1,\"adminPermissionGranted\":false,\"companyScope\":false,\"employeeViewGranted\":false}\n",
    "REVIEW_MEASURE {\"case\":\"permission-write-after-judgement\",\"mode\":\"scope\",\"newJudgement\":403,\"oldRequest\":409,\"versionAtJudgement\":0,\"versionAfterInterveningChange\":1,\"finalVersion\":1,\"adminPermissionGranted\":false,\"companyScope\":true,\"employeeViewGranted\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_permission_races_test_ddb4f5bfbbe7d8e8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_permission_races_test_ddb4f5bfbbe7d8e8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_account_role_test_9b73db287c2c1dc5\"}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"account\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":2}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"role\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":2}\n",
    "REVIEW_MEASURE {\"case\":\"proposed-role-upgrade\",\"freshDecision\":403,\"pendingDecision\":409,\"versionBeforeAssignment\":0,\"versionAfterAssignment\":0,\"administrativePermissionGranted\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_account_role_test_9b73db287c2c1dc5\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_account_role_test_9b73db287c2c1dc5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_range_locks_test_1b40ba9a2061df05\"}\n",
    "REVIEW_MEASURE {\"case\":\"adjacent-absent-role-ranges\",\"realSqlWait\":true,\"statuses\":[200,200]}\n",
    "REVIEW_MEASURE {\"case\":\"role-create-before-assignment\",\"realSqlWait\":true,\"statuses\":[201,200]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_range_locks_test_1b40ba9a2061df05\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_range_locks_test_1b40ba9a2061df05\"}\n"
  ]
}

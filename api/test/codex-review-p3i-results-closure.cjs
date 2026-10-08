module.exports = {
  "selected": [
    "codex-review-p3i-unseeded-role",
    "codex-review-p3i-account-role-concurrency",
    "codex-review-p3i-permission-races",
    "codex-review-p3i-domain-rebinding",
    "codex-review-p3i-fix-controls",
    "codex-review-p3i-password-race"
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
    "duration_ms": 25575.1216
  },
  "results": [
    {
      "file": "codex-review-p3i-unseeded-role.integration.cjs",
      "name": "P3I-U-preset: a missing role row must stay pinned after the final roleStamp read",
      "ms": 6873.3426,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-account-role-concurrency.integration.cjs",
      "name": "P3I-C-account: overlapping account and role transactions finish without a lock cycle",
      "ms": 4976.123,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-account-role-concurrency.integration.cjs",
      "name": "P3I-C-role: overlapping account and role transactions finish without a lock cycle",
      "ms": 125.1844,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-account-role-concurrency.integration.cjs",
      "name": "P3I-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
      "ms": 109.9065,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-permission-races.integration.cjs",
      "name": "P3I-O-bundle: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 5149.1247,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-permission-races.integration.cjs",
      "name": "P3I-O-overrides: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 131.9821,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-permission-races.integration.cjs",
      "name": "P3I-O-scope: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 115.9507,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-domain-rebinding.integration.cjs",
      "name": "P3I-D-link: a sync link must not attach a directory identity to an account rebound to a different employee",
      "ms": 5149.614,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-fix-controls.integration.cjs",
      "name": "P3I-F-create: existing proposed role changed before the lock rejects creation with no account row",
      "ms": 4902.6109,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-fix-controls.integration.cjs",
      "name": "P3I-F-temporary: a stale second member rolls back the entire temporary-password batch",
      "ms": 344.2023,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-fix-controls.integration.cjs",
      "name": "P3I-F-reactivate: promotion after the takeover check rejects reactivation and leaves the account inactive",
      "ms": 153.6912,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-password-race.integration.cjs",
      "name": "P3I-P-role: changing a password must not reissue revoked authority with the current version",
      "ms": 5093.4317,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-password-race.integration.cjs",
      "name": "P3I-P-legacy-grant: changing a password must not reissue revoked authority with the current version",
      "ms": 351.1577,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-password-race.integration.cjs",
      "name": "P3I-P-role-bundle: changing a password must not reissue revoked authority with the current version",
      "ms": 388.6947,
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
    "duration_ms 25575.1216"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_unseeded_role_test_68d33407f0a4e13c\"}\n",
    "REVIEW_MEASURE {\"case\":\"unseeded-role-stamp\",\"insertWaited\":true,\"edit\":200,\"insert\":201}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_unseeded_role_test_68d33407f0a4e13c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_unseeded_role_test_68d33407f0a4e13c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_account_role_test_188cfe1adfd43270\"}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"account\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":2}\n",
    "REVIEW_MEASURE {\"case\":\"account-role-lock-order\",\"first\":\"role\",\"realSqlWait\":true,\"statuses\":[200,200],\"version\":2}\n",
    "REVIEW_MEASURE {\"case\":\"proposed-role-upgrade\",\"freshDecision\":403,\"pendingDecision\":409,\"versionBeforeAssignment\":0,\"versionAfterAssignment\":0,\"administrativePermissionGranted\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_account_role_test_188cfe1adfd43270\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_account_role_test_188cfe1adfd43270\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_permission_races_test_e1ffb5154691c032\"}\n",
    "REVIEW_MEASURE {\"case\":\"permission-write-after-judgement\",\"mode\":\"bundle\",\"newJudgement\":403,\"oldRequest\":409,\"versionAtJudgement\":1,\"versionAfterInterveningChange\":2,\"finalVersion\":2,\"adminPermissionGranted\":false,\"companyScope\":false,\"employeeViewGranted\":false}\n",
    "REVIEW_MEASURE {\"case\":\"permission-write-after-judgement\",\"mode\":\"overrides\",\"newJudgement\":403,\"oldRequest\":409,\"versionAtJudgement\":0,\"versionAfterInterveningChange\":1,\"finalVersion\":1,\"adminPermissionGranted\":false,\"companyScope\":false,\"employeeViewGranted\":false}\n",
    "REVIEW_MEASURE {\"case\":\"permission-write-after-judgement\",\"mode\":\"scope\",\"newJudgement\":403,\"oldRequest\":409,\"versionAtJudgement\":0,\"versionAfterInterveningChange\":1,\"finalVersion\":1,\"adminPermissionGranted\":false,\"companyScope\":true,\"employeeViewGranted\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_permission_races_test_e1ffb5154691c032\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_permission_races_test_e1ffb5154691c032\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_domain_rebinding_test_bf6cba0e2f3d687a\"}\n",
    "REVIEW_MEASURE {\"case\":\"domain-link-after-rebinding\",\"sync\":200,\"currentPreviewCreatesSeparateAccount\":true,\"staleGuidAttached\":false,\"login\":201,\"loggedInAsOtherEmployee\":false,\"guardedAccess\":200,\"guardedAsOtherEmployee\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_domain_rebinding_test_bf6cba0e2f3d687a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_domain_rebinding_test_bf6cba0e2f3d687a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_fix_controls_test_f5b724841c4e8347\"}\n",
    "REVIEW_MEASURE {\"case\":\"temporary-password-batch-rollback\",\"status\":409,\"firstVersion\":0,\"secondVersion\":1,\"passwordsUnchanged\":true,\"temporaryPasswordAudits\":0}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_fix_controls_test_f5b724841c4e8347\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_fix_controls_test_f5b724841c4e8347\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_password_race_test_c32a18c8cf4d71ac\"}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"role\",\"changePassword\":200,\"dbRole\":\"employee\",\"responseRole\":\"employee\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"legacy-grant\",\"changePassword\":200,\"dbRole\":\"employee\",\"responseRole\":\"employee\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "REVIEW_MEASURE {\"case\":\"password-current-version-stale-authority\",\"mode\":\"role-bundle\",\"changePassword\":200,\"dbRole\":\"p3i_password_role_2\",\"responseRole\":\"p3i_password_role_2\",\"currentVersion\":2,\"versionAfterRevocation\":1,\"privilegedAccess\":403}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_password_race_test_c32a18c8cf4d71ac\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_password_race_test_c32a18c8cf4d71ac\"}\n"
  ]
}

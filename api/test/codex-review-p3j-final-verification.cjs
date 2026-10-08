module.exports = {
  "target": "7b7f8d1fbf7b95f6453ed2f2e2a9c0b45bee3e16",
  "trackedFilesUnchanged": 3851,
  "databasesAbsent": 31,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p3j_domain_creation_test_2c989ee430b03e76",
    "hr_codex_p3j_domain_rebinding_test_abe2d491d8b1002d",
    "hr_codex_p3j_unseeded_role_test_56529730176969a8",
    "hr_codex_p3j_permission_races_test_ddb4f5bfbbe7d8e8",
    "hr_codex_p3j_account_role_test_9b73db287c2c1dc5",
    "hr_codex_p3j_range_locks_test_1b40ba9a2061df05",
    "hr_codex_p3j_domain_creation_test_ef3ac802da88f153",
    "hr_codex_p3j_auth_races_test_51ec44f96bc1a644",
    "hr_codex_p3j_auth_test_fbeaca11eb4745da",
    "hr_codex_p3j_session_boundary_test_db45ba0ab036f083",
    "hr_codex_p3j_factor_paths_test_8c4e66615387779a",
    "hr_codex_p3j_password_race_test_fd07b87a05212e8a",
    "hr_codex_p3j_fix_controls_test_aa580287d9f65ccc",
    "hr_totp_test_674c91d151488afd",
    "hr_totp_migration_test_69400165dc64f2ba",
    "hr_session_cookie_test_df43c363043702db",
    "hr_user_sessions_test_aa6434a3bf71bab4",
    "hr_2fa_race_test_fcf3d1c5f1244eba",
    "hr_roles_scope_test_a697c1ab25ff0f16",
    "hr_roles_collation_test_10dad1fa9b1714b6",
    "hr_audit_log_test_a3bad418e4d8774f",
    "hr_user_temp_pw_test_d681651f18107f8b",
    "hr_domain_sync_test_647ba54339e3289b",
    "hr_domain_autoprov_test_500dc4757db71c06",
    "hr_employee_suspension_test_03274f91e42aed96",
    "hr_employment_periods_test_b7646c8f0c8bfcf6",
    "hr_calendar_transfer_test_8ab2eee673f54065",
    "hr_codex_p3j_slot_races_test_b3d17ea2cf9e0f5b",
    "hr_codex_p3j_slot_races_test_ee454c01276b1008",
    "hr_codex_p3j_slot_races_test_bc2e5f93ede13f7b",
    "hr_codex_p3j_slot_races_test_9faab8e0c9043caa"
  ],
  "results": [
    {
      "file": "codex-review-p3j-results-closure.cjs",
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
      "failures": []
    },
    {
      "file": "codex-review-p3j-results-domain-final.cjs",
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
      "failures": []
    },
    {
      "file": "codex-review-p3j-results-regression.cjs",
      "counts": {
        "tests": 178,
        "failed": 0,
        "passed": 178,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 178,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3j-results-slot-races-complete.cjs",
      "counts": {
        "tests": 9,
        "failed": 1,
        "passed": 8,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 9,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3J-S-unlink: freeing the old employee slot does not form a cycle with first domain login",
          "error": "Expected values to be strictly equal:\n\n409 !== 201\n"
        }
      ]
    },
    {
      "file": "codex-review-p3j-results-slot-races-final.cjs",
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
      "failures": []
    },
    {
      "file": "codex-review-p3j-results-slot-races.cjs",
      "counts": {
        "tests": 7,
        "failed": 2,
        "passed": 5,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3J-S-slot-first-transfer: employee mutation waits behind account creation and updates that new account",
          "error": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs"
        },
        {
          "name": "P3J-S-transfer-first: stale directory match creates in the employee current branch",
          "error": "Cannot find module '../src/common/local-date'\nRequire stack:\n- D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs"
        }
      ]
    },
    {
      "file": "codex-review-p3j-results-unlink-final.cjs",
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
      "failures": []
    }
  ]
}

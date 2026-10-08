module.exports = {
  "target": "25df8dc8f60a8af6de33e206a79e1bcb6ff999d5",
  "trackedFilesUnchanged": 3814,
  "databasesAbsent": 25,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p3i_auth_races_test_435782d8488c5459",
    "hr_codex_p3i_auth_test_4bb5d63b5cdc61c7",
    "hr_codex_p3i_session_boundary_test_087b118d1bcb4760",
    "hr_codex_p3i_factor_paths_test_e5d38d6a356ffafd",
    "hr_totp_test_47d597f25dffdf54",
    "hr_totp_migration_test_cdac046c55ee80f8",
    "hr_session_cookie_test_0f1956a921b3b546",
    "hr_user_sessions_test_e6fd5488a43cb1c2",
    "hr_2fa_race_test_9ef9046ad1d55af1",
    "hr_roles_scope_test_5fabe3b1ab4ec509",
    "hr_roles_collation_test_f5a387aec5b941e2",
    "hr_audit_log_test_cd60ef8f46e07485",
    "hr_user_temp_pw_test_f0b765dc51095373",
    "hr_domain_sync_test_277f4d4226ba520b",
    "hr_domain_autoprov_test_61ac9f5031155240",
    "hr_codex_p3i_unseeded_role_test_68d33407f0a4e13c",
    "hr_codex_p3i_account_role_test_188cfe1adfd43270",
    "hr_codex_p3i_permission_races_test_e1ffb5154691c032",
    "hr_codex_p3i_domain_rebinding_test_bf6cba0e2f3d687a",
    "hr_codex_p3i_fix_controls_test_f5b724841c4e8347",
    "hr_codex_p3i_password_race_test_c32a18c8cf4d71ac",
    "hr_codex_p3i_domain_creation_test_ff7d45294ad24605",
    "hr_codex_p3i_domain_creation_test_3cd4ae09044b162e",
    "hr_codex_p3i_range_locks_test_4b5948925c26e602",
    "hr_codex_p3i_range_locks_test_7e02c33d8f72cb50"
  ],
  "results": [
    {
      "file": "codex-review-p3i-results-auth-regression.cjs",
      "counts": {
        "tests": 146,
        "failed": 0,
        "passed": 146,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 146,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3i-results-closure.cjs",
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
      "file": "codex-review-p3i-results-domain-creation-final.cjs",
      "counts": {
        "tests": 4,
        "failed": 2,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3I-D-create-two-guids: two simultaneous first domain logins do not create duplicate employee accounts",
          "error": "only one directory account may claim an employee; another GUID is rejected by the sequential path\n\n2 !== 1\n"
        },
        {
          "name": "P3I-D-created-account: an existing disabled account appearing after matching is not bypassed by a stale first-login creation",
          "error": "stale creation must not create a second active identity that bypasses the current disabled-account refusal"
        }
      ]
    },
    {
      "file": "codex-review-p3i-results-domain-creation.cjs",
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3I-D-create-two-guids: two simultaneous first domain logins do not create duplicate employee accounts",
          "error": "only one directory account may claim an employee; another GUID is rejected by the sequential path\n\n2 !== 1\n"
        },
        {
          "name": "P3I-D-created-account: an existing disabled account appearing after matching is not bypassed by a stale first-login creation",
          "error": "stale creation must not create a second active identity that bypasses the current disabled-account refusal"
        }
      ]
    },
    {
      "file": "codex-review-p3i-results-range-locks-final.cjs",
      "counts": {
        "tests": 2,
        "failed": 0,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3i-results-range-locks.cjs",
      "counts": {
        "tests": 2,
        "failed": 2,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3I-R-gaps: two absent preset codes sharing a unique-index range serialize without a cycle",
          "error": "Completed before barrier"
        },
        {
          "name": "P3I-R-create-first: assignment waits for a new role transaction and sees its committed bundle",
          "error": "No SQL lock wait observed"
        }
      ]
    }
  ]
}

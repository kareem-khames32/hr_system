module.exports = {
  "target": "f0983dfdc263836113a5a2875b77b6058afc9dce",
  "trackedFilesUnchanged": 3741,
  "databasesAbsent": 20,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p3g_auth_races_test_228bc081f42f97fe",
    "hr_codex_p3g_session_boundary_test_05ecaab2ee090ebc",
    "hr_codex_p3g_auth_test_b62b40338b044bbf",
    "hr_codex_p3g_data_test_d6c780f241e993d4",
    "hr_codex_p3g_docs_test_c1230cb8bacfc8e0",
    "hr_codex_p3g_reports_test_66f975dd7b10e157",
    "hr_codex_p3g_factor_paths_test_f9848f35ee87c753",
    "hr_codex_p3g_account_role_test_6db4f043487e223e",
    "hr_codex_p3g_account_role_test_41dfaa07182e646f",
    "hr_totp_test_1f3a16bb4665c077",
    "hr_totp_migration_test_545e70c365130ac2",
    "hr_session_cookie_test_cb9071a057d2c56b",
    "hr_user_sessions_test_5d920ac98c24b5b3",
    "hr_2fa_race_test_c6a1dadffb95d241",
    "hr_roles_scope_test_eaeba82ec415aea0",
    "hr_roles_collation_test_4cc06f178c84c9c4",
    "hr_audit_log_test_0b572a91e1ab7c7c",
    "hr_user_temp_pw_test_89e7295c8009be5b",
    "hr_codex_p3g_version_writers_test_69369a7281d74152",
    "hr_codex_p3g_password_race_test_79f524495b753abc"
  ],
  "results": [
    {
      "file": "codex-review-p3g-results-closure.cjs",
      "counts": {
        "tests": 21,
        "failed": 0,
        "passed": 21,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 21,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3g-results-factor-paths.cjs",
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
      "file": "codex-review-p3g-results-overlap-final.cjs",
      "counts": {
        "tests": 3,
        "failed": 1,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3G-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
          "error": "a manager must not assign a role that acquired admin-only permissions after the original judgement"
        }
      ]
    },
    {
      "file": "codex-review-p3g-results-overlap.cjs",
      "counts": {
        "tests": 3,
        "failed": 3,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3G-C-account: overlapping account and role transactions finish without a lock cycle",
          "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n"
        },
        {
          "name": "P3G-C-role: overlapping account and role transactions finish without a lock cycle",
          "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 'Synthetic overlap'\n- 'Synthetic updated overlap'\n             ^\n"
        },
        {
          "name": "P3G-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
          "error": "a manager must not assign a role that acquired admin-only permissions after the original judgement"
        }
      ]
    },
    {
      "file": "codex-review-p3g-results-regression.cjs",
      "counts": {
        "tests": 94,
        "failed": 0,
        "passed": 94,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 94,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3g-results-writers.cjs",
      "counts": {
        "tests": 6,
        "failed": 2,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3G-P-role: changing a password must not reissue revoked authority with the current version",
          "error": "new password session must not restore authority revoked before its row was opened"
        },
        {
          "name": "P3G-P-legacy-grant: changing a password must not reissue revoked authority with the current version",
          "error": "new password session must not restore authority revoked before its row was opened"
        }
      ]
    }
  ]
}

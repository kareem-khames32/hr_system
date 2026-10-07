module.exports = {
  "target": "419a41eb1fb0c85574185e01184d64ac50a897d7",
  "trackedFilesUnchanged": 3712,
  "databasesAbsent": 14,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p3f_auth_races_test_48d464d193117c2b",
    "hr_codex_p3f_reports_test_e683b89ebeeb1a9e",
    "hr_codex_p3f_auth_test_4a0cf90f910ea1f2",
    "hr_codex_p3f_data_test_bf2e6af61d082584",
    "hr_codex_p3f_docs_test_8de45ba44f37656a",
    "hr_codex_p3f_session_boundary_test_ab4b034a1b6b9ae0",
    "hr_codex_p3f_version_writers_test_11f684aed013d529",
    "hr_totp_test_f772a3f2e322cc05",
    "hr_totp_migration_test_63a895b08fc4e314",
    "hr_session_cookie_test_bfa77d88345a4a41",
    "hr_user_sessions_test_88d8dd73644ae32c",
    "hr_2fa_race_test_7ae7c60c4c8401f5",
    "hr_sec2_roles_test_c3a5be9853630b32",
    "hr_codex_p3f_version_writers_test_f953976271ac57be"
  ],
  "results": [
    {
      "file": "codex-review-p3f-results-closure.cjs",
      "counts": {
        "tests": 18,
        "failed": 0,
        "passed": 18,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 18,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3f-results-new-races.cjs",
      "counts": {
        "tests": 5,
        "failed": 3,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3F-S-password: password-only login cannot open a new full session after TOTP activation committed",
          "error": "a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n"
        },
        {
          "name": "P3F-V-role: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
          "error": "a stale reset cannot pass after promotion and ordinary account editing"
        },
        {
          "name": "P3F-V-override: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
          "error": "a stale reset cannot pass after promotion and ordinary account editing"
        }
      ]
    },
    {
      "file": "codex-review-p3f-results-regression.cjs",
      "counts": {
        "tests": 72,
        "failed": 0,
        "passed": 72,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 72,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3f-results-role-writer.cjs",
      "counts": {
        "tests": 1,
        "failed": 1,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3F-V-role-name: renaming a stale role cannot restore elevated permissions without moving the account version",
          "error": "restoring a stronger role must invalidate an earlier reset judgement"
        }
      ]
    }
  ]
}

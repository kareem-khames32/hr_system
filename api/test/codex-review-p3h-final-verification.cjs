module.exports = {
  "target": "b53a0115a2e74448ca1d97220142ccc7394857de",
  "trackedFilesUnchanged": 3775,
  "databasesAbsent": 23,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p3h_password_race_test_ddf16e6e5ef2fb96",
    "hr_codex_p3h_account_role_test_2c72d85300a7ddc1",
    "hr_codex_p3h_version_writers_test_23b35f7f9485f28a",
    "hr_codex_p3h_auth_races_test_8966bfce8f4debac",
    "hr_codex_p3h_session_boundary_test_4c366bf8eff5c5bd",
    "hr_codex_p3h_factor_paths_test_26a9ba7ec9a68756",
    "hr_codex_p3h_auth_test_9b85157d13d5a4fa",
    "hr_codex_p3h_domain_rebinding_test_a6b1b2a89bafae4c",
    "hr_codex_p3h_fix_controls_test_0c3d338a9749c5cf",
    "hr_codex_p3h_permission_races_test_a8965ba8e0e09e1d",
    "hr_totp_test_3aed84483f1abe60",
    "hr_totp_migration_test_703ee5f6df0c6895",
    "hr_session_cookie_test_97f55410e6a8ae54",
    "hr_user_sessions_test_9c8cf4fe533c69cc",
    "hr_2fa_race_test_fd65e3ab0d77f93e",
    "hr_roles_scope_test_d5aa0ea7087ff6e8",
    "hr_roles_collation_test_8c770400f063b3cf",
    "hr_audit_log_test_9146c79cfddb38a3",
    "hr_user_temp_pw_test_39f7601f0c1292aa",
    "hr_domain_sync_test_2be89d90a7739ba7",
    "hr_domain_autoprov_test_f70e77b9674a5c92",
    "hr_codex_p3h_unseeded_role_test_334153ac33efef3f",
    "hr_codex_p3h_domain_rebinding_test_97347133e81273f0"
  ],
  "results": [
    {
      "file": "codex-review-p3h-results-closure.cjs",
      "counts": {
        "tests": 23,
        "failed": 0,
        "passed": 23,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 23,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3h-results-domain-final.cjs",
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
          "name": "P3H-D-link: a sync link must not attach a directory identity to an account rebound to a different employee",
          "error": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan"
        }
      ]
    },
    {
      "file": "codex-review-p3h-results-fix-controls.cjs",
      "counts": {
        "tests": 3,
        "failed": 0,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3h-results-permission-races.cjs",
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
          "name": "P3H-O-bundle: permission replacement must retain the identity and effective-rights judgement through the write",
          "error": "a permission writer must reject an obsolete authority/scope judgement"
        },
        {
          "name": "P3H-O-overrides: permission replacement must retain the identity and effective-rights judgement through the write",
          "error": "a permission writer must reject an obsolete authority/scope judgement"
        },
        {
          "name": "P3H-O-scope: permission replacement must retain the identity and effective-rights judgement through the write",
          "error": "a permission writer must reject an obsolete authority/scope judgement"
        }
      ]
    },
    {
      "file": "codex-review-p3h-results-regression.cjs",
      "counts": {
        "tests": 130,
        "failed": 0,
        "passed": 130,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 130,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3h-results-remaining-paths.cjs",
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
          "name": "P3H-U-preset: a missing role row must stay pinned after the final roleStamp read",
          "error": "role creation after the final absent-row read must not bypass the assignment judgement"
        },
        {
          "name": "P3H-D-link: a sync link must not attach a directory identity to an account rebound to a different employee",
          "error": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan"
        }
      ]
    }
  ]
}

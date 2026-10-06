module.exports = {
  "target": "5af6c3096c30b80c81e32132322e3a93209244cc",
  "trackedFilesUnchanged": 3124,
  "databasesAbsent": 19,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 11,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2q_boundaries_test_4810a9e709b5f999",
    "hr_comments_test_92806a45974a7198",
    "hr_comments_migration_test_527514d8345dbad8",
    "hr_codex_p2q_controls_test_bc5bb5ec0e34eda1",
    "hr_codex_p2q_independent_test_043baabe83e0ce90",
    "hr_codex_p2q_concurrency_test_ccb3986a2d22a277",
    "hr_codex_p2q_decision_race_test_3e352b4a27daa956",
    "hr_codex_p2q_rebinding_sql_test_fa2c3221518933ea",
    "hr_codex_p2q_concurrency_test_367554644a3417b7",
    "hr_codex_p2q_rebinding_race_test_93f30ea7522e5611",
    "hr_domain_sync_test_8a1692ca47736db5",
    "hr_domain_autoprov_test_3d94337f98a481e7",
    "hr_codex_p2q_rebinding_race_test_21fc19c4d06b4196",
    "hr_codex_p2q_rebinding_sql_test_c626222c306dbf16",
    "hr_notifications_test_6fa2336b444b224c",
    "hr_notify_migration_test_192e089a9b752d3d",
    "hr_audit_log_test_e86e92cb67d72dc7",
    "hr_audit_log_migration_test_6f435829e5b738a7",
    "hr_user_branch_scopes_test_696c84949ec1015d"
  ],
  "results": [
    {
      "file": "codex-review-p2q-results-closure.cjs",
      "counts": {
        "tests": 51,
        "failed": 0,
        "passed": 51,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 51,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2q-results-controls.cjs",
      "counts": {
        "tests": 19,
        "failed": 1,
        "passed": 18,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 19,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2Q hidden notifications must not crowd a still-readable notification out of the returned list",
          "error": "Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n"
        }
      ]
    },
    {
      "file": "codex-review-p2q-results-rcsi.cjs",
      "counts": {
        "tests": 4,
        "failed": 1,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2Q real SQL row lock: both committed employee bindings remain recorded with RCSI=true",
          "error": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2q-results-rebinding-final.cjs",
      "counts": {
        "tests": 37,
        "failed": 2,
        "passed": 35,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 37,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2Q concurrent account rebindings must retain the intermediate employee identity and keep its internal content hidden",
          "error": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n"
        },
        {
          "name": "P2Q a concurrent permissions-only PATCH must not silently restore an old employee binding without recording the displaced identity",
          "error": "All account saves must preserve the binding history, including PATCH calls that did not request a binding change\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2q-results-rebinding-race.cjs",
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
          "name": "P2Q concurrent account rebindings must retain the intermediate employee identity and keep its internal content hidden",
          "error": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2q-results-rebinding-sql.cjs",
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
          "name": "P2Q real SQL row lock: both committed employee bindings remain recorded with RCSI=false",
          "error": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2q-results-regression.cjs",
      "counts": {
        "tests": 35,
        "failed": 0,
        "passed": 35,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 35,
        "suites": 0
      },
      "failures": []
    }
  ]
}

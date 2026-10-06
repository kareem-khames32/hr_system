module.exports = {
  "target": "32a20340126b8379993f5c005b8d1bdd624822b7",
  "trackedFilesUnchanged": 3275,
  "databasesAbsent": 18,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2u_independent_test_7aa67a990bc4c9b1",
    "hr_codex_p2u_concurrency_test_b0051f95496e2f67",
    "hr_codex_p2u_migration_shape_test_ae4c46869741674c",
    "hr_audience_test_f969dfeaac8be23b",
    "hr_custom_fields_test_cf320b4046138a4e",
    "hr_custom_fields_migration_test_a45c159ee9272bd0",
    "hr_codex_p2u_decision_race_test_e95f7e28faff21c6",
    "hr_codex_p2u_draft_controls_test_031357b104e4363c",
    "hr_codex_p2u_lock_consistency_test_8c8659914733cfe2",
    "hr_codex_p2u_lock_consistency_test_9c66b142eb476fbf",
    "hr_codex_p2u_concurrency_test_6dd5bb23881dc17e",
    "hr_codex_p2u_migration_extra_test_e43edd587d230ddc",
    "hr_codex_p2u_draft_controls_test_dd80c4a800d3f70c",
    "hr_recovery_test_a4a1fa932bd561c4",
    "hr_category_chains_test_d289f174b34ed310",
    "hr_payroll_salary_request_test_20e53d454fea7b3b",
    "hr_payroll_typed_deductions_test_5823df005bfc3e89",
    "hr_payroll_bonuses_test_6d809d8bbc8de9e1"
  ],
  "results": [
    {
      "file": "codex-review-p2u-results-closure.cjs",
      "counts": {
        "tests": 65,
        "failed": 0,
        "passed": 65,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 65,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2u-results-decision-race.cjs",
      "counts": {
        "tests": 8,
        "failed": 0,
        "passed": 8,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2u-results-draft-controls.cjs",
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
      "file": "codex-review-p2u-results-locks-rc.cjs",
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
      "file": "codex-review-p2u-results-locks-rcsi.cjs",
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
      "file": "codex-review-p2u-results-migration-extra.cjs",
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
      "file": "codex-review-p2u-results-regressions.cjs",
      "counts": {
        "tests": 110,
        "failed": 9,
        "passed": 101,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 110,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2U edited draft cannot use resubmission or caller-supplied bypass flags to evade first-submission audience",
          "error": "Expected values to be strictly equal:\n\n404 !== 200\n"
        },
        {
          "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
          "error": "failed running before hook"
        },
        {
          "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "failed running before hook"
        },
        {
          "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
          "error": "failed running before hook"
        },
        {
          "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "failed running before hook"
        },
        {
          "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
          "error": "failed running before hook"
        },
        {
          "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
          "error": "failed running before hook"
        },
        {
          "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
          "error": "failed running before hook"
        },
        {
          "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
          "error": "failed running before hook"
        }
      ]
    }
  ]
}

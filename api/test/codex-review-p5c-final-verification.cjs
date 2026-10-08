module.exports = {
  "target": "555a15520ce2446ec8ed175dc93bbbc1d194a976",
  "trackedFilesUnchanged": 4725,
  "databasesAbsent": 18,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_expense_reports_test_e4689f59a94dec03",
    "hr_expense_reports_test_e2261c95c0a9acca",
    "hr_decision_race_test_723912e4f2682b29",
    "hr_expense_reports_test_ac43d92d8164a98c",
    "hr_expense_reports_test_466435aa63d5e9c5",
    "hr_swap_consents_test_97ccfce287237556",
    "hr_expense_reports_test_9a338561326ce0f0",
    "hr_expense_reports_test_b416661a1e1e9b34",
    "hr_expense_reports_test_2689f3e0525ac866",
    "hr_expense_reports_test_409db1fcaa31e975",
    "hr_modules_test_f4f337068bad97c3",
    "hr_modules_migration_test_162241bf269e8e3d",
    "hr_modules_settings_test_66b9da2c5e72da2e",
    "hr_public_holiday_audience_test_ea2b194f2fbd6724",
    "hr_audience_test_ff2395dbe6858439",
    "hr_category_chains_test_8a15dc74eab08a4b",
    "hr_recovery_test_c7d65fa5bf4d5e15",
    "hr_swap_consents_test_554d25e4aa31bfce"
  ],
  "results": [
    {
      "file": "codex-review-p5c-results-extended.cjs",
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
      "file": "codex-review-p5c-results-independent.cjs",
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
      "file": "codex-review-p5c-results-money-controls.cjs",
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
      "file": "codex-review-p5c-results-receipt-final.cjs",
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
      "file": "codex-review-p5c-results-receipt-pool.cjs",
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
    },
    {
      "file": "codex-review-p5c-results-regression.cjs",
      "counts": {
        "tests": 118,
        "failed": 8,
        "passed": 110,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 118,
        "suites": 0
      },
      "failures": [
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

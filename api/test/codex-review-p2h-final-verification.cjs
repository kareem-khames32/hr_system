module.exports = {
  "target": "6d4d9e97f7d0ceaca2e2c4f4636ecdb00bf6497e",
  "trackedFilesUnchanged": 2843,
  "databasesAbsent": 7,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2h_independent_test_79514166fa48d227",
    "hr_reqexec_test_0cee0081ef2e3546",
    "hr_reqexec_migration_test_a5b0cec1cddca61d",
    "hr_codex_p2h_execution_test_f64d469608ffbec4",
    "hr_tasks_test_8b10dc5655b4f089",
    "hr_notifications_test_fb36cb6e552c2115",
    "hr_recovery_test_256974800b8ddd69"
  ],
  "results": [
    {
      "file": "codex-review-p2h-results-closure.cjs",
      "counts": {
        "tests": 5,
        "failed": 0,
        "passed": 5,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2h-results-execution-core.cjs",
      "counts": {
        "tests": 34,
        "failed": 0,
        "passed": 34,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 34,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2h-results-independent.cjs",
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
          "name": "P2H a current confidential execution party should remain a party in the pending report and reject-execution action",
          "error": "The same current execution party is masked in the console report\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2h-results-regressions.cjs",
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
    }
  ]
}

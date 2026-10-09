module.exports = {
  "selected": [
    "codex-review-p6a-setup"
  ],
  "summary": {
    "success": true,
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
    "duration_ms": 14470.1568
  },
  "results": [
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "P6A-I01: settings-only account can create an employee despite original route refusing it",
      "ms": 10960.2171,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "P6A-I03: balance import bypasses the leave module audience while the original adjustment route refuses",
      "ms": 216.8904,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "P6A-I04: settings-only account can create organization structure despite original route refusal",
      "ms": 97.1097,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"direct\":403,\"import\":200,\"created\":1}",
    "{\"direct\":404,\"import\":200,\"balance\":17}",
    "{\"direct\":403,\"import\":200,\"created\":1}",
    "Cleanup verified: hr_setup_import_test_e64690c0debf8399 is absent from sys.databases.",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14470.1568"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_setup_import_test_e64690c0debf8399\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_setup_import_test_e64690c0debf8399\"}\n"
  ]
}

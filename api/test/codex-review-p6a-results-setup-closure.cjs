module.exports = {
  "selected": [
    "codex-review-p6a-setup"
  ],
  "summary": {
    "success": true,
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
    "duration_ms": 11583.0361
  },
  "results": [
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "P6A-I01: settings-only account can create an employee despite original route refusing it",
      "ms": 8788.3828,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"direct\":403,\"import\":200,\"created\":1}",
    "Cleanup verified: hr_setup_import_test_ffc0330c3ccc6df8 is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11583.0361"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_setup_import_test_ffc0330c3ccc6df8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_setup_import_test_ffc0330c3ccc6df8\"}\n"
  ]
}

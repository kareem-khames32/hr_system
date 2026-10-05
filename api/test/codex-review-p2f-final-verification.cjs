module.exports = {
  "target": "a30d8c0010d00d88fa88a5b4eefcb5de7562d437",
  "trackedFilesUnchanged": 2787,
  "databasesAbsent": 6,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p2f_boundaries_test_3974ff4556c4ed90",
    "hr_notifications_test_4ae2f8489f1aedf4",
    "hr_notify_migration_test_99895402008651ec",
    "hr_queue_outbox_test_b486e1348089701b",
    "hr_codex_p2f_independent_test_8a86c721a05388e1",
    "hr_codex_p2f_independent_test_4f4ee0a6f1a5b39b"
  ],
  "results": [
    {
      "file": "codex-review-p2f-results-closure.cjs",
      "counts": {
        "tests": 59,
        "failed": 0,
        "passed": 59,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 59,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2f-results-independent-final.cjs",
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
      "file": "codex-review-p2f-results-independent.cjs",
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
          "name": "P2F deferred digest is deduplicated, requeues when quiet hours extend, then is delivered once by the queue",
          "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ 1791180121000\n- 1791190921000\n       ^\n"
        }
      ]
    }
  ]
}

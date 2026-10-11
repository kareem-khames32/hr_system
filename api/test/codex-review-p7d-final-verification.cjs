module.exports = {
  "target": "cfd56bd4bfd89103b1fa109c7e81b803b973a0ce",
  "trackedFilesUnchanged": 5196,
  "databasesAbsent": 6,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p7d_channels_test_3d249f9dfc7d6ae3",
    "hr_codex_p7d_channels_test_d8a8d08642c9b3cf",
    "hr_codex_p7d_channels_test_d57adb2f6ab61462",
    "hr_notify_channels_test_77fac41d7c2401cf",
    "hr_notifications_test_dfae1f745f3a00cd",
    "hr_notify_channels_migration_test_edb971f468745f47"
  ],
  "results": [
    {
      "file": "codex-review-p7d-results-closures.cjs",
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
      "file": "codex-review-p7d-results-extended-final.cjs",
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
      "file": "codex-review-p7d-results-extended.cjs",
      "counts": {
        "tests": 5,
        "failed": 1,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P7D-N11 observation: SQL failure recording a skipped row after successful handover repeats the open event",
          "error": "Expected values to be strictly equal:\n\n'ETIMEOUT' !== 1222\n"
        }
      ]
    },
    {
      "file": "codex-review-p7d-results-regression.cjs",
      "counts": {
        "tests": 33,
        "failed": 0,
        "passed": 33,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 33,
        "suites": 0
      },
      "failures": []
    }
  ]
}

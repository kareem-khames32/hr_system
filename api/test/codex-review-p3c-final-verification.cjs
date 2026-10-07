module.exports = {
  "target": "e9c8b9c0b76b905c6670e92410bc55ab762d5346",
  "trackedFilesUnchanged": 3559,
  "databasesAbsent": 11,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_positions_test_d35d242bc840a65f",
    "hr_positions_migration_test_699e4a44ed32e939",
    "hr_codex_p3c_independent_test_4b6b6cbe4a171eec",
    "hr_codex_p3c_controls_test_55eb15f3d0fdd055",
    "hr_codex_p3c_seat_locking_test_a87c881a7ba3b430",
    "hr_codex_p3c_seat_snapshot_test_b7c6956188ed79ed",
    "hr_codex_p3c_generation_test_bd905bb24d97888b",
    "hr_codex_p3c_unit_writes_test_b94845acf59f522d",
    "hr_codex_p3c_isolation_test_696121c8ee1d602e",
    "hr_codex_p3c_residual_test_5f19ac789c401377",
    "hr_codex_p3c_residual_test_e026b6450b939104"
  ],
  "results": [
    {
      "file": "codex-review-p3c-results-closure.cjs",
      "counts": {
        "tests": 87,
        "failed": 0,
        "passed": 87,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 87,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3c-results-residual-final.cjs",
      "counts": {
        "tests": 6,
        "failed": 3,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3C-R01: approval waiting on manual creation must extend that frozen position, not create an active duplicate",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     headcount: 3,\n-     headcount: 5,\n      id: 1,\n      status: 'FROZEN'\n    },\n+   {\n+     headcount: 2,\n+     id: 2,\n+     status: 'ACTIVE'\n+   }\n  ]\n"
        },
        {
          "name": "P3C-R03: generation must still match the current title name to employee titles after waiting",
          "error": "an old name no longer maps to this catalog title\n\n1 !== 0\n"
        },
        {
          "name": "P3C-R04: same-branch team move rejects linking and should suppress the now-invalid candidates",
          "error": "the UI must not offer a link the current unit rule refuses\n+ actual - expected\n\n+ [\n+   {\n+     employeeCode: 'P3C5',\n+     fullName: 'Synthetic employee 5',\n+     id: 5,\n+     jobTitle: 'Synthetic analyst'\n+   }\n+ ]\n- []\n"
        }
      ]
    },
    {
      "file": "codex-review-p3c-results-residual.cjs",
      "counts": {
        "tests": 4,
        "failed": 3,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3C-R01: approval waiting on manual creation must extend that frozen position, not create an active duplicate",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     headcount: 3,\n-     headcount: 5,\n      id: 1,\n      status: 'FROZEN'\n    },\n+   {\n+     headcount: 2,\n+     id: 2,\n+     status: 'ACTIVE'\n+   }\n  ]\n"
        },
        {
          "name": "P3C-R03: generation must still match the current title name to employee titles after waiting",
          "error": "an old name no longer maps to this catalog title\n\n1 !== 0\n"
        },
        {
          "name": "P3C-R04: same-branch team move rejects linking and should suppress the now-invalid candidates",
          "error": "the UI must not offer a link the current unit rule refuses\n+ actual - expected\n\n+ [\n+   {\n+     employeeCode: 'P3C5',\n+     fullName: 'Synthetic employee 5',\n+     id: 5,\n+     jobTitle: 'Synthetic analyst'\n+   }\n+ ]\n- []\n"
        }
      ]
    }
  ]
}

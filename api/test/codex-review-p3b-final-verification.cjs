module.exports = {
  "target": "ef4e894375fcee2511a723e57273f4b22e8153fe",
  "trackedFilesUnchanged": 3522,
  "databasesAbsent": 10,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_positions_test_647ac0c98f9b553c",
    "hr_positions_migration_test_016f183086cf480b",
    "hr_codex_p3b_independent_test_8be28e04d1f70e15",
    "hr_codex_p3b_controls_test_425d26c2963d9d67",
    "hr_codex_p3b_seat_locking_test_2b1fba7f14b7eff5",
    "hr_codex_p3b_seat_snapshot_test_6aafbdc0709f07b4",
    "hr_codex_p3b_generation_test_05e4be7b73aa1284",
    "hr_codex_p3b_isolation_test_0b083fdf2dd9564b",
    "hr_codex_p3b_unit_writes_test_21b32db7c54a2ee5",
    "hr_codex_p3b_unit_writes_test_3c08feb26a35d48c"
  ],
  "results": [
    {
      "file": "codex-review-p3b-results-closure.cjs",
      "counts": {
        "tests": 78,
        "failed": 0,
        "passed": 78,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 78,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3b-results-generation.cjs",
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3B-G01: an existing position committed after the plan must prevent duplicate generation",
          "error": "generation must recheck whether its title/unit already has a non-cancelled position\n\n2 !== 1\n"
        },
        {
          "name": "P3B-G02: an inactive catalog title after the plan must not create a new approved position",
          "error": "generation must recheck the catalog title still qualifies\n\n1 !== 0\n"
        }
      ]
    },
    {
      "file": "codex-review-p3b-results-isolation.cjs",
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
      "file": "codex-review-p3b-results-unit-writes-final.cjs",
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3B-W01: linking must not seat an employee on a position whose department is already foreign",
          "error": "a hidden foreign unit must not accept a new assignment through the direct route\n\n201 !== 400\n"
        },
        {
          "name": "P3B-W02: hiring must recheck department ownership after waiting on the seat",
          "error": "hiring must reject a unit moved out of the branch while waiting\n\n201 !== 400\n"
        }
      ]
    },
    {
      "file": "codex-review-p3b-results-unit-writes.cjs",
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
          "name": "P3B-W01: linking must not seat an employee on a position whose department is already foreign",
          "error": "a hidden foreign unit must not accept a new assignment through the direct route\n\n201 !== 400\n"
        },
        {
          "name": "P3B-W02: hiring must recheck department ownership after waiting on the seat",
          "error": "hiring must reject a unit moved out of the branch while waiting\n\n201 !== 400\n"
        }
      ]
    }
  ]
}

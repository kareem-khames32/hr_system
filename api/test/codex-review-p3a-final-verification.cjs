module.exports = {
  "target": "1221285fd6e7b041c6bcb77ae2dc5d6478aebe21",
  "trackedFilesUnchanged": 3495,
  "databasesAbsent": 14,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_codex_p3a_controls_test_9a8df310c6c2f30f",
    "hr_codex_p3a_seat_locking_test_3ff6ac04bf98b21c",
    "hr_codex_p3a_seat_snapshot_test_b0fd1e2ffdcd40b1",
    "hr_codex_p3a_controls_test_29a11abd275eb466",
    "hr_codex_p3a_seat_locking_test_79e20f7788e9db15",
    "hr_codex_p3a_seat_snapshot_test_89b7e1187b142ccc",
    "hr_positions_test_5064545f59b6052b",
    "hr_positions_migration_test_db83f24e5e9e8910",
    "hr_modules_test_cbab21918aedec0f",
    "hr_modules_settings_test_def46ca948f3f862",
    "hr_modules_migration_test_8dd607512052fb95",
    "hr_codex_p3a_independent_test_1fba0f49ff98c5e7",
    "hr_codex_p3a_independent_test_f3c4797ef7561259",
    "hr_codex_p3a_independent_test_d82265a2f8418c1d"
  ],
  "results": [
    {
      "file": "codex-review-p3a-results-controls-final.cjs",
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
      "file": "codex-review-p3a-results-controls.cjs",
      "counts": {
        "tests": 7,
        "failed": 1,
        "passed": 6,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 7,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3A-S2: competing holders on the final seat (RCSI=true)",
          "error": "Login failed for user 'sa'."
        }
      ]
    },
    {
      "file": "codex-review-p3a-results-core.cjs",
      "counts": {
        "tests": 88,
        "failed": 0,
        "passed": 88,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 88,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p3a-results-independent-final.cjs",
      "counts": {
        "tests": 4,
        "failed": 4,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3A-I01: a moved department and team must not expose their foreign identifiers",
          "error": "foreign department ID must be redacted along with its name"
        },
        {
          "name": "P3A-I02: moving a team alone to a foreign department must hide its current name",
          "error": "team current department is outside the reader branch"
        },
        {
          "name": "P3A-I03: department validity must survive waiting for the position creation lock",
          "error": "approval must reject a department moved out of the request branch while waiting\n\n201 !== 400\n"
        },
        {
          "name": "P3A-I04: generation must not overwrite a holder assignment committed after its initial plan",
          "error": "employee already seated in its unit must be skipped after acquiring its row lock\n\n6 !== 4\n"
        }
      ]
    },
    {
      "file": "codex-review-p3a-results-independent.cjs",
      "counts": {
        "tests": 4,
        "failed": 4,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P3A-I01: a moved department and team must not expose their foreign identifiers",
          "error": "PATCH /org/departments/1: 404 {\"message\":\"Cannot PATCH /api/org/departments/1\",\"error\":\"Not Found\",\"statusCode\":404}"
        },
        {
          "name": "P3A-I02: moving a team alone to a foreign department must hide its current name",
          "error": "PATCH /org/teams/1: 404 {\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}"
        },
        {
          "name": "P3A-I03: department validity must survive waiting for the position creation lock",
          "error": "PATCH /org/departments/3: 404 {\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}"
        },
        {
          "name": "P3A-I04: generation must not overwrite a holder assignment committed after its initial plan",
          "error": "employee already seated in its unit must be skipped after acquiring its row lock\n\n7 !== 4\n"
        }
      ]
    }
  ]
}

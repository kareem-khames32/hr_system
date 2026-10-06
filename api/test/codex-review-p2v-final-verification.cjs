module.exports = {
  "target": "9a0037609ef5c4912139adbc0aaba97fb26d63e8",
  "trackedFilesUnchanged": 3318,
  "databasesAbsent": 16,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_employment_periods_test_90279865aff6d98e",
    "hr_employment_periods_migration_test_553fbc73562365f4",
    "hr_codex_p2v_independent_test_c5ce7067ca719879",
    "hr_codex_p2v_rollover_race_test_fefd44f5c16ec65b",
    "hr_codex_p2v_independent_test_31a30d9cc6fd371b",
    "hr_codex_p2v_independent_test_7242a156e712fc73",
    "hr_codex_p2v_payroll_race_test_bc33fcd63e7774b9",
    "hr_codex_p2v_payroll_race_test_560b74ddda6abcfc",
    "hr_codex_p2v_reason_test_c282de6106e3e941",
    "hr_recovery_test_742dddd7e3498bde",
    "hr_leave_year_end_test_73d758909106799c",
    "hr_payroll_coverage_test_91a046576eeaf2c2",
    "hr_payroll_settlement_test_fbb0627a88ffe98b",
    "hr_employment_window_test_e0bca0d1e6862766",
    "hr_settlement_payment_test_f6a7ea5db5b6bea9",
    "hr_recovery_test_fab5ac95e046deb5"
  ],
  "results": [
    {
      "file": "codex-review-p2v-results-batch.cjs",
      "counts": {
        "tests": 39,
        "failed": 0,
        "passed": 39,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 39,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2v-results-boundaries.cjs",
      "counts": {
        "tests": 5,
        "failed": 3,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2V B old future-dated leave cancellation must not restore days from the new period",
          "error": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n"
        },
        {
          "name": "P2V B hidden old payroll period must not be returned to new-branch employee reader",
          "error": "Foreign run period must be redacted, not only its id and name\n\ntrue !== false\n"
        },
        {
          "name": "P2V B a year rollover already reading old balances must not import their carry into new service",
          "error": "Old-service carry must not reach the current service balance\n\n10 !== 0\n"
        }
      ]
    },
    {
      "file": "codex-review-p2v-results-independent-final.cjs",
      "counts": {
        "tests": 4,
        "failed": 2,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2V B old future-dated leave cancellation must not restore days from the new period",
          "error": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n"
        },
        {
          "name": "P2V B hidden old payroll period must not be returned to new-branch employee reader",
          "error": "Foreign run period must be redacted, not only its id and name\n\ntrue !== false\n"
        }
      ]
    },
    {
      "file": "codex-review-p2v-results-independent.cjs",
      "counts": {
        "tests": 4,
        "failed": 2,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2V B old future-dated leave cancellation must not restore days from the new period",
          "error": "Frozen old leave must not refund new-period deductions\n\n0 !== 2\n"
        },
        {
          "name": "P2V B hidden old payroll period must not be returned to new-branch employee reader",
          "error": "Cannot read properties of undefined (reading 'filter')"
        }
      ]
    },
    {
      "file": "codex-review-p2v-results-old-payroll-race.cjs",
      "counts": {
        "tests": 1,
        "failed": 1,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2V B rehire and old-period calculation must not both commit an unresolved old payroll item",
          "error": "A calculation evaluating after rehire commits must agree with the fresh calculation\n+ actual - expected\n\n+ 'INCLUDED'\n- 'EXCLUDED'\n"
        }
      ]
    },
    {
      "file": "codex-review-p2v-results-payroll-race.cjs",
      "counts": {
        "tests": 1,
        "failed": 1,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2V B calculation waiting for employee financial lock must evaluate the committed new service",
          "error": "A calculation evaluating after rehire commits must agree with the fresh calculation\n+ actual - expected\n\n+ 'EXCLUDED'\n- 'INCLUDED'\n"
        }
      ]
    },
    {
      "file": "codex-review-p2v-results-reason.cjs",
      "counts": {
        "tests": 1,
        "failed": 1,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2V A accepted 500-character return reason should retain its final explanation in history",
          "error": "An accepted reason must not lose its final explanation to the automatic prefix\n\nfalse !== true\n"
        }
      ]
    },
    {
      "file": "codex-review-p2v-results-regressions.cjs",
      "counts": {
        "tests": 101,
        "failed": 0,
        "passed": 101,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 101,
        "suites": 0
      },
      "failures": []
    }
  ]
}

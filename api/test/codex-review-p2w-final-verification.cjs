module.exports = {
  "target": "57018ce4d225df0cf5f675b4779f7deb7a07e24a",
  "trackedFilesUnchanged": 3347,
  "databasesAbsent": 14,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_employment_periods_test_7556c65c42cec84e",
    "hr_employment_periods_migration_test_d44773ecb3c4e55a",
    "hr_codex_p2w_payroll_race_test_45d4bff2a62607dc",
    "hr_codex_p2w_reason_test_6dfe326e87496de5",
    "hr_codex_p2w_empty_row_approval_test_f74aee8ba09b821c",
    "hr_codex_p2w_empty_row_approval_test_be573777c45cab35",
    "hr_codex_p2w_fix_controls_test_aa193f46e916be28",
    "hr_leave_year_end_test_b467d1b788ceef3d",
    "hr_recovery_test_41792124a95bc48e",
    "hr_employee_suspension_test_22c87656f60459c3",
    "hr_payroll_coverage_test_41ff9f4e811a501c",
    "hr_payroll_settlement_test_45ad865bcabe5c27",
    "hr_codex_p2w_residual_writers_test_16ec455eddbc8a05",
    "hr_codex_p2w_residual_writers_test_1a132563b6416517"
  ],
  "results": [
    {
      "file": "codex-review-p2w-results-closure.cjs",
      "counts": {
        "tests": 46,
        "failed": 0,
        "passed": 46,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 46,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2w-results-empty-row-approval-final.cjs",
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
          "name": "P2W approval crossing rehire must not spend extra days from an empty stale-anniversary row",
          "error": "An approval must not spend three days when the new-service reference has fewer than two\n+ actual - expected\n\n+ Leave {\n+   attachmentDueDate: null,\n+   attachmentRef: null,\n+   attachmentStatus: null,\n+   days: 3,\n+   employeeId: 5,\n+   fromDate: '2027-01-29',\n+   id: 1,\n+   isUnpaid: false,\n+   leaveTypeCode: 'ANNUAL',\n+   period: 'FULL',\n+   requestId: 1,\n+   revokedAt: null,\n+   revokedByUserId: null,\n+   status: 'APPROVED',\n+   toDate: '2027-01-31'\n+ }\n- null\n"
        }
      ]
    },
    {
      "file": "codex-review-p2w-results-empty-row-approval.cjs",
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
      "file": "codex-review-p2w-results-fix-controls.cjs",
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
      "failures": []
    },
    {
      "file": "codex-review-p2w-results-regressions.cjs",
      "counts": {
        "tests": 57,
        "failed": 0,
        "passed": 57,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 57,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2w-results-residual-writers-final.cjs",
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
          "name": "P2W profile opening-balance write begun in old service must not land in the new service",
          "error": "An old-service profile operation must finish before freezing or reject its delayed balance update\n\n10 !== 0\n"
        },
        {
          "name": "P2W an empty balance inserted after rehire must not preserve the old hire-anniversary window",
          "error": "A supposedly empty stale row must not change new-service accrual\n\n4.25 !== 1.78\n"
        }
      ]
    },
    {
      "file": "codex-review-p2w-results-residual-writers.cjs",
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
          "name": "P2W profile opening-balance write begun in old service must not land in the new service",
          "error": "An old-service profile operation must finish before freezing or reject its delayed balance update\n\n10 !== 0\n"
        },
        {
          "name": "P2W an empty balance inserted after rehire must not preserve the old hire-anniversary window",
          "error": "Cannot read properties of null (reading 'remaining')"
        }
      ]
    }
  ]
}

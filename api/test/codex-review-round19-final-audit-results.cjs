module.exports = {
  "checkedAt": "2026-09-28T12:49:02.240Z",
  "head": "41b47c854656af5349a2a3626509644b4ad222f5",
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "executions": [
    {
      "file": "codex-review-round19-results-independent.cjs",
      "selected": [
        "codex-review-round19-locks",
        "codex-review-round19-overtime",
        "codex-review-round19-bank-pay-codes"
      ],
      "success": true,
      "counts": {
        "tests": 12,
        "failed": 0,
        "passed": 12,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 12,
        "suites": 0
      }
    },
    {
      "file": "codex-review-round19-results-prior.cjs",
      "selected": [
        "codex-review-round18-locks",
        "codex-review-round18-overtime",
        "codex-review-round18-required-fields"
      ],
      "success": true,
      "counts": {
        "tests": 16,
        "failed": 0,
        "passed": 16,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 16,
        "suites": 0
      }
    },
    {
      "file": "codex-review-round19-results-regression.cjs",
      "selected": [
        "national-id-or-passport",
        "overtime-auto-approve-period",
        "employee-bulk-update",
        "employee-suspension",
        "user-branch-scopes"
      ],
      "success": true,
      "counts": {
        "tests": 44,
        "failed": 0,
        "passed": 44,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 44,
        "suites": 0
      }
    }
  ],
  "databaseCount": 9,
  "databases": [
    {
      "name": "hr_bulk_update_test_2ffb0d847c26a15c",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r18_locks_test_930173c6ae5e8db9",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r19_locks_test_ceaa190fac3a1c0a",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r19_overtime_test_e64371adc5bd75ca",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_employee_suspension_test_bb53af1422a95bac",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_identity_test_0351bb15ef12ef6f",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_2147ca540a40b668",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_c668837ad667dcd5",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_user_branch_scopes_test_257df64ac1731c68",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "product": [
    {
      "file": "api/src/attendance/attendance.service.ts",
      "sha256": "5be8e7214a226912283458698433c701d4faed784fe2bd03a16c047465a6f2ff",
      "unchanged": true
    },
    {
      "file": "api/src/attendance/overtime-window-view.ts",
      "sha256": "44254d763e7513e1e8c7a458f946a62e95a41ee02e797e122a85fba0e08db805",
      "unchanged": true
    },
    {
      "file": "api/src/employees/employees.service.ts",
      "sha256": "f8c9f2d4c3418e303b80369d34fea7ad02f8e5647fae929ed3b19ea0a76bed10",
      "unchanged": true
    }
  ],
  "productDiffFromTarget": "",
  "priorEvidenceChanged": [],
  "workingTreeStatus": "M api/test/codex-review-round2-performance-results.cjs\n?? .next-fr-preview/\n?? CODEX_REVIEW_REPORT_19.md\n?? api/test/codex-review-round19-bank-pay-codes.integration.cjs\n?? api/test/codex-review-round19-build-overtime.cjs\n?? api/test/codex-review-round19-final-audit.cjs\n?? api/test/codex-review-round19-fixture.cjs\n?? api/test/codex-review-round19-locks.integration.cjs\n?? api/test/codex-review-round19-overtime-extra.cjs\n?? api/test/codex-review-round19-overtime.integration.cjs\n?? api/test/codex-review-round19-preload.cjs\n?? api/test/codex-review-round19-prepare.cjs\n?? api/test/codex-review-round19-results-independent.cjs\n?? api/test/codex-review-round19-results-prior.cjs\n?? api/test/codex-review-round19-results-regression.cjs\n?? api/test/codex-review-round19-scope-evidence.cjs\n?? api/test/codex-review-round19-suite.cjs\n?? docs/migrations/runs/20260926165342_apply_hr_system.json",
  "secretScan": {
    "files": 15,
    "filesWithMatches": []
  },
  "temporaryFilesRemaining": [],
  "emptyDirectoryRetained": true,
  "staticChecks": {
    "api": "tsc --noEmit --incremental false: exit 0",
    "frontend": "tsc --noEmit --incremental false: exit 0"
  },
  "performanceMeasured": false
}

module.exports = {
  "checkedAt": "2026-09-28T12:32:22.787Z",
  "head": "77da57066c2514e3a4f83f329a2b05082e839d3e",
  "databaseCount": 14,
  "databases": [
    {
      "name": "hr_bulk_update_test_3f9f1ce646c37184",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r17_identity_test_67b4e6478e7a1beb",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r18_locks_test_9a3028747ade124e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r18_locks_test_9fe602c40b6c13dc",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r18_locks_test_cf925c6367f12aea",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_employee_suspension_test_2adc49d2ec070a2e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_identity_test_bc9c6d163ed72423",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_2e7c67411611d872",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_3107eec39f32017e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_4fc19ed0e6587609",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_67b9b7fe1639988f",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_f3f7d6c2c3cdb2cd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_dispatch_test_d9139f864b9ed01e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_ot_test_5d9043a531a8af86",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "product": [
    {
      "file": "api/src/attendance/attendance.service.ts",
      "sha256": "7594bea200109e600e86536ba1e2735e39b783173a2b8478522a1c2c9c87e739",
      "unchanged": true
    },
    {
      "file": "api/src/attendance/overtime-window-view.ts",
      "sha256": "b6b5420a191eb4ec7e5263380010f571f26f7524a334e08c9c832ba810de0783",
      "unchanged": true
    },
    {
      "file": "api/src/employees/employees.dto.ts",
      "sha256": "8cb603ad4a0b0509c6b19a85eedf9e556abaec0de62ed5c8137c585d5b6b7e88",
      "unchanged": true
    },
    {
      "file": "api/src/employees/employees.service.ts",
      "sha256": "fd563b0c39a445f1d02f069b9a1bd72a805ce7d3b10b5c8e95a953d0c003e770",
      "unchanged": true
    },
    {
      "file": "api/src/requests/requests.service.ts",
      "sha256": "1ea26886ca5b8a3de49676592498cf67de989fb68b3191f05f644d4da83fb9b7",
      "unchanged": true
    }
  ],
  "productDiffFromTarget": "",
  "priorEvidenceChanged": [],
  "workingTreeStatus": "M api/test/codex-review-round2-performance-results.cjs\n?? .next-fr-preview/\n?? CODEX_REVIEW_REPORT_18.md\n?? api/test/codex-review-round18-build-overtime.cjs\n?? api/test/codex-review-round18-final-audit-results.cjs\n?? api/test/codex-review-round18-final-audit.cjs\n?? api/test/codex-review-round18-fixture.cjs\n?? api/test/codex-review-round18-locks.integration.cjs\n?? api/test/codex-review-round18-overtime-extra.cjs\n?? api/test/codex-review-round18-overtime.integration.cjs\n?? api/test/codex-review-round18-preload.cjs\n?? api/test/codex-review-round18-prepare.cjs\n?? api/test/codex-review-round18-required-fields.integration.cjs\n?? api/test/codex-review-round18-results-boundaries.cjs\n?? api/test/codex-review-round18-results-independent-final.cjs\n?? api/test/codex-review-round18-results-locks.cjs\n?? api/test/codex-review-round18-results-overtime.cjs\n?? api/test/codex-review-round18-results-prior.cjs\n?? api/test/codex-review-round18-results-regression.cjs\n?? api/test/codex-review-round18-scope-evidence.cjs\n?? api/test/codex-review-round18-suite.cjs\n?? docs/migrations/runs/20260926165342_apply_hr_system.json",
  "concurrentRunNote": "Round2 performance result changed outside this review selected runs; left untouched. This review did not run or restore it.",
  "secretScan": {
    "files": 19,
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

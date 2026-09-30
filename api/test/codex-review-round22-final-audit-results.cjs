module.exports = {
  "checkedAt": "2026-09-30T15:31:17.670Z",
  "head": "27741078ee376b8e7b492d3a5d45817e147e8aac",
  "target": "27741078ee376b8e7b492d3a5d45817e147e8aac",
  "snapshotHead": "27741078ee376b8e7b492d3a5d45817e147e8aac",
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "executions": [
    {
      "file": "codex-review-round22-results-confirmed.cjs",
      "selected": [
        "codex-review-round22-independent"
      ],
      "success": true,
      "counts": {
        "tests": 6,
        "failed": 0,
        "passed": 6,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      }
    },
    {
      "file": "codex-review-round22-results-independent.cjs",
      "selected": [
        "codex-review-round22-independent"
      ],
      "success": false,
      "counts": {
        "tests": 6,
        "failed": 1,
        "passed": 5,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      }
    },
    {
      "file": "codex-review-round22-results-legacy.cjs",
      "selected": [
        "codex-review-round22-independent"
      ],
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
      }
    },
    {
      "file": "codex-review-round22-results-regression.cjs",
      "selected": [
        "org-filter-context",
        "financial-report",
        "payroll-approval-chain-disbursement",
        "disbursed-recorded-split"
      ],
      "success": true,
      "counts": {
        "tests": 24,
        "failed": 0,
        "passed": 24,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 24,
        "suites": 0
      }
    },
    {
      "file": "codex-review-round22-results-ui.cjs",
      "selected": [
        "codex-review-round22-ui"
      ],
      "success": true,
      "counts": {
        "tests": 28,
        "failed": 0,
        "passed": 28,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 28,
        "suites": 0
      }
    }
  ],
  "databaseCount": 7,
  "databases": [
    {
      "name": "hr_chain_disburse_test_3ae5ec10b9694c50",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r22_independent_test_1ef9f1900490ffcc",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r22_independent_test_9e2ba64eead4eec4",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r22_independent_test_fb7cfca099123142",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_financial_report_test_88725d2753d9ac32",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_org_filter_test_29c969ad959cff26",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_recorded_split_test_9b03d4d1197cc9cc",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "product": [
    {
      "file": "api/src/payroll/bank-sheet.controller.ts",
      "sha256": "3b56f7c280606c8f7d21a75b6657eee335ffba4cb25b8f9e683d5359ebc40b1d",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/bank-sheet.ts",
      "sha256": "144c8fba27541f5be16ed8b346974e9860c87aa9635f6c3ec08f113d11d45280",
      "unchanged": true
    },
    {
      "file": "api/src/reports/reports.controller.ts",
      "sha256": "adaa786116d054bf39aeda82e6720b9609af4b8106e887a79cbb96f47ef92576",
      "unchanged": true
    },
    {
      "file": "src/app/payroll/bank-sheet/page.tsx",
      "sha256": "ee42013e79ecc131f435f6843b2bf60303f7b26cbba3685f48cf3ef2ebb161bb",
      "unchanged": true
    },
    {
      "file": "src/lib/bank-sheet-filter.ts",
      "sha256": null,
      "unchanged": true
    },
    {
      "file": "src/lib/reports-org-api.ts",
      "sha256": "54e7c52bc84c5b555eafb8dd22dd1c950fcccaf7de1e90129d74dde5c8f4addd",
      "unchanged": true
    }
  ],
  "snapshotProductDiff": "",
  "originalProductDiff": "",
  "priorEvidenceChanged": [],
  "workingTreeStatus": "?? .next-fr-preview/\n?? CODEX_REVIEW_REPORT_22.md\n?? SYSTEM_ANALYSIS_2026-09-29.md\n?? api/test/codex-review-round22-final-audit.cjs\n?? api/test/codex-review-round22-fixture.cjs\n?? api/test/codex-review-round22-independent.integration.cjs\n?? api/test/codex-review-round22-preload.cjs\n?? api/test/codex-review-round22-prepare.cjs\n?? api/test/codex-review-round22-results-confirmed.cjs\n?? api/test/codex-review-round22-results-independent.cjs\n?? api/test/codex-review-round22-results-legacy.cjs\n?? api/test/codex-review-round22-results-regression.cjs\n?? api/test/codex-review-round22-results-ui.cjs\n?? api/test/codex-review-round22-scope-evidence.cjs\n?? api/test/codex-review-round22-static-checks.cjs\n?? api/test/codex-review-round22-suite.cjs\n?? api/test/codex-review-round22-ui.integration.cjs\n?? docs/migrations/runs/20260926165342_apply_hr_system.json",
  "secretScan": {
    "files": 15,
    "filesWithMatches": []
  },
  "environmentFileCopied": false,
  "cleanup": {
    "removedSnapshot": true,
    "removedTemporaryDirectory": true,
    "temporaryEntriesBeforeRemoval": [
      "v8-compile-cache"
    ],
    "dependencies": [
      {
        "path": "D:\\projects\\hr_system\\node_modules",
        "preserved": true
      },
      {
        "path": "D:\\projects\\hr_system\\api\\node_modules",
        "preserved": true
      }
    ]
  },
  "staticChecks": {
    "api": "tsc --noEmit --incremental false: exit 0",
    "frontend": "tsc --noEmit --incremental false: exit 0"
  },
  "performanceMeasured": false
}

module.exports = {
  "checkedAt": "2026-10-02T23:27:38.675Z",
  "target": "f7a184e2bdcacecdab025194cf905bb8eb677e58",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 1817,
  "trackedFilesChanged": [
    "api/test/branch-separation.test.cjs"
  ],
  "baselineProductDiff": "",
  "productFilesChanged": [],
  "concurrentChanges": [
    {
      "file": "api/test/branch-separation.test.cjs",
      "beforeSha256": "b646d6c9aac023175f169cb1ee443942dcd7376f5d028416b2c992294d9ed239",
      "afterSha256": "ca13e5f988dbbf17ecefc4bdc453952279b1a2863fbdc3cba75171bea51ad350",
      "reviewEdited": false,
      "reviewExecuted": false
    }
  ],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 20,
  "databases": [
    {
      "name": "hr_chain_disburse_test_9f07ae528bd800e6",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r23_exemptions_test_65dcef2725d43c0b",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r23_payslips_test_983b7a2dced14d20",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r23_previews_test_3d98653755121278",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_exemptions_test_acdb54e5b533da78",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_mutations_test_3746267447a98772",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_boundaries_test_464a940ef94d6b88",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_boundaries_test_e2c2a01b3b93efb3",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_correction_edges_test_2a00641a362101f8",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_correction_edges_test_8bad974cb645a5ff",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_correction_edges_test_b7f431dd7a9f2cd7",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_exemption_edges_test_a2a2b9584ccdcbdf",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_corrections_test_519e6456cafa30b8",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_exemptions_test_93121d24b1542b8c",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_overview_filters_test_883dd6b5c145ce86",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_settle_test_fb9bdcf87a40b96e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payslip_leaks_test_6e31520dbc52eeb6",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_policy_engine_test_9035952a6e41fd18",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_policy_publish_test_7a3701291c022a6a",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_run_definition_test_040e2f6cda26d26f",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "executions": [
    {
      "file": "codex-review-round25-results-affected.cjs",
      "selected": [
        "payroll-response-leaks",
        "payroll-financial-exemptions",
        "payroll-corrections",
        "payroll-run-definition",
        "payroll-overview-filters",
        "payroll-policy-publish",
        "payroll-policy-snapshot-engine",
        "payroll-suspended-archived-settlement",
        "payroll-approval-chain-disbursement"
      ],
      "counts": {
        "tests": 51,
        "failed": 0,
        "passed": 51,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 51,
        "suites": 0
      },
      "success": true
    },
    {
      "file": "codex-review-round25-results-boundaries-corrected.cjs",
      "selected": [
        "codex-review-round25-boundaries"
      ],
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
      "success": true
    },
    {
      "file": "codex-review-round25-results-boundaries.cjs",
      "selected": [
        "codex-review-round25-boundaries"
      ],
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
      "success": false
    },
    {
      "file": "codex-review-round25-results-correction-edges.cjs",
      "selected": [
        "codex-review-round25-correction-edges"
      ],
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
      "success": false
    },
    {
      "file": "codex-review-round25-results-correction-final-v2.cjs",
      "selected": [
        "codex-review-round25-correction-edges"
      ],
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
      "success": false
    },
    {
      "file": "codex-review-round25-results-correction-final.cjs",
      "selected": [
        "codex-review-round25-correction-edges"
      ],
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
      "success": false
    },
    {
      "file": "codex-review-round25-results-exemption-edges.cjs",
      "selected": [
        "codex-review-round25-exemption-edges"
      ],
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
      "success": true
    },
    {
      "file": "codex-review-round25-results-policy-publish.cjs",
      "selected": [
        "payroll-policy-publish"
      ],
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
      "success": true
    },
    {
      "file": "codex-review-round25-results-prior-independent.cjs",
      "selected": [
        "codex-review-round24-exemptions",
        "codex-review-round24-mutations",
        "codex-review-round23-exemptions",
        "codex-review-round23-payslips",
        "codex-review-round23-previews"
      ],
      "counts": {
        "tests": 22,
        "failed": 0,
        "passed": 22,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 22,
        "suites": 0
      },
      "success": true
    },
    {
      "file": "codex-review-round25-results-ui.cjs",
      "selected": [
        "codex-review-round25-ui"
      ],
      "counts": {
        "tests": 18,
        "failed": 0,
        "passed": 18,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 18,
        "suites": 0
      },
      "success": true
    }
  ],
  "secretScan": {
    "files": 26,
    "filesWithMatches": []
  },
  "cleanup": {
    "privateTemporaryDirectoryRemoved": true,
    "preservedSuppliedWorktreesAndDependencies": [
      "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix",
      "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e",
      "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\node_modules",
      "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\node_modules",
      "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\node_modules",
      "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\api\\node_modules"
    ]
  },
  "staticChecks": {
    "target": "f7a184e2bdcacecdab025194cf905bb8eb677e58",
    "results": [
      {
        "area": "api",
        "exitCode": 0,
        "diagnostics": ""
      },
      {
        "area": ".",
        "exitCode": 0,
        "diagnostics": ""
      }
    ]
  },
  "performanceMeasured": false
}

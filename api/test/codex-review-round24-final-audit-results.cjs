module.exports = {
  "checkedAt": "2026-10-02T21:52:15.718Z",
  "target": "31cd394d6bb0abe98244ee409baef3f6c3db6d96",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 1796,
  "trackedFilesChanged": [],
  "baselineProductDiff": "",
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 11,
  "databases": [
    {
      "name": "hr_chain_disburse_test_f9293d2ad5052b8b",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r23_exemptions_test_756e3720932f6e67",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r23_payslips_test_d3e6037c5c6791c0",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r23_previews_test_c408e86fa6c35bbd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_exemptions_test_5bea57585b3256dd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_exemptions_test_e4e69f07cca0b48e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_mutations_test_96f916a77a89960a",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_mutations_test_b5552317977f8cf2",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_mutations_test_cfee69ab889dd015",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_exemptions_test_f15b9affb231bf11",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payslip_leaks_test_08b5ddc23d2db4db",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "executions": [
    {
      "file": "codex-review-round24-results-expanded-exemptions.cjs",
      "selected": [
        "codex-review-round24-exemptions"
      ],
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
      "success": false
    },
    {
      "file": "codex-review-round24-results-final-independent.cjs",
      "selected": [
        "codex-review-round24-exemptions",
        "codex-review-round24-mutations"
      ],
      "counts": {
        "tests": 8,
        "failed": 1,
        "passed": 7,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      },
      "success": false
    },
    {
      "file": "codex-review-round24-results-membership-boundary.cjs",
      "selected": [
        "codex-review-round24-mutations"
      ],
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
      "success": false
    },
    {
      "file": "codex-review-round24-results-mutation-matrix.cjs",
      "selected": [
        "codex-review-round24-mutations"
      ],
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
      "success": true
    },
    {
      "file": "codex-review-round24-results-prior-independent.cjs",
      "selected": [
        "codex-review-round23-exemptions",
        "codex-review-round23-payslips",
        "codex-review-round23-previews"
      ],
      "counts": {
        "tests": 13,
        "failed": 0,
        "passed": 13,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 13,
        "suites": 0
      },
      "success": true
    },
    {
      "file": "codex-review-round24-results-regression.cjs",
      "selected": [
        "payroll-response-leaks",
        "payroll-financial-exemptions",
        "payroll-approval-chain-disbursement"
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
    }
  ],
  "secretScan": {
    "files": 19,
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
    "target": "31cd394d6bb0abe98244ee409baef3f6c3db6d96",
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

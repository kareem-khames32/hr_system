module.exports = {
  "checkedAt": "2026-10-03T00:02:01.622Z",
  "target": "84f26e8ecf9f1bf311169a14561a22d8c2f5a3b2",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 1846,
  "trackedFilesChanged": [],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 11,
  "databases": [
    {
      "name": "hr_codex_r24_exemptions_test_0f91a802d80e1012",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_mutations_test_bfb4673a14ac9845",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_boundaries_test_e45bf1faeb945d39",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_correction_edges_test_14d28738b5e2c0cc",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_exemption_edges_test_8c23c7b5024de523",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r26_independent_test_1006a08d67870986",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_corrections_test_da6864d0ba8ac49f",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_exemptions_test_e15cd0ac1ae54e35",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_membership_moves_test_21bb485d8c855336",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payslip_leaks_test_02d821d2af087f7b",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_run_definition_test_9d73f09f1d46ba4d",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "secretScan": {
    "files": 17,
    "filesWithMatches": []
  },
  "privateTemporaryDirectoryRemoved": true,
  "preservedSuppliedWorktreesAndDependencies": [
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e",
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\node_modules",
    "D:\\projects\\hr_system\\.claude\\worktrees\\base-162d50e\\api\\node_modules"
  ],
  "evidence": {
    "target": "84f26e8ecf9f1bf311169a14561a22d8c2f5a3b2",
    "comparedProductRange": "f7a184e..84f26e8",
    "counts": {
      "tests": 97,
      "passed": 94,
      "failed": 3
    },
    "executions": [
      {
        "file": "codex-review-round26-results-previous.cjs",
        "selected": [
          "codex-review-round25-boundaries",
          "codex-review-round25-correction-edges",
          "codex-review-round25-exemption-edges",
          "codex-review-round25-ui",
          "codex-review-round24-exemptions",
          "codex-review-round24-mutations"
        ],
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
        "file": "codex-review-round26-results-affected.cjs",
        "selected": [
          "payroll-corrections",
          "payroll-run-membership-moves",
          "payroll-financial-exemptions",
          "payroll-response-leaks",
          "payroll-run-definition",
          "codex-review-round26-ui"
        ],
        "counts": {
          "tests": 54,
          "failed": 0,
          "passed": 54,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 54,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round26-results-independent.cjs",
        "selected": [
          "codex-review-round26-independent"
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
        "failures": [
          {
            "file": "codex-review-round26-independent.integration.cjs",
            "name": "CR26 a transfer between supplementary creation and calculation must not leave the old branch able to read or revoke its exemption",
            "error": "The original grantor must not read a carried copy in a foreign payroll\n\n200 !== 403\n"
          },
          {
            "file": "codex-review-round26-independent.integration.cjs",
            "name": "CR26 dated organisation must govern the carried exemption just as it governs supplementary membership",
            "error": "Current profile placement must not disclose an exemption belonging to historical branch A\n\n200 !== 403\n"
          },
          {
            "file": "codex-review-round26-independent.integration.cjs",
            "name": "CR26 mixed supplementary header must not expose a foreign carried exemption reference in the parent event",
            "error": "The parent payroll event must apply the same reference redaction as the exemption event"
          }
        ]
      }
    ],
    "rawSerializersComparedWithPreviousCommit": [
      {
        "name": "describePayrollRunCorrection",
        "unchanged": true,
        "sha256": "20ed1daec13f38fa5fa683ee0deff92acf20e24121c9f6d6918cb08fd2bb4ecb"
      },
      {
        "name": "describePayrollItemReversal",
        "unchanged": true,
        "sha256": "a57d157769d83e58989a7790ab171848b8fac0877d20f0cd910e812713778b90"
      }
    ],
    "notes": {
      "runtimeTarget": "84f26e8",
      "oldRuntimeExecuted": false,
      "fullResponseCheck": "Actual HTTP correction and reversal bodies compared by deep equality to unchanged raw serializers on the same disposable data.",
      "directFixtureUpdates": "Employee placement was prepared on the disposable database; the dated case also uses appendEmployeeOrgCalendar in a transaction. Payroll and exemption actions use the guarded API.",
      "performanceMeasured": false
    },
    "staticChecks": {
      "target": "84f26e8ecf9f1bf311169a14561a22d8c2f5a3b2",
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
    }
  },
  "performanceMeasured": false
}

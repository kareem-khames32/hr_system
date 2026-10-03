module.exports = {
  "checkedAt": "2026-10-03T03:36:25.542Z",
  "target": "2ba6575a9c06081b46e8d3b3d17645c4c7ce09cd",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 1990,
  "trackedFilesChanged": [],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 7,
  "databases": [
    {
      "name": "hr_chain_disburse_test_5033c25b11f1a1ee",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r32_holiday_effects_test_5c0935f67224ee54",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r32_independent_test_81b66ab62af30f48",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r32_postwrite_test_1b5204e1cc787b0a",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r33_independent_test_97a8ca08e5b5e7e4",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r33_independent_test_bc4ca84846fc020c",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_allowances_test_a052f3e54ae51dcc",
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
    "target": "2ba6575a9c06081b46e8d3b3d17645c4c7ce09cd",
    "comparedProductRange": "7e08fb1..2ba6575",
    "relatedCodeLimit": "162d50e..2ba6575",
    "counts": {
      "tests": 35,
      "passed": 33,
      "failed": 2,
      "skipped": 0
    },
    "executions": [
      {
        "file": "codex-review-round33-results-previous.cjs",
        "selected": [
          "codex-review-round32-postwrite",
          "codex-review-round32-independent",
          "codex-review-round32-holiday-effects"
        ],
        "counts": {
          "tests": 10,
          "failed": 0,
          "passed": 10,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 10,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round33-results-affected.cjs",
        "selected": [
          "payroll-allowances",
          "payroll-approval-chain-disbursement"
        ],
        "counts": {
          "tests": 15,
          "failed": 0,
          "passed": 15,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 15,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round33-results-independent-confirmed.cjs",
        "selected": [
          "codex-review-round33-independent"
        ],
        "counts": {
          "tests": 10,
          "failed": 2,
          "passed": 8,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 10,
          "suites": 0
        },
        "failures": [
          {
            "file": "codex-review-round33-independent.integration.cjs",
            "name": "CR33 cancellation refusal for foreign approved payroll must not expose its identifier",
            "error": "A refusal must preserve financial protection without disclosing the hidden payroll identifier"
          },
          {
            "file": "codex-review-round33-independent.integration.cjs",
            "name": "CR33 cancellation refusal for foreign paid payroll must not expose its identifier",
            "error": "A refusal must preserve financial protection without disclosing the hidden payroll identifier"
          }
        ]
      }
    ],
    "diagnostics": [
      {
        "case": "allowance-postcommit-foreign-run",
        "responseStatus": 201,
        "response": {
          "id": 1,
          "created": 1,
          "skippedDuplicates": 0,
          "amount": 150.25,
          "total": 150.25,
          "recalculateRuns": [],
          "lockedRuns": []
        },
        "foreignRead": 403,
        "foreignRunId": 1,
        "foreignName": "CR32 NEW PRIVATE B PAYROLL",
        "memberBranchIds": [
          2
        ],
        "leaked": false
      },
      {
        "case": "allowance-postcommit-control",
        "created": 1,
        "total": 150.25,
        "inScopeRunReturned": true
      },
      {
        "case": "holiday-response-after-move",
        "phase": "after-commit",
        "responseStatus": 200,
        "getOldBranch": 404,
        "response": {
          "today": "2026-10-03",
          "canSeeAmounts": false,
          "order": {
            "id": 1,
            "kind": "ORDER",
            "name": "CR32 known saved 1",
            "status": "ACTIVE",
            "movedOutOfScope": true
          },
          "overtime": {
            "recomputed": 0,
            "failed": 0
          }
        },
        "foreignNamePresent": false,
        "submittedName": "CR32 known saved 1",
        "foreignName": "CR32 PRIVATE B ONLY 1"
      },
      {
        "case": "holiday-response-after-move",
        "phase": "after-reload",
        "responseStatus": 200,
        "getOldBranch": 404,
        "response": {
          "today": "2026-10-03",
          "canSeeAmounts": false,
          "order": {
            "id": 2,
            "kind": "ORDER",
            "name": "CR32 known saved 2",
            "status": "ACTIVE",
            "movedOutOfScope": true
          },
          "overtime": {
            "recomputed": 0,
            "failed": 0
          }
        },
        "foreignNamePresent": false,
        "submittedName": "CR32 known saved 2",
        "foreignName": "CR32 PRIVATE B ONLY 2"
      },
      {
        "case": "period-company-first",
        "action": "update",
        "companyUpdate": 200,
        "oldCommand": 403,
        "stateUnchanged": true
      },
      {
        "case": "period-company-first",
        "action": "delete",
        "companyUpdate": 200,
        "oldCommand": 403,
        "stateUnchanged": true
      },
      {
        "case": "period-old-command-first",
        "action": "update",
        "command": 200,
        "laterCompany": 200,
        "responseFromOwnWrite": true
      },
      {
        "case": "period-old-command-first",
        "action": "delete",
        "command": 200,
        "laterCompany": 404,
        "responseFromOwnWrite": true
      },
      {
        "case": "holiday-update-financial-effects",
        "initialCredit": 300,
        "newCredit": 225,
        "afterCancel": 0,
        "coveredOvertimeRecomputed": 1,
        "replyEqualsGet": true,
        "noDuplicateCredit": true
      },
      {
        "case": "allowance-cancellation",
        "foreign": false,
        "action": "line",
        "rows": 1,
        "referenceVisible": true,
        "netBefore": 9150.25,
        "netAfter": 9000,
        "companyReferenceVisible": true
      },
      {
        "case": "allowance-cancellation",
        "foreign": false,
        "action": "grant",
        "rows": 2,
        "referenceVisible": true,
        "netBefore": 9150.25,
        "netAfter": 9000,
        "companyReferenceVisible": true
      },
      {
        "case": "allowance-cancellation",
        "foreign": true,
        "action": "line",
        "rows": 1,
        "referenceVisible": false,
        "netBefore": 9150.25,
        "netAfter": 9000,
        "companyReferenceVisible": true
      },
      {
        "case": "allowance-cancellation",
        "foreign": true,
        "action": "grant",
        "rows": 2,
        "referenceVisible": false,
        "netBefore": 9150.25,
        "netAfter": 9000,
        "companyReferenceVisible": true
      },
      {
        "case": "allowance-mixed-member-scope",
        "members": 2,
        "allowanceEmployeeBranch": 2,
        "otherEmployeeBranch": 1,
        "referenceHidden": true
      },
      {
        "case": "allowance-refusal-reference",
        "paid": false,
        "responseStatus": 409,
        "response": {
          "message": "البدل ده في مسير معتمد (#6) — افتح المسير الأول وبعدين الغيه",
          "error": "Conflict",
          "statusCode": 409
        },
        "foreignRunId": 6,
        "listRunId": null,
        "directRead": 403,
        "ledgerUnchanged": true,
        "leaked": true
      },
      {
        "case": "allowance-refusal-reference",
        "paid": true,
        "responseStatus": 409,
        "response": {
          "message": "البدل ده اتصرف في مسير #7 — مينفعش يتلغي",
          "error": "Conflict",
          "statusCode": 409
        },
        "foreignRunId": 7,
        "listRunId": null,
        "directRead": 403,
        "ledgerUnchanged": true,
        "leaked": true
      },
      {
        "case": "allowance-locked-response",
        "foreign": false,
        "total": 150.25,
        "lockedRuns": [
          {
            "id": 8,
            "name": "CR33 locked VISIBLE A 8",
            "status": "APPROVED"
          }
        ],
        "companyReferenceVisible": true
      },
      {
        "case": "allowance-locked-response",
        "foreign": true,
        "total": 150.25,
        "lockedRuns": [],
        "companyReferenceVisible": true
      },
      {
        "case": "legacy-payroll-reference",
        "ownVisible": true,
        "foreignHidden": true,
        "companyBothVisible": true,
        "fixture": "explicit pre-membership shape in disposable database only"
      }
    ],
    "sourceComparisons": [
      {
        "comparedFrom": "162d50e",
        "file": "api/src/payroll/allowances-grants.service.ts",
        "part": "cancelConflict",
        "unchanged": true
      },
      {
        "comparedFrom": "7e08fb1",
        "file": "api/src/payroll/allowances-grants.service.ts",
        "part": "monthRunsFor",
        "unchanged": true
      },
      {
        "comparedFrom": "7e08fb1",
        "file": "api/src/payroll/allowances-grants.service.ts",
        "part": "runsHolding",
        "unchanged": true
      },
      {
        "comparedFrom": "7e08fb1",
        "file": "api/src/payroll/allowances-grants.service.ts",
        "part": "cancelConflict",
        "unchanged": true
      },
      {
        "comparedFrom": "7e08fb1",
        "file": "api/src/payroll/allowances-grants.service.ts",
        "part": "lockedBranchTargets",
        "unchanged": true
      },
      {
        "comparedFrom": "7e08fb1",
        "file": "api/src/payroll/allowances-grants.service.ts",
        "part": "openRunItems",
        "unchanged": true
      }
    ],
    "notes": {
      "runtimeTarget": "2ba6575",
      "oldRuntimeExecuted": false,
      "closure": "Unmodified Round32 postwrite race passes: actual employee transfer and new foreign payroll after grant commit, response 201 with correct 150.25 and no foreign reference. Independently verified list, line cancellation and bulk cancellation for A-only and B-only snapshots. Company retains references; exact same in-scope references retained.",
      "finance": "Each employee has salary 9000 and allowance 150.25: actual calculated net 9150.25. Real line/bulk cancellation cancels only the intended PENDING obligation, actual recalculation yields otherAdditions 0 and net 9000. Foreign approved and paid scenarios use real approval/payment endpoints, refusal leaves the obligation and line unchanged.",
      "cases": "LockedRuns tested on actual approved payroll created between grant commit and reference lookup, both own and foreign. Mixed run with a different A member still hides the B allowance employee reference. Legacy-no-members fixture explicitly removes membership only in a disposable database and stamps run branch; own visible, foreign hidden, company both visible.",
      "blocker": "CR33-B01: after an A-stamped allowance employee actually transfers to B, a B-only payroll includes the allowance and is approved or paid. List correctly hides runId/name/status and disables cancel, direct run read is 403. Calling line cancellation returns 409 but cancelConflict embeds the hidden reserved/applied payroll ID (#6/#7 in these fixtures). Both states reproduced on two disposable databases. Financial protection is correct; only refusal-message redaction is missing.",
      "expectedFix": "Keep 409 and all locked financial checks; format the refusal with a run reference only if visible for this user and employee snapshot. Company keeps its identifying message. This is a concrete identifier disclosure, not merely deferred 403/404 existence differences.",
      "repeatedExecution": {
        "file": "codex-review-round33-results-independent.cjs",
        "classification": "First valid seven-case run (five pass, two reproduce blocker). Confirmed file repeats these and adds three successful boundary cases on a second database; repeats not double counted."
      },
      "preparationCorrection": "An initial affected-suite invocation named a nonexistent payroll-future-month test; it failed during file selection before any test or database creation. Corrected to the two existing affected files; no product failure.",
      "migrations": "None executed in this round.",
      "performanceMeasured": false,
      "fullSuiteExecuted": false,
      "servicesStartedOrStopped": false,
      "companyDatabasesWritten": false
    },
    "staticChecks": {
      "target": "2ba6575a9c06081b46e8d3b3d17645c4c7ce09cd",
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

module.exports = {
  "checkedAt": "2026-10-03T02:39:50.835Z",
  "target": "f680ac1b08f2fff0c4e32b66fb51cecea1e3d000",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 1951,
  "trackedFilesChanged": [],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 11,
  "databases": [
    {
      "name": "hr_codex_r29_independent_test_cb23b81990a20bfd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r29_obligations_test_3627a94a5762e96a",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r30_independent_test_59bbfda7ecffbb63",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r31_holiday_scope_test_032a38878d8842b9",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r31_independent_test_2dc719cef23396ce",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r31_independent_test_7ff04e271f992bd0",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_holiday_work_test_801941de185bd715",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_auto_approve_test_0a777422ebdbedcd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_ot_dispatch_test_d30b95d431570049",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_ot_test_67d77a1101f22587",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_schedule_range_test_d96df372d18ba06c",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "secretScan": {
    "files": 18,
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
    "target": "f680ac1b08f2fff0c4e32b66fb51cecea1e3d000",
    "comparedProductRange": "5d4c52b..f680ac1",
    "relatedCodeLimit": "162d50e..f680ac1",
    "counts": {
      "tests": 127,
      "passed": 126,
      "failed": 1,
      "skipped": 0
    },
    "executions": [
      {
        "file": "codex-review-round31-results-previous.cjs",
        "selected": [
          "codex-review-round31-holiday-scope",
          "codex-review-round30-independent",
          "codex-review-round29-obligations",
          "codex-review-round29-independent"
        ],
        "counts": {
          "tests": 24,
          "failed": 0,
          "passed": 24,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 24,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round31-results-affected.cjs",
        "selected": [
          "holiday-work",
          "schedule-range-overtime-periods",
          "overtime-auto-approve-period",
          "overtime-immediate-dispatch",
          "payroll-overtime-request"
        ],
        "counts": {
          "tests": 96,
          "failed": 0,
          "passed": 96,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 96,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round31-results-independent-confirmed.cjs",
        "selected": [
          "codex-review-round31-independent"
        ],
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
            "file": "codex-review-round31-independent.integration.cjs",
            "name": "CR31 holiday update reply before-reload: a later foreign name must never enter the success fallback",
            "error": "The success response must not disclose a name saved later in the other branch"
          }
        ]
      }
    ],
    "diagnostics": [
      {
        "case": "holiday-order-branch-race",
        "action": "update",
        "companyChange": 200,
        "oldBranchReadAfterChange": 404,
        "oldMutationStatus": 404,
        "before": {
          "branchId": 2,
          "status": "ACTIVE"
        },
        "after": {
          "branchId": 2,
          "status": "ACTIVE"
        },
        "creditBefore": {
          "status": "PENDING",
          "amount": 300
        },
        "creditAfter": {
          "status": "PENDING",
          "amount": 300
        }
      },
      {
        "case": "holiday-order-branch-race",
        "action": "cancel",
        "companyChange": 200,
        "oldBranchReadAfterChange": 404,
        "oldMutationStatus": 404,
        "before": {
          "branchId": 2,
          "status": "ACTIVE"
        },
        "after": {
          "branchId": 2,
          "status": "ACTIVE"
        },
        "creditBefore": {
          "status": "PENDING",
          "amount": 300
        },
        "creditAfter": {
          "status": "PENDING",
          "amount": 300
        }
      },
      {
        "case": "holiday-order-controls",
        "foreignUpdate": 404,
        "foreignCancel": 404,
        "authorizedUpdate": 200,
        "authorizedCancel": 201
      },
      {
        "case": "financial-write-first",
        "action": "create",
        "exclusiveLock": true,
        "write": 201,
        "transfer": 200,
        "afterTransfer": 403,
        "amount": 321.09
      },
      {
        "case": "financial-write-first",
        "action": "cancel",
        "exclusiveLock": true,
        "write": 201,
        "transfer": 200,
        "afterTransfer": 403,
        "amount": 321.09
      },
      {
        "case": "paid-state-recheck",
        "cancelStatus": 400,
        "ledger": "APPLIED",
        "net": 9321.09,
        "expected": 9321.09
      },
      {
        "case": "allowance-target-recheck",
        "level": "employees",
        "transfer": 200,
        "status": 400,
        "employees": [],
        "remainingExpected": 0,
        "total": 0
      },
      {
        "case": "allowance-target-recheck",
        "level": "teams",
        "transfer": 200,
        "status": 201,
        "employees": [
          7
        ],
        "remainingExpected": 1,
        "total": 150.25
      },
      {
        "case": "named-target-recheck",
        "kind": "waiver",
        "transfer": 200,
        "status": 400,
        "noPartialSave": true
      },
      {
        "case": "named-target-recheck",
        "kind": "holiday-create",
        "transfer": 200,
        "status": 400,
        "noPartialSave": true
      },
      {
        "case": "named-target-recheck",
        "kind": "holiday-update",
        "transfer": 200,
        "status": 400,
        "noPartialSave": true
      },
      {
        "case": "obligation-transfer-race",
        "action": "create",
        "realTransferStatus": 200,
        "transferCommittedFirst": true,
        "oldBranchWriteStatus": 403,
        "oldBranchReply": {
          "message": "الموظف خارج نطاق فرعك — لا يمكنك إدارة مديونياته",
          "error": "Forbidden",
          "statusCode": 403
        },
        "newBranchBefore": [],
        "newBranchAfter": [],
        "ordinaryPostTransferDenied": 403
      },
      {
        "case": "obligation-transfer-race",
        "action": "cancel",
        "realTransferStatus": 200,
        "transferCommittedFirst": true,
        "oldBranchWriteStatus": 403,
        "oldBranchReply": {
          "message": "الموظف خارج نطاق فرعك — لا يمكنك إدارة مديونياته",
          "error": "Forbidden",
          "statusCode": 403
        },
        "newBranchBefore": [
          {
            "id": 1,
            "status": "PENDING",
            "amount": 321.09
          }
        ],
        "newBranchAfter": [
          {
            "id": 1,
            "status": "PENDING",
            "amount": 321.09
          }
        ],
        "ordinaryPostTransferDenied": 403
      },
      {
        "case": "obligation-controls",
        "create": 201,
        "foreignCreate": 403,
        "foreignCancel": 403,
        "authorizedCancel": 201
      },
      {
        "case": "instant-manual-equality",
        "kind": "bonus",
        "amount": 123.45,
        "eachObligations": 1,
        "replay": 409,
        "responseEqualsDetail": true
      },
      {
        "case": "response-atomicity",
        "kind": "bonus",
        "action": "approve",
        "exclusiveEmployeeLock": true,
        "failureRolledBack": true,
        "retry": 201,
        "responseEqualsDetail": true
      },
      {
        "case": "response-atomicity",
        "kind": "bonus",
        "action": "reject",
        "exclusiveEmployeeLock": true,
        "failureRolledBack": true,
        "retry": 201,
        "responseEqualsDetail": true
      },
      {
        "case": "response-atomicity",
        "kind": "bonus",
        "action": "cancel",
        "exclusiveEmployeeLock": true,
        "failureRolledBack": true,
        "retry": 201,
        "responseEqualsDetail": true
      },
      {
        "case": "instant-manual-equality",
        "kind": "deduction",
        "amount": 123.45,
        "eachObligations": 1,
        "replay": 409,
        "responseEqualsDetail": true
      },
      {
        "case": "response-atomicity",
        "kind": "deduction",
        "action": "approve",
        "exclusiveEmployeeLock": true,
        "failureRolledBack": true,
        "retry": 201,
        "responseEqualsDetail": true
      },
      {
        "case": "response-atomicity",
        "kind": "deduction",
        "action": "reject",
        "exclusiveEmployeeLock": true,
        "failureRolledBack": true,
        "retry": 201,
        "responseEqualsDetail": true
      },
      {
        "case": "response-atomicity",
        "kind": "deduction",
        "action": "cancel",
        "exclusiveEmployeeLock": true,
        "failureRolledBack": true,
        "retry": 201,
        "responseEqualsDetail": true
      },
      {
        "case": "loan-request-branch-recheck",
        "kind": "early",
        "transfer": 200,
        "oldApproval": 403,
        "rollbackComplete": true,
        "newBranchApproval": 201,
        "replayNoEffect": true,
        "amount": 123.45
      },
      {
        "case": "loan-request-branch-recheck",
        "kind": "defer",
        "transfer": 200,
        "oldApproval": 403,
        "rollbackComplete": true,
        "newBranchApproval": 201,
        "replayNoEffect": true,
        "amount": 900
      },
      {
        "case": "holiday-response-after-move",
        "phase": "before-reload",
        "responseStatus": 200,
        "getOldBranch": 404,
        "response": {
          "today": "2026-10-03",
          "canSeeAmounts": false,
          "order": {
            "id": 1,
            "kind": "ORDER",
            "name": "CR31 PRIVATE B ONLY 1",
            "status": "ACTIVE",
            "movedOutOfScope": true
          },
          "overtime": {
            "recomputed": 0,
            "failed": 0
          }
        },
        "foreignNamePresent": true,
        "submittedName": "CR31 known saved 1",
        "foreignName": "CR31 PRIVATE B ONLY 1"
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
            "name": "CR31 known saved 2",
            "status": "ACTIVE",
            "movedOutOfScope": true
          },
          "overtime": {
            "recomputed": 0,
            "failed": 0
          }
        },
        "foreignNamePresent": false,
        "submittedName": "CR31 known saved 2",
        "foreignName": "CR31 PRIVATE B ONLY 2"
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
      }
    ],
    "sourceComparisons": [
      {
        "file": "api/src/attendance/holiday-work.service.ts",
        "part": "create",
        "unchanged": true
      },
      {
        "file": "api/src/attendance/holiday-work.service.ts",
        "part": "normalize",
        "unchanged": true
      },
      {
        "file": "api/src/attendance/holiday-work.service.ts",
        "part": "view",
        "unchanged": true
      },
      {
        "file": "api/src/attendance/holiday-work.service.ts",
        "part": "computeRows",
        "unchanged": true
      },
      {
        "file": "api/src/attendance/holiday-work.service.ts",
        "part": "clearCoveredOvertime",
        "unchanged": true
      },
      {
        "file": "api/src/attendance/holiday-work.service.ts",
        "part": "lockNamedTargets",
        "unchanged": true
      },
      {
        "file": "api/src/attendance/attendance.service.ts",
        "part": "recomputeOvertimeWindowDays",
        "unchanged": true
      },
      {
        "file": "api/src/attendance/attendance.service.ts",
        "part": "assertOvertimePeriodAutoApprove",
        "unchanged": true
      }
    ],
    "notes": {
      "runtimeTarget": "f680ac1",
      "oldRuntimeExecuted": false,
      "closure": "CR30 holiday-order update and cancel races both reject 404 after actual company PATCH moves the order to branch B. Real punch-backed payroll CREDIT 300 remains PENDING; order remains ACTIVE in B. Branch-B allowed control passes.",
      "priorFixtureAdaptation": "Original Round30 test is unchanged. New Round31 copy uses distinct Fridays for update (2026-07-17) and cancel (2026-07-10); protected first order otherwise legitimately remains in branch B and wins the second same-day payroll source.",
      "periods": "Actual company relocation before the row lock: old update/delete both 403 with the entire stored period unchanged. Reverse ordering: real company PATCH waits on the held row; old update returns its own A snapshot then company update succeeds, or old delete succeeds and company update sees 404. No foreign names enter these responses.",
      "ordinaryResponses": "Ordinary holiday update/cancel detail replies deeply equal GET; post-reload relocation returns only the already-known saved name, not the later foreign name.",
      "autoApproval": "Affected runtime suite covers closed windows, branch scope, unsettled days, exemption, caps, disabled type, and malformed approval snapshots. Automatic and manual approved overtime both equal 140.62 = trunc(2.5 * 37.5 * 1.5, 2), preserved in payroll and overtime report.",
      "blocker": "CR31-B01: pause the holiday update after its transaction commits and before its unscoped repository reload. Actual company PATCH moves/renames the order in branch B; old-branch GET is 404. Resume: 200 fallback has movedOutOfScope=true but includes the new branch-B name. Confirmed on a second disposable database. Stored B order remains unchanged; no new incorrect financial write is claimed.",
      "repeatedExecution": {
        "file": "codex-review-round31-results-independent.cjs",
        "classification": "Initial valid reproduction; independent-confirmed repeats all seven cases on a second disposable database. Not double counted."
      },
      "migrations": "No new migration in product delta. Existing AA-13 exercises migration 074 twice only on its owned disposable database; prior owner clarification permits this. No company migration.",
      "performanceMeasured": false,
      "fullSuiteExecuted": false,
      "servicesStartedOrStopped": false,
      "companyDatabasesWritten": false
    },
    "staticChecks": {
      "target": "f680ac1b08f2fff0c4e32b66fb51cecea1e3d000",
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

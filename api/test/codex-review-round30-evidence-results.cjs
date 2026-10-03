module.exports = {
  "target": "5d4c52b7df4d9bb3ecfd57546cdff8b814926757",
  "comparedProductRange": "6620dab..5d4c52b",
  "relatedCodeLimit": "162d50e..5d4c52b",
  "counts": {
    "tests": 85,
    "passed": 83,
    "failed": 2,
    "skipped": 0
  },
  "executions": [
    {
      "file": "codex-review-round30-results-previous.cjs",
      "selected": [
        "codex-review-round29-obligations",
        "codex-review-round29-independent",
        "codex-review-round6-requests"
      ],
      "counts": {
        "tests": 16,
        "failed": 0,
        "passed": 16,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 16,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round30-results-affected.cjs",
      "selected": [
        "payroll-allowances",
        "payroll-overview-filters",
        "holiday-work",
        "payroll-bonuses",
        "loan-completion",
        "loan-installment-deferral",
        "loan-single-deduction"
      ],
      "counts": {
        "tests": 58,
        "failed": 0,
        "passed": 58,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 58,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round30-results-independent.cjs",
      "selected": [
        "codex-review-round30-independent"
      ],
      "counts": {
        "tests": 8,
        "failed": 0,
        "passed": 8,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round30-results-holiday-confirmed.cjs",
      "selected": [
        "codex-review-round30-holiday-scope"
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
      "failures": [
        {
          "file": "codex-review-round30-holiday-scope.integration.cjs",
          "name": "CR30 holiday update: old branch must not overwrite or cancel an order reassigned to another branch",
          "error": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n+   branchId: 1,\n-   branchId: 2,\n    cancelReason: null,\n    cancelledAt: null,\n    cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:32.531Z,\n    createdByUserId: 3,\n...\n    multiplier: 2,\n+   name: 'CR30 stale A update',\n-   name: 'CR30 private B update',\n    note: null,\n    sourceRequestId: null,\n    status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n+   updatedAt: 2026-10-03T02:12:33.780Z,\n+   updatedByUserId: 3\n-   updatedAt: 2026-10-03T02:12:32.665Z,\n-   updatedByUserId: 1\n  }\n"
        },
        {
          "file": "codex-review-round30-holiday-scope.integration.cjs",
          "name": "CR30 holiday cancel: old branch must not overwrite or cancel an order reassigned to another branch",
          "error": "An old branch permission must not overwrite a now-foreign order\n+ actual - expected\n... Skipped lines\n\n  HolidayWorkOrder {\n    branchId: 2,\n+   cancelReason: 'فحص مستقل لتزامن تغيير فرع أمر دوام عطلة وقرار مالي',\n+   cancelledAt: 2026-10-03T02:12:34.651Z,\n+   cancelledByUserId: 3,\n-   cancelReason: null,\n-   cancelledAt: null,\n-   cancelledByUserId: null,\n    createdAt: 2026-10-03T02:12:33.921Z,\n    createdByUserId: 3,\n    dates: '[\"2026-07-17\"]',\n    firstDate: '2026-07-17',\n    id: 2,\n...\n    sourceRequestId: null,\n+   status: 'CANCELLED',\n-   status: 'ACTIVE',\n    targetIds: null,\n    targetLevel: 'branch',\n    updatedAt: 2026-10-03T02:12:33.966Z,\n    updatedByUserId: 1\n  }\n"
        }
      ]
    }
  ],
  "diagnostics": [
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
      "decisions": [
        {
          "action": "APPROVE",
          "status": "COMPLETED",
          "decisionRows": 1
        },
        {
          "action": "REJECT",
          "status": "REJECTED",
          "decisionRows": 1
        },
        {
          "action": "RETURN",
          "status": "RETURNED_FOR_INFO",
          "decisionRows": 1
        }
      ],
      "financialExpected": 123.45,
      "financialActual": 123.45,
      "financialRows": 1,
      "retryStatuses": [
        400,
        400
      ],
      "pendingRemaining": 2,
      "decisionHistory": 4
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
      "case": "holiday-order-branch-race",
      "action": "update",
      "companyChange": 200,
      "oldBranchReadAfterChange": 404,
      "oldMutationStatus": 200,
      "before": {
        "branchId": 2,
        "status": "ACTIVE"
      },
      "after": {
        "branchId": 1,
        "status": "ACTIVE"
      },
      "creditBefore": {
        "status": "PENDING",
        "amount": 300
      },
      "creditAfter": {
        "status": "CANCELLED",
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
        "status": "CANCELLED"
      },
      "creditBefore": {
        "status": "PENDING",
        "amount": 300
      },
      "creditAfter": {
        "status": "CANCELLED",
        "amount": 300
      }
    },
    {
      "case": "holiday-order-controls",
      "foreignUpdate": 404,
      "foreignCancel": 404,
      "authorizedUpdate": 200,
      "authorizedCancel": 201
    }
  ],
  "sourceComparisons": [
    {
      "file": "api/src/payroll/allowances-grants.service.ts",
      "part": "cancelLine",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/allowances-grants.service.ts",
      "part": "cancelGrant",
      "unchanged": true
    },
    {
      "file": "api/src/attendance/holiday-work.service.ts",
      "part": "cancel",
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
      "part": "update, apart from the added named-employee lock call",
      "unchanged": true
    }
  ],
  "notes": {
    "runtimeTarget": "5d4c52b",
    "oldRuntimeExecuted": false,
    "closure": "Original Round29 create/cancel races unmodified: actual transfer commits first; both financial writes return 403 with no ledger change. New reverse-order tests verify Exclusive employee-finance lock via SQL APPLOCK_MODE, actual transfer waits, financial operation finishes 201 then transfer 200.",
    "paidState": "A real payroll containing 9000 base plus 321.09 direct CREDIT is calculated, approved and paid while cancellation is paused after its early scope check. Cancellation resumes, rereads APPLIED and returns 400; netPay is 9321.09 and applied ledger is unchanged.",
    "targets": "Actual PATCH employee transfer before named/group allowance lock: named group rejects atomically 400; team loses transferred employee and creates one 150.25 line for the remaining member. Line cancellation remains operational. Named waiver and named holiday create/update reject 400 with no partial save.",
    "moneyRequests": "Round29 early-repayment/deferral transfer guards still work after relocation to execute. Round6 historical allowance request executes after transfer once, 123.45; approve/reject/return and scope concealment remain correct.",
    "blocker": "Holiday order scope can change. Pause branch-A update after normalize, or cancel after visibleOrder read. Company PATCH moves order to B, old-branch GET is 404. Real manual punches (fingerprint mapped) and payroll calculation create B employee CREDIT 300 for four hours * (9000/30/8) *2. Resume old A mutation: update 200 moves order back to A, or cancellation commits then returns 404. Both cancel the actual B financial source. Reproduced on a second disposable database.",
    "preliminaryRuns": [
      {
        "file": "codex-review-round30-results-setup1.cjs",
        "classification": "New fixture errors: attempted to clear required department; used incorrect net field. Fixed test with valid destination department/team and correct netPay."
      },
      {
        "file": "codex-review-round30-results-setup2.cjs",
        "classification": "One remaining new-test assertion used net instead of netPay; corrected only the new test."
      },
      {
        "file": "codex-review-round30-results-holiday-setup1.cjs",
        "classification": "Fixture lacked raw punch evidence; payroll recomputation correctly replaced the manually seeded day."
      },
      {
        "file": "codex-review-round30-results-holiday-setup2.cjs",
        "classification": "Fixture employee lacked fingerprint mapping; manual punches did not bind. Added mapping in disposable fixture and used real manual-punch API."
      },
      {
        "file": "codex-review-round30-results-holiday-scope.cjs",
        "classification": "Initial valid reproduction of the same two product failures; confirmed unchanged on another disposable database. Not double counted."
      }
    ],
    "performanceMeasured": false,
    "fullSuiteExecuted": false,
    "servicesStartedOrStopped": false,
    "companyDatabasesWritten": false
  },
  "staticChecks": {
    "target": "5d4c52b7df4d9bb3ecfd57546cdff8b814926757",
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
}

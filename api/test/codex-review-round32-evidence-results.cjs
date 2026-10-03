module.exports = {
  "target": "7e08fb126da78d0dbc31765cf9832ddb5be9efa7",
  "comparedProductRange": "f680ac1..7e08fb1",
  "relatedCodeLimit": "162d50e..7e08fb1",
  "counts": {
    "tests": 44,
    "passed": 43,
    "failed": 1,
    "skipped": 0
  },
  "executions": [
    {
      "file": "codex-review-round32-results-independent.cjs",
      "selected": [
        "codex-review-round32-independent",
        "codex-review-round31-holiday-scope"
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
      "file": "codex-review-round32-results-affected.cjs",
      "selected": [
        "holiday-work",
        "schedule-range-overtime-periods",
        "overtime-auto-approve-period"
      ],
      "counts": {
        "tests": 31,
        "failed": 0,
        "passed": 31,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 31,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round32-results-postwrite-confirmed.cjs",
      "selected": [
        "codex-review-round32-postwrite"
      ],
      "counts": {
        "tests": 2,
        "failed": 1,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      },
      "failures": [
        {
          "file": "codex-review-round32-postwrite.integration.cjs",
          "name": "CR32 allowance success reply does not expose a new foreign run created after its transaction committed",
          "error": "The post-commit response must not disclose a run wholly outside the writer branch"
        }
      ]
    },
    {
      "file": "codex-review-round32-results-effects-final.cjs",
      "selected": [
        "codex-review-round32-holiday-effects"
      ],
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
    }
  ],
  "diagnostics": [
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
      "case": "allowance-postcommit-foreign-run",
      "responseStatus": 201,
      "response": {
        "id": 1,
        "created": 1,
        "skippedDuplicates": 0,
        "amount": 150.25,
        "total": 150.25,
        "recalculateRuns": [
          {
            "id": 1,
            "name": "CR32 NEW PRIVATE B PAYROLL",
            "status": "CALCULATED"
          }
        ],
        "lockedRuns": []
      },
      "foreignRead": 403,
      "foreignRunId": 1,
      "foreignName": "CR32 NEW PRIVATE B PAYROLL",
      "memberBranchIds": [
        2
      ],
      "leaked": true
    },
    {
      "case": "allowance-postcommit-control",
      "created": 1,
      "total": 150.25,
      "inScopeRunReturned": true
    },
    {
      "case": "holiday-update-financial-effects",
      "initialCredit": 300,
      "newCredit": 225,
      "afterCancel": 0,
      "coveredOvertimeRecomputed": 1,
      "replyEqualsGet": true,
      "noDuplicateCredit": true
    }
  ],
  "sourceComparisons": [
    {
      "comparedFrom": "f680ac1",
      "file": "api/src/attendance/holiday-work.service.ts",
      "part": "create",
      "unchanged": true
    },
    {
      "comparedFrom": "f680ac1",
      "file": "api/src/attendance/holiday-work.service.ts",
      "part": "cancel",
      "unchanged": true
    },
    {
      "comparedFrom": "f680ac1",
      "file": "api/src/attendance/holiday-work.service.ts",
      "part": "normalize",
      "unchanged": true
    },
    {
      "comparedFrom": "f680ac1",
      "file": "api/src/attendance/holiday-work.service.ts",
      "part": "view",
      "unchanged": true
    },
    {
      "comparedFrom": "f680ac1",
      "file": "api/src/attendance/holiday-work.service.ts",
      "part": "computeRows",
      "unchanged": true
    },
    {
      "comparedFrom": "f680ac1",
      "file": "api/src/attendance/holiday-work.service.ts",
      "part": "clearCoveredOvertime",
      "unchanged": true
    },
    {
      "comparedFrom": "f680ac1",
      "file": "api/src/attendance/holiday-work.service.ts",
      "part": "lockNamedTargets",
      "unchanged": true
    },
    {
      "comparedFrom": "f680ac1",
      "file": "api/src/attendance/holiday-work.service.ts",
      "part": "detailAfterWrite",
      "unchanged": true
    },
    {
      "comparedFrom": "162d50e",
      "file": "api/src/payroll/allowances-grants.service.ts",
      "part": "monthRunsFor",
      "unchanged": true
    }
  ],
  "notes": {
    "runtimeTarget": "7e08fb1",
    "oldRuntimeExecuted": false,
    "closure": "CR31-B01: real transaction work completes and commits, test pauses the return of that transaction, then an actual company PATCH moves/renames the holiday order. Old branch GET is 404; resumed update is 200 and returns only its own committed name. Delaying detailAfterWrite gives the same result. Affected holiday-work test also exercises a real SQL row-lock queue without service hooks.",
    "adaptation": "The removed post-commit repository read can no longer be hooked. New test delays return from the real transaction after it commits; it does not change transaction work, returned row, scope decisions, or persistence. Original Round31 tests remain untouched.",
    "effects": "Real Friday punches discover overtime. Updating a future holiday order to cover that day recomputes one day and cancels detected overtime; detail reply equals GET. Payroll creates 300 (9000/30/8*4*2). Updating multiplier cancels unreserved credit, recalculation creates exactly one 225 credit, overtimeAmount=0. Cancelling the order and recalculating removes the credit. Existing affected test preserves reserved 487.50 on an approved run.",
    "blocker": "CR32-B01: create an A-branch allowance 150.25 and pause the subsequent monthRunsFor read, after the grant transaction commits. Transfer employee through actual PATCH, create and calculate a new B-only payroll through actual endpoints (membership snapshot branch B). Old branch cannot list it and GET is 403. Resume the allowance response: 201 with correct 150.25 plus forbidden new run id/name/status in recalculateRuns. Confirmed on two disposable databases; the second run asserts the membership snapshot explicitly. No incorrect money or unauthorized write is claimed.",
    "scopeDecision": "This is not the accepted mixed-run header case: the new run has only one member, whose snapshot is branch B. The branch-A allowance was saved before transfer; its existence does not make the subsequent B-only payroll readable.",
    "controls": "An allowance whose employee and calculated payroll remain inside branch A returns its allowed run reference and 150.25 unchanged.",
    "adjacentSourceReadOnly": [
      "financial-exemptions.detailIn/transactions",
      "bonuses.act/detail",
      "typed-deductions.act/detail",
      "obligations.create/cancel",
      "loans transactions",
      "payroll-disbursement.mark/view",
      "employees.update",
      "holiday-work.create/detail"
    ],
    "repeatedExecution": {
      "file": "codex-review-round32-results-postwrite.cjs",
      "classification": "Initial valid reproduction, not double counted. Diagnostic initially accessed member.branchId instead of member.snapshot.branchId; authorization/list assertions already demonstrated denied access. Corrected diagnostic and strengthened snapshot assertion for confirmation."
    },
    "fixtureCorrection": {
      "file": "codex-review-round32-results-effects.cjs",
      "classification": "New review test initially invoked the draft-only calculate endpoint for a CALCULATED run. Product correctly refused 400 PAYRUN-STATE-001. Only the new test was corrected to the recalculate endpoint with reason; final case passes."
    },
    "preparationCorrection": "Before any execution, normalized CRLF/LF in the new prepare script so its hook adaptation matches either working-copy newline style.",
    "migrations": "No new product migration. Affected fixture tests exercise existing 055 and 074 only on their owned disposable databases, permitted by prior owner clarification. No company migrations.",
    "performanceMeasured": false,
    "fullSuiteExecuted": false,
    "servicesStartedOrStopped": false,
    "companyDatabasesWritten": false
  },
  "staticChecks": {
    "target": "7e08fb126da78d0dbc31765cf9832ddb5be9efa7",
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

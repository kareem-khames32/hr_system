module.exports = {
  "target": "6620dab9b58408975812f6155d8cabb312d7906f",
  "comparedProductRange": "770a591..6620dab",
  "relatedCodeLimit": "162d50e..6620dab",
  "counts": {
    "tests": 99,
    "passed": 97,
    "failed": 2,
    "skipped": 0
  },
  "executions": [
    {
      "file": "codex-review-round29-results-previous.cjs",
      "selected": [
        "codex-review-round28-boundaries",
        "codex-review-round28-related-race",
        "codex-review-round26-independent",
        "codex-review-round25-exemption-edges",
        "codex-review-round24-exemptions"
      ],
      "counts": {
        "tests": 27,
        "failed": 0,
        "passed": 27,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 27,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round29-results-affected.cjs",
      "selected": [
        "payroll-bonuses",
        "payroll-typed-deductions",
        "loan-completion",
        "loan-installment-deferral",
        "loan-single-deduction",
        "hr-final-authority"
      ],
      "counts": {
        "tests": 59,
        "failed": 0,
        "passed": 59,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 59,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round29-results-independent.cjs",
      "selected": [
        "codex-review-round29-independent"
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
      "file": "codex-review-round29-results-obligations-confirmed.cjs",
      "selected": [
        "codex-review-round29-obligations"
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
          "file": "codex-review-round29-obligations.integration.cjs",
          "name": "CR29 obligation create: current-branch financial permission must survive a real transfer before the write",
          "error": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n\n+ [\n+   {\n+     amount: 321.09,\n+     appliedAmount: null,\n+     appliedAt: null,\n+     appliedPayrollRunId: null,\n+     bonusRequestId: null,\n+     carriedFromObligationId: null,\n+     category: 'manual',\n+     createdAt: '2026-10-02T22:33:27.396Z',\n+     createdByUserId: 3,\n+     deductionRequestId: null,\n+     effectiveDate: null,\n+     employeeId: 1,\n+     financialExemptionId: null,\n+     id: 1,\n+     label: 'مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات',\n+     payrollReversalOfObligationId: null,\n+     payrollReversalRunId: null,\n+     reservedAt: null,\n+     reservedPayrollRunId: null,\n+     sourceRef: null,\n+     sourceRequestId: null,\n+     status: 'PENDING',\n+     targetPeriod: null,\n+     type: 'CREDIT'\n+   }\n+ ]\n- []\n"
        },
        {
          "file": "codex-review-round29-obligations.integration.cjs",
          "name": "CR29 obligation cancel: current-branch financial permission must survive a real transfer before the write",
          "error": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n... Skipped lines\n\n  [\n    {\n      amount: 321.09,\n      appliedAmount: null,\n      appliedAt: null,\n...\n      sourceRequestId: null,\n+     status: 'CANCELLED',\n-     status: 'PENDING',\n      targetPeriod: null,\n      type: 'CREDIT'\n    }\n  ]\n"
        }
      ]
    }
  ],
  "diagnostics": [
    {
      "case": "unknown-carried-placement",
      "branchMutationChecks": 8,
      "branchesClosed": true,
      "companyVisible": true,
      "companyAttachmentAllowed": true,
      "activeReports": [
        0,
        0,
        1
      ]
    },
    {
      "case": "recalculated-carried-placement",
      "sequence": [
        "A",
        "B",
        "A",
        "B"
      ],
      "sameEvaluationSnapshot": true,
      "parallelReadsIsolated": true,
      "branchReportExempted": "300.00",
      "companyNet": "9000.00",
      "reportDifference": "0.00"
    },
    {
      "case": "attachment-first",
      "runLock": "Exclusive",
      "recalculationWaited": true,
      "attachmentStatus": 201,
      "recalculationStatus": 201,
      "afterTransferStatus": 403,
      "newEventsAfterRefusal": 0
    },
    {
      "case": "recalculation-first",
      "runLock": "Exclusive",
      "attachmentWaited": true,
      "recalculationStatus": 201,
      "attachmentStatus": 403,
      "referenceUnchanged": true,
      "eventCountUnchanged": true
    },
    {
      "case": "busy-and-retry",
      "busyStatus": 409,
      "failedRecalculationKeptOldMembership": true,
      "attachmentStatus": 201,
      "retryStatus": 201
    },
    {
      "case": "response-atomicity",
      "action": "create",
      "runLock": "Exclusive",
      "refusalStatus": 403,
      "rowAndEventsRolledBack": true,
      "retryStatus": 201,
      "responseEqualsGet": true,
      "companyAndBranchDataEqual": true,
      "estimatedAmount": "300.00",
      "status": "ACTIVE"
    },
    {
      "case": "response-atomicity",
      "action": "approve",
      "runLock": "Exclusive",
      "refusalStatus": 403,
      "rowAndEventsRolledBack": true,
      "retryStatus": 201,
      "responseEqualsGet": true,
      "companyAndBranchDataEqual": true,
      "estimatedAmount": "300.00",
      "status": "ACTIVE"
    },
    {
      "case": "response-atomicity",
      "action": "reject",
      "runLock": "Exclusive",
      "refusalStatus": 403,
      "rowAndEventsRolledBack": true,
      "retryStatus": 201,
      "responseEqualsGet": true,
      "companyAndBranchDataEqual": true,
      "estimatedAmount": "300.00",
      "status": "REJECTED"
    },
    {
      "case": "response-atomicity",
      "action": "revoke",
      "runLock": "Exclusive",
      "refusalStatus": 403,
      "rowAndEventsRolledBack": true,
      "retryStatus": 201,
      "responseEqualsGet": true,
      "companyAndBranchDataEqual": true,
      "estimatedAmount": "300.00",
      "status": "REVOKED"
    },
    {
      "case": "response-atomicity",
      "action": "attachment",
      "runLock": "Exclusive",
      "refusalStatus": 403,
      "rowAndEventsRolledBack": true,
      "retryStatus": 201,
      "responseEqualsGet": true,
      "companyAndBranchDataEqual": true,
      "estimatedAmount": "300.00",
      "status": "ACTIVE"
    },
    {
      "case": "related-cancellation-race",
      "kind": "bonus",
      "transferCommittedBeforeRelease": true,
      "transferStatus": 200,
      "cancelStatus": 404,
      "cancelCode": "BONUS_NOT_FOUND",
      "readAfterTransfer": 404,
      "requestStatus": "APPROVED",
      "ledgerStatus": "PENDING",
      "amount": 300
    },
    {
      "case": "related-cancellation-race",
      "kind": "deduction",
      "transferCommittedBeforeRelease": true,
      "transferStatus": 200,
      "cancelStatus": 404,
      "cancelCode": "DEDUCTION_NOT_FOUND",
      "readAfterTransfer": 404,
      "requestStatus": "APPROVED",
      "ledgerStatus": "PENDING",
      "amount": 300
    },
    {
      "case": "related-cancellation-controls",
      "kind": "bonus",
      "ordinaryStatus": 201,
      "afterTransferStatus": 404,
      "refusalKeptRequestAndLedger": true
    },
    {
      "case": "related-cancellation-controls",
      "kind": "deduction",
      "ordinaryStatus": 201,
      "afterTransferStatus": 404,
      "refusalKeptRequestAndLedger": true
    },
    {
      "case": "full-contract",
      "fullCorrectionDeepEqual": true,
      "fullItemDeepEqual": true,
      "readers": [
        "branch",
        "company",
        "admin",
        "employee-own"
      ],
      "net": 7319.17
    },
    {
      "case": "carry-before-transfer",
      "savedExemptionBranch": 1,
      "memberBranch": 2,
      "oldBranchRunStatus": 403,
      "oldBranchExemptionStatus": 403,
      "newBranchExemptionStatus": 200,
      "revokeStatus": 403,
      "storedExemptionStatus": "ACTIVE",
      "netBefore": 9000,
      "netAfter": 9000
    },
    {
      "case": "dated-carry-organisation",
      "effectiveTransfer": "2026-09-01",
      "payrollPeriod": "2026-07",
      "currentBranch": 2,
      "memberBranch": 1,
      "exemptionBranch": 1,
      "rightfulStatus": 200,
      "foreignStatus": 403
    },
    {
      "case": "mixed-supplementary-event",
      "headerVisible": true,
      "headerNet": null,
      "foreignExemptionDirectStatus": 403,
      "individualEventForeignId": null,
      "nearCopyId": 7,
      "foreignCopyId": 8,
      "scopedCarriedExemptions": [
        {
          "fromExemptionId": 5,
          "exemptionId": 7,
          "employeeId": 4
        }
      ],
      "companyCopies": 2
    },
    {
      "case": "early-exemption-refusal",
      "probes": 8,
      "payrollRead": false,
      "applicationLock": false,
      "noEmployeeId": true,
      "all403": true
    },
    {
      "case": "foreign-exemption-membership",
      "routes": 3,
      "eachCompared": 3,
      "all403": true,
      "identicalBodies": true
    },
    {
      "case": "attachment-approval-refusal",
      "readerAmount": "600.00",
      "readerThreshold": "300.00",
      "limited409": true,
      "limitedHasAmounts": false,
      "netAfterExemption": 9000
    },
    {
      "case": "historical-own-grant",
      "retainedOwnAmount": "300.00",
      "retainedRunHeader": true,
      "newCandidates": 0,
      "newGrant403": true
    },
    {
      "case": "exemption-basis-union",
      "hrTypes": 3,
      "dualTypes": 1,
      "ownerTypes": 1,
      "hrDayRate": "300.00",
      "noEmployeeStatus": 403
    },
    {
      "case": "function-owner-foreign-candidates",
      "listStatus": 200,
      "foreignEmployees": [],
      "detailStatus": 403,
      "expectedBranch": 1,
      "employeeBranch": 2
    },
    {
      "case": "foreign-mutations-denied",
      "evidence": [
        {
          "actor": "department-manager",
          "statuses": [
            403,
            403,
            403
          ]
        },
        {
          "actor": "function-owner",
          "statuses": [
            403,
            403,
            403
          ]
        }
      ],
      "rowsInserted": 0
    },
    {
      "case": "authorized-grants-and-read-scope",
      "ownerAmount": "147.89",
      "departmentAmount": "37.50",
      "companyOwnerAmount": "147.89",
      "ownRows": 2,
      "sharedCandidates": 1
    },
    {
      "case": "foreign-only-exemption-run",
      "viewerBranch": 1,
      "employeeBranch": 2,
      "viewerPermissions": [],
      "ownHistoricalGrants": 0,
      "results": [
        {
          "route": "/candidates",
          "status": 403,
          "body": {}
        },
        {
          "route": "run-view",
          "status": 403,
          "body": {}
        }
      ],
      "withoutStructuralRelationship": [
        {
          "route": "/candidates",
          "status": 403,
          "body": {
            "code": "EXEMPTION_RUN_OUT_OF_SCOPE",
            "message": "المسير خارج نطاق فرعك"
          }
        },
        {
          "route": "run-view",
          "status": 403,
          "body": {
            "code": "EXEMPTION_RUN_OUT_OF_SCOPE",
            "message": "المسير خارج نطاق فرعك"
          }
        }
      ]
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
      "case": "obligation-transfer-race",
      "action": "create",
      "realTransferStatus": 200,
      "transferCommittedFirst": true,
      "oldBranchWriteStatus": 201,
      "oldBranchReply": {
        "employeeId": 1,
        "type": "CREDIT",
        "category": "manual",
        "amount": 321.09,
        "label": "مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات",
        "status": "PENDING",
        "effectiveDate": null,
        "createdByUserId": 3,
        "sourceRequestId": null,
        "sourceRef": null,
        "appliedPayrollRunId": null,
        "appliedAt": null,
        "deductionRequestId": null,
        "targetPeriod": null,
        "reservedPayrollRunId": null,
        "reservedAt": null,
        "appliedAmount": null,
        "carriedFromObligationId": null,
        "bonusRequestId": null,
        "financialExemptionId": null,
        "payrollReversalRunId": null,
        "payrollReversalOfObligationId": null,
        "id": 1,
        "createdAt": "2026-10-02T22:33:27.396Z"
      },
      "newBranchBefore": [],
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
      "case": "obligation-transfer-race",
      "action": "cancel",
      "realTransferStatus": 200,
      "transferCommittedFirst": true,
      "oldBranchWriteStatus": 201,
      "oldBranchReply": {
        "id": 2,
        "status": "CANCELLED"
      },
      "newBranchBefore": [
        {
          "id": 2,
          "status": "PENDING",
          "amount": 321.09
        }
      ],
      "newBranchAfter": [
        {
          "id": 2,
          "status": "CANCELLED",
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
    }
  ],
  "sourceComparisons": [
    {
      "file": "api/src/payroll/bonuses.service.ts",
      "part": "views",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/bonuses.service.ts",
      "part": "actorProblem",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/bonuses.service.ts",
      "part": "snapshotRules",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/bonuses.service.ts",
      "part": "approveStep",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/bonuses.service.ts",
      "part": "approveInstantly",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/typed-deductions.service.ts",
      "part": "views",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/typed-deductions.service.ts",
      "part": "actorProblem",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/typed-deductions.service.ts",
      "part": "snapshotRules",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/typed-deductions.service.ts",
      "part": "approveStep",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/typed-deductions.service.ts",
      "part": "approveInstantly",
      "unchanged": true
    },
    {
      "file": "api/src/payroll/obligations.service.ts",
      "part": "entire unchanged file; reproduced issue predates 6620dab",
      "unchanged": true
    }
  ],
  "notes": {
    "runtimeTarget": "6620dab",
    "oldRuntimeExecuted": false,
    "closure": "Round28 related-race unchanged: both actual employee transfers commit first; cancellation is refused, request stays APPROVED and obligation PENDING. Affected product tests also cover rejection, objection response, new creation, stale bulk, reversal, suspended deduction decision, direct loan repayment, recovery collect/writeoff and on-behalf loan request.",
    "responseAtomicity": "Six independent cases call the original detailIn, verify a transaction-owned Exclusive employee-finance lock with SQL APPLOCK_MODE, then inject ForbiddenException in the response phase. Request, events and ledger roll back; successful retries equal GET. This injection is a verification technique, not a production finding.",
    "immediateHr": "Bonus and deduction immediate HR versus separate approval: exactly one 123.45 obligation each; replay denied without an extra obligation.",
    "loans": "Actual PATCH employee transfer before final approval of early settlement and deferral: generic 403 and full rollback. Fresh request in new branch completes once. After transfer the fixture refreshes the user tokenVersion, as normal reauthentication requires.",
    "blocker": "Direct obligations create/cancel: barrier delays only the old-branch command after its real scope check. Actual transfer commits, new-branch reader observes ledger before old write, then old branch POST succeeds 201. Added/cancelled CREDIT 321.09. Normal post-transfer attempts are 403; legitimate new-branch controls succeed. No subsequent payroll net measured.",
    "additionalReadOnlyReview": [
      "payroll-salary-history.service.ts",
      "attendance-exemptions.service.ts",
      "attendance.service.ts confirmOvertime",
      "employees.service.ts suspension/transfer locks",
      "allowances-grants.service.ts cancelLine",
      "offboarding.service.ts withFinancialCase",
      "requests/destinations.service.ts executeTransfer"
    ],
    "nonfinancialOpinion": "No independently executed new nonfinancial defect reported. Overlap alone is not a blanket proof that a write completed before a transfer: intervening reads or payroll consumers must also agree. Follow up per endpoint under B1.4.",
    "preliminaryRuns": [
      {
        "file": "codex-review-round29-results-setup1.cjs",
        "classification": "Test fixture errors only: uppercase catalog codes required; real transfer invalidates old JWT tokenVersion. Fixed only the new test."
      },
      {
        "file": "codex-review-round29-results-obligations.cjs",
        "classification": "First reproduction of the same two product failures; confirmed unchanged on a second disposable database. Not double counted."
      }
    ],
    "performanceMeasured": false,
    "fullSuiteExecuted": false
  },
  "staticChecks": {
    "target": "6620dab9b58408975812f6155d8cabb312d7906f",
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

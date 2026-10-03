module.exports = {
  "checkedAt": "2026-10-03T00:48:12.998Z",
  "target": "770a5917932602fa5275beb0b6e2001e8ed3c4b8",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 1886,
  "trackedFilesChanged": [],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 15,
  "databases": [
    {
      "name": "hr_codex_r24_exemptions_test_9a86dae4cfdc804f",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_mutations_test_64d37d69d1752dba",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_boundaries_test_b383ea07461e2c3e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_correction_edges_test_ee1366155cfe94b6",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_exemption_edges_test_d48a8af5e9532dfd",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r26_independent_test_2c6dab1b7f6686f2",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r28_boundaries_test_158446e2ac15e74e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r28_related_test_0b92dbffa31893ba",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r28_related_test_1f29e529697ae2c7",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r28_related_test_4136e2c56a7ab42e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r28_related_test_e434e25497e644be",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_corrections_test_691df2fbbc4407e0",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_exemptions_test_3f3bb82ce1db9aa6",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_membership_moves_test_7428190441807713",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payslip_leaks_test_f3887b5cafdbdd01",
      "dropRecorded": true,
      "absent": true
    }
  ],
  "allDropped": true,
  "secretScan": {
    "files": 21,
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
    "target": "770a5917932602fa5275beb0b6e2001e8ed3c4b8",
    "comparedProductRange": "e6fa740..770a591",
    "relatedCodeLimit": "162d50e..770a591",
    "counts": {
      "tests": 103,
      "passed": 101,
      "failed": 2,
      "skipped": 0
    },
    "executions": [
      {
        "file": "codex-review-round28-results-previous.cjs",
        "selected": [
          "codex-review-round26-independent",
          "codex-review-round26-ui",
          "codex-review-round25-boundaries",
          "codex-review-round25-correction-edges",
          "codex-review-round25-exemption-edges",
          "codex-review-round25-ui",
          "codex-review-round24-exemptions",
          "codex-review-round24-mutations"
        ],
        "counts": {
          "tests": 64,
          "failed": 0,
          "passed": 64,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 64,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round28-results-affected.cjs",
        "selected": [
          "payroll-corrections",
          "payroll-financial-exemptions",
          "payroll-run-membership-moves",
          "payroll-response-leaks"
        ],
        "counts": {
          "tests": 25,
          "failed": 0,
          "passed": 25,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 25,
          "suites": 0
        },
        "failures": []
      },
      {
        "file": "codex-review-round28-results-boundaries.cjs",
        "selected": [
          "codex-review-round28-boundaries"
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
        "file": "codex-review-round28-results-related-confirmed.cjs",
        "selected": [
          "codex-review-round28-related-race"
        ],
        "counts": {
          "tests": 4,
          "failed": 2,
          "passed": 2,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 4,
          "suites": 0
        },
        "failures": [
          {
            "file": "codex-review-round28-related-race.integration.cjs",
            "name": "CR28 bonus cancellation cannot commit on stale branch scope after an actual employee transfer",
            "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n"
          },
          {
            "file": "codex-review-round28-related-race.integration.cjs",
            "name": "CR28 deduction cancellation cannot commit on stale branch scope after an actual employee transfer",
            "error": "A branch cancellation must recheck scope after a concurrent transfer commits\n+ actual - expected\n\n+ 'CANCELLED'\n- 'APPROVED'\n"
          }
        ]
      }
    ],
    "diagnostics": [
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
        "case": "preview-and-ack",
        "monthlyGross": 7319.17,
        "blindGross": null,
        "previewEqualExceptMoney": true,
        "eventRetainedMoney": true,
        "foreignRunNameHidden": true,
        "companyAcknowledgementRedacted": true
      },
      {
        "case": "forward-and-bulk",
        "foreignFutureUnchanged": true,
        "ownDraftUpdated": true,
        "unknownEqualsForeign": true,
        "hiddenSourceId": null,
        "added": 1
      },
      {
        "case": "overview-recorded-branches",
        "visibleRuns": 1,
        "foreignRunHidden": true,
        "currentProfilesSwapped": true
      },
      {
        "case": "cancel-obligation",
        "repeatedLimitedResponse": true,
        "readerAmount": 871.26,
        "foreignStatus": 403
      },
      {
        "case": "correction-shared-root",
        "branchOriginal": "6321.19",
        "companyOriginal": "24700.80",
        "hiddenTotal": null,
        "knownParentHeader": true,
        "reversalId": 2
      },
      {
        "case": "correction-child-after-transfer",
        "parentSnapshotBranch": 1,
        "childSnapshotBranch": 2,
        "childDirectGet": 403,
        "childNet": 9876.54,
        "reconciliationHidesChild": true,
        "returnedChildren": [
          null,
          null
        ]
      },
      {
        "case": "forward-calculated-foreign",
        "beforeStatus": "CALCULATED",
        "readStatus": 403,
        "forwardSnapshotBranch": 2,
        "profileNowBranch": 1,
        "beforeDefinition": "{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}",
        "afterDefinition": "{\"version\":1,\"filters\":{\"branchIds\":[],\"departmentIds\":[],\"teamIds\":[],\"costCenterIds\":[],\"employeeIds\":[5],\"allEmployees\":false,\"includeSubDepartments\":true,\"includeEmployeeIds\":[]},\"exclusions\":[],\"emptyScope\":null}",
        "eventsAdded": 0,
        "returnedRecalculateRuns": []
      },
      {
        "case": "old-payslip-foreign-supplementary",
        "oldItem": 10,
        "newItem": 11,
        "directNewItemStatus": 404,
        "branchReaderSupplementary": [],
        "employeeOwnSupplementaryVisible": true
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
        "case": "mutation-matrix",
        "viewer": false,
        "actions": [
          {
            "label": "create-draft",
            "viewer": false,
            "runType": null,
            "status": "DRAFT",
            "keys": 13,
            "storedTotal": 0
          },
          {
            "label": "update-draft",
            "viewer": false,
            "runType": null,
            "status": "DRAFT",
            "keys": 13,
            "storedTotal": 0
          },
          {
            "label": "calculate-draft",
            "viewer": false,
            "runType": null,
            "status": "CALCULATED",
            "keys": 13,
            "storedTotal": 23341.37
          },
          {
            "label": "recalculate",
            "viewer": false,
            "runType": null,
            "status": "CALCULATED",
            "keys": 13,
            "storedTotal": 23341.37
          },
          {
            "label": "approve",
            "viewer": false,
            "runType": null,
            "status": "APPROVED",
            "keys": 13,
            "storedTotal": 23341.37
          },
          {
            "label": "reopen",
            "viewer": false,
            "runType": null,
            "status": "CALCULATED",
            "keys": 13,
            "storedTotal": 23341.37
          },
          {
            "label": "approve-again",
            "viewer": false,
            "runType": null,
            "status": "APPROVED",
            "keys": 13,
            "storedTotal": 23341.37
          },
          {
            "label": "pay",
            "viewer": false,
            "runType": null,
            "status": "PAID",
            "keys": 13,
            "storedTotal": 23341.37
          },
          {
            "label": "create-reversal",
            "viewer": false,
            "runType": "REVERSAL",
            "status": "CALCULATED",
            "keys": 13,
            "storedTotal": -23341.37
          },
          {
            "label": "approve-reversal",
            "viewer": false,
            "runType": "REVERSAL",
            "status": "APPROVED",
            "keys": 13,
            "storedTotal": -23341.37
          },
          {
            "label": "pay-reversal",
            "viewer": false,
            "runType": "REVERSAL",
            "status": "PAID",
            "keys": 13,
            "storedTotal": -23341.37
          },
          {
            "label": "create-supplementary",
            "viewer": false,
            "runType": "SUPPLEMENTARY",
            "status": "DRAFT",
            "keys": 13,
            "storedTotal": 0
          },
          {
            "label": "calculate-supplementary",
            "viewer": false,
            "runType": "SUPPLEMENTARY",
            "status": "CALCULATED",
            "keys": 13,
            "storedTotal": 23341.37
          },
          {
            "label": "approve-supplementary",
            "viewer": false,
            "runType": "SUPPLEMENTARY",
            "status": "APPROVED",
            "keys": 13,
            "storedTotal": 23341.37
          },
          {
            "label": "pay-supplementary",
            "viewer": false,
            "runType": "SUPPLEMENTARY",
            "status": "PAID",
            "keys": 13,
            "storedTotal": 23341.37
          },
          {
            "label": "create-cancel-target",
            "viewer": false,
            "runType": null,
            "status": "DRAFT",
            "keys": 13,
            "storedTotal": 0
          },
          {
            "label": "cancel-draft",
            "viewer": false,
            "runType": null,
            "status": "CANCELLED",
            "keys": 13,
            "storedTotal": 0
          },
          {
            "label": "legacy-calculate-defined",
            "viewer": false,
            "runType": null,
            "status": "CALCULATED",
            "keys": 13,
            "storedTotal": 8123.45
          },
          {
            "label": "cancel-calculated",
            "viewer": false,
            "runType": null,
            "status": "CANCELLED",
            "keys": 13,
            "storedTotal": 8123.45
          },
          {
            "label": "legacy-calculate-branch",
            "viewer": false,
            "runType": null,
            "status": "CALCULATED",
            "keys": 13,
            "storedTotal": 7319.17
          },
          {
            "label": "cancel-branch-calculated",
            "viewer": false,
            "runType": null,
            "status": "CANCELLED",
            "keys": 13,
            "storedTotal": 7319.17
          }
        ],
        "netBeforeAndAfter": 23341.37,
        "reversalTotal": -23341.37,
        "nextDrafts": 1
      },
      {
        "case": "mutation-matrix",
        "viewer": true,
        "actions": [
          {
            "label": "create-draft",
            "viewer": true,
            "runType": null,
            "status": "DRAFT",
            "keys": 45,
            "storedTotal": 0
          },
          {
            "label": "update-draft",
            "viewer": true,
            "runType": null,
            "status": "DRAFT",
            "keys": 45,
            "storedTotal": 0
          },
          {
            "label": "calculate-draft",
            "viewer": true,
            "runType": null,
            "status": "CALCULATED",
            "keys": 45,
            "storedTotal": 23341.37
          },
          {
            "label": "recalculate",
            "viewer": true,
            "runType": null,
            "status": "CALCULATED",
            "keys": 45,
            "storedTotal": 23341.37
          },
          {
            "label": "approve",
            "viewer": true,
            "runType": null,
            "status": "APPROVED",
            "keys": 32,
            "storedTotal": 23341.37
          },
          {
            "label": "reopen",
            "viewer": true,
            "runType": null,
            "status": "CALCULATED",
            "keys": 45,
            "storedTotal": 23341.37
          },
          {
            "label": "approve-again",
            "viewer": true,
            "runType": null,
            "status": "APPROVED",
            "keys": 32,
            "storedTotal": 23341.37
          },
          {
            "label": "pay",
            "viewer": true,
            "runType": null,
            "status": "PAID",
            "keys": 32,
            "storedTotal": 23341.37
          },
          {
            "label": "create-reversal",
            "viewer": true,
            "runType": "REVERSAL",
            "status": "CALCULATED",
            "keys": 45,
            "storedTotal": -23341.37
          },
          {
            "label": "approve-reversal",
            "viewer": true,
            "runType": "REVERSAL",
            "status": "APPROVED",
            "keys": 32,
            "storedTotal": -23341.37
          },
          {
            "label": "pay-reversal",
            "viewer": true,
            "runType": "REVERSAL",
            "status": "PAID",
            "keys": 32,
            "storedTotal": -23341.37
          },
          {
            "label": "create-supplementary",
            "viewer": true,
            "runType": "SUPPLEMENTARY",
            "status": "DRAFT",
            "keys": 45,
            "storedTotal": 0
          },
          {
            "label": "calculate-supplementary",
            "viewer": true,
            "runType": "SUPPLEMENTARY",
            "status": "CALCULATED",
            "keys": 45,
            "storedTotal": 23341.37
          },
          {
            "label": "approve-supplementary",
            "viewer": true,
            "runType": "SUPPLEMENTARY",
            "status": "APPROVED",
            "keys": 32,
            "storedTotal": 23341.37
          },
          {
            "label": "pay-supplementary",
            "viewer": true,
            "runType": "SUPPLEMENTARY",
            "status": "PAID",
            "keys": 32,
            "storedTotal": 23341.37
          },
          {
            "label": "create-cancel-target",
            "viewer": true,
            "runType": null,
            "status": "DRAFT",
            "keys": 45,
            "storedTotal": 0
          },
          {
            "label": "cancel-draft",
            "viewer": true,
            "runType": null,
            "status": "CANCELLED",
            "keys": 45,
            "storedTotal": 0
          },
          {
            "label": "legacy-calculate-defined",
            "viewer": true,
            "runType": null,
            "status": "CALCULATED",
            "keys": 45,
            "storedTotal": 8123.45
          },
          {
            "label": "cancel-calculated",
            "viewer": true,
            "runType": null,
            "status": "CANCELLED",
            "keys": 45,
            "storedTotal": 8123.45
          },
          {
            "label": "legacy-calculate-branch",
            "viewer": true,
            "runType": null,
            "status": "CALCULATED",
            "keys": 45,
            "storedTotal": 7319.17
          },
          {
            "label": "cancel-branch-calculated",
            "viewer": true,
            "runType": null,
            "status": "CANCELLED",
            "keys": 45,
            "storedTotal": 7319.17
          }
        ],
        "netBeforeAndAfter": 23341.37,
        "reversalTotal": -23341.37,
        "nextDrafts": 1
      },
      {
        "case": "scope-before-state",
        "responses": [
          {
            "method": "PATCH",
            "tail": "",
            "status": 403
          },
          {
            "method": "POST",
            "tail": "/calculate",
            "status": 403
          },
          {
            "method": "POST",
            "tail": "/recalculate",
            "status": 403
          },
          {
            "method": "POST",
            "tail": "/reopen",
            "status": 403
          },
          {
            "method": "POST",
            "tail": "/cancel",
            "status": 403
          },
          {
            "method": "POST",
            "tail": "/approve",
            "status": 403
          },
          {
            "method": "POST",
            "tail": "/pay",
            "status": 403
          }
        ],
        "storedStatus": "DRAFT"
      },
      {
        "case": "membership-mutation-run-leak",
        "permissions": [
          "payroll.calculate"
        ],
        "getStatus": 403,
        "bulkDidNotChangeMembership": true,
        "bulk": {
          "kind": "bulk",
          "status": 201,
          "runKeys": [
            "id",
            "name",
            "period",
            "startDate",
            "endDate",
            "status",
            "branchId",
            "paidAt",
            "payChannel",
            "payReference",
            "runType",
            "parentRunId",
            "correctionReason"
          ],
          "hasEngine": false
        },
        "single": {
          "kind": "single",
          "status": 201,
          "runKeys": [
            "id",
            "name",
            "period",
            "startDate",
            "endDate",
            "status",
            "branchId",
            "paidAt",
            "payChannel",
            "payReference",
            "runType",
            "parentRunId",
            "correctionReason"
          ],
          "hasEngine": false
        },
        "storedTotal": 31464.82,
        "authorizedViewerContractMatched": true
      },
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
        "requestStatus": "CANCELLED",
        "ledgerStatus": "CANCELLED",
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
        "requestStatus": "CANCELLED",
        "ledgerStatus": "CANCELLED",
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
      }
    ],
    "sourceComparisons": [
      {
        "file": "api/src/payroll/financial-exemptions.service.ts",
        "part": "old detail transaction body versus new detailIn",
        "unchanged": true
      },
      {
        "file": "api/src/payroll/financial-exemptions.service.ts",
        "part": "views",
        "unchanged": true
      },
      {
        "file": "api/src/payroll/financial-exemptions.service.ts",
        "part": "visible",
        "unchanged": true
      },
      {
        "file": "api/src/payroll/financial-exemptions.service.ts",
        "part": "hiddenCarriedCopies",
        "unchanged": true
      },
      {
        "file": "api/src/payroll/bonuses.service.ts",
        "part": "cancel (newly reproduced, predates this fix)",
        "unchanged": true
      },
      {
        "file": "api/src/payroll/typed-deductions.service.ts",
        "part": "cancel (newly reproduced, predates this fix)",
        "unchanged": true
      }
    ],
    "notes": {
      "runtimeTarget": "770a591",
      "oldRuntimeExecuted": false,
      "originalRaceTest": "Previous test source preserved. Its 10-second gate equalled the SQL lock timeout. New tests explicitly cover attachment-first, recalculation-first, and real 409 timeout followed by retry; a safe busy response is accepted.",
      "responseAtomicity": "A test-only detailIn wrapper calls the original, verifies Exclusive transaction-owned run lock, then injects a response-phase ForbiddenException. All five mutations roll back both rows and events; successful retry equals GET.",
      "relatedRaces": "Real bonus/deduction creation and approval, branch-scoped cancel, and real PATCH employees with dated calendar command. A barrier pauses the existing await before acquiring the employee finance lock, after scope checking. Actual transfer commits first; cancellation commits request and obligation changes then returns 404.",
      "preliminaryRuns": [
        {
          "file": "codex-review-round28-results-related.cjs",
          "classification": "fixture preparation errors: catalog code used a hyphen; fixed only in new test"
        },
        {
          "file": "codex-review-round28-results-related-valid.cjs",
          "classification": "fixture preparation errors: employee transfer omitted mandatory calendar command; fixed only in new test"
        },
        {
          "file": "codex-review-round28-results-related-final.cjs",
          "classification": "earlier reproduction of the same two product failures; superseded in distinct counts by related-confirmed with controls"
        }
      ],
      "performanceMeasured": false
    },
    "staticChecks": {
      "target": "770a5917932602fa5275beb0b6e2001e8ed3c4b8",
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

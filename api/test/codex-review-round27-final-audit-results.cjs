module.exports = {
  "checkedAt": "2026-10-03T00:24:47.401Z",
  "target": "e6fa74039550f500ee18f8196e83341f37446553",
  "baselineHead": "162d50e7ca5ef2e872c437f523ce34c78f01bbce",
  "trackedFilesChecked": 1866,
  "trackedFilesChanged": [],
  "engine": {
    "productVersion": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "testDatabaseCompatibility": 150,
  "databaseCount": 11,
  "databases": [
    {
      "name": "hr_codex_r24_exemptions_test_d5b48d1332c5f2e9",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r24_mutations_test_4c79090f8e9b7102",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_boundaries_test_ac0beebf737e178e",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_correction_edges_test_dc5a248082876f68",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r25_exemption_edges_test_031a5ea22077777d",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r26_independent_test_5417e52878435c0f",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_codex_r27_boundaries_test_500799cb06c8e2d4",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_corrections_test_22e85280fe3262f5",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_exemptions_test_17bff0e9fcf459ed",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payroll_membership_moves_test_97ddbfc7566929d2",
      "dropRecorded": true,
      "absent": true
    },
    {
      "name": "hr_payslip_leaks_test_84d1a4a9eaa189a7",
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
    "target": "e6fa74039550f500ee18f8196e83341f37446553",
    "comparedProductRange": "84f26e8..e6fa740",
    "relatedCodeLimit": "162d50e..e6fa740",
    "counts": {
      "tests": 92,
      "passed": 91,
      "failed": 1,
      "skipped": 0
    },
    "executions": [
      {
        "file": "codex-review-round27-results-previous.cjs",
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
        "file": "codex-review-round27-results-affected.cjs",
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
        "file": "codex-review-round27-results-boundaries.cjs",
        "selected": [
          "codex-review-round27-boundaries"
        ],
        "counts": {
          "tests": 3,
          "failed": 1,
          "passed": 2,
          "cancelled": 0,
          "skipped": 0,
          "todo": 0,
          "topLevel": 3,
          "suites": 0
        },
        "failures": [
          {
            "file": "codex-review-round27-boundaries.integration.cjs",
            "name": "CR27 attachment authorization must remain valid until commit when membership recalculation changes scope",
            "error": "A membership change that commits first must invalidate an old branch attachment write\n+ actual - expected\n\n+ 'racing-old-branch-reference'\n- 'initial-reference'\n"
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
        "case": "attachment-scope-race",
        "recalculatedBeforeRelease": true,
        "attachmentResponse": 403,
        "memberBranch": 2,
        "storedAttachment": "racing-old-branch-reference",
        "attachmentEvents": 1
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
      "runtimeTarget": "e6fa740",
      "oldRuntimeExecuted": false,
      "fullResponseCheck": "Actual guarded API correction and reversal bodies compared by deep equality to unchanged raw serializers on the same disposable data. No claim of whole-system byte equality across two deployed versions.",
      "directFixtureUpdates": "Employee placement is prepared only on disposable databases; the dated scenario uses appendEmployeeOrgCalendar in a transaction. Recalculation, payment, reversal, supplementary creation and exemption actions use real guarded API handlers in process, without a listener.",
      "concurrencyControl": "The test calls the real loadCarriedPlaces, then pauses its return once. While attachment is paused with exemption row locked, company recalculation commits a new membership. No scope result or SQL snapshot is fabricated. Finally always releases the barrier and restores the runtime method.",
      "observedImpact": "Attachment reference and ATTACHMENT_ADDED event committed after foreign membership committed, followed by 403. The request began while its branch was authorized; no post-transfer standalone bypass or monetary alteration was demonstrated.",
      "performanceMeasured": false
    },
    "staticChecks": {
      "target": "e6fa74039550f500ee18f8196e83341f37446553",
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

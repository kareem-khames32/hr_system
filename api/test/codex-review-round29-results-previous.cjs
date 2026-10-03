module.exports = {
  "selected": [
    "codex-review-round28-boundaries",
    "codex-review-round28-related-race",
    "codex-review-round26-independent",
    "codex-review-round25-exemption-edges",
    "codex-review-round24-exemptions"
  ],
  "summary": {
    "success": true,
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
    "duration_ms": 86095.707
  },
  "results": [
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 unresolved carried placement is closed on every branch read and mutation surface",
      "ms": 8374.8312,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 carried visibility follows each recalculated snapshot and agrees with lists, reports, flags and history",
      "ms": 3926.3061,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 attachment first holds the real run lock through its response and recalculation follows",
      "ms": 2883.1045,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 recalculation first denies a waiting old-branch attachment without a row or event change",
      "ms": 3150.2193,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 long contention returns busy without mutation and a retry works after release",
      "ms": 12371.9198,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 create rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 826.2389,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 approve rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 894.461,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 reject rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 831.4747,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 revoke rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 748.2234,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-boundaries.integration.cjs",
      "name": "CR28 attachment rolls back all effects when response construction refuses and keeps the old successful view",
      "ms": 796.4595,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 bonus cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 4145.1665,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 deduction cancellation cannot commit on stale branch scope after an actual employee transfer",
      "ms": 255.5175,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 bonus ordinary cancellation works and an already-transferred employee is denied without writes",
      "ms": 331.2943,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round28-related-race.integration.cjs",
      "name": "CR28 deduction ordinary cancellation works and an already-transferred employee is denied without writes",
      "ms": 333.8976,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 full-scope correction views preserve the old serialized contract and employee self links",
      "ms": 7472.5895,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 a transfer between supplementary creation and calculation must not leave the old branch able to read or revoke its exemption",
      "ms": 2127.4379,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 dated organisation must govern the carried exemption just as it governs supplementary membership",
      "ms": 2200.2733,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 mixed supplementary header must not expose a foreign carried exemption reference in the parent event",
      "ms": 3624.9504,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 account without a grant basis is denied identically before payroll reads and application locks",
      "ms": 6054.2759,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 a foreign member, foreign non-member and missing employee give identical exemption denials",
      "ms": 127.6004,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 payroll approval keeps attachment rejection but discloses its amount only to payroll readers",
      "ms": 2445.8988,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 an own historical grant remains readable after scope change without granting new candidates",
      "ms": 731.3466,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 7011.9348,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 51.3676,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 both structural bases reject foreign preview and direct grant without identifying data",
      "ms": 219.214,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 authorized structural grants keep amounts, and foreign exemptions stay outside lists and mine",
      "ms": 1492.3642,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 foreign-only run metadata must not pass an out-of-scope structural department relationship",
      "ms": 126.6306,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"unknown-carried-placement\",\"branchMutationChecks\":8,\"branchesClosed\":true,\"companyVisible\":true,\"companyAttachmentAllowed\":true,\"activeReports\":[0,0,1]}",
    "{\"case\":\"recalculated-carried-placement\",\"sequence\":[\"A\",\"B\",\"A\",\"B\"],\"sameEvaluationSnapshot\":true,\"parallelReadsIsolated\":true,\"branchReportExempted\":\"300.00\",\"companyNet\":\"9000.00\",\"reportDifference\":\"0.00\"}",
    "{\"case\":\"attachment-first\",\"runLock\":\"Exclusive\",\"recalculationWaited\":true,\"attachmentStatus\":201,\"recalculationStatus\":201,\"afterTransferStatus\":403,\"newEventsAfterRefusal\":0}",
    "{\"case\":\"recalculation-first\",\"runLock\":\"Exclusive\",\"attachmentWaited\":true,\"recalculationStatus\":201,\"attachmentStatus\":403,\"referenceUnchanged\":true,\"eventCountUnchanged\":true}",
    "{\"case\":\"busy-and-retry\",\"busyStatus\":409,\"failedRecalculationKeptOldMembership\":true,\"attachmentStatus\":201,\"retryStatus\":201}",
    "{\"case\":\"response-atomicity\",\"action\":\"create\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"ACTIVE\"}",
    "{\"case\":\"response-atomicity\",\"action\":\"approve\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"ACTIVE\"}",
    "{\"case\":\"response-atomicity\",\"action\":\"reject\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"REJECTED\"}",
    "{\"case\":\"response-atomicity\",\"action\":\"revoke\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"REVOKED\"}",
    "{\"case\":\"response-atomicity\",\"action\":\"attachment\",\"runLock\":\"Exclusive\",\"refusalStatus\":403,\"rowAndEventsRolledBack\":true,\"retryStatus\":201,\"responseEqualsGet\":true,\"companyAndBranchDataEqual\":true,\"estimatedAmount\":\"300.00\",\"status\":\"ACTIVE\"}",
    "{\"case\":\"related-cancellation-race\",\"kind\":\"bonus\",\"transferCommittedBeforeRelease\":true,\"transferStatus\":200,\"cancelStatus\":404,\"cancelCode\":\"BONUS_NOT_FOUND\",\"readAfterTransfer\":404,\"requestStatus\":\"APPROVED\",\"ledgerStatus\":\"PENDING\",\"amount\":300}",
    "{\"case\":\"related-cancellation-race\",\"kind\":\"deduction\",\"transferCommittedBeforeRelease\":true,\"transferStatus\":200,\"cancelStatus\":404,\"cancelCode\":\"DEDUCTION_NOT_FOUND\",\"readAfterTransfer\":404,\"requestStatus\":\"APPROVED\",\"ledgerStatus\":\"PENDING\",\"amount\":300}",
    "{\"case\":\"related-cancellation-controls\",\"kind\":\"bonus\",\"ordinaryStatus\":201,\"afterTransferStatus\":404,\"refusalKeptRequestAndLedger\":true}",
    "{\"case\":\"related-cancellation-controls\",\"kind\":\"deduction\",\"ordinaryStatus\":201,\"afterTransferStatus\":404,\"refusalKeptRequestAndLedger\":true}",
    "{\"case\":\"full-contract\",\"fullCorrectionDeepEqual\":true,\"fullItemDeepEqual\":true,\"readers\":[\"branch\",\"company\",\"admin\",\"employee-own\"],\"net\":7319.17}",
    "{\"case\":\"carry-before-transfer\",\"savedExemptionBranch\":1,\"memberBranch\":2,\"oldBranchRunStatus\":403,\"oldBranchExemptionStatus\":403,\"newBranchExemptionStatus\":200,\"revokeStatus\":403,\"storedExemptionStatus\":\"ACTIVE\",\"netBefore\":9000,\"netAfter\":9000}",
    "{\"case\":\"dated-carry-organisation\",\"effectiveTransfer\":\"2026-09-01\",\"payrollPeriod\":\"2026-07\",\"currentBranch\":2,\"memberBranch\":1,\"exemptionBranch\":1,\"rightfulStatus\":200,\"foreignStatus\":403}",
    "{\"case\":\"mixed-supplementary-event\",\"headerVisible\":true,\"headerNet\":null,\"foreignExemptionDirectStatus\":403,\"individualEventForeignId\":null,\"nearCopyId\":7,\"foreignCopyId\":8,\"scopedCarriedExemptions\":[{\"fromExemptionId\":5,\"exemptionId\":7,\"employeeId\":4}],\"companyCopies\":2}",
    "{\"case\":\"early-exemption-refusal\",\"probes\":8,\"payrollRead\":false,\"applicationLock\":false,\"noEmployeeId\":true,\"all403\":true}",
    "{\"case\":\"foreign-exemption-membership\",\"routes\":3,\"eachCompared\":3,\"all403\":true,\"identicalBodies\":true}",
    "{\"case\":\"attachment-approval-refusal\",\"readerAmount\":\"600.00\",\"readerThreshold\":\"300.00\",\"limited409\":true,\"limitedHasAmounts\":false,\"netAfterExemption\":9000}",
    "{\"case\":\"historical-own-grant\",\"retainedOwnAmount\":\"300.00\",\"retainedRunHeader\":true,\"newCandidates\":0,\"newGrant403\":true}",
    "{\"case\":\"exemption-basis-union\",\"hrTypes\":3,\"dualTypes\":1,\"ownerTypes\":1,\"hrDayRate\":\"300.00\",\"noEmployeeStatus\":403}",
    "{\"case\":\"function-owner-foreign-candidates\",\"listStatus\":200,\"foreignEmployees\":[],\"detailStatus\":403,\"expectedBranch\":1,\"employeeBranch\":2}",
    "{\"case\":\"foreign-mutations-denied\",\"evidence\":[{\"actor\":\"department-manager\",\"statuses\":[403,403,403]},{\"actor\":\"function-owner\",\"statuses\":[403,403,403]}],\"rowsInserted\":0}",
    "{\"case\":\"authorized-grants-and-read-scope\",\"ownerAmount\":\"147.89\",\"departmentAmount\":\"37.50\",\"companyOwnerAmount\":\"147.89\",\"ownRows\":2,\"sharedCandidates\":1}",
    "{\"case\":\"foreign-only-exemption-run\",\"viewerBranch\":1,\"employeeBranch\":2,\"viewerPermissions\":[],\"ownHistoricalGrants\":0,\"results\":[{\"route\":\"/candidates\",\"status\":403,\"body\":{}},{\"route\":\"run-view\",\"status\":403,\"body\":{}}],\"withoutStructuralRelationship\":[{\"route\":\"/candidates\",\"status\":403,\"body\":{\"code\":\"EXEMPTION_RUN_OUT_OF_SCOPE\",\"message\":\"المسير خارج نطاق فرعك\"}},{\"route\":\"run-view\",\"status\":403,\"body\":{\"code\":\"EXEMPTION_RUN_OUT_OF_SCOPE\",\"message\":\"المسير خارج نطاق فرعك\"}}]}",
    "tests 27",
    "suites 0",
    "pass 27",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 86095.707"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r28_boundaries_test_99cb5a7019a5c244\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r28_boundaries_test_99cb5a7019a5c244\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r28_boundaries_test_99cb5a7019a5c244\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r28_related_test_986d0f2a39633199\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r28_related_test_986d0f2a39633199\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r28_related_test_986d0f2a39633199\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r26_independent_test_b3c2c65fffde4dc6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r26_independent_test_b3c2c65fffde4dc6\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r26_independent_test_b3c2c65fffde4dc6\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_exemption_edges_test_1fc1366a1926bb16\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_exemption_edges_test_1fc1366a1926bb16\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_exemption_edges_test_1fc1366a1926bb16\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_exemptions_test_35deec7d927b1466\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_exemptions_test_35deec7d927b1466\"}\n"
  ]
}

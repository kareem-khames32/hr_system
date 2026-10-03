module.exports = {
  "selected": [
    "codex-review-round25-boundaries",
    "codex-review-round25-correction-edges",
    "codex-review-round25-exemption-edges",
    "codex-review-round25-ui",
    "codex-review-round24-exemptions",
    "codex-review-round24-mutations"
  ],
  "summary": {
    "success": true,
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
    "duration_ms": 86487.771
  },
  "results": [
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 preview hides amounts and hash, retains identical allowed rows, and preserves full internal event",
      "ms": 7781.3782,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 forward membership skips foreign definitions, updates own empty drafts, and bulk exclusions hide origins",
      "ms": 2574.7258,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 monthly overview metadata and waiver references follow recorded branches, including after transfer",
      "ms": 1838.5077,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 obligation cancellation hides amounts on first and repeated cancel while payroll reader retains them",
      "ms": 202.1028,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 shared-root reconciliation retains only reader items and identical company totals",
      "ms": 7692.868,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 correction children must not expose a later payroll recorded wholly in another branch",
      "ms": 2551.3272,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 forward update must not modify a calculated foreign snapshot after a profile moves into scope",
      "ms": 2119.4688,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 an old payslip must not reveal a paid supplementary item recorded in another branch",
      "ms": 2888.3429,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 account without a grant basis is denied identically before payroll reads and application locks",
      "ms": 5777.9063,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 a foreign member, foreign non-member and missing employee give identical exemption denials",
      "ms": 119.3352,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 payroll approval keeps attachment rejection but discloses its amount only to payroll readers",
      "ms": 2609.4128,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 an own historical grant remains readable after scope change without granting new candidates",
      "ms": 879.1359,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "linked filters: departments follow chosen branches, teams follow chosen departments (with sub-departments), and pruning drops broken links",
      "ms": 1.0741,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "only published policy versions are offered for a run, labelled by the set name (dates only when one set has two)",
      "ms": 0.2811,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "membership preview view shows the read-only notice, coverage, the formula set name and plain Arabic exclusion reasons, without codes, day basis, factor or the other run number",
      "ms": 3.6661,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion candidates: employees the preview already excludes (data problems first) can get a written exclusion; transferred-out and manual exclusions cannot",
      "ms": 1.132,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "stored draft: the membership card says an employee with incomplete employment data is left out of the calculation, and offers the written exclusion on those rows",
      "ms": 5.4902,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: name, formula set, month, linked filters or list, exclusions with a reason, preview and save as draft",
      "ms": 2.2205,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "payroll page: «مسير جديد» is separate from «احتساب المسودة» / «إعادة حساب المسير», and approval no longer waits for an unassigned acknowledgement",
      "ms": 1.7342,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "scope sentence: an empty department or team list reads «كل الأقسام»/«كل الفرق», sub-departments are said out loud, and an empty selection says nobody joins",
      "ms": 0.3512,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion scope check mirrors the engine: an empty department list covers the whole branch, sub-departments included, and nothing selected covers nobody",
      "ms": 0.1886,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: the live scope sentence, «كل الأقسام» selected by default, and an exclusion picker that works before any preview",
      "ms": 2.3277,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "no new endpoint: the exclusion picker reuses the employees the screen already loads (or the scoped directory)",
      "ms": 0.4844,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "قراءة الاستعلام: القيم غير الصالحة تسقط، والحالات من نص مفصول بفاصلة، ومن/إلى المقلوبين يتصححوا",
      "ms": 0.3369,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "البحث بالاسم أو الكود بلا حساسية لحالة الحروف، والباقي مطابقة دقيقة",
      "ms": 0.2983,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "مدى تاريخ التعيين شامل الطرفين، وبلا تاريخ = خارج المدى، و«كل التواريخ» ما بتفلترش",
      "ms": 0.0929,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "المنظور: الكل / المدرجين في مسير / بلا مسير على نفس الصفوف",
      "ms": 0.0835,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الفلاتر بتشتغل مع بعض (AND)، والعدّاد بيعد المفعّل بس والمنظور مش فلتر",
      "ms": 0.1004,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الموقوف بيدخل التقرير بس لما يتفلتر بالاسم",
      "ms": 0.0579,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "تقسيم الاختيار المختلط: مين ينتقل من أنهي مسير، مين يتضاف، ومين يتخطى وليه",
      "ms": 0.5166,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 8125.926,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 67.9107,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 both structural bases reject foreign preview and direct grant without identifying data",
      "ms": 217.6308,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 authorized structural grants keep amounts, and foreign exemptions stay outside lists and mine",
      "ms": 968.7414,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 foreign-only run metadata must not pass an out-of-scope structural department relationship",
      "ms": 84.403,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 all run mutations preserve permissions and exact 13-field operation-only responses",
      "ms": 14154.3926,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 all run mutations preserve permissions and payroll viewer details",
      "ms": 8582.8374,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 scoped operation permission cannot act on a foreign run or return identifiers in the rejection",
      "ms": 245.7755,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 membership mutation responses cannot bypass the run read permission",
      "ms": 2177.5186,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"preview-and-ack\",\"monthlyGross\":7319.17,\"blindGross\":null,\"previewEqualExceptMoney\":true,\"eventRetainedMoney\":true,\"foreignRunNameHidden\":true,\"companyAcknowledgementRedacted\":true}",
    "{\"case\":\"forward-and-bulk\",\"foreignFutureUnchanged\":true,\"ownDraftUpdated\":true,\"unknownEqualsForeign\":true,\"hiddenSourceId\":null,\"added\":1}",
    "{\"case\":\"overview-recorded-branches\",\"visibleRuns\":1,\"foreignRunHidden\":true,\"currentProfilesSwapped\":true}",
    "{\"case\":\"cancel-obligation\",\"repeatedLimitedResponse\":true,\"readerAmount\":871.26,\"foreignStatus\":403}",
    "{\"case\":\"correction-shared-root\",\"branchOriginal\":\"6321.19\",\"companyOriginal\":\"24700.80\",\"hiddenTotal\":null,\"knownParentHeader\":true,\"reversalId\":2}",
    "{\"case\":\"correction-child-after-transfer\",\"parentSnapshotBranch\":1,\"childSnapshotBranch\":2,\"childDirectGet\":403,\"childNet\":9876.54,\"reconciliationHidesChild\":true,\"returnedChildren\":[null,null]}",
    "{\"case\":\"forward-calculated-foreign\",\"beforeStatus\":\"CALCULATED\",\"readStatus\":403,\"forwardSnapshotBranch\":2,\"profileNowBranch\":1,\"beforeDefinition\":\"{\\\"version\\\":1,\\\"filters\\\":{\\\"branchIds\\\":[],\\\"departmentIds\\\":[],\\\"teamIds\\\":[],\\\"costCenterIds\\\":[],\\\"employeeIds\\\":[5],\\\"allEmployees\\\":false,\\\"includeSubDepartments\\\":true,\\\"includeEmployeeIds\\\":[]},\\\"exclusions\\\":[],\\\"emptyScope\\\":null}\",\"afterDefinition\":\"{\\\"version\\\":1,\\\"filters\\\":{\\\"branchIds\\\":[],\\\"departmentIds\\\":[],\\\"teamIds\\\":[],\\\"costCenterIds\\\":[],\\\"employeeIds\\\":[5],\\\"allEmployees\\\":false,\\\"includeSubDepartments\\\":true,\\\"includeEmployeeIds\\\":[]},\\\"exclusions\\\":[],\\\"emptyScope\\\":null}\",\"eventsAdded\":0,\"returnedRecalculateRuns\":[]}",
    "{\"case\":\"old-payslip-foreign-supplementary\",\"oldItem\":10,\"newItem\":11,\"directNewItemStatus\":404,\"branchReaderSupplementary\":[],\"employeeOwnSupplementaryVisible\":true}",
    "{\"case\":\"early-exemption-refusal\",\"probes\":8,\"payrollRead\":false,\"applicationLock\":false,\"noEmployeeId\":true,\"all403\":true}",
    "{\"case\":\"foreign-exemption-membership\",\"routes\":3,\"eachCompared\":3,\"all403\":true,\"identicalBodies\":true}",
    "{\"case\":\"attachment-approval-refusal\",\"readerAmount\":\"600.00\",\"readerThreshold\":\"300.00\",\"limited409\":true,\"limitedHasAmounts\":false,\"netAfterExemption\":9000}",
    "{\"case\":\"historical-own-grant\",\"retainedOwnAmount\":\"300.00\",\"retainedRunHeader\":true,\"newCandidates\":0,\"newGrant403\":true}",
    "{\"case\":\"exemption-basis-union\",\"hrTypes\":3,\"dualTypes\":1,\"ownerTypes\":1,\"hrDayRate\":\"300.00\",\"noEmployeeStatus\":403}",
    "{\"case\":\"function-owner-foreign-candidates\",\"listStatus\":200,\"foreignEmployees\":[],\"detailStatus\":403,\"expectedBranch\":1,\"employeeBranch\":2}",
    "{\"case\":\"foreign-mutations-denied\",\"evidence\":[{\"actor\":\"department-manager\",\"statuses\":[403,403,403]},{\"actor\":\"function-owner\",\"statuses\":[403,403,403]}],\"rowsInserted\":0}",
    "{\"case\":\"authorized-grants-and-read-scope\",\"ownerAmount\":\"147.89\",\"departmentAmount\":\"37.50\",\"companyOwnerAmount\":\"147.89\",\"ownRows\":2,\"sharedCandidates\":1}",
    "{\"case\":\"foreign-only-exemption-run\",\"viewerBranch\":1,\"employeeBranch\":2,\"viewerPermissions\":[],\"ownHistoricalGrants\":0,\"results\":[{\"route\":\"/candidates\",\"status\":403,\"body\":{}},{\"route\":\"run-view\",\"status\":403,\"body\":{}}],\"withoutStructuralRelationship\":[{\"route\":\"/candidates\",\"status\":403,\"body\":{\"code\":\"EXEMPTION_RUN_OUT_OF_SCOPE\",\"message\":\"المسير خارج نطاق فرعك\"}},{\"route\":\"run-view\",\"status\":403,\"body\":{\"code\":\"EXEMPTION_RUN_OUT_OF_SCOPE\",\"message\":\"المسير خارج نطاق فرعك\"}}]}",
    "{\"case\":\"mutation-matrix\",\"viewer\":false,\"actions\":[{\"label\":\"create-draft\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"update-draft\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"calculate-draft\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"recalculate\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve\",\"viewer\":false,\"runType\":null,\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"reopen\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve-again\",\"viewer\":false,\"runType\":null,\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"pay\",\"viewer\":false,\"runType\":null,\"status\":\"PAID\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"create-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"approve-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"pay-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"create-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"calculate-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"pay-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"create-cancel-target\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"cancel-draft\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":0},{\"label\":\"legacy-calculate-defined\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":8123.45},{\"label\":\"cancel-calculated\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":8123.45},{\"label\":\"legacy-calculate-branch\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":7319.17},{\"label\":\"cancel-branch-calculated\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":7319.17}],\"netBeforeAndAfter\":23341.37,\"reversalTotal\":-23341.37,\"nextDrafts\":1}",
    "{\"case\":\"mutation-matrix\",\"viewer\":true,\"actions\":[{\"label\":\"create-draft\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"update-draft\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"calculate-draft\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"recalculate\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve\",\"viewer\":true,\"runType\":null,\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"reopen\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve-again\",\"viewer\":true,\"runType\":null,\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"pay\",\"viewer\":true,\"runType\":null,\"status\":\"PAID\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"create-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":-23341.37},{\"label\":\"approve-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":-23341.37},{\"label\":\"pay-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"keys\":32,\"storedTotal\":-23341.37},{\"label\":\"create-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"calculate-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"pay-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"create-cancel-target\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"cancel-draft\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":0},{\"label\":\"legacy-calculate-defined\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":8123.45},{\"label\":\"cancel-calculated\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":8123.45},{\"label\":\"legacy-calculate-branch\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":7319.17},{\"label\":\"cancel-branch-calculated\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":7319.17}],\"netBeforeAndAfter\":23341.37,\"reversalTotal\":-23341.37,\"nextDrafts\":1}",
    "{\"case\":\"scope-before-state\",\"responses\":[{\"method\":\"PATCH\",\"tail\":\"\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/calculate\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/recalculate\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/reopen\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/cancel\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/approve\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/pay\",\"status\":403}],\"storedStatus\":\"DRAFT\"}",
    "{\"case\":\"membership-mutation-run-leak\",\"permissions\":[\"payroll.calculate\"],\"getStatus\":403,\"bulkDidNotChangeMembership\":true,\"bulk\":{\"kind\":\"bulk\",\"status\":201,\"runKeys\":[\"id\",\"name\",\"period\",\"startDate\",\"endDate\",\"status\",\"branchId\",\"paidAt\",\"payChannel\",\"payReference\",\"runType\",\"parentRunId\",\"correctionReason\"],\"hasEngine\":false},\"single\":{\"kind\":\"single\",\"status\":201,\"runKeys\":[\"id\",\"name\",\"period\",\"startDate\",\"endDate\",\"status\",\"branchId\",\"paidAt\",\"payChannel\",\"payReference\",\"runType\",\"parentRunId\",\"correctionReason\"],\"hasEngine\":false},\"storedTotal\":31464.82,\"authorizedViewerContractMatched\":true}",
    "tests 39",
    "suites 0",
    "pass 39",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 86487.771"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_boundaries_test_e45bf1faeb945d39\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_boundaries_test_e45bf1faeb945d39\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_boundaries_test_e45bf1faeb945d39\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_correction_edges_test_14d28738b5e2c0cc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_correction_edges_test_14d28738b5e2c0cc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_correction_edges_test_14d28738b5e2c0cc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_exemption_edges_test_8c23c7b5024de523\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_exemption_edges_test_8c23c7b5024de523\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_exemption_edges_test_8c23c7b5024de523\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_exemptions_test_0f91a802d80e1012\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_exemptions_test_0f91a802d80e1012\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_mutations_test_bfb4673a14ac9845\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_mutations_test_bfb4673a14ac9845\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r24_mutations_test_bfb4673a14ac9845\"}\n"
  ]
}

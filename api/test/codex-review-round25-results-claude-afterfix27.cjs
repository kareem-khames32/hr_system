module.exports = {
  "selected": [
    "codex-review-round25-boundaries",
    "codex-review-round25-correction-edges",
    "codex-review-round25-exemption-edges",
    "codex-review-round25-ui"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 30,
      "failed": 0,
      "passed": 30,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 30,
      "suites": 0
    },
    "duration_ms": 41256.0573
  },
  "results": [
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 preview hides amounts and hash, retains identical allowed rows, and preserves full internal event",
      "ms": 6930.5153,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 forward membership skips foreign definitions, updates own empty drafts, and bulk exclusions hide origins",
      "ms": 2300.7937,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 monthly overview metadata and waiver references follow recorded branches, including after transfer",
      "ms": 1695.9196,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 obligation cancellation hides amounts on first and repeated cancel while payroll reader retains them",
      "ms": 183.4585,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 shared-root reconciliation retains only reader items and identical company totals",
      "ms": 6739.2359,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 correction children must not expose a later payroll recorded wholly in another branch",
      "ms": 1935.6672,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 forward update must not modify a calculated foreign snapshot after a profile moves into scope",
      "ms": 1750.8474,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-correction-edges.integration.cjs",
      "name": "CR25 an old payslip must not reveal a paid supplementary item recorded in another branch",
      "ms": 2337.4002,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 account without a grant basis is denied identically before payroll reads and application locks",
      "ms": 5077.8932,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 a foreign member, foreign non-member and missing employee give identical exemption denials",
      "ms": 119.8513,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 payroll approval keeps attachment rejection but discloses its amount only to payroll readers",
      "ms": 2190.0281,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 an own historical grant remains readable after scope change without granting new candidates",
      "ms": 694.627,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "linked filters: departments follow chosen branches, teams follow chosen departments (with sub-departments), and pruning drops broken links",
      "ms": 1.1448,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "only published policy versions are offered for a run, labelled by the set name (dates only when one set has two)",
      "ms": 0.3438,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "membership preview view shows the read-only notice, coverage, the formula set name and plain Arabic exclusion reasons, without codes, day basis, factor or the other run number",
      "ms": 3.8532,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion candidates: employees the preview already excludes (data problems first) can get a written exclusion; transferred-out and manual exclusions cannot",
      "ms": 0.916,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "stored draft: the membership card says an employee with incomplete employment data is left out of the calculation, and offers the written exclusion on those rows",
      "ms": 5.4772,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: name, formula set, month, linked filters or list, exclusions with a reason, preview and save as draft",
      "ms": 1.9684,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "payroll page: «مسير جديد» is separate from «احتساب المسودة» / «إعادة حساب المسير», and approval no longer waits for an unassigned acknowledgement",
      "ms": 1.4323,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "scope sentence: an empty department or team list reads «كل الأقسام»/«كل الفرق», sub-departments are said out loud, and an empty selection says nobody joins",
      "ms": 0.3014,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion scope check mirrors the engine: an empty department list covers the whole branch, sub-departments included, and nothing selected covers nobody",
      "ms": 0.1543,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: the live scope sentence, «كل الأقسام» selected by default, and an exclusion picker that works before any preview",
      "ms": 1.7411,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "no new endpoint: the exclusion picker reuses the employees the screen already loads (or the scoped directory)",
      "ms": 0.4768,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "قراءة الاستعلام: القيم غير الصالحة تسقط، والحالات من نص مفصول بفاصلة، ومن/إلى المقلوبين يتصححوا",
      "ms": 0.3291,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "البحث بالاسم أو الكود بلا حساسية لحالة الحروف، والباقي مطابقة دقيقة",
      "ms": 0.2872,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "مدى تاريخ التعيين شامل الطرفين، وبلا تاريخ = خارج المدى، و«كل التواريخ» ما بتفلترش",
      "ms": 0.1205,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "المنظور: الكل / المدرجين في مسير / بلا مسير على نفس الصفوف",
      "ms": 0.0972,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الفلاتر بتشتغل مع بعض (AND)، والعدّاد بيعد المفعّل بس والمنظور مش فلتر",
      "ms": 0.1376,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الموقوف بيدخل التقرير بس لما يتفلتر بالاسم",
      "ms": 0.0879,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "تقسيم الاختيار المختلط: مين ينتقل من أنهي مسير، مين يتضاف، ومين يتخطى وليه",
      "ms": 0.5178,
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
    "tests 30",
    "suites 0",
    "pass 30",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 41256.0573"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_boundaries_test_74f9f1f087d8e341\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_boundaries_test_74f9f1f087d8e341\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_boundaries_test_74f9f1f087d8e341\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_correction_edges_test_1e34b51dcbe63def\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_correction_edges_test_1e34b51dcbe63def\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_correction_edges_test_1e34b51dcbe63def\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_exemption_edges_test_a9655700518b74b8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_exemption_edges_test_a9655700518b74b8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_exemption_edges_test_a9655700518b74b8\"}\n"
  ]
}

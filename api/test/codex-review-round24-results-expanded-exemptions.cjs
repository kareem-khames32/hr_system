module.exports = {
  "selected": [
    "codex-review-round24-exemptions"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 1,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 13324.3292
  },
  "results": [
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 8880.1147,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 67.5137,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 both structural bases reject foreign preview and direct grant without identifying data",
      "ms": 232.4688,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 authorized structural grants keep amounts, and foreign exemptions stay outside lists and mine",
      "ms": 1178.6639,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 foreign-only run metadata must not pass an out-of-scope structural department relationship",
      "ms": 42.9561,
      "pass": false,
      "error": "Foreign-only run must be denied before returning its identifying metadata\n\n200 !== 403\n",
      "cause": "Foreign-only run must be denied before returning its identifying metadata\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign-only run must be denied before returning its identifying metadata\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round24-exemptions.integration.cjs:317:34)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 foreign-only run metadata must not pass an out-of-scope structural department relationship",
      "ms": 42.9561,
      "pass": false,
      "error": "Foreign-only run must be denied before returning its identifying metadata\n\n200 !== 403\n",
      "cause": "Foreign-only run must be denied before returning its identifying metadata\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign-only run must be denied before returning its identifying metadata\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round24-exemptions.integration.cjs:317:34)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"exemption-basis-union\",\"hrTypes\":3,\"dualTypes\":1,\"ownerTypes\":1,\"hrDayRate\":\"300.00\",\"noEmployeeStatus\":403}",
    "{\"case\":\"function-owner-foreign-candidates\",\"listStatus\":200,\"foreignEmployees\":[],\"detailStatus\":403,\"expectedBranch\":1,\"employeeBranch\":2}",
    "{\"case\":\"foreign-mutations-denied\",\"evidence\":[{\"actor\":\"department-manager\",\"statuses\":[403,403,403]},{\"actor\":\"function-owner\",\"statuses\":[403,403,403]}],\"rowsInserted\":0}",
    "{\"case\":\"authorized-grants-and-read-scope\",\"ownerAmount\":\"147.89\",\"departmentAmount\":\"37.50\",\"companyOwnerAmount\":\"147.89\",\"ownRows\":2,\"sharedCandidates\":1}",
    "{\"case\":\"foreign-only-exemption-run\",\"viewerBranch\":1,\"employeeBranch\":2,\"results\":[{\"route\":\"/candidates\",\"status\":200,\"body\":{\"run\":{\"id\":3,\"name\":\"مسير الفرع الخارجي السري R24\",\"period\":\"2026-10\",\"status\":\"CALCULATED\"},\"employees\":[]}},{\"route\":\"run-view\",\"status\":200,\"body\":{\"run\":{\"id\":3,\"name\":\"مسير الفرع الخارجي السري R24\",\"period\":\"2026-10\",\"status\":\"CALCULATED\",\"statusLabel\":\"محسوب\",\"snapshotVersion\":1},\"settings\":{\"reasonMinLength\":20,\"attachmentThresholdDays\":1,\"maxPerEmployeeYear\":0,\"cooldownHours\":0,\"maxPctPerGrantor\":0},\"permissions\":{\"canGrant\":true,\"canApprove\":false,\"canOverride\":false},\"recalcRequired\":false,\"recalcEmployeeIds\":[],\"pendingApproval\":0,\"labels\":{\"scopes\":{\"ALL_DEDUCTIONS\":\"كل الخصومات القابلة للإعفاء\",\"DEDUCTION_TYPE\":\"نوع خصم\",\"SINGLE_ENTRY\":\"قيد واحد\"},\"typeTargets\":{\"LATENESS\":\"كل خصم التأخير\",\"SHORTFALL\":\"كل خصم نقص ساعات العمل\",\"ABSENCE\":\"كل خصم الغياب\",\"ADVANCE_INSTALLMENT\":\"كل أقساط السلف (تأجيل)\",\"TYPED\":\"نوع خصم مصنف\"},\"entryTargets\":{\"LATENESS_DAY\":\"تأخير يوم\",\"SHORTFALL_DAY\":\"نقص ساعات يوم\",\"ABSENCE_DAY\":\"غياب يوم\",\"OBLIGATION\":\"قسط خصم مصنف\",\"LOAN_INSTALLMENT\":\"قسط سلفة (تأجيل)\"},\"components\":{\"LATENESS\":\"خصم التأخير\",\"SHORTFALL\":\"خصم نقص ساعات العمل\",\"ABSENCE\":\"خصم الغياب\",\"TYPED\":\"خصم مصنف\",\"LOAN\":\"قسط سلفة\"},\"dispositions\":{\"DROP\":\"إسقاط نهائي\",\"DEFER_ONE_PERIOD\":\"تأجيل للشهر التالي\"},\"statuses\":{\"PENDING_APPROVAL\":\"بانتظار اعتماد الموارد البشرية\",\"ACTIVE\":\"نشط — يُطبق عند حساب المسير\",\"APPLIED\":\"مطبق في مسير معتمد\",\"REJECTED\":\"مرفوض\",\"REVOKED\":\"ملغى قبل اعتماد المسير\",\"EXPIRED\":\"منتهٍ دون تطبيق\",\"SUPERSEDED\":\"محتوى في إعفاء أشمل\"},\"bases\":{\"HR\":\"الموارد البشرية\",\"DEPARTMENT_MANAGER\":\"مدير القسم\",\"FUNCTION_OWNER\":\"مدير الجهة المالكة للخصم\"}},\"exemptions\":[]}}]}",
    "tests 5",
    "suites 0",
    "pass 4",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13324.3292"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_exemptions_test_5bea57585b3256dd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_exemptions_test_5bea57585b3256dd\"}\n"
  ]
}

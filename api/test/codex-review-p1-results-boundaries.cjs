module.exports = {
  "selected": [
    "codex-review-p1-boundaries"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 2,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 12253.3563
  },
  "results": [
    {
      "file": "codex-review-p1-boundaries.integration.cjs",
      "name": "P1 branch reader changes tab must not disclose a foreign prior payroll period or amount",
      "ms": 8674.782,
      "pass": false,
      "error": "Foreign previous period and financial amount must be concealed",
      "cause": "Foreign previous period and financial amount must be concealed",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign previous period and financial amount must be concealed\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-boundaries.integration.cjs:30:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p1-boundaries.integration.cjs",
      "name": "P1 login log accepts ISO from/to date filters and retains branch isolation",
      "ms": 45.7439,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-boundaries.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p1-boundaries.integration.cjs",
      "name": "P1 branch reader changes tab must not disclose a foreign prior payroll period or amount",
      "ms": 8674.782,
      "pass": false,
      "error": "Foreign previous period and financial amount must be concealed",
      "cause": "Foreign previous period and financial amount must be concealed",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign previous period and financial amount must be concealed\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-boundaries.integration.cjs:30:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p1-boundaries.integration.cjs",
      "name": "P1 login log accepts ISO from/to date filters and retains branch isolation",
      "ms": 45.7439,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-boundaries.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"P1-new-changes-tab\",\"foreignRunStatus\":403,\"currentRunStatus\":200,\"branch\":{\"runId\":2,\"period\":\"2026-11\",\"previousSeriesPeriod\":\"2026-07\",\"rows\":[{\"employeeId\":1,\"employeeCode\":\"R25-1\",\"fullName\":\"موظف اختبار مستقل 1\",\"isNew\":false,\"previousPeriod\":\"2026-07\",\"salary\":{\"previous\":6000,\"current\":9000},\"payMethod\":null,\"changes\":[{\"kind\":\"SALARY\",\"field\":null,\"label\":\"الراتب\",\"oldValue\":null,\"newValue\":null,\"changedByUserId\":1,\"changedAt\":\"2026-10-03T09:31:50.466Z\",\"source\":null,\"reason\":\"مراجعة مستقلة لتاريخ المسير وعزل الفروع\",\"changedByName\":\"Review Admin\"}]}],\"leavers\":[],\"counts\":{\"changed\":1,\"new\":0,\"leavers\":0}},\"companyRow\":{\"employeeId\":1,\"employeeCode\":\"R25-1\",\"fullName\":\"موظف اختبار مستقل 1\",\"isNew\":false,\"previousPeriod\":\"2026-07\",\"salary\":{\"previous\":6000,\"current\":9000},\"payMethod\":null,\"changes\":[{\"kind\":\"SALARY\",\"field\":null,\"label\":\"الراتب\",\"oldValue\":null,\"newValue\":null,\"changedByUserId\":1,\"changedAt\":\"2026-10-03T09:31:50.466Z\",\"source\":null,\"reason\":\"مراجعة مستقلة لتاريخ المسير وعزل الفروع\",\"changedByName\":\"Review Admin\"}]},\"storedUnchanged\":true}",
    "{\"case\":\"P1-login-date-filter\",\"plainStatus\":200,\"filteredStatus\":400,\"filtered\":{\"message\":[\"التاريخ بصيغة YYYY-MM-DD\",\"التاريخ بصيغة YYYY-MM-DD\"],\"error\":\"Bad Request\",\"statusCode\":400}}",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12253.3563"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_boundary_test_529cd69a9d403393\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_boundary_test_529cd69a9d403393\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_boundary_test_529cd69a9d403393\"}\n"
  ]
}

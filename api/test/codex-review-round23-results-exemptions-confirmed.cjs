module.exports = {
  "selected": [
    "codex-review-round23-exemptions"
  ],
  "summary": {
    "success": false,
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
    "duration_ms": 12345.7017
  },
  "results": [
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 9170.1416,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 66.0684,
      "pass": false,
      "error": "The owned type must not broaden branch scope\n\n1 !== 0\n",
      "cause": "The owned type must not broaden branch scope\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: The owned type must not broaden branch scope\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:239:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 66.0684,
      "pass": false,
      "error": "The owned type must not broaden branch scope\n\n1 !== 0\n",
      "cause": "The owned type must not broaden branch scope\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: The owned type must not broaden branch scope\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:239:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"exemption-basis-union\",\"hrTypes\":3,\"dualTypes\":1,\"ownerTypes\":1,\"hrDayRate\":\"300.00\",\"noEmployeeStatus\":403}",
    "{\"case\":\"function-owner-foreign-candidates\",\"listStatus\":200,\"foreignEmployees\":[{\"employeeId\":9,\"fullName\":\"موظف سري خارج نطاق المالك\",\"employeeCode\":\"R23-FAR\",\"branchId\":2,\"departmentId\":3,\"bases\":[\"FUNCTION_OWNER\"],\"basisLabels\":[\"مدير الجهة المالكة للخصم\"]}],\"detailStatus\":200,\"detailEmployee\":{\"employeeId\":9,\"fullName\":\"موظف سري خارج نطاق المالك\",\"employeeCode\":\"R23-FAR\",\"branchId\":2,\"departmentId\":3,\"teamId\":null},\"detailTyped\":[{\"obligationId\":4,\"amount\":\"147.89\",\"deductionTypeId\":3,\"typeName\":\"R23_OWNER\",\"typedCategory\":\"PERFORMANCE\",\"targetPeriod\":\"2026-10\",\"label\":\"R23_OWNER: مخالفة موثقة في تقرير الجودة الأسبوعي للقسم\",\"exemptable\":true,\"protectedReason\":null}],\"expectedBranch\":1,\"employeeBranch\":2}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12345.7017"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_exemptions_test_7d92762c26a20a50\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_exemptions_test_7d92762c26a20a50\"}\n"
  ]
}

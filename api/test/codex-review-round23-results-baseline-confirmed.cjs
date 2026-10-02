module.exports = {
  "selected": [
    "codex-review-round23-exemptions",
    "codex-review-round23-payslips"
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
    "duration_ms": 28147.4685
  },
  "results": [
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 8350.5254,
      "pass": false,
      "error": "The owned type must not broaden branch scope\n\n1 !== 0\n",
      "cause": "The owned type must not broaden branch scope\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: The owned type must not broaden branch scope\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:239:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 reopening and cancelling without payroll.view must not return full employee payroll details",
      "ms": 13287.4649,
      "pass": false,
      "error": "Reopen permission alone must not disclose individual salaries",
      "cause": "Reopen permission alone must not disclose individual salaries",
      "stack": "AssertionError [ERR_ASSERTION]: Reopen permission alone must not disclose individual salaries\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-payslips.integration.cjs:340:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 8350.5254,
      "pass": false,
      "error": "The owned type must not broaden branch scope\n\n1 !== 0\n",
      "cause": "The owned type must not broaden branch scope\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: The owned type must not broaden branch scope\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-exemptions.integration.cjs:239:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 reopening and cancelling without payroll.view must not return full employee payroll details",
      "ms": 13287.4649,
      "pass": false,
      "error": "Reopen permission alone must not disclose individual salaries",
      "cause": "Reopen permission alone must not disclose individual salaries",
      "stack": "AssertionError [ERR_ASSERTION]: Reopen permission alone must not disclose individual salaries\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-payslips.integration.cjs:340:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"function-owner-foreign-candidates\",\"listStatus\":200,\"foreignEmployees\":[{\"employeeId\":9,\"fullName\":\"موظف سري خارج نطاق المالك\",\"employeeCode\":\"R23-FAR\",\"branchId\":2,\"departmentId\":3,\"bases\":[\"FUNCTION_OWNER\"],\"basisLabels\":[\"مدير الجهة المالكة للخصم\"]}],\"detailStatus\":200,\"detailEmployee\":{\"employeeId\":9,\"fullName\":\"موظف سري خارج نطاق المالك\",\"employeeCode\":\"R23-FAR\",\"branchId\":2,\"departmentId\":3,\"teamId\":null},\"detailTyped\":[{\"obligationId\":4,\"amount\":\"147.89\",\"deductionTypeId\":3,\"typeName\":\"R23_OWNER\",\"typedCategory\":\"PERFORMANCE\",\"targetPeriod\":\"2026-10\",\"label\":\"R23_OWNER: مخالفة موثقة في تقرير الجودة الأسبوعي للقسم\",\"exemptable\":true,\"protectedReason\":null}],\"expectedBranch\":1,\"employeeBranch\":2}",
    "{\"case\":\"mutation-without-payroll-view\",\"getStatus\":403,\"permissions\":[\"payroll.reopen\",\"payroll.cancel\"],\"reopen\":{\"status\":201,\"items\":[{\"employeeId\":4,\"netPay\":7000},{\"employeeId\":5,\"netPay\":8123.45}],\"memberNames\":[\"موظف فرع القارئ\",\"موظف الفرع التاني\"],\"hasEngine\":true},\"cancel\":{\"status\":201,\"items\":[{\"employeeId\":4,\"netPay\":7000},{\"employeeId\":5,\"netPay\":8123.45}],\"memberNames\":[\"موظف فرع القارئ\",\"موظف الفرع التاني\"],\"hasEngine\":true}}",
    "Cleanup verified: hr_codex_r23_payslips_test_a9495cab36d5daff is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 28147.4685"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_exemptions_test_ec2b704f86933393\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_exemptions_test_ec2b704f86933393\"}\n",
    "CR23_BASELINE {\"head\":\"162d50e7ca5ef2e872c437f523ce34c78f01bbce\",\"mappedProductModules\":6,\"baselineReadOnly\":true}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_payslips_test_a9495cab36d5daff\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_payslips_test_a9495cab36d5daff\"}\n",
    "CR23_BASELINE {\"head\":\"162d50e7ca5ef2e872c437f523ce34c78f01bbce\",\"mappedProductModules\":5,\"baselineReadOnly\":true}\n"
  ]
}

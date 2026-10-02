module.exports = {
  "selected": [
    "codex-review-round23-payslips"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 8,
      "failed": 2,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 19072.2902
  },
  "results": [
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 13323.1811,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 89.4373,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 92.2412,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 95.6948,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 184.7643,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 103.0048,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 own paid, reversed and supplementary payslips keep colleague amounts outside every response",
      "ms": 2255.9007,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(!('parityReport' in response))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(!('parityReport' in response))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(!('parityReport' in response))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-payslips.integration.cjs:309:79)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 reopening and cancelling without payroll.view must not return full employee payroll details",
      "ms": 122.6753,
      "pass": false,
      "error": "Reopen permission alone must not disclose individual salaries",
      "cause": "Reopen permission alone must not disclose individual salaries",
      "stack": "AssertionError [ERR_ASSERTION]: Reopen permission alone must not disclose individual salaries\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-payslips.integration.cjs:333:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 own paid, reversed and supplementary payslips keep colleague amounts outside every response",
      "ms": 2255.9007,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(!('parityReport' in response))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(!('parityReport' in response))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(!('parityReport' in response))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-payslips.integration.cjs:309:79)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 reopening and cancelling without payroll.view must not return full employee payroll details",
      "ms": 122.6753,
      "pass": false,
      "error": "Reopen permission alone must not disclose individual salaries",
      "cause": "Reopen permission alone must not disclose individual salaries",
      "stack": "AssertionError [ERR_ASSERTION]: Reopen permission alone must not disclose individual salaries\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-payslips.integration.cjs:333:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"mutation-without-payroll-view\",\"getStatus\":403,\"permissions\":[\"payroll.reopen\",\"payroll.cancel\"],\"reopen\":{\"status\":201,\"items\":[{\"employeeId\":4,\"netPay\":7000},{\"employeeId\":5,\"netPay\":8123.45}],\"memberNames\":[\"موظف فرع القارئ\",\"موظف الفرع التاني\"],\"hasEngine\":true},\"cancel\":{\"status\":201,\"items\":[{\"employeeId\":4,\"netPay\":7000},{\"employeeId\":5,\"netPay\":8123.45}],\"memberNames\":[\"موظف فرع القارئ\",\"موظف الفرع التاني\"],\"hasEngine\":true}}",
    "Cleanup verified: hr_codex_r23_payslips_test_4f1d647045e9aebf is absent from sys.databases.",
    "tests 8",
    "suites 0",
    "pass 6",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 19072.2902"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_payslips_test_4f1d647045e9aebf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_payslips_test_4f1d647045e9aebf\"}\n"
  ]
}

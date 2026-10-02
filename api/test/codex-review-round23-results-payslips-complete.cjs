module.exports = {
  "selected": [
    "codex-review-round23-payslips"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 9,
      "failed": 1,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 18684.7429
  },
  "results": [
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 12807.722,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 80.777,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 82.7028,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 92.8235,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 187.0973,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 90.1242,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 own paid, reversed and supplementary payslips keep colleague amounts outside every response",
      "ms": 2104.1591,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 approve and pay responses do not contain colleague monetary evidence for regular or reversal runs",
      "ms": 0.25,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 reopening and cancelling without payroll.view must not return full employee payroll details",
      "ms": 106.7412,
      "pass": false,
      "error": "Reopen permission alone must not disclose individual salaries",
      "cause": "Reopen permission alone must not disclose individual salaries",
      "stack": "AssertionError [ERR_ASSERTION]: Reopen permission alone must not disclose individual salaries\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-payslips.integration.cjs:340:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 reopening and cancelling without payroll.view must not return full employee payroll details",
      "ms": 106.7412,
      "pass": false,
      "error": "Reopen permission alone must not disclose individual salaries",
      "cause": "Reopen permission alone must not disclose individual salaries",
      "stack": "AssertionError [ERR_ASSERTION]: Reopen permission alone must not disclose individual salaries\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round23-payslips.integration.cjs:340:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"finance-responses\",\"responses\":[{\"id\":3,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"parityReportLength\":0,\"policySnapshotLength\":0,\"peerPresent\":false,\"hasParityReportKey\":false,\"hasPolicySnapshotKey\":false},{\"id\":3,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"parityReportLength\":0,\"policySnapshotLength\":0,\"peerPresent\":false,\"hasParityReportKey\":true,\"hasPolicySnapshotKey\":true},{\"id\":4,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"parityReportLength\":0,\"policySnapshotLength\":0,\"peerPresent\":false,\"hasParityReportKey\":false,\"hasPolicySnapshotKey\":false},{\"id\":4,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"parityReportLength\":0,\"policySnapshotLength\":0,\"peerPresent\":false,\"hasParityReportKey\":false,\"hasPolicySnapshotKey\":false}]}",
    "{\"case\":\"own-correction-payslips\",\"publishedSlips\":2,\"runKeys\":13,\"ownNet\":6000,\"peerNet\":17341.37,\"peerLeaked\":false,\"reversalItems\":0}",
    "{\"case\":\"mutation-without-payroll-view\",\"getStatus\":403,\"permissions\":[\"payroll.reopen\",\"payroll.cancel\"],\"reopen\":{\"status\":201,\"items\":[{\"employeeId\":4,\"netPay\":7000},{\"employeeId\":5,\"netPay\":8123.45}],\"memberNames\":[\"موظف فرع القارئ\",\"موظف الفرع التاني\"],\"hasEngine\":true},\"cancel\":{\"status\":201,\"items\":[{\"employeeId\":4,\"netPay\":7000},{\"employeeId\":5,\"netPay\":8123.45}],\"memberNames\":[\"موظف فرع القارئ\",\"موظف الفرع التاني\"],\"hasEngine\":true}}",
    "Cleanup verified: hr_codex_r23_payslips_test_7fe90c39e218471c is absent from sys.databases.",
    "tests 9",
    "suites 0",
    "pass 8",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18684.7429"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_payslips_test_7fe90c39e218471c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_payslips_test_7fe90c39e218471c\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round23-exemptions",
    "codex-review-round23-payslips",
    "codex-review-round23-previews"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 13,
      "failed": 0,
      "passed": 13,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 13,
      "suites": 0
    },
    "duration_ms": 37589.9297
  },
  "results": [
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 7719.2333,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 64.8529,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 13115.4846,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 77.069,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 89.6755,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 88.9237,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 168.9839,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 84.3326,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 own paid, reversed and supplementary payslips keep colleague amounts outside every response",
      "ms": 2174.8346,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 approve and pay responses do not contain colleague monetary evidence for regular or reversal runs",
      "ms": 0.2051,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 reopening and cancelling without payroll.view must not return full employee payroll details",
      "ms": 80.5703,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-previews.integration.cjs",
      "name": "CR23 preview and stale bulk protect both inactive and outside-basis definitions from unlinked and structural users",
      "ms": 5122.3833,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-previews.integration.cjs",
      "name": "CR23 allowed HR without employeeId and structural manager retain correct preview money and foreign rows are anonymous",
      "ms": 320.6302,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"exemption-basis-union\",\"hrTypes\":3,\"dualTypes\":1,\"ownerTypes\":1,\"hrDayRate\":\"300.00\",\"noEmployeeStatus\":403}",
    "{\"case\":\"function-owner-foreign-candidates\",\"listStatus\":200,\"foreignEmployees\":[],\"detailStatus\":403,\"expectedBranch\":1,\"employeeBranch\":2}",
    "{\"case\":\"finance-responses\",\"responses\":[{\"id\":3,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"parityReportLength\":0,\"policySnapshotLength\":0,\"peerPresent\":false,\"hasParityReportKey\":false,\"hasPolicySnapshotKey\":false},{\"id\":3,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"parityReportLength\":0,\"policySnapshotLength\":0,\"peerPresent\":false,\"hasParityReportKey\":false,\"hasPolicySnapshotKey\":false},{\"id\":4,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"parityReportLength\":0,\"policySnapshotLength\":0,\"peerPresent\":false,\"hasParityReportKey\":false,\"hasPolicySnapshotKey\":false},{\"id\":4,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"parityReportLength\":0,\"policySnapshotLength\":0,\"peerPresent\":false,\"hasParityReportKey\":false,\"hasPolicySnapshotKey\":false}]}",
    "{\"case\":\"own-correction-payslips\",\"publishedSlips\":2,\"runKeys\":13,\"ownNet\":6000,\"peerNet\":17341.37,\"peerLeaked\":false,\"reversalItems\":0}",
    "{\"case\":\"mutation-without-payroll-view\",\"getStatus\":403,\"permissions\":[\"payroll.reopen\",\"payroll.cancel\"],\"reopen\":{\"status\":201,\"hasEngine\":false},\"cancel\":{\"status\":201,\"hasEngine\":false}}",
    "Cleanup verified: hr_codex_r23_payslips_test_d3e6037c5c6791c0 is absent from sys.databases.",
    "{\"case\":\"definition-response-matrix\",\"outsideBasis403\":16,\"authorizedInactive400\":4}",
    "{\"case\":\"authorized-financial-preview\",\"kind\":\"bonuses\",\"amount\":77.77,\"obligationCount\":1,\"bulkStatus\":\"returned\",\"foreignNameHidden\":true}",
    "{\"case\":\"authorized-financial-preview\",\"kind\":\"deductions\",\"amount\":77.77,\"obligationCount\":1,\"bulkStatus\":\"returned\",\"foreignNameHidden\":true}",
    "tests 13",
    "suites 0",
    "pass 13",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 37589.9297"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_exemptions_test_756e3720932f6e67\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_exemptions_test_756e3720932f6e67\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_payslips_test_d3e6037c5c6791c0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_payslips_test_d3e6037c5c6791c0\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_previews_test_c408e86fa6c35bbd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_previews_test_c408e86fa6c35bbd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r23_previews_test_c408e86fa6c35bbd\"}\n"
  ]
}

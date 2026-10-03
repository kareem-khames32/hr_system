module.exports = {
  "selected": [
    "codex-review-round23-exemptions",
    "codex-review-round23-payslips",
    "codex-review-round23-previews",
    "codex-review-round23-ui-dates"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 25,
      "failed": 0,
      "passed": 25,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 25,
      "suites": 0
    },
    "duration_ms": 36208.0939
  },
  "results": [
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 7095.6853,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-exemptions.integration.cjs",
      "name": "CR23 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 51.7896,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 11726.6459,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 91.9055,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 95.6047,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 113.5733,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 203.573,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 92.0939,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 own paid, reversed and supplementary payslips keep colleague amounts outside every response",
      "ms": 2325.4764,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 approve and pay responses do not contain colleague monetary evidence for regular or reversal runs",
      "ms": 0.2009,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-payslips.integration.cjs",
      "name": "CR23 reopening and cancelling without payroll.view must not return full employee payroll details",
      "ms": 100.1777,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-previews.integration.cjs",
      "name": "CR23 preview and stale bulk protect both inactive and outside-basis definitions from unlinked and structural users",
      "ms": 4413.642,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-previews.integration.cjs",
      "name": "CR23 allowed HR without employeeId and structural manager retain correct preview money and foreign rows are anonymous",
      "ms": 252.2589,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report-ui.test.cjs",
      "name": "every financial report has its own screen with the shared filters, Excel export and print, titled like its link",
      "ms": 1.6709,
      "pass": true,
      "skip": false
    },
    {
      "file": "financial-report-ui.test.cjs",
      "name": "the reports hub and the payroll reports page link all financial reports, and the cost-center report stays linked",
      "ms": 0.49,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-01: خطوات السلسلة تتنضف وتترتب، وأسماء الخطوات الافتراضية «مراجعة N» والأخيرة «الاعتماد النهائي»",
      "ms": 0.8425,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-02: بصمة السلسلة = هوية المعتمدين بترتيبهم؛ اسم الخطوة برّاها، وأي تغيير في شخص أو ترتيب يغيّرها",
      "ms": 0.3517,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-03: التقدم — الخطوات بالترتيب، والمسير يفضل منتظر صاحب أول خطوة مش معتمدة",
      "ms": 0.359,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-04: القرارات تخص نسخة حساب واحدة وبصمة سلسلة واحدة — نسخة أقدم أو قرار ملغى أو بصمة قديمة لا تُحتسب",
      "ms": 0.1335,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-05: الرفض بسبب يرجّع نسخة الحساب لمسؤول الرواتب — مفيش خطوة حالية، وتغيير السلسلة مايمسحش الرفض",
      "ms": 0.2546,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-06: مسير معتمد أو مصروف — الشريط من القرارات نفسها (تاريخ ثابت مهما اتغيرت السلسلة)، ومسير اتعتمد بخطوة واحدة بلا شريط",
      "ms": 0.1801,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-07: صاحب الخطوة — الشخص المسمّى برقمه، والدور بكود دور التوكن",
      "ms": 0.1212,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-07b: حل سلسلة المسير — الخاصة باسمه الدائم أولًا ثم سلسلة الشركة؛ سلسلة بلا خطوات = غير موجودة؛ بلا أي سلسلة = null (الاعتماد بخطوة واحدة)",
      "ms": 0.2465,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain.test.cjs",
      "name": "CHAIN-08: خطافات المسير الكبير قليلة ومحددة — الاعتماد القديم يتحقق من السلسلة، وآخر خطوة تنادي approveLocked نفسها، والقسيمة على APPROVED/PAID كما هي",
      "ms": 1.9552,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-ui-dates.integration.cjs",
      "name": "CR23 shifted date fixtures preserve every March-December weekday and original payroll constants",
      "ms": 1.1018,
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
    "Cleanup verified: hr_codex_r23_payslips_test_1daf6abc2f6aff5d is absent from sys.databases.",
    "{\"case\":\"definition-response-matrix\",\"outsideBasis403\":16,\"authorizedInactive400\":4}",
    "{\"case\":\"authorized-financial-preview\",\"kind\":\"bonuses\",\"amount\":77.77,\"obligationCount\":1,\"bulkStatus\":\"returned\",\"foreignNameHidden\":true}",
    "{\"case\":\"authorized-financial-preview\",\"kind\":\"deductions\",\"amount\":77.77,\"obligationCount\":1,\"bulkStatus\":\"returned\",\"foreignNameHidden\":true}",
    "{\"case\":\"future-calendar\",\"mappedYear\":2037,\"weekdayComparisons\":1530,\"lateLine\":270,\"permissionLine\":120,\"joinerAllowance\":733.33}",
    "tests 25",
    "suites 0",
    "pass 25",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 36208.0939"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_exemptions_test_4667df185d6b9acb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_exemptions_test_4667df185d6b9acb\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_payslips_test_1daf6abc2f6aff5d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_payslips_test_1daf6abc2f6aff5d\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_previews_test_d8dbda7be280144d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_previews_test_d8dbda7be280144d\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r23_previews_test_d8dbda7be280144d\"}\n"
  ]
}

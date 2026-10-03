module.exports = {
  "target": "2cb88835c220815488b92911caedd778db61714f",
  "productRange": "ecf4846..2cb8883",
  "relatedCodeLimit": "162d50e..2cb8883",
  "counts": {
    "tests": 362,
    "passed": 361,
    "failed": 1,
    "skipped": 0
  },
  "executions": [
    {
      "file": "codex-review-round41-results-previous40.cjs",
      "files": [
        "codex-review-round40-key-boundary",
        "codex-review-round40-scope-controls"
      ],
      "counts": {
        "tests": 8,
        "failed": 0,
        "passed": 8,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 8,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round41-results-independent.cjs",
      "files": [
        "codex-review-round41-independent",
        "codex-review-round41-text"
      ],
      "counts": {
        "tests": 10,
        "failed": 1,
        "passed": 9,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 10,
        "suites": 0
      },
      "failures": [
        {
          "file": "codex-review-round41-independent.integration.cjs",
          "name": "CR41 boundary: unconsumed employeeId query cannot reveal another employee hidden payroll month through my payslip",
          "error": "Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n"
        }
      ]
    },
    {
      "file": "codex-review-round41-results-affected.cjs",
      "files": [
        "payroll-reports",
        "payroll-corrections",
        "fulltest-reports",
        "fulltest-leaves-payroll",
        "overtime-auto-approve-period",
        "payroll-response-leaks",
        "user-branch-scopes",
        "payroll-overtime-request",
        "payroll-bonuses",
        "payroll-typed-deductions",
        "payroll-overview-filters",
        "security-permission-gaps",
        "loan-completion",
        "payroll-allowances",
        "payroll-financial-exemptions",
        "payroll-approval-chain-disbursement",
        "payroll-membership-history",
        "financial-report",
        "cost-center-report",
        "request-execution",
        "leave-contract",
        "fulltest-settings"
      ],
      "counts": {
        "tests": 344,
        "failed": 0,
        "passed": 344,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 344,
        "suites": 0
      },
      "failures": []
    }
  ],
  "finalCases": [
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 line rendering controls: hidden text, stable row/column keys, unchanged totals, company/self and stored history",
      "ms": 10545.0103,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-previous40.cjs"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 payslip: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 72.0847,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-previous40.cjs"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 run-lines: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 49.9465,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-previous40.cjs"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent overview-lines: old foreign period must not survive in another line reader",
      "ms": 88.8293,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-previous40.cjs"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent approval-review: old foreign period must not survive in another line reader",
      "ms": 104.1167,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-previous40.cjs"
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 TEAM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 7759.3694,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-previous40.cjs"
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 CUSTOM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 2115.7335,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-previous40.cjs"
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 COST_CENTER: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 1891.8986,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-previous40.cjs"
    },
    {
      "file": "codex-review-round41-independent.integration.cjs",
      "name": "CR41 closures: seven real readers, opaque stable keys, permitted self/company text, exact money and stored history",
      "ms": 8339.542,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "codex-review-round41-independent.integration.cjs",
      "name": "CR41 boundary: unconsumed employeeId query cannot reveal another employee hidden payroll month through my payslip",
      "ms": 2372.5483,
      "pass": false,
      "error": "Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n",
      "cause": "Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round41-independent.integration.cjs:103:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم",
      "ms": 0.9771,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم",
      "ms": 0.196,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي",
      "ms": 0.6771,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B01: مفتاح السطر المحجوب ببصمة من الأصل — مفتاحين مختلفين مايبقوش واحد، ونفس المفتاح نفس النتيجة في الصف والعمود، والاسم من غير الفترة",
      "ms": 0.943,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40-B01: بصمة المفتاح المحجوب معتمة — مش hash علني للنص الأصلي، فتجربة الشهور من الرد بس مابتطابقش أي شهر",
      "ms": 2.7805,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40: قايمة فترات بعد «مسير» — كل فترة مخفية بتتشال والمرئية تفضل",
      "ms": 0.1609,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40 (شبكة الأمان): موظفي الرد من employeeId ومن employee.id، والحجب في كل نص ومفتاح واسم خاصية — والأرقام والتواريخ زي ما هي",
      "ms": 13.342,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B02: تسمية نطاق المسير لقارئ فرع — وحدات نطاقه بس، والباقي «وغيرها خارج نطاق صلاحيتك»، والشركة كاملة، والقايمة المخصّصة من غير عدد",
      "ms": 98.8604,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-independent.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "runs report lists runs without a branch, keeps cancelled runs out of totals, and scopes branch users by member snapshot",
      "ms": 12787.4011,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "detailed payroll reports require payroll.view on top of reports.view",
      "ms": 72.2709,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "unassigned report lists every on-job employee outside a run with a reason, and changes nothing",
      "ms": 567.6511,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "overtime report shows amounts with their source; rejected rows are zero and outside the total",
      "ms": 154.821,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "loans report reconciles paid + remaining = principal, shows installment n of m, aging and after-service balances",
      "ms": 103.4092,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "variance report explains each employee difference by component and isolates unexplained residuals",
      "ms": 65.2045,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "month totals are one number in the payroll month report, the variance report and the financial payroll register",
      "ms": 2091.2252,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "a suspended employee is derived from the suspension periods: real reason, real count, and the checkbox filters",
      "ms": 325.419,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "accepted filters are applied: teamId on the financial reports and branchId on the attendance report",
      "ms": 153.5818,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 15162.1844,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 3729.7615,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 5996.5016,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
      "ms": 7351.059,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
      "ms": 6987.7229,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01 / CR26: إعفاء منقول لتكميلي فيه موظف اتنقل لفرع تاني — مكان النسخة من عضوية التكميلي نفسه، فقارئ ومانح الفرع القديم مايشوفوهاش ولا يلغوها، وسجلات الإعفاء والمسير مابتسمّيهاش",
      "ms": 5854.4681,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR35-B01 / CR35-N01: موانع عكس الصرف بقاعدة رؤية المسير — قسط ترحيل حجزه مسير فرع تاني بعد نقل الموظف بيتقال من غير رقمه ولا حالته لقارئ الفرع في المعاينة والإنشاء واعتماد مسير العكس، والشركة بتشوفه؛ ومسير العكس بيتبع مسيره الأصلي",
      "ms": 3547.8861,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR37-B02: تقرير الإضافي وتقرير «بلا مسير» — مسير صرف إضافي موظف اتنقل لفرع تاني ومرجع تأجيله وآخر مسير ليه من غير رقمهم ولا اسمهم ولا حالتهم ولا فترتهم لقارئ الفرع الجديد، والشركة بتشوفهم",
      "ms": 1867.1765,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR38-B01/B02: موظف اتنقل — قايمة مسيرات «بلا مسير» لقارئ الفرع الجديد زي ما هي (مسيره القديم مايظهرش)، واسم قيده من غير فترة المسير القديم، والشركة بتشوف الكل",
      "ms": 1736.739,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR40-B01/B02: موظف اتعكس صرفه واتنقل — بنود مسيره الجديد في كل شاشة (القسيمة، جدول المسير، سطور الشهر، مراجعة الاعتماد، شاشة المسير، السجل المالي) من غير فترة مسيره القديم لقارئ الفرع الجديد، وبصمة المفتاح مابتتفكّش، والشركة وصاحب القسيمة بيشوفوا النص كامل",
      "ms": 3276.6985,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية",
      "ms": 12198.9052,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق",
      "ms": 8739.3713,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها",
      "ms": 787.4484,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين",
      "ms": 31.7025,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه",
      "ms": 50.0515,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع",
      "ms": 31.9699,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات",
      "ms": 11.1567,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة",
      "ms": 525.9206,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة",
      "ms": 43.9664,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور",
      "ms": 76.3535,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي",
      "ms": 73.3652,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف",
      "ms": 75.8837,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده",
      "ms": 44.6511,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير",
      "ms": 42.2584,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر",
      "ms": 42.3037,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة",
      "ms": 337.0947,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات",
      "ms": 120.5757,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع",
      "ms": 104.7091,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين",
      "ms": 70.2328,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط",
      "ms": 42.4789,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع",
      "ms": 19.4924,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا",
      "ms": 251.3524,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير",
      "ms": 150.3278,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ",
      "ms": 110.0913,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير",
      "ms": 1132.7973,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف",
      "ms": 264.6249,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا",
      "ms": 135.2742,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "ZZ — ملخص التغطية والملاحظات",
      "ms": 0.5129,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 10641.7566,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 833.5384,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 273.3826,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 823.5965,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 608.6753,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 442.9032,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 1049.4719,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 444.7659,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 205.2281,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 50.8516,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 738.2594,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 282.6889,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 211.2217,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 137.8066,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 339.393,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 125.8818,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 22.5035,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 170.4246,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 173.1064,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 1495.5323,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 2114.9901,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 2761.3826,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 573.7726,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 2098.3451,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 1269.4203,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 942.2241,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 1131.2329,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 1131.3918,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 333.9357,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 1056.2448,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 105.9723,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.2129,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 7134.2266,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 710.9006,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1559.3004,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 937.2958,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 840.5409,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 1653.3595,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 542.5265,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 513.2176,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 855.3373,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 488.0509,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.5014,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 1.4371,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1186.5314,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 4342.7687,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 15689.4895,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 104.9881,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 80.9083,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 108.1431,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 258.8631,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 87.7859,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-07: إعادة فتح المسير وإلغاؤه من غير «عرض مسيرات الرواتب» — العملية بتتنفذ والرد حالة المسير بس",
      "ms": 105.9539,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-08: «ضم موظفين للمسير» بصلاحية الحساب من غير «عرض مسيرات الرواتب» — العضوية بتتغير والرد حالة المسير بس",
      "ms": 1047.32,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-09: معاينة عضوية المسير بصلاحية الحساب من غير «عرض مسيرات الرواتب» — الأسماء والتغطية من غير راتب الشهر ولا المستحق",
      "ms": 65.9426,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
      "ms": 9432.8008,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
      "ms": 328.1565,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
      "ms": 280.7839,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
      "ms": 1970.214,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
      "ms": 518.156,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
      "ms": 408.0012,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
      "ms": 372.6885,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
      "ms": 226.5398,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
      "ms": 158.0772,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
      "ms": 245.0799,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
      "ms": 6521.1653,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
      "ms": 942.5805,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
      "ms": 1273.7987,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
      "ms": 686.7041,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
      "ms": 612.8609,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
      "ms": 1211.6156,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
      "ms": 637.6654,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
      "ms": 640.783,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
      "ms": 382.3237,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
      "ms": 492.6178,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
      "ms": 600.5819,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
      "ms": 817.3794,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
      "ms": 1154.7248,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
      "ms": 517.1605,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
      "ms": 926.0492,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
      "ms": 1233.6268,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
      "ms": 1121.7312,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
      "ms": 694.8939,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
      "ms": 796.5066,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
      "ms": 615.8856,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
      "ms": 537.7257,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
      "ms": 1003.256,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
      "ms": 1588.3312,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
      "ms": 1439.6546,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
      "ms": 554.9457,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
      "ms": 931.8584,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
      "ms": 1719.8153,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
      "ms": 859.0348,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
      "ms": 461.3293,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
      "ms": 917.3166,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
      "ms": 1901.9899,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
      "ms": 1602.5536,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 3405.0134,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
      "ms": 1742.2467,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
      "ms": 3438.6554,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
      "ms": 2136.0048,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
      "ms": 790.3007,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1618.3105,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
      "ms": 2800.5971,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
      "ms": 550.5424,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
      "ms": 800.8067,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
      "ms": 963.0269,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
      "ms": 486.5796,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
      "ms": 775.4673,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
      "ms": 1764.0656,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
      "ms": 3369.4713,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
      "ms": 1318.6399,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
      "ms": 795.2455,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
      "ms": 3055.1693,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
      "ms": 1277.608,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
      "ms": 4634.1753,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
      "ms": 2768.5752,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
      "ms": 737.2564,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
      "ms": 2274.9384,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
      "ms": 26.2599,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
      "ms": 2406.6992,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
      "ms": 2518.4487,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 8451.5524,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2625.2721,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 409.6951,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 230.9073,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 70.3767,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1435.9197,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 464.6799,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 180.7516,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 461.4472,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1243.8929,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
      "ms": 346.1646,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
      "ms": 2205.1619,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
      "ms": 1094.1626,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
      "ms": 2202.2064,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 7657.0847,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2515.4768,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 362.4015,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 179.2545,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 370.2457,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 47.7713,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1704.2187,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 160.2047,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 274.7651,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 410.7602,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 423.8556,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 2184.4959,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 41.0777,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 262.1031,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 312.9145,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
      "ms": 6573.8015,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
      "ms": 1550.0603,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
      "ms": 877.5239,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
      "ms": 345.5973,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(هـ) فصل الفروع في شاشات الشهر: مسير كل أعضائه في فرع تاني مايتعرضش لحساب فرع، ومسير شهر لاحق بنفس الاسم برّه نطاقه مايتعدّلش، ورد إلغاء قيد على قد صلاحية القراءة",
      "ms": 1164.1631,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
      "ms": 6130.5847,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
      "ms": 181.7644,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 428.5957,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
      "ms": 121.8657,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 6814.9749,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 397.2023,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 118.3165,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 260.1661,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 60.6343,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 54.0422,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 316.1117,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
      "ms": 425.2638,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR34-B01: دفتر السلفة لقارئ رواتب الفرع — رقم مسير اتعمل للموظف في فرع تاني (قبل نقله) مابيظهرش ولا «#رقمه» في نص الحدث؛ مسير فرعه وحساب الشركة والموظف نفسه بيشوفوه",
      "ms": 146.1011,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز",
      "ms": 5843.5946,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع",
      "ms": 2309.0313,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز",
      "ms": 1136.935,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "بدل على الشركة كلها: حساب الفرع يشوف عدد سطور فرعه بس (مش عدد الشركة)، ومفيش «اتلغى منه» من سطور فروع تانية",
      "ms": 132.8657,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "CR32-B01: مسير فرع تاني للموظف بعد نقله مايظهرش لحساب الفرع في ردود البدل وقايمته، ومسير فرعه بيظهر",
      "ms": 927.3059,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "CR33-B01: رفض إلغاء سطر بدل في مسير فرع تاني معتمد أو مصروف من غير رقم المسير لحساب الفرع، وبالرقم للشركة",
      "ms": 1096.4377,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
      "ms": 8711.8787,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
      "ms": 3280.8544,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
      "ms": 645.71,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
      "ms": 914.9718,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
      "ms": 865.7912,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
      "ms": 1145.6853,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 7456.9614,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 228.3056,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 4822.0637,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 5450.7602,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 1011.3729,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 1022.586,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 595.5434,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 735.2706,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 467.3315,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 155.8573,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-11: the legacy branch calculation creates a replacement after cancellation, while an explicit cancelled runId remains locked",
      "ms": 7445.3346,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: snapshot payslip maps the saved hireDate to joinDate and keeps employee identity and salary from calculation",
      "ms": 672.8693,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: legacy branch payslip never exposes current private data or current salary after an employee transfer",
      "ms": 139.9909,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: an installment-only recalculation appears in changedEmployeeIds while membership and employee salary stay unchanged",
      "ms": 781.8197,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: CUSTOM history with old items but no historical members denies branch access even when every current member is local",
      "ms": 690.496,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا",
      "ms": 6298.9167,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "ملخص التكلفة والخصومات والإضافي من نفس البنود",
      "ms": 35.5972,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير",
      "ms": 60.3035,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 37.2341,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
      "ms": 6633.3034,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 16.1773,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
      "ms": 49.3751,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 5985.7064,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 156.1762,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 207.9068,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 105.644,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 936.6394,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 191.1553,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 80.2375,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 232.6217,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 183.54,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 185.6756,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.5369,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 160.2917,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 55.9025,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 164.2407,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 94.7996,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 42.6712,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 161.4483,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 37.9929,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 180.155,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 86.0186,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 112.5514,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1519.2104,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 249.8947,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 230.2355,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 550.6542,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 67.0089,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 101.6768,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 121.0886,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 219.9891,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 308.5843,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 320.6532,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 67.3811,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 89.2084,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 211.145,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 73.8312,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 164.0455,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 78.7623,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 180.2986,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 99.4846,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 117.6922,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 6295.0678,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 733.7585,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 48.0936,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 188.1999,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 270.4644,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 120.408,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 198.1513,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 168.4177,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 172.1822,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 36.591,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 437.1433,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 182.6737,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 217.3299,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 19.2833,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 89.3014,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "A1 — كتالوج مفاتيح الإعدادات كامل ومقروء (GET /settings/config)",
      "ms": 7772.1214,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "A2 — مفتاح غير مُعلن مرفوض ولا يُخزَّن (لا إنشاء مفاتيح من العميل)",
      "ms": 16.4221,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "A3 — سلطة الكتابة: نطاق الشركة فقط، والموظف العادي ممنوع",
      "ms": 61.207,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "A4 — مفاتيح يقرؤها الخادم ولا تُضبط من الإعدادات (مفاتيح يتيمة)",
      "ms": 91.3084,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B1 — attendance.grace_minutes: السماحية تغيّر التأخير المحسوب",
      "ms": 1408.8519,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B2 — attendance.weekend_days: أيام الراحة تغيّر أيام العمل المحسوبة",
      "ms": 186.4095,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B3 — attendance.device_key: المفتاح يفتح/يقفل استقبال البصمات",
      "ms": 163.1365,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B4 — attendance.holiday_work_multiplier: مضاعف بدل دوام العطلة الافتراضي",
      "ms": 147.5366,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B5 — attendance.flex.*: إعدادات المرونة تُثبَّت في نسخة تعريف الدوام الجديدة",
      "ms": 218.0453,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "B6 — attendance.absence_penalty_days / sync_interval_minutes / absence_catchup_max_days",
      "ms": 61.0742,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C1 — overtime.detection_threshold_hours / rounding_minutes: البصمة تُنتج دقائق مختلفة",
      "ms": 544.8657,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C2 — overtime.multiplier_* : مضاعف نوع اليوم يغيّر قيمة الإضافي",
      "ms": 346.2259,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C3 — overtime.enabled / allow_early_overtime / request_backdate_days / max_hours_*",
      "ms": 469.5137,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C3b — مفاتيح «إعداد» مقفولة على قيمة واحدة منفّذة (توثيق لا إعداد)",
      "ms": 6.5312,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "C4 — overtime.wage_components: مفتاح توافق — أي قيمة تُعاد لقائمة المكونات الكاملة",
      "ms": 20.8984,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D1 — leave.annual_entitled: استحقاق الموظف الجديد يتبع الإعداد",
      "ms": 334.4597,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D2 — leave.sick_entitled: هل المفتاح مقروء فعلاً؟ (مفتاح ميت مشتبه فيه)",
      "ms": 184.0166,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D3 — leave.max_backdate_days: حد الأثر الرجعي لطلب الإجازة",
      "ms": 195.3424,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D4 — leave.accrual_mode / probation_months / carryover_*",
      "ms": 120.7478,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "D5 — أنواع الإجازات: إنشاء وتعديل، والقاعدة تتحكم في الطلب",
      "ms": 127.163,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E1 — payroll.cycle_start_day: يوم بداية الدورة يغيّر مدى فترة المسير",
      "ms": 83.8098,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E2 — payroll.monthly_days / daily_hours / late_deduction_enabled / salary_evidence_mode",
      "ms": 136.2201,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E3 — payroll.shortfall_* و attendance_overlap_policy و attendance_daily_cap_days",
      "ms": 131.7406,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E4 — payroll.policy.*: افتراضات النسخة الجديدة متحقَّق منها ومتصلة",
      "ms": 217.8959,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "E5 — system.currency و onboarding.window_days و eos.*",
      "ms": 276.9471,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "F1 — loan.request_open / request_from_day / request_to_day: فتح وقفل طلب السلفة",
      "ms": 279.6812,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "F2 — loan.exceptional_reason_min_length / first_installment_max_months_ahead / insufficient_net_behavior",
      "ms": 78.8784,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "G1 — deductions.*: أقل طول للسبب وحد الدفعة وإنشاء المدير",
      "ms": 233.5622,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "G2 — bonuses.* و financial_exemptions.*",
      "ms": 202.0958,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "H1 — company.*: صيغ ملف الشركة وأثرها على المستندات",
      "ms": 169.0845,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I1 — الفروع: إنشاء وتعديل، وأيام الراحة على مستوى الفرع تغيّر أيام العمل",
      "ms": 155.9889,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I2 — الأقسام والفرق: الهيكل وعزل الفروع",
      "ms": 111.7842,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I3 — الكتالوجات (مسميات/درجات/مراكز تكلفة/أنواع أصول/أنواع إذن): إنشاء وتعديل وسلطة",
      "ms": 350.7493,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I4 — الورديات وجداول العمل: القاعدة تغيّر التأخير وأيام العمل",
      "ms": 548.8349,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I5 — قواعد استثناء أيام العمل: القاعدة تغيّر يوم الراحة إلى دوام",
      "ms": 225.6619,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I6 — العطلات الرسمية: العطلة تغيّر أيام العمل، وحساب الفرع ممنوع",
      "ms": 268.8036,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I7 — المستخدمون والأدوار: الصلاحية الممنوحة تفتح السلوك فعلاً",
      "ms": 266.5875,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I8 — سلاسل الاعتماد وأنواع الطلبات: التعريف يتحكم في مسار الطلب",
      "ms": 212.6811,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    },
    {
      "file": "fulltest-settings.integration.cjs",
      "name": "I9 — أنواع الخصم والمكافأة (كتالوج): إنشاء وتعديل وسلطة",
      "ms": 57.611,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round41-results-affected.cjs"
    }
  ],
  "diagnostics": [
    {
      "case": "line-key-rendering-controls",
      "hiddenKeys": [
        "BASIC",
        "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~6673d7f7e4191d29"
      ],
      "rowColumnMapping": true,
      "stableReads": true,
      "net": 9067.89,
      "companySelfPreserved": true,
      "storedUnchanged": true
    },
    {
      "case": "recover-hidden-period-from-key",
      "route": "payslip",
      "directForeignRead": 403,
      "currentRead": 200,
      "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~6673d7f7e4191d29",
      "readerOnlyCandidateSpace": 432,
      "decoded": [],
      "net": 9067.89,
      "storedUnchanged": true
    },
    {
      "case": "recover-hidden-period-from-key",
      "route": "run-lines",
      "directForeignRead": 403,
      "currentRead": 200,
      "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~6673d7f7e4191d29",
      "readerOnlyCandidateSpace": 432,
      "decoded": [],
      "net": 9067.89,
      "storedUnchanged": true
    },
    {
      "case": "adjacent-reader-foreign-period",
      "route": "overview-lines",
      "url": "/payroll/overview/lines?period=2026-11",
      "foreignRead": 403,
      "currentRead": 200,
      "leaks": [],
      "companyRefs": [
        {
          "path": "$.columns.earnings[1].key",
          "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
        },
        {
          "path": "$.columns.earnings[1].name",
          "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
        },
        {
          "path": "$.rows[0].earnings[1].key",
          "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
        },
        {
          "path": "$.rows[0].earnings[1].name",
          "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
        }
      ],
      "net": 9067.89,
      "storedUnchanged": true
    },
    {
      "case": "adjacent-reader-foreign-period",
      "route": "approval-review",
      "url": "/payroll/approval-chain/runs/3/review",
      "foreignRead": 403,
      "currentRead": 200,
      "leaks": [],
      "companyRefs": [
        {
          "path": "$.rows[0].earningLines[1].key",
          "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
        },
        {
          "path": "$.rows[0].earningLines[1].name",
          "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
        }
      ],
      "net": 9067.89,
      "storedUnchanged": true
    },
    {
      "case": "extended-scope-label-controls",
      "kind": "TEAM",
      "branchLabel": "فريق: CR40 allowed team، وغيرها خارج نطاق صلاحيتك",
      "companyLabel": "فريق: CR40 allowed team، CR40 private team",
      "multiLabel": "فريق: CR40 allowed team، CR40 private team",
      "localTotal": "6000.00",
      "companyTotal": "15000.00",
      "branchHeader": [
        null,
        null
      ],
      "companyHeader": [
        null,
        null
      ],
      "storedUnchanged": true
    },
    {
      "case": "extended-scope-label-controls",
      "kind": "CUSTOM",
      "branchLabel": "قائمة مخصّصة",
      "companyLabel": "قائمة مخصّصة (2 موظف)",
      "multiLabel": "قائمة مخصّصة",
      "localTotal": "6000.00",
      "companyTotal": "15000.00",
      "branchHeader": [
        null,
        null
      ],
      "companyHeader": [
        2,
        "فرع باء المحجوب"
      ],
      "storedUnchanged": true
    },
    {
      "case": "extended-scope-label-controls",
      "kind": "COST_CENTER",
      "branchLabel": "مركز تكلفة: CR40 company cost center",
      "companyLabel": "مركز تكلفة: CR40 company cost center",
      "multiLabel": "مركز تكلفة: CR40 company cost center",
      "localTotal": "6000.00",
      "companyTotal": "15000.00",
      "branchHeader": [
        null,
        null
      ],
      "companyHeader": [
        null,
        null
      ],
      "storedUnchanged": true
    },
    {
      "case": "CR41-seven-reader-closures",
      "routes": [
        "payslip",
        "lines",
        "run",
        "overview",
        "review",
        "ledger",
        "register"
      ],
      "status": 200,
      "oldForeignRunStatus": 403,
      "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294",
      "publicCandidates": 432,
      "algorithms": 4,
      "matches": [],
      "net": 9067.89,
      "reversal": -9067.89,
      "companySelfPreserved": true,
      "storedUnchanged": true
    },
    {
      "case": "CR41-query-payroll-month-oracle",
      "actorHasPayrollView": false,
      "ownPayslipStatus": 200,
      "foreignItemStatus": 404,
      "observations": [
        {
          "target": "nonexistent",
          "retainsOwnJuly": true,
          "identical": true
        },
        {
          "target": "foreignNoPayroll",
          "retainsOwnJuly": true,
          "identical": true
        },
        {
          "target": "foreignAugust",
          "retainsOwnJuly": true,
          "identical": true
        },
        {
          "target": "self",
          "retainsOwnJuly": true,
          "identical": true
        },
        {
          "target": "foreignJuly",
          "retainsOwnJuly": false,
          "identical": false
        }
      ],
      "ownLineBefore": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance",
      "ownLineAfter": "إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance",
      "net": 9067.89,
      "companyUnchanged": true,
      "storedUnchanged": true
    }
  ],
  "databasesCreated": 25,
  "closures": [
    {
      "id": "CR40-B01",
      "closed": true,
      "proof": "Eight unchanged round40 tests pass. Independent live response decoder accepts the new 16-hex tag and tries 432 months using SHA1/SHA256/SHA512/MD5: no match. Read implementation uses domain-separated server-secret HMAC. Stable keys agree across payslip, run table, month lines and approval review; rows and columns match. Company/self line text retained."
    },
    {
      "id": "CR40-B02",
      "closed": true,
      "proof": "Same real allowance/pay/reverse/transfer/pay lifecycle exercised in seven readers: payslip, run lines, run detail, month lines, approval review, obligation ledger and financial register. No foreign historical period in branch responses. Product corrections regression also covers explicitly seeded stored debit/breakdown text and financial register fallback. All four describePayrollItemsLines callers pass viewer."
    }
  ],
  "findings": [
    {
      "id": "CR41-B01",
      "severity": "blocking branch isolation / payroll-period existence disclosure",
      "introducedIn": "2cb8883",
      "routes": [
        "GET /payroll/items/:ownItemId?employeeId=:foreignEmployeeId"
      ],
      "sources": [
        "api/src/payroll/hidden-run-periods.interceptor.ts:58",
        "api/src/payroll/hidden-run-periods.interceptor.ts:69",
        "api/src/payroll/payroll.controller.ts:480"
      ],
      "reproduction": "Ordinary employee account, employeeId linked only to own employee, permissions=[] and branch A. Own paid November payslip legitimately retains original July payroll text after an actual allowance/pay/reverse/transfer lifecycle. Create real foreign B July payroll (6000), foreign B August payroll (7000), plus another B employee with no payroll. Reading the foreign July item directly is 404. Append unused employeeId query to the same own-payslip URL: nonexistent ID, self ID, foreign no-payroll ID and foreign August ID all return the byte-equivalent JSON body, retaining مسير 2026-07. Only foreign July ID causes that text and key to be masked. Every own-payslip request returns 200. Thus a caller without payroll.view can verify a specific foreign employee payroll month through redaction differences. Stored records and own net 9067.89 unchanged; company response identical with/without the query.",
      "cause": "Global interceptor reads raw request.query.employeeId regardless of whether the endpoint accepts or authorizes that parameter, adds it to response employee context and queries hidden payroll periods. Controller ignores this query and authorizes only the item ID. The correct self exemption does not exempt the injected foreign ID.",
      "expected": "Tie redaction employee context to the resource actually authorized by this route. Do not use unconsumed/unvalidated query values as an authorization or redaction input. Preserve safety net on genuine employee responses and allowed self/company text.",
      "policyInterpretation": "This is a newly introduced specific foreign-employee payroll-month oracle in a successful self-service read, not the previously deferred 403/404 distinction when requesting a payroll-run ID. It does not expose the foreign salary amount; the protected fact reproduced is membership in a payroll period."
    }
  ],
  "controls": {
    "restoredAllowance": {
      "base": 9000,
      "allowance": 67.89,
      "originalNet": 9067.89,
      "reversal": -9067.89,
      "currentNet": 9067.89
    },
    "scopeRuns": {
      "local": 6000,
      "foreign": 9000,
      "company": 15000
    },
    "queryControls": [
      "nonexistent employee",
      "self employee",
      "foreign employee without payroll",
      "foreign employee with August only"
    ],
    "directForeignItemStatus": 404,
    "allSelfReadStatuses": 200,
    "companySelfTextPreservedWithoutInjectedContext": true,
    "storedFinanceAndHistoryUnchangedByReads": true
  },
  "limitations": {
    "fullIntegrationSuite": false,
    "fullUnitSuite": false,
    "textUnitTests": 8,
    "browser": false,
    "oldRevisionRuntime": false,
    "performanceMeasured": false,
    "newMigrations": false,
    "environment": "Real Nest guards/pipes/controllers/interceptors/services in-process without a listening HTTP service. SQL Server2022 compatibility150, not native SQL2019. Existing migration fixtures only on our disposable databases under prior explicit permission.",
    "fixtures": "Real API financial cycle and branch transfer in independent test; fixture seeds synthetic employees/attendance exemptions. Existing corrections test explicitly seeds debit and breakdown text. Round40 scope controls retain documented legacy-header fixtures, not a new migration or unsupported cost-center-only create claim.",
    "transport": "Exact private SEC-07 PDF fixture permits dot directory segments under supplied .claude worktree; authorization and storage checks unchanged.",
    "scope": "Full seven-file product delta and relevant readers reviewed within authorized range; main phase0/phase1/phase2 untouched. Owner decisions not reclassified.",
    "modifications": "New round41 tests/evidence and requested report only; no product/old test edits, company-data writes or service changes."
  },
  "staticChecks": {
    "target": "2cb88835c220815488b92911caedd778db61714f",
    "results": [
      {
        "area": "api",
        "exitCode": 0,
        "diagnostics": ""
      },
      {
        "area": ".",
        "exitCode": 0,
        "diagnostics": ""
      }
    ]
  }
}

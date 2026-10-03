module.exports = {
  "target": "ecf4846644822ecc1b9f533fa3451ef69bd84f48",
  "productRange": "f58f894..ecf4846",
  "relatedCodeLimit": "162d50e..ecf4846",
  "counts": {
    "tests": 270,
    "passed": 266,
    "failed": 4,
    "skipped": 0
  },
  "executions": [
    {
      "file": "codex-review-round40-results-previous39.cjs",
      "files": [
        "codex-review-round39-payslip",
        "codex-review-round39-mixed-report",
        "codex-review-round39-bonus-control",
        "codex-review-round39-text"
      ],
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
      "failures": []
    },
    {
      "file": "codex-review-round40-results-key.cjs",
      "files": [
        "codex-review-round40-key-boundary"
      ],
      "counts": {
        "tests": 3,
        "failed": 2,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "file": "codex-review-round40-key-boundary.integration.cjs",
          "name": "CR40 payslip: a masked key must not allow recovering the hidden payroll period offline",
          "error": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n"
        },
        {
          "file": "codex-review-round40-key-boundary.integration.cjs",
          "name": "CR40 run-lines: a masked key must not allow recovering the hidden payroll period offline",
          "error": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n"
        }
      ]
    },
    {
      "file": "codex-review-round40-results-scopes.cjs",
      "files": [
        "codex-review-round40-scope-controls"
      ],
      "counts": {
        "tests": 3,
        "failed": 1,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      },
      "failures": [
        {
          "file": "codex-review-round40-scope-controls.integration.cjs",
          "name": "CR40 COST_CENTER: scoped labels, multi-branch/company control, counts and legacy branch header",
          "error": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-SCOPE-REQUIRED\",\"message\":\"حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين\"}"
        }
      ]
    },
    {
      "file": "codex-review-round40-results-cost-center-control.cjs",
      "files": [
        "codex-review-round40-scope-controls"
      ],
      "counts": {
        "tests": 1,
        "failed": 0,
        "passed": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-round40-results-adjacent.cjs",
      "files": [
        "codex-review-round40-key-boundary"
      ],
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
      "failures": [
        {
          "file": "codex-review-round40-key-boundary.integration.cjs",
          "name": "CR40 adjacent overview-lines: old foreign period must not survive in another line reader",
          "error": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n"
        },
        {
          "file": "codex-review-round40-key-boundary.integration.cjs",
          "name": "CR40 adjacent approval-review: old foreign period must not survive in another line reader",
          "error": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n"
        }
      ]
    },
    {
      "file": "codex-review-round40-results-affected.cjs",
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
        "cost-center-report"
      ],
      "counts": {
        "tests": 249,
        "failed": 0,
        "passed": 249,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 249,
        "suites": 0
      },
      "failures": []
    }
  ],
  "finalCases": [
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 ledger and payslip obligationDetails hide a real reinstated foreign period; company/self and finance intact",
      "ms": 7457.0058,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 payslip: no foreign payroll period through a current in-scope payroll",
      "ms": 103.0463,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-lines: no foreign payroll period through a current in-scope payroll",
      "ms": 90.1103,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-detail: no foreign payroll period through a current in-scope payroll",
      "ms": 94.0159,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 events: no foreign payroll period through a current in-scope payroll",
      "ms": 50.425,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "codex-review-round39-mixed-report.integration.cjs",
      "name": "CR39 BRANCH mixed report retains allowed run head without foreign organization names",
      "ms": 6705.7224,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "codex-review-round39-mixed-report.integration.cjs",
      "name": "CR39 DEPARTMENT mixed report retains allowed run head without foreign organization names",
      "ms": 3516.3172,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "codex-review-round39-bonus-control.integration.cjs",
      "name": "CR39 paid bonus: hide foreign applied period in payout/obligations/status while own, company and allowed branch retain it",
      "ms": 5046.9094,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم",
      "ms": 0.7144,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم",
      "ms": 0.1712,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي",
      "ms": 0.5733,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B01: مفتاح السطر المحجوب ببصمة من الأصل — مفتاحين مختلفين مايبقوش واحد، ونفس المفتاح نفس النتيجة في الصف والعمود، والاسم من غير الفترة",
      "ms": 0.5166,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B02: تسمية نطاق المسير لقارئ فرع — وحدات نطاقه بس، والباقي «وغيرها خارج نطاق صلاحيتك»، والشركة كاملة، والقايمة المخصّصة من غير عدد",
      "ms": 78.071,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-previous39.cjs"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 line rendering controls: hidden text, stable row/column keys, unchanged totals, company/self and stored history",
      "ms": 5942.2895,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-key.cjs"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 payslip: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 35.2102,
      "pass": false,
      "error": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "cause": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:67:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "evidence": "codex-review-round40-results-key.cjs"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 run-lines: a masked key must not allow recovering the hidden payroll period offline",
      "ms": 41.9544,
      "pass": false,
      "error": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "cause": "The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: The returned unkeyed digest verifies a small dictionary of hidden payroll periods\n+ actual - expected\n\n+ [\n+   '2026-07'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:67:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "evidence": "codex-review-round40-results-key.cjs"
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 TEAM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 5934.5442,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-scopes.cjs"
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 CUSTOM: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 1769.276,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-scopes.cjs"
    },
    {
      "file": "codex-review-round40-scope-controls.integration.cjs",
      "name": "CR40 COST_CENTER: scoped labels, multi-branch/company control, counts and legacy branch header",
      "ms": 12884.5749,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-cost-center-control.cjs"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent overview-lines: old foreign period must not survive in another line reader",
      "ms": 8973.6123,
      "pass": false,
      "error": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.columns.earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.columns.earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earnings[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:76:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)",
      "evidence": "codex-review-round40-results-adjacent.cjs"
    },
    {
      "file": "codex-review-round40-key-boundary.integration.cjs",
      "name": "CR40 adjacent approval-review: old foreign period must not survive in another line reader",
      "ms": 83.1672,
      "pass": false,
      "error": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "cause": "A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: A visible current payroll does not authorize an embedded foreign historical payroll period\n+ actual - expected\n\n+ [\n+   {\n+     path: '$.rows[0].earningLines[1].key',\n+     text: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   },\n+   {\n+     path: '$.rows[0].earningLines[1].name',\n+     text: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round40-key-boundary.integration.cjs:76:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)",
      "evidence": "codex-review-round40-results-adjacent.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "runs report lists runs without a branch, keeps cancelled runs out of totals, and scopes branch users by member snapshot",
      "ms": 10460.9087,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "detailed payroll reports require payroll.view on top of reports.view",
      "ms": 36.2438,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "unassigned report lists every on-job employee outside a run with a reason, and changes nothing",
      "ms": 420.6567,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "overtime report shows amounts with their source; rejected rows are zero and outside the total",
      "ms": 104.5063,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "loans report reconciles paid + remaining = principal, shows installment n of m, aging and after-service balances",
      "ms": 80.2294,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "variance report explains each employee difference by component and isolates unexplained residuals",
      "ms": 49.7974,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "month totals are one number in the payroll month report, the variance report and the financial payroll register",
      "ms": 1788.3444,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "a suspended employee is derived from the suspension periods: real reason, real count, and the checkbox filters",
      "ms": 321.6719,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "accepted filters are applied: teamId on the financial reports and branchId on the attendance report",
      "ms": 163.828,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 12424.9222,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 3179.5226,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 4763.3186,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
      "ms": 5617.7094,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
      "ms": 5070.7227,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01 / CR26: إعفاء منقول لتكميلي فيه موظف اتنقل لفرع تاني — مكان النسخة من عضوية التكميلي نفسه، فقارئ ومانح الفرع القديم مايشوفوهاش ولا يلغوها، وسجلات الإعفاء والمسير مابتسمّيهاش",
      "ms": 5163.9618,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR35-B01 / CR35-N01: موانع عكس الصرف بقاعدة رؤية المسير — قسط ترحيل حجزه مسير فرع تاني بعد نقل الموظف بيتقال من غير رقمه ولا حالته لقارئ الفرع في المعاينة والإنشاء واعتماد مسير العكس، والشركة بتشوفه؛ ومسير العكس بيتبع مسيره الأصلي",
      "ms": 2560.1573,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR37-B02: تقرير الإضافي وتقرير «بلا مسير» — مسير صرف إضافي موظف اتنقل لفرع تاني ومرجع تأجيله وآخر مسير ليه من غير رقمهم ولا اسمهم ولا حالتهم ولا فترتهم لقارئ الفرع الجديد، والشركة بتشوفهم",
      "ms": 1402.15,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR38-B01/B02: موظف اتنقل — قايمة مسيرات «بلا مسير» لقارئ الفرع الجديد زي ما هي (مسيره القديم مايظهرش)، واسم قيده من غير فترة المسير القديم، والشركة بتشوف الكل",
      "ms": 1421.2208,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية",
      "ms": 9671.0466,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق",
      "ms": 8434.0585,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها",
      "ms": 718.1371,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين",
      "ms": 33.8402,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه",
      "ms": 44.0951,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع",
      "ms": 25.06,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات",
      "ms": 9.4105,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة",
      "ms": 419.4476,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة",
      "ms": 35.9853,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور",
      "ms": 66.565,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي",
      "ms": 61.0756,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف",
      "ms": 60.7297,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده",
      "ms": 52.73,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير",
      "ms": 34.6692,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر",
      "ms": 33.8194,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة",
      "ms": 274.8958,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات",
      "ms": 124.9231,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع",
      "ms": 91.5237,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين",
      "ms": 61.1704,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط",
      "ms": 29.5249,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع",
      "ms": 15.7578,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا",
      "ms": 222.1165,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير",
      "ms": 98.3862,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ",
      "ms": 90.9881,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير",
      "ms": 930.3218,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف",
      "ms": 190.3296,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا",
      "ms": 105.2331,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-reports.integration.cjs",
      "name": "ZZ — ملخص التغطية والملاحظات",
      "ms": 0.4261,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 7423.0534,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 540.0428,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 181.0924,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 485.4523,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 356.7269,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 337.2391,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 793.4867,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 362.1453,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 153.7852,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 48.1285,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 496.7307,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 206.0689,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 217.3491,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 126.2316,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 297.8656,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 83.9593,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 13.5383,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 135.8021,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 170.4021,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 1391.7191,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 1842.989,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 2004.0467,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 477.6306,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 1556.3252,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 951.5517,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 699.3042,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 868.0878,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 842.2357,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 209.0729,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 880.8357,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 86.0293,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.1711,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 6402.0427,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 685.0075,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1615.7735,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 887.4043,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 848.8555,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 1667.9709,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 598.7126,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 463.4497,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 779.3223,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 409.4705,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.4819,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 1.566,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1101.9176,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 4168.6544,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-01: «قسائم راتبي» بترجّع بيانات المسير اللي القسيمة بتعرضها بس — من غير أرقام الزملاء ولا تعريف المسير",
      "ms": 11591.9311,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-02: القسيمة — صاحبها من غير صلاحية بياخد البيانات المحدودة، وقارئ الرواتب في نطاقه زي ما كان",
      "ms": 116.2531,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-03: بعد الصرف — مرجع الصرف وقناته في قسيمة الموظف، ومين صرف مش في الرد",
      "ms": 111.5322,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-04: مسير فيه فرعين — قارئ رواتب فرع واحد بياخد قسيمة موظف فرعه ببيانات القسيمة بس، وقارئ الشركة بياخد بيانات المسير",
      "ms": 162.7762,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-05: تقرير مسيرات الرواتب في لوحة التقارير وآخر المسيرات في لوحة التحكم — لقارئ الرواتب بس",
      "ms": 244.1002,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-06: تقرير حوكمة الإعفاءات — صافي المسير المحفوظ لقارئ الشركة بس، والمكافآت بموظفي نطاق القارئ",
      "ms": 122.565,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-07: إعادة فتح المسير وإلغاؤه من غير «عرض مسيرات الرواتب» — العملية بتتنفذ والرد حالة المسير بس",
      "ms": 113.0933,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-08: «ضم موظفين للمسير» بصلاحية الحساب من غير «عرض مسيرات الرواتب» — العضوية بتتغير والرد حالة المسير بس",
      "ms": 1132.9099,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-response-leaks.integration.cjs",
      "name": "LK-09: معاينة عضوية المسير بصلاحية الحساب من غير «عرض مسيرات الرواتب» — الأسماء والتغطية من غير راتب الشهر ولا المستحق",
      "ms": 79.0156,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "migration 068 through the real migrator: adds users.scopeBranchIds nvarchar(400) NULL, backfills nothing, zero users schema delta, re-runs change nothing",
      "ms": 8990.7563,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API «نطاق الفروع»: existing branches only and no duplicates, [home] is stored as NULL, [] / null reset to home, «كل الفروع» clears the list, and every change bumps tokenVersion",
      "ms": 416.5908,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "users API: a branch-scoped admin grants only branches inside its own scope and never «كل الفروع»; a company-wide admin grants any; a wider account is off-limits to a narrower admin",
      "ms": 327.1407,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "a user scoped to [A, B] sees A and B but never C: employees, org, requests, attendance, payroll runs and approval chains",
      "ms": 1983.3259,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the [A, B] user writes inside A and B but never into C: employees, transfers, requests on behalf, manual punches, payroll runs, branch approval chains",
      "ms": 551.4439,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "raw-SQL report paths (dashboard, /reports/*, Excel export) count A and B together and never C; a single-branch account keeps its one branch",
      "ms": 380.1596,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "payroll «موظفون بلا مسير» on a run for [A, B]: the report covers exactly both branches, the acknowledgement is stored per branch, and it never counts for the company scope",
      "ms": 289.1071,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "an unassigned non-admin (no branch, not «all branches») sees nothing and writes nothing — the empty scope never means «all»",
      "ms": 195.8455,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "the scope rides in the token: a scopeBranchIds change bumps tokenVersion and kills the old session, narrowing behind the screen kills it too, widening waits for the next login",
      "ms": 127.5776,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "user-branch-scopes.integration.cjs",
      "name": "round-4 review: out of scope reads exactly like «not found» (requests, attendance exemptions), and a C-only shift or work-schedule history stays hidden",
      "ms": 178.6922,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
      "ms": 22468.9754,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
      "ms": 4224.569,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
      "ms": 4299.2129,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
      "ms": 3263.0194,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
      "ms": 4571.4777,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
      "ms": 6462.2961,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
      "ms": 963.8231,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
      "ms": 806.2084,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
      "ms": 499.8668,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
      "ms": 492.8558,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
      "ms": 463.4308,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
      "ms": 675.8327,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
      "ms": 509.3752,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
      "ms": 396.4872,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
      "ms": 777.0897,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
      "ms": 992.5685,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
      "ms": 701.7495,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
      "ms": 604.0939,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
      "ms": 681.4938,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
      "ms": 567.6864,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
      "ms": 565.3708,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
      "ms": 909.2145,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
      "ms": 1486.4725,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
      "ms": 1080.0038,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
      "ms": 422.0152,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
      "ms": 646.3981,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
      "ms": 790.1944,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
      "ms": 896.0683,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
      "ms": 396.652,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
      "ms": 860.1508,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
      "ms": 1902.2153,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
      "ms": 1425.1735,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 2289.8076,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
      "ms": 1498.6142,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
      "ms": 2727.0076,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
      "ms": 1877.775,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
      "ms": 552.5828,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1287.0568,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
      "ms": 2273.2786,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
      "ms": 296.8546,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
      "ms": 662.9741,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
      "ms": 703.5429,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
      "ms": 328.0521,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
      "ms": 530.6855,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
      "ms": 1181.9512,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
      "ms": 2631.5849,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
      "ms": 1006.6,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
      "ms": 537.5115,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
      "ms": 2466.9931,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
      "ms": 1143.3152,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
      "ms": 4051.2889,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
      "ms": 2125.2564,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
      "ms": 492.618,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
      "ms": 2567.5026,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
      "ms": 27.8776,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
      "ms": 2673.8384,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
      "ms": 2752.0776,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 6507.9768,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2397.9883,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 350.5172,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 165.6972,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 63.1945,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1403.5016,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 455.7419,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 148.5517,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 435.5966,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1215.9228,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
      "ms": 359.161,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
      "ms": 2010.7572,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
      "ms": 1047.5418,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
      "ms": 2077.0364,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 6605.6689,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2791.9217,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 399.0121,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 191.0678,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 359.6121,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 56.1889,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1759.9673,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 239.4837,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 355.0453,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 419.0895,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 429.35,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 2295.9458,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 39.8321,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 367.7471,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 350.4867,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
      "ms": 8250.4385,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
      "ms": 1644.4452,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
      "ms": 1003.13,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
      "ms": 397.1715,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(هـ) فصل الفروع في شاشات الشهر: مسير كل أعضائه في فرع تاني مايتعرضش لحساب فرع، ومسير شهر لاحق بنفس الاسم برّه نطاقه مايتعدّلش، ورد إلغاء قيد على قد صلاحية القراءة",
      "ms": 1272.8514,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
      "ms": 6649.8073,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
      "ms": 229.6854,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 423.905,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
      "ms": 108.7463,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 6895.0351,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 456.2499,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 145.447,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 345.3456,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 81.916,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 72.3124,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 353.1326,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
      "ms": 482.2921,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR34-B01: دفتر السلفة لقارئ رواتب الفرع — رقم مسير اتعمل للموظف في فرع تاني (قبل نقله) مابيظهرش ولا «#رقمه» في نص الحدث؛ مسير فرعه وحساب الشركة والموظف نفسه بيشوفوه",
      "ms": 185.8879,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز",
      "ms": 6371.6744,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع",
      "ms": 2493.1588,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز",
      "ms": 1247.8976,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "بدل على الشركة كلها: حساب الفرع يشوف عدد سطور فرعه بس (مش عدد الشركة)، ومفيش «اتلغى منه» من سطور فروع تانية",
      "ms": 157.7098,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "CR32-B01: مسير فرع تاني للموظف بعد نقله مايظهرش لحساب الفرع في ردود البدل وقايمته، ومسير فرعه بيظهر",
      "ms": 851.9458,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "CR33-B01: رفض إلغاء سطر بدل في مسير فرع تاني معتمد أو مصروف من غير رقم المسير لحساب الفرع، وبالرقم للشركة",
      "ms": 865.7993,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
      "ms": 8860.9731,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
      "ms": 4027.0118,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
      "ms": 884.9336,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
      "ms": 987.9552,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
      "ms": 791.9177,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
      "ms": 1253.7446,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 7665.2437,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 204.5491,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 4693.9676,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 5591.3096,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 1318.4984,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 1133.312,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 662.6374,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 807.2055,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 516.3178,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 175.1902,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-11: the legacy branch calculation creates a replacement after cancellation, while an explicit cancelled runId remains locked",
      "ms": 7149.6997,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: snapshot payslip maps the saved hireDate to joinDate and keeps employee identity and salary from calculation",
      "ms": 730.3765,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: legacy branch payslip never exposes current private data or current salary after an employee transfer",
      "ms": 167.1305,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: an installment-only recalculation appears in changedEmployeeIds while membership and employee salary stay unchanged",
      "ms": 860.9645,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: CUSTOM history with old items but no historical members denies branch access even when every current member is local",
      "ms": 711.9016,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا",
      "ms": 6310.8073,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "ملخص التكلفة والخصومات والإضافي من نفس البنود",
      "ms": 50.5522,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير",
      "ms": 80.1131,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "financial-report.integration.cjs",
      "name": "حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 50.676,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
      "ms": 7138.3934,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 16.5841,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
      "ms": 50.5742,
      "pass": true,
      "skip": false,
      "evidence": "codex-review-round40-results-affected.cjs"
    }
  ],
  "diagnostics": [
    {
      "case": "real-restored-ledger-controls",
      "foreignRunRead": 403,
      "currentRunRead": 200,
      "ledgerLabel": "إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR39 original allowance",
      "obligationDetailLabel": "إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR39 original allowance",
      "companyLabel": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance",
      "net": 9067.89,
      "restoredAmount": 67.89,
      "companyAndSelfPreserved": true,
      "storedUnchanged": true
    },
    {
      "case": "in-scope-payroll-foreign-text",
      "route": "payslip",
      "originalForeignPeriod": "2026-07",
      "currentVisiblePeriod": "2026-11",
      "directForeignRead": 403,
      "routeStatus": 200,
      "leaks": [],
      "companyRefs": [
        {
          "path": "$.obligationDetails[0].label",
          "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
        },
        {
          "path": "$.lines.earnings[1].key",
          "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
        },
        {
          "path": "$.lines.earnings[1].name",
          "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
        }
      ],
      "net": 9067.89,
      "storedUnchanged": true
    },
    {
      "case": "in-scope-payroll-foreign-text",
      "route": "run-lines",
      "originalForeignPeriod": "2026-07",
      "currentVisiblePeriod": "2026-11",
      "directForeignRead": 403,
      "routeStatus": 200,
      "leaks": [],
      "companyRefs": [
        {
          "path": "$.columns.earnings[1].key",
          "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
        },
        {
          "path": "$.columns.earnings[1].name",
          "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
        },
        {
          "path": "$.rows[0].earnings[1].key",
          "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
        },
        {
          "path": "$.rows[0].earnings[1].name",
          "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR39 original allowance"
        }
      ],
      "net": 9067.89,
      "storedUnchanged": true
    },
    {
      "case": "in-scope-payroll-foreign-text",
      "route": "run-detail",
      "originalForeignPeriod": "2026-07",
      "currentVisiblePeriod": "2026-11",
      "directForeignRead": 403,
      "routeStatus": 200,
      "leaks": [],
      "companyRefs": [],
      "net": 9067.89,
      "storedUnchanged": true
    },
    {
      "case": "in-scope-payroll-foreign-text",
      "route": "events",
      "originalForeignPeriod": "2026-07",
      "currentVisiblePeriod": "2026-11",
      "directForeignRead": 403,
      "routeStatus": 200,
      "leaks": [],
      "companyRefs": [],
      "net": 9067.89,
      "storedUnchanged": true
    },
    {
      "case": "mixed-head-foreign-organization-label",
      "kind": "BRANCH",
      "fullRunRead": 403,
      "mixedHeadAllowed": true,
      "hiddenName": "فرع باء المحجوب",
      "listHead": {
        "id": null,
        "name": "مسير خارج نطاق صلاحيتك",
        "period": "2026-07",
        "status": "PAID",
        "startDate": "2026-06-23",
        "endDate": "2026-07-22",
        "scopeLabel": "فرع: فرع ألف، وغيرها خارج نطاق صلاحيتك"
      },
      "summaryScopeLabel": "فرع: فرع ألف، وغيرها خارج نطاق صلاحيتك",
      "storedNet": 18000,
      "storedUnchanged": true
    },
    {
      "case": "mixed-head-foreign-organization-label",
      "kind": "DEPARTMENT",
      "fullRunRead": 403,
      "mixedHeadAllowed": true,
      "hiddenName": "CR39 confidential department B",
      "listHead": {
        "id": null,
        "name": "مسير خارج نطاق صلاحيتك",
        "period": "2026-08",
        "status": "PAID",
        "startDate": "2026-07-23",
        "endDate": "2026-08-22",
        "scopeLabel": "قسم: CR39 visible department A، وغيرها خارج نطاق صلاحيتك"
      },
      "summaryScopeLabel": "قسم: CR39 visible department A، وغيرها خارج نطاق صلاحيتك",
      "storedNet": 36000,
      "storedUnchanged": true
    },
    {
      "case": "bonus-payout-period-control",
      "directForeignRead": 403,
      "hiddenStatus": "مصروف",
      "hiddenPayout": {
        "state": "PAID",
        "label": "مصروف",
        "runId": null,
        "period": null
      },
      "companyPayout": {
        "state": "PAID",
        "label": "مصروف",
        "runId": 1,
        "period": "2026-07"
      },
      "selfPayout": {
        "state": "PAID",
        "label": "مصروف",
        "runId": 1,
        "period": "2026-07"
      },
      "amount": 123.45,
      "net": 9123.45,
      "storedUnchanged": true
    },
    {
      "case": "line-key-rendering-controls",
      "hiddenKeys": [
        "BASIC",
        "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~d1124846"
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
      "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~d1124846",
      "readerOnlyCandidateSpace": 432,
      "decoded": [
        "2026-07"
      ],
      "net": 9067.89,
      "storedUnchanged": true
    },
    {
      "case": "recover-hidden-period-from-key",
      "route": "run-lines",
      "directForeignRead": 403,
      "currentRead": 200,
      "key": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR40 original allowance~d1124846",
      "readerOnlyCandidateSpace": 432,
      "decoded": [
        "2026-07"
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
      "case": "adjacent-reader-foreign-period",
      "route": "overview-lines",
      "url": "/payroll/overview/lines?period=2026-11",
      "foreignRead": 403,
      "currentRead": 200,
      "leaks": [
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
      "leaks": [
        {
          "path": "$.rows[0].earningLines[1].key",
          "text": "ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
        },
        {
          "path": "$.rows[0].earningLines[1].name",
          "text": "إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR40 original allowance"
        }
      ],
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
    }
  ],
  "databasesCreated": 26,
  "comparisons": [
    {
      "file": "api/src/payroll/payroll-overview.service.ts",
      "name": "itemLines",
      "unchangedFromF58f894": true
    },
    {
      "file": "api/src/payroll/payroll-approval-chain.service.ts",
      "name": "review",
      "unchangedFromF58f894": true
    }
  ],
  "closures": [
    {
      "id": "CR39-B01",
      "literalCopiesClosed": true,
      "securityClosed": false,
      "proof": "All unchanged round39 cases pass: literal hidden month removed from payslip and run-lines name/key. Stable row-column mapping and money preserved. New unkeyed key digest still reveals the hidden month through offline dictionary matching (CR40-B01); other line readers still return it literally (CR40-B02)."
    },
    {
      "id": "CR39-B02",
      "closed": true,
      "proof": "Real BRANCH and DEPARTMENT mixed payroll controls (unchanged round39), plus independent TEAM and CUSTOM payrolls. Single-branch labels hide foreign units; multi-branch/company labels retain authorized names. CUSTOM global count hidden; legacy branch header scoped; company cost-center name preserved in explicit historical metadata fixture."
    }
  ],
  "findings": [
    {
      "id": "CR40-B01",
      "severity": "blocking branch isolation",
      "routes": [
        "GET /payroll/items/:id",
        "GET /payroll/runs/:id/lines"
      ],
      "sources": [
        "api/src/payroll/payroll-run-visibility.ts:163",
        "api/src/payroll/payroll.service.ts:1952",
        "api/src/payroll/payroll.service.ts:1968"
      ],
      "introducedIn": "ecf4846",
      "reproduction": "Actual API CREDIT/allowance 67.89 for B employee earning 9000. July payroll calculated/approved/paid (9067.89), reversed (-9067.89), product regenerates obligation label with original period. Employee transferred to A; November payroll calculated/approved/paid (9067.89), A membership snapshot verified. Reader A gets 403 for July and its reversal, 200 for November. Returned masked key ends ~d1124846. An independent decoder taking only that returned string enumerates 432 months (2000-2035); replacing the generic phrase and comparing SHA1 first8 produces the unique candidate 2026-07 in both routes. No privileged response or DB data is input to the decoder.",
      "cause": "Public unsalted digest of the original text is a verifier for a small hidden-period dictionary. This is not a hash-collision finding; changing to a stronger unkeyed digest does not address it.",
      "expected": "Use a stable opaque line identity that cannot validate guesses of protected text, preserving row-column mapping and distinct keys. Keep authorized/company/self text and stored records intact."
    },
    {
      "id": "CR40-B02",
      "severity": "blocking branch isolation",
      "routes": [
        "GET /payroll/overview/lines?period=2026-11",
        "GET /payroll/approval-chain/runs/:id/review"
      ],
      "sources": [
        "api/src/payroll/payroll-overview.service.ts:426",
        "api/src/payroll/payroll-overview.service.ts:431",
        "api/src/payroll/payroll-approval-chain.service.ts:293",
        "api/src/payroll/payroll-approval-chain.service.ts:301"
      ],
      "preExisting": true,
      "reproduction": "Same genuine allowance/pay/reverse/transfer/pay lifecycle. Reader A may read the November item, but may not read the July B payroll (403). overview-lines rows.earnings and columns.earnings still return original name/key containing مسير 2026-07. Approval review rows.earningLines returns the same literal hidden period. Both responses 200; net remains 9067.89. Company text retained and stored item/ledger/events unchanged.",
      "cause": "Both existing describePayrollItemsLines callers return the line names/keys directly without applying hidden-run-period rendering. Method bodies unchanged from f58f894 (static comparison; no old-runtime claim).",
      "expected": "Apply consistent visibility-aware rendering to all line readers, including names, keys and column headers. Preserve allowed current run heads, money, original storage and company/self text."
    }
  ],
  "controls": {
    "restoredAllowance": {
      "base": 9000,
      "allowance": 67.89,
      "net": 9067.89,
      "reversal": -9067.89,
      "currentNet": 9067.89
    },
    "scopeRuns": {
      "local": 6000,
      "foreign": 9000,
      "company": 15000
    },
    "keyMapping": true,
    "stableRepeatedResponse": true,
    "companySelfTextPreserved": true,
    "storedFinanceAndHistoryUnchangedByReads": true
  },
  "fixtureCorrections": {
    "superseded": [
      "Initial COST_CENTER setup attempted unsupported costCenter-only definition, correctly rejected 400 PAYRUN-SCOPE-REQUIRED. Corrected only new test: real mixed BRANCH payroll then explicit historical scope metadata fixture; rerun passed. Not a product defect."
    ],
    "resultsRetained": true,
    "databaseCleanupIncludesAllAttempts": true
  },
  "limitations": {
    "fullIntegrationSuite": false,
    "fullUnitSuite": false,
    "textUnitTests": 5,
    "browser": false,
    "oldRevisionRuntime": false,
    "performanceMeasured": false,
    "newMigrations": false,
    "environment": "Actual Nest guards/pipes/controllers/services with in-process HTTP transport and no listening service. SQL2022 compatibility150, not native SQL2019. Existing migration fixtures only on private random databases under prior permission.",
    "transport": "Exact private SEC-07 PDF fixture path permits dot directory segments under supplied .claude worktree; actual authorization and storage checks intact.",
    "scope": "Full product delta and related authorized paths reviewed. Main phase0/phase1/phase2 untouched. Prior owner exceptions unchanged; current visible run permission does not authorize a different historical foreign run period embedded in a line.",
    "modifications": "New round40 tests/evidence and requested report only; no product/old tests/company data/service changes."
  },
  "staticChecks": {
    "target": "ecf4846644822ecc1b9f533fa3451ef69bd84f48",
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

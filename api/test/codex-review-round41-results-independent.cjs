module.exports = {
  "selected": [
    "codex-review-round41-independent",
    "codex-review-round41-text"
  ],
  "summary": {
    "success": false,
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
    "duration_ms": 16505.0763
  },
  "results": [
    {
      "file": "codex-review-round41-independent.integration.cjs",
      "name": "CR41 closures: seven real readers, opaque stable keys, permitted self/company text, exact money and stored history",
      "ms": 8339.542,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round41-independent.integration.cjs",
      "name": "CR41 boundary: unconsumed employeeId query cannot reveal another employee hidden payroll month through my payslip",
      "ms": 2372.5483,
      "pass": false,
      "error": "Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n",
      "cause": "Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round41-independent.integration.cjs:103:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم",
      "ms": 0.9771,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم",
      "ms": 0.196,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي",
      "ms": 0.6771,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B01: مفتاح السطر المحجوب ببصمة من الأصل — مفتاحين مختلفين مايبقوش واحد، ونفس المفتاح نفس النتيجة في الصف والعمود، والاسم من غير الفترة",
      "ms": 0.943,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40-B01: بصمة المفتاح المحجوب معتمة — مش hash علني للنص الأصلي، فتجربة الشهور من الرد بس مابتطابقش أي شهر",
      "ms": 2.7805,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40: قايمة فترات بعد «مسير» — كل فترة مخفية بتتشال والمرئية تفضل",
      "ms": 0.1609,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR40 (شبكة الأمان): موظفي الرد من employeeId ومن employee.id، والحجب في كل نص ومفتاح واسم خاصية — والأرقام والتواريخ زي ما هي",
      "ms": 13.342,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR39-B02: تسمية نطاق المسير لقارئ فرع — وحدات نطاقه بس، والباقي «وغيرها خارج نطاق صلاحيتك»، والشركة كاملة، والقايمة المخصّصة من غير عدد",
      "ms": 98.8604,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round41-independent.integration.cjs",
      "name": "CR41 boundary: unconsumed employeeId query cannot reveal another employee hidden payroll month through my payslip",
      "ms": 2372.5483,
      "pass": false,
      "error": "Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n",
      "cause": "Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Ignored employeeId must not become a payroll-period existence oracle for an unrelated out-of-scope employee\n+ actual - expected\n... Skipped lines\n\n  {\n    employee: {\n      bankName: 'CR41 fixture bank',\n      bankTransferAmount: null,\n      basicSalary: 9000,\n...\n          amount: 67.89,\n+         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294',\n+         name: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance'\n-         key: 'ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n-         name: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance'\n        }\n      ],\n      totals: {\n        deductions: 0,\n        earnings: 9067.89,\n...\n        deduction: null,\n+       label: 'إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance',\n-       label: 'إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance',\n        obligationId: 2,\n        status: 'APPLIED',\n        targetPeriod: null,\n        type: 'CREDIT'\n      }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round41-independent.integration.cjs:103:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"CR41-seven-reader-closures\",\"routes\":[\"payslip\",\"lines\",\"run\",\"overview\",\"review\",\"ledger\",\"register\"],\"status\":200,\"oldForeignRunStatus\":403,\"key\":\"ALLOWANCE:إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance~dd88842ffdcf8294\",\"publicCandidates\":432,\"algorithms\":4,\"matches\":[],\"net\":9067.89,\"reversal\":-9067.89,\"companySelfPreserved\":true,\"storedUnchanged\":true}",
    "{\"case\":\"CR41-query-payroll-month-oracle\",\"actorHasPayrollView\":false,\"ownPayslipStatus\":200,\"foreignItemStatus\":404,\"observations\":[{\"target\":\"nonexistent\",\"retainsOwnJuly\":true,\"identical\":true},{\"target\":\"foreignNoPayroll\",\"retainsOwnJuly\":true,\"identical\":true},{\"target\":\"foreignAugust\",\"retainsOwnJuly\":true,\"identical\":true},{\"target\":\"self\",\"retainsOwnJuly\":true,\"identical\":true},{\"target\":\"foreignJuly\",\"retainsOwnJuly\":false,\"identical\":false}],\"ownLineBefore\":\"إعادة قيد #1 بعد عكس صرف مسير 2026-07: CR41 original allowance\",\"ownLineAfter\":\"إعادة قيد #1 بعد عكس صرف مسير خارج نطاق صلاحيتك: CR41 original allowance\",\"net\":9067.89,\"companyUnchanged\":true,\"storedUnchanged\":true}",
    "tests 10",
    "suites 0",
    "pass 9",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16505.0763"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r41_payslip_test_8a48ea0d5b1c7818\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r41_payslip_test_8a48ea0d5b1c7818\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r41_payslip_test_8a48ea0d5b1c7818\"}\n"
  ]
}

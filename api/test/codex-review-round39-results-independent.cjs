module.exports = {
  "selected": [
    "codex-review-round39-payslip",
    "codex-review-round39-text"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 8,
      "failed": 5,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 9181.6234
  },
  "results": [
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 ledger and payslip obligationDetails hide a real reinstated foreign period; company/self and finance intact",
      "ms": 4251.2052,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 payslip: no foreign payroll period through a current in-scope payroll",
      "ms": 0.6363,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-lines: no foreign payroll period through a current in-scope payroll",
      "ms": 0.0686,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-detail: no foreign payroll period through a current in-scope payroll",
      "ms": 0.0384,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 events: no foreign payroll period through a current in-scope payroll",
      "ms": 0.0509,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: «مسير YYYY-MM» لفترة مخفية بيبقى الوصف العام، وتاريخ العمل والشهر المستهدف والفترة المرئية زي ما هم",
      "ms": 0.606,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: نص الحدث من غير «#رقم» ولا فترة المسير المخفي، والمبلغ وتاريخ العمل زي ما هم",
      "ms": 0.1929,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-period-scrub.test.cjs",
      "name": "CR38-B02: النسخة العميقة بتنضّف حقول النص بس (اسم وسبب وملاحظة ووصف)، والأرقام والتواريخ والمراجع زي ما هي",
      "ms": 0.6291,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 ledger and payslip obligationDetails hide a real reinstated foreign period; company/self and finance intact",
      "ms": 4251.2052,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 payslip: no foreign payroll period through a current in-scope payroll",
      "ms": 0.6363,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-lines: no foreign payroll period through a current in-scope payroll",
      "ms": 0.0686,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 run-detail: no foreign payroll period through a current in-scope payroll",
      "ms": 0.0384,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round39-payslip.integration.cjs",
      "name": "CR39 events: no foreign payroll period through a current in-scope payroll",
      "ms": 0.0509,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.before.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round39-payslip.integration.cjs:10:14)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "diagnostics": [
    "tests 8",
    "suites 0",
    "pass 3",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9181.6234"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r39_payslip_test_b79906079f6de6bf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r39_payslip_test_b79906079f6de6bf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r39_payslip_test_b79906079f6de6bf\"}\n"
  ]
}

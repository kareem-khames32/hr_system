module.exports = {
  "selected": [
    "codex-review-p1-default-money"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 9104.4613
  },
  "results": [
    {
      "file": "codex-review-p1-default-money.integration.cjs",
      "name": "P1 default-off money is identical to ce15142 for Egyptian Saudi and uninsured actual payrolls",
      "ms": 5953.6342,
      "pass": false,
      "error": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-default-money.integration.cjs:21:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p1-default-money.integration.cjs",
      "name": "P1 default-off money is identical to ce15142 for Egyptian Saudi and uninsured actual payrolls",
      "ms": 5953.6342,
      "pass": false,
      "error": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "cause": "POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /obligations: 403 {\"code\":\"OBLIGATION_DIRECT_DEBIT_LOCKED\",\"message\":\"إنشاء خصم مباشر في دفتر المديونيات مقفل؛ أنشئ الخصم من شاشة الخصومات المصنفة بنوعه ودورة اعتماده\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-default-money.integration.cjs:21:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9104.4613"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_money_current_test_ad15755dec7a12fa\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_money_current_test_ad15755dec7a12fa\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_money_current_test_ad15755dec7a12fa\"}\n"
  ]
}

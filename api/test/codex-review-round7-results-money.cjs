module.exports = {
  "selected": [
    "codex-review-round7-money"
  ],
  "summary": {
    "success": false,
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
    "duration_ms": 7616.1589
  },
  "results": [
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: paid run, one reversal and one supplementary preserve 1000 once and reconcile all surfaces",
      "ms": 4598.7705,
      "pass": false,
      "error": "POST /payroll/runs/1/supplementary: 409 {\"code\":\"PAYRUN-SUPPLEMENTARY-UNAVAILABLE\",\"message\":\"مسير سابق بلا نسخة سياسة منشورة؛ المسير التكميلي يُحتسب بنسخة سياسة المسير الأصلي\"}",
      "cause": "POST /payroll/runs/1/supplementary: 409 {\"code\":\"PAYRUN-SUPPLEMENTARY-UNAVAILABLE\",\"message\":\"مسير سابق بلا نسخة سياسة منشورة؛ المسير التكميلي يُحتسب بنسخة سياسة المسير الأصلي\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/1/supplementary: 409 {\"code\":\"PAYRUN-SUPPLEMENTARY-UNAVAILABLE\",\"message\":\"مسير سابق بلا نسخة سياسة منشورة؛ المسير التكميلي يُحتسب بنسخة سياسة المسير الأصلي\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round7-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-money.integration.cjs:43:23)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: sick and unpaid deductions leave the pressure amount whole, with an independent zero-allowance control",
      "ms": 391.8308,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n600 !== 400\n",
      "cause": "Expected values to be strictly equal:\n\n600 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n600 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-money.integration.cjs:66:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: 31-day month full coverage and mid-month joiner truncate independently to cents",
      "ms": 318.282,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: paid run, one reversal and one supplementary preserve 1000 once and reconcile all surfaces",
      "ms": 4598.7705,
      "pass": false,
      "error": "POST /payroll/runs/1/supplementary: 409 {\"code\":\"PAYRUN-SUPPLEMENTARY-UNAVAILABLE\",\"message\":\"مسير سابق بلا نسخة سياسة منشورة؛ المسير التكميلي يُحتسب بنسخة سياسة المسير الأصلي\"}",
      "cause": "POST /payroll/runs/1/supplementary: 409 {\"code\":\"PAYRUN-SUPPLEMENTARY-UNAVAILABLE\",\"message\":\"مسير سابق بلا نسخة سياسة منشورة؛ المسير التكميلي يُحتسب بنسخة سياسة المسير الأصلي\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs/1/supplementary: 409 {\"code\":\"PAYRUN-SUPPLEMENTARY-UNAVAILABLE\",\"message\":\"مسير سابق بلا نسخة سياسة منشورة؛ المسير التكميلي يُحتسب بنسخة سياسة المسير الأصلي\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round7-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-money.integration.cjs:43:23)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round7-money.integration.cjs",
      "name": "CR7 money: sick and unpaid deductions leave the pressure amount whole, with an independent zero-allowance control",
      "ms": 391.8308,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n600 !== 400\n",
      "cause": "Expected values to be strictly equal:\n\n600 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n600 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-money.integration.cjs:66:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7616.1589"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7money_test_f53191cd910e6895\"}\n",
    "CR7_EVIDENCE {\"case\":\"31-day-proration\",\"full\":7000.01,\"joinerDays\":15,\"joinerPressure\":500,\"joinerNet\":3500}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7money_test_f53191cd910e6895\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7money_test_f53191cd910e6895\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round7-holiday-edges"
  ],
  "summary": {
    "success": false,
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
    "duration_ms": 6619.8892
  },
  "results": [
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 4226.8054,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/policies: 400 {\"message\":[\"property currency should not exist\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/policies: 400 {\"message\":[\"property currency should not exist\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round7-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:28:12)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 0.3352,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/policies: 400 {\"message\":[\"property currency should not exist\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/policies: 400 {\"message\":[\"property currency should not exist\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round7-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:28:12)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 4226.8054,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/policies: 400 {\"message\":[\"property currency should not exist\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/policies: 400 {\"message\":[\"property currency should not exist\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round7-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:28:12)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 0.3352,
      "pass": false,
      "error": "failed running before hook",
      "cause": "POST /payroll/policies: 400 {\"message\":[\"property currency should not exist\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/policies: 400 {\"message\":[\"property currency should not exist\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round7-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:28:12)\n    at async TestHook.run (node:internal/test_runner/test:1113:7)"
    }
  ],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6619.8892"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7holiday_test_be9b66c6199ff85b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7holiday_test_be9b66c6199ff85b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7holiday_test_be9b66c6199ff85b\"}\n"
  ]
}

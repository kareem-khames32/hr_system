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
    "duration_ms": 6713.0097
  },
  "results": [
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 4201.8099,
      "pass": false,
      "error": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "cause": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:43:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 161.2934,
      "pass": false,
      "error": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "cause": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:56:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 historical department holiday survives actual employee move and allows its holiday-work order",
      "ms": 4201.8099,
      "pass": false,
      "error": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "cause": "A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: A real past holiday for the selected employee must permit holiday-work recording\n\n400 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:43:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round7-holiday-edges.integration.cjs",
      "name": "CR7 branch A live payroll sources do not disclose the holiday targeted to branch B",
      "ms": 161.2934,
      "pass": false,
      "error": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "cause": "Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Sources for an authorized employee must not reveal a foreign targeted holiday\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round7-holiday-edges.integration.cjs:56:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 6713.0097"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r7holiday_test_744b40eb6c38c38e\"}\n",
    "CR7_EVIDENCE {\"case\":\"dated-department-holiday-work\",\"calendar\":\"HOLIDAY\",\"status\":400,\"body\":{\"message\":\"2026-09-15 يوم عمل عادي — أمر الدوام لأيام العطلة (الويك إند أو العطلات الرسمية) بس\",\"error\":\"Bad Request\",\"statusCode\":400}}\n",
    "CR7_EVIDENCE {\"case\":\"branch-live-source-isolation\",\"sourceStatus\":200,\"leaked\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r7holiday_test_744b40eb6c38c38e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r7holiday_test_744b40eb6c38c38e\"}\n"
  ]
}

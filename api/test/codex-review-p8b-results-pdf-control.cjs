module.exports = {
  "selected": [
    "saved-reports"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 3,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 108018.4416
  },
  "results": [
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-01: a saved report is named filters judged by the report's own rules, and it belongs to its owner only",
      "ms": 11227.5934,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
      "ms": 30638.6559,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:188:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
      "ms": 31008.3189,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:283:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-04 (CRP3D): the owner is judged again after the file is built — a file built with a withdrawn scope or right does not go out",
      "ms": 30613.5406,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:322:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
      "ms": 30638.6559,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:188:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
      "ms": 31008.3189,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:283:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-04 (CRP3D): the owner is judged again after the file is built — a file built with a withdrawn scope or right does not go out",
      "ms": 30613.5406,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    builds: 1,\n+   due: 2,\n+   failed: 1,\n-   due: 1,\n-   failed: 0,\n    sent: 1,\n    skipped: null\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:322:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_saved_reports_test_355cb9083222b5c9",
    "tests 4",
    "suites 0",
    "pass 1",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 108018.4416"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_saved_reports_test_355cb9083222b5c9\"}\n",
    "REVIEW_PROGRESS PDF launch failure Timed out after waiting 30000ms\n",
    "REVIEW_PROGRESS PDF render failure Timed out after waiting 30000ms\n",
    "REVIEW_PROGRESS PDF launch failure Timed out after waiting 30000ms\nREVIEW_PROGRESS PDF render failure Timed out after waiting 30000ms\n",
    "REVIEW_PROGRESS PDF launch failure Timed out after waiting 30000ms\nREVIEW_PROGRESS PDF render failure Timed out after waiting 30000ms\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_saved_reports_test_355cb9083222b5c9\"}\n"
  ]
}

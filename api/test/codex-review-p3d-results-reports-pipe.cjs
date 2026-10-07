module.exports = {
  "selected": [
    "report-metrics",
    "saved-reports"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 3,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 76082.5881
  },
  "results": [
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-01: the active-employees number is the same on the dashboard, in the report, in the metrics and in the export",
      "ms": 11053.3979,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-02: turnover, absence and overtime follow the dictionary definitions, inside the reader scope",
      "ms": 155.2886,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
      "ms": 31050.2407,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\report-metrics.integration.cjs:238:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-01: a saved report is named filters judged by the report's own rules, and it belongs to its owner only",
      "ms": 10132.4539,
      "pass": true,
      "skip": false
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
      "ms": 30685.8086,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:188:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
      "ms": 31488.383,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:282:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
      "ms": 31050.2407,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\report-metrics.integration.cjs:238:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-02: the owner downloads a saved report with its saved filters, under the permissions held now",
      "ms": 30685.8086,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:188:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "saved-reports.integration.cjs",
      "name": "SR-03: a scheduled report goes to its owner by mail once when due, built with the owner's identity at send time",
      "ms": 31488.383,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "cause": "Expected values to be strictly equal:\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\saved-reports.integration.cjs:282:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_report_metrics_test_ba030021577d52e4",
    "تحقق حذف قاعدة الاختبار: hr_saved_reports_test_ca476e82977826ff",
    "tests 6",
    "suites 0",
    "pass 3",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 76082.5881"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_metrics_test_ba030021577d52e4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_metrics_test_ba030021577d52e4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_saved_reports_test_ca476e82977826ff\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_saved_reports_test_ca476e82977826ff\"}\n"
  ]
}

module.exports = {
  "selected": [
    "report-metrics"
  ],
  "summary": {
    "success": false,
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
    "duration_ms": 43610.7039
  },
  "results": [
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-01: the active-employees number is the same on the dashboard, in the report, in the metrics and in the export",
      "ms": 9643.3454,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-02: turnover, absence and overtime follow the dictionary definitions, inside the reader scope",
      "ms": 94.2648,
      "pass": true,
      "skip": false
    },
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
      "ms": 30743.9483,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\report-metrics.integration.cjs:238:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "report-metrics.integration.cjs",
      "name": "RM-03: every report exports from the server as Excel and PDF with the report's own permission and scope, and each export is audited",
      "ms": 30743.9483,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\report-metrics.integration.cjs:238:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_report_metrics_test_07bd692ec4f81e2e",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 43610.7039"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_report_metrics_test_07bd692ec4f81e2e\"}\n",
    "REVIEW_PROGRESS PDF launch failure Timed out after waiting 30000ms\nREVIEW_PROGRESS PDF render failure Timed out after waiting 30000ms\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_report_metrics_test_07bd692ec4f81e2e\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round34-exemption-events"
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
    "duration_ms": 6015.6589
  },
  "results": [
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
      "ms": 3767.89,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:16:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
      "ms": 77.5571,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:16:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DROP: deduction exemption event must hide a foreign payroll reference",
      "ms": 3767.89,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:16:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-exemption-events.integration.cjs",
      "name": "CR34 DEFER_ONE_PERIOD: deduction exemption event must hide a foreign payroll reference",
      "ms": 77.5571,
      "pass": false,
      "error": "POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /deductions/types: 400 {\"message\":[\"category must be one of the following values: DISCIPLINARY, PERFORMANCE, ADMINISTRATIVE, STATUTORY, COURT_ORDER\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-exemption-events.integration.cjs:16:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 6015.6589"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_exemption_events_test_5a7e890a09d33cca\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_exemption_events_test_5a7e890a09d33cca\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_exemption_events_test_5a7e890a09d33cca\"}\n"
  ]
}

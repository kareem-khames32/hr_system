module.exports = {
  "selected": [
    "codex-review-p4b-tax"
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
    "duration_ms": 13641.7203
  },
  "results": [
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
      "ms": 8360.3478,
      "pass": false,
      "error": "{\"message\":\"مفيش تغيير\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"مفيش تغيير\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"مفيش تغيير\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:41:53)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:134:2)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation",
      "ms": 1912.8316,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F03: missing source IDs in a legacy snapshot force recalculation",
      "ms": 653.2968,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
      "ms": 8360.3478,
      "pass": false,
      "error": "{\"message\":\"مفيش تغيير\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"مفيش تغيير\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"مفيش تغيير\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:41:53)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4b-tax.integration.cjs:134:2)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"unfinalizedSource\":409,\"cancelledSource\":409,\"recalculatedTax\":1482.5,\"dependentReopen\":409}",
    "Cleanup verified: hr_payroll_statutory_test_6fa009ce2993dbc1 is absent from sys.databases.",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13641.7203"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_6fa009ce2993dbc1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_6fa009ce2993dbc1\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round36-ledger-response"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 1,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 8166.3126
  },
  "results": [
    {
      "file": "codex-review-round36-ledger-response.integration.cjs",
      "name": "CR36 cancellation response: authorized payroll reference and amounts are preserved",
      "ms": 4834.9347,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-ledger-response.integration.cjs",
      "name": "CR36 cancellation response: foreign payroll reference is hidden",
      "ms": 1026.4779,
      "pass": false,
      "error": "Cancellation response must use the same run-reference scope as list and payroll access\n\n2 !== null\n",
      "cause": "Cancellation response must use the same run-reference scope as list and payroll access\n\n2 !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Cancellation response must use the same run-reference scope as list and payroll access\n\n2 !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round36-ledger-response.integration.cjs:34:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round36-ledger-response.integration.cjs",
      "name": "CR36 cancellation response: foreign payroll reference is hidden",
      "ms": 1026.4779,
      "pass": false,
      "error": "Cancellation response must use the same run-reference scope as list and payroll access\n\n2 !== null\n",
      "cause": "Cancellation response must use the same run-reference scope as list and payroll access\n\n2 !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Cancellation response must use the same run-reference scope as list and payroll access\n\n2 !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round36-ledger-response.integration.cjs:34:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"obligation-cancellation-response\",\"foreign\":false,\"runReadStatus\":200,\"cancellationStatus\":201,\"storedStatus\":\"CANCELLED\",\"responseReservedRunId\":1,\"companyReservedRunId\":1,\"amount\":123.45,\"approvedNet\":9123.45,\"financialFieldsOtherThanCancellationUnchanged\":true}",
    "{\"case\":\"obligation-cancellation-response\",\"foreign\":true,\"runReadStatus\":403,\"cancellationStatus\":201,\"storedStatus\":\"CANCELLED\",\"responseReservedRunId\":2,\"companyReservedRunId\":2,\"amount\":123.45,\"approvedNet\":9123.45,\"financialFieldsOtherThanCancellationUnchanged\":true}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8166.3126"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r36_ledger_response_test_0d3b1408a0f55587\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r36_ledger_response_test_0d3b1408a0f55587\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r36_ledger_response_test_0d3b1408a0f55587\"}\n"
  ]
}

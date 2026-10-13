module.exports = {
  "selected": [
    "codex-review-p8a-payroll",
    "codex-review-p8a-evaluator",
    "codex-review-p8a-position-gate"
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
    "duration_ms": 43175.7495
  },
  "results": [
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F01: late pending correction versus final payroll approval",
      "ms": 19656.5379,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-evaluator.integration.cjs",
      "name": "P8A-R01: employee transferred after scope judgment before evaluator write",
      "ms": 17843.1529,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n1 !== 2\n",
      "cause": "Expected values to be strictly equal:\n\n1 !== 2\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== 2\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8a-evaluator.integration.cjs:71:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p8a-position-gate.integration.cjs",
      "name": "P8A-J01: vacancy route bypasses recruitment module audience",
      "ms": 16530.7958,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p8a-evaluator.integration.cjs",
      "name": "P8A-R01: employee transferred after scope judgment before evaluator write",
      "ms": 17843.1529,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n1 !== 2\n",
      "cause": "Expected values to be strictly equal:\n\n1 !== 2\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== 2\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8a-evaluator.integration.cjs:71:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_bfb95d35cfb82360 is absent from sys.databases.",
    "Cleanup verified: hr_review_evaluator_test_f5f71e8749669cef is absent from sys.databases.",
    "Cleanup verified: hr_p8a_positions_test_af866ef5dfe57c7f is absent from sys.databases.",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 43175.7495"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_bfb95d35cfb82360\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F01\",\"approval\":201,\"pendingCorrection\":5,\"deduction\":75}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_bfb95d35cfb82360\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_f5f71e8749669cef\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R01\",\"status\":500,\"branch\":1,\"hrBranch\":1,\"manager\":1,\"chosen\":3}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_f5f71e8749669cef\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_p8a_positions_test_af866ef5dfe57c7f\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-J01\",\"original\":404,\"alternate\":201,\"jobId\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_p8a_positions_test_af866ef5dfe57c7f\"}\n"
  ]
}

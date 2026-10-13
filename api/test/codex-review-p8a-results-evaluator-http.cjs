module.exports = {
  "selected": [
    "codex-review-p8a-evaluator"
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
    "duration_ms": 22890.8723
  },
  "results": [
    {
      "file": "codex-review-p8a-evaluator.integration.cjs",
      "name": "P8A-R01: employee transferred after scope judgment before evaluator write",
      "ms": 17588.9076,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-evaluator.integration.cjs",
      "name": "P8A-R02: actual transfer overlap and SQL lock attribution",
      "ms": 932.9595,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8a-evaluator.integration.cjs:96:65)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p8a-evaluator.integration.cjs",
      "name": "P8A-R02: actual transfer overlap and SQL lock attribution",
      "ms": 932.9595,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8a-evaluator.integration.cjs:96:65)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_review_evaluator_test_bbc45c63290018e5 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 22890.8723"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_bbc45c63290018e5\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R01\",\"status\":200,\"branch\":2,\"hrBranch\":1,\"manager\":3,\"chosen\":3}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R02-wait\",\"finished\":true,\"locks\":[]}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R02\",\"evaluator\":200,\"transfer\":400,\"transferBody\":{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_bbc45c63290018e5\"}\n"
  ]
}

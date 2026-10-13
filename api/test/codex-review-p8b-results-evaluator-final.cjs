module.exports = {
  "selected": [
    "codex-review-p8b-evaluator"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 16495.0986
  },
  "results": [
    {
      "file": "codex-review-p8b-evaluator.integration.cjs",
      "name": "P8B-R01: employee transferred after scope judgment before evaluator write",
      "ms": 12730.9865,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-evaluator.integration.cjs",
      "name": "P8B-R02: a real transfer waits for the evaluator transaction employee lock",
      "ms": 326.3118,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-evaluator.integration.cjs",
      "name": "P8B-R03: crossed evaluator assignments use the same employee lock order",
      "ms": 45.7797,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_review_evaluator_test_9ad0aca9f0c0aab3 is absent from sys.databases.",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16495.0986"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_9ad0aca9f0c0aab3\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-R01-transfer\",\"status\":200}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-R01\",\"status\":404,\"branch\":2,\"hrBranch\":1,\"manager\":1,\"chosen\":3}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-R02\",\"transferWaited\":true,\"evaluator\":200,\"transfer\":200}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_9ad0aca9f0c0aab3\"}\n"
  ]
}

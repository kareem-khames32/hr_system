module.exports = {
  "selected": [
    "codex-review-p3b-generation"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 2,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 7047.7077
  },
  "results": [
    {
      "file": "codex-review-p3b-generation.integration.cjs",
      "name": "P3B-G01: an existing position committed after the plan must prevent duplicate generation",
      "ms": 4483.3572,
      "pass": false,
      "error": "generation must recheck whether its title/unit already has a non-cancelled position\n\n2 !== 1\n",
      "cause": "generation must recheck whether its title/unit already has a non-cancelled position\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: generation must recheck whether its title/unit already has a non-cancelled position\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3b-generation.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3b-generation.integration.cjs",
      "name": "P3B-G02: an inactive catalog title after the plan must not create a new approved position",
      "ms": 80.2853,
      "pass": false,
      "error": "generation must recheck the catalog title still qualifies\n\n1 !== 0\n",
      "cause": "generation must recheck the catalog title still qualifies\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: generation must recheck the catalog title still qualifies\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3b-generation.integration.cjs:38:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3b-generation.integration.cjs",
      "name": "P3B-G03: equivalent changes before the plan are skipped",
      "ms": 66.7624,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3b-generation.integration.cjs",
      "name": "P3B-G01: an existing position committed after the plan must prevent duplicate generation",
      "ms": 4483.3572,
      "pass": false,
      "error": "generation must recheck whether its title/unit already has a non-cancelled position\n\n2 !== 1\n",
      "cause": "generation must recheck whether its title/unit already has a non-cancelled position\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: generation must recheck whether its title/unit already has a non-cancelled position\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3b-generation.integration.cjs:27:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3b-generation.integration.cjs",
      "name": "P3B-G02: an inactive catalog title after the plan must not create a new approved position",
      "ms": 80.2853,
      "pass": false,
      "error": "generation must recheck the catalog title still qualifies\n\n1 !== 0\n",
      "cause": "generation must recheck the catalog title still qualifies\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: generation must recheck the catalog title still qualifies\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3b-generation.integration.cjs:38:46)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7047.7077"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3b_generation_test_05e4be7b73aa1284\"}\n",
    "REVIEW_MEASURE {\"case\":\"generation-existing-after-plan\",\"manual\":1,\"positions\":[{\"id\":1,\"headcount\":3},{\"id\":3,\"headcount\":1}],\"result\":{\"created\":2,\"linked\":2}}\n",
    "REVIEW_MEASURE {\"case\":\"generation-inactive-title-after-plan\",\"active\":false,\"created\":[4],\"result\":{\"created\":1,\"linked\":1}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3b_generation_test_05e4be7b73aa1284\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3b_generation_test_05e4be7b73aa1284\"}\n"
  ]
}

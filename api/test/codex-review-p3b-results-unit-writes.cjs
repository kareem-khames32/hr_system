module.exports = {
  "selected": [
    "codex-review-p3b-unit-writes"
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
    "duration_ms": 7197.1124
  },
  "results": [
    {
      "file": "codex-review-p3b-unit-writes.integration.cjs",
      "name": "P3B-W01: linking must not seat an employee on a position whose department is already foreign",
      "ms": 4537.4744,
      "pass": false,
      "error": "a hidden foreign unit must not accept a new assignment through the direct route\n\n201 !== 400\n",
      "cause": "a hidden foreign unit must not accept a new assignment through the direct route\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: a hidden foreign unit must not accept a new assignment through the direct route\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3b-unit-writes.integration.cjs:15:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3b-unit-writes.integration.cjs",
      "name": "P3B-W02: hiring must recheck department ownership after waiting on the seat",
      "ms": 266.734,
      "pass": false,
      "error": "hiring must reject a unit moved out of the branch while waiting\n\n201 !== 400\n",
      "cause": "hiring must reject a unit moved out of the branch while waiting\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: hiring must reject a unit moved out of the branch while waiting\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3b-unit-writes.integration.cjs:35:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3b-unit-writes.integration.cjs",
      "name": "P3B-W01: linking must not seat an employee on a position whose department is already foreign",
      "ms": 4537.4744,
      "pass": false,
      "error": "a hidden foreign unit must not accept a new assignment through the direct route\n\n201 !== 400\n",
      "cause": "a hidden foreign unit must not accept a new assignment through the direct route\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: a hidden foreign unit must not accept a new assignment through the direct route\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3b-unit-writes.integration.cjs:15:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3b-unit-writes.integration.cjs",
      "name": "P3B-W02: hiring must recheck department ownership after waiting on the seat",
      "ms": 266.734,
      "pass": false,
      "error": "hiring must reject a unit moved out of the branch while waiting\n\n201 !== 400\n",
      "cause": "hiring must reject a unit moved out of the branch while waiting\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: hiring must reject a unit moved out of the branch while waiting\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3b-unit-writes.integration.cjs:35:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 7197.1124"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3b_unit_writes_test_3c08feb26a35d48c\"}\n",
    "REVIEW_MEASURE {\"case\":\"link-foreign-department\",\"hidden\":true,\"status\":201,\"positionBranch\":1,\"departmentCurrentBranch\":2,\"link\":1}\n",
    "REVIEW_MEASURE {\"case\":\"hire-moved-department\",\"status\":201,\"employees\":[{\"id\":3,\"branchId\":1,\"departmentId\":4}],\"departmentCurrentBranch\":2}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3b_unit_writes_test_3c08feb26a35d48c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3b_unit_writes_test_3c08feb26a35d48c\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2q-rebinding-race"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 10721.0324
  },
  "results": [
    {
      "file": "codex-review-p2q-rebinding-race.integration.cjs",
      "name": "P2Q concurrent account rebindings must retain the intermediate employee identity and keep its internal content hidden",
      "ms": 7703.0234,
      "pass": false,
      "error": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "cause": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-race.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2q-rebinding-race.integration.cjs",
      "name": "P2Q concurrent account rebindings must retain the intermediate employee identity and keep its internal content hidden",
      "ms": 7703.0234,
      "pass": false,
      "error": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "cause": "Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Every committed account identity must remain on the employee side, including an intermediate concurrent binding\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-race.integration.cjs:37:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"concurrent-rebinding\",\"recordedOldEmployees\":[5,5],\"intermediateEmployeeRecorded\":false,\"canInternal\":true,\"internalContentVisible\":true,\"fileStatus\":200,\"fileBytesMatch\":true}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10721.0324"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_rebinding_race_test_21fc19c4d06b4196\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_rebinding_race_test_21fc19c4d06b4196\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2q_rebinding_race_test_21fc19c4d06b4196\"}\n"
  ]
}

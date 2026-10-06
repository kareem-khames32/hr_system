module.exports = {
  "selected": [
    "codex-review-p2q-rebinding-sql",
    "codex-review-p2q-concurrency"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 1,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 16567.2565
  },
  "results": [
    {
      "file": "codex-review-p2q-rebinding-sql.integration.cjs",
      "name": "P2Q real SQL row lock: both committed employee bindings remain recorded with RCSI=true",
      "ms": 5585.6499,
      "pass": false,
      "error": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "cause": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-sql.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q two comments race for one attachment with RCSI=true",
      "ms": 5870.851,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q task transfer while comment waits rechecks the new assignee with RCSI=true",
      "ms": 126.6135,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q late document/execution task mapping rejects comments with RCSI=true",
      "ms": 234.839,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2q-rebinding-sql.integration.cjs",
      "name": "P2Q real SQL row lock: both committed employee bindings remain recorded with RCSI=true",
      "ms": 5585.6499,
      "pass": false,
      "error": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "cause": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-sql.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"real-SQL-rebinding\",\"rcsi\":true,\"patchStatuses\":[200,200],\"intermediateRecorded\":false,\"internalVisible\":true}",
    "{\"rcsi\":true,\"sharedFileStatuses\":[201,400],\"comments\":1,\"mentionEvents\":1}",
    "{\"rcsi\":true,\"lateLinks\":[{\"kind\":\"document\",\"initial\":409,\"retry\":400,\"comments\":0},{\"kind\":\"execution\",\"initial\":409,\"retry\":400,\"comments\":0}]}",
    "tests 4",
    "suites 0",
    "pass 3",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16567.2565"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_rebinding_sql_test_fa2c3221518933ea\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_rebinding_sql_test_fa2c3221518933ea\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2q_rebinding_sql_test_fa2c3221518933ea\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_concurrency_test_367554644a3417b7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_concurrency_test_367554644a3417b7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2q_concurrency_test_367554644a3417b7\"}\n"
  ]
}

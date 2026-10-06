module.exports = {
  "selected": [
    "codex-review-p2q-rebinding-sql"
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
    "duration_ms": 8701.8218
  },
  "results": [
    {
      "file": "codex-review-p2q-rebinding-sql.integration.cjs",
      "name": "P2Q real SQL row lock: both committed employee bindings remain recorded with RCSI=false",
      "ms": 6188.6665,
      "pass": false,
      "error": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "cause": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-sql.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2q-rebinding-sql.integration.cjs",
      "name": "P2Q real SQL row lock: both committed employee bindings remain recorded with RCSI=false",
      "ms": 6188.6665,
      "pass": false,
      "error": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "cause": "The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-rebinding-sql.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"real-SQL-rebinding\",\"rcsi\":false,\"patchStatuses\":[200,200],\"intermediateRecorded\":false,\"internalVisible\":true}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8701.8218"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_rebinding_sql_test_c626222c306dbf16\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_rebinding_sql_test_c626222c306dbf16\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2q_rebinding_sql_test_c626222c306dbf16\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p1-migrations"
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
    "duration_ms": 8186.6386
  },
  "results": [
    {
      "file": "codex-review-p1-migrations.integration.cjs",
      "name": "P1 all eight migrations together preserve old rows, permit old-schema boot and replay with zero schema difference",
      "ms": 5800.2861,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\ntrue !== false\n",
      "cause": "Expected values to be strictly equal:\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\ntrue !== false\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-migrations.integration.cjs:24:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p1-migrations.integration.cjs",
      "name": "P1 all eight migrations together preserve old rows, permit old-schema boot and replay with zero schema difference",
      "ms": 5800.2861,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\ntrue !== false\n",
      "cause": "Expected values to be strictly equal:\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\ntrue !== false\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-migrations.integration.cjs:24:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8186.6386"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_migrations_test_396a218ac8e1b911\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_migrations_test_396a218ac8e1b911\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_migrations_test_396a218ac8e1b911\"}\n"
  ]
}

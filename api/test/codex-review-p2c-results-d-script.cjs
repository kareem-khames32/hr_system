module.exports = {
  "selected": [
    "codex-review-p2c-script-precision"
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
    "duration_ms": 3982.979
  },
  "results": [
    {
      "file": "codex-review-p2c-script-precision.integration.cjs",
      "name": "P2C D direct legacy-import DataSource precision diagnostic (no AppModule imported)",
      "ms": 1518.1987,
      "pass": false,
      "error": "Legacy import factory must load the same output precision correction\n\n1251 !== 1250.5\n",
      "cause": "Legacy import factory must load the same output precision correction\n\n1251 !== 1250.5\n",
      "stack": "AssertionError [ERR_ASSERTION]: Legacy import factory must load the same output precision correction\n\n1251 !== 1250.5\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-script-precision.integration.cjs:14:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2c-script-precision.integration.cjs",
      "name": "P2C D direct legacy-import DataSource precision diagnostic (no AppModule imported)",
      "ms": 1518.1987,
      "pass": false,
      "error": "Legacy import factory must load the same output precision correction\n\n1251 !== 1250.5\n",
      "cause": "Legacy import factory must load the same output precision correction\n\n1251 !== 1250.5\n",
      "stack": "AssertionError [ERR_ASSERTION]: Legacy import factory must load the same output precision correction\n\n1251 !== 1250.5\n\n    at TestContext.test.timeout (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2c-script-precision.integration.cjs:14:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"legacy-import-factory\",\"memoryHousing\":1251,\"storedHousing\":1250.5,\"patchLoaded\":false}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 3982.979"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_script_test_c450c80fee71e1d1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_script_test_c450c80fee71e1d1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_script_test_c450c80fee71e1d1\"}\n"
  ]
}

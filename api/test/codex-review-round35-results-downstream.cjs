module.exports = {
  "selected": [
    "codex-review-round35-downstream"
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
    "duration_ms": 8282.7629
  },
  "results": [
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 6009.6007,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(company.blockers.some(x=>x.runId===hidden.id))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(company.blockers.some(x=>x.runId===hidden.id))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(company.blockers.some(x=>x.runId===hidden.id))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:26:44)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 6009.6007,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(company.blockers.some(x=>x.runId===hidden.id))\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(company.blockers.some(x=>x.runId===hidden.id))\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(company.blockers.some(x=>x.runId===hidden.id))\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:26:44)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
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
    "duration_ms 8282.7629"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r35_downstream_test_e67f248c44df758f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r35_downstream_test_e67f248c44df758f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r35_downstream_test_e67f248c44df758f\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2v-payroll-race"
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
    "duration_ms": 15443.4099
  },
  "results": [
    {
      "file": "codex-review-p2v-payroll-race.integration.cjs",
      "name": "P2V B rehire and old-period calculation must not both commit an unresolved old payroll item",
      "ms": 12497.6372,
      "pass": false,
      "error": "A calculation evaluating after rehire commits must agree with the fresh calculation\n+ actual - expected\n\n+ 'INCLUDED'\n- 'EXCLUDED'\n",
      "cause": "A calculation evaluating after rehire commits must agree with the fresh calculation\n+ actual - expected\n\n+ 'INCLUDED'\n- 'EXCLUDED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A calculation evaluating after rehire commits must agree with the fresh calculation\n+ actual - expected\n\n+ 'INCLUDED'\n- 'EXCLUDED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-payroll-race.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2v-payroll-race.integration.cjs",
      "name": "P2V B rehire and old-period calculation must not both commit an unresolved old payroll item",
      "ms": 12497.6372,
      "pass": false,
      "error": "A calculation evaluating after rehire commits must agree with the fresh calculation\n+ actual - expected\n\n+ 'INCLUDED'\n- 'EXCLUDED'\n",
      "cause": "A calculation evaluating after rehire commits must agree with the fresh calculation\n+ actual - expected\n\n+ 'INCLUDED'\n- 'EXCLUDED'\n",
      "stack": "AssertionError [ERR_ASSERTION]: A calculation evaluating after rehire commits must agree with the fresh calculation\n+ actual - expected\n\n+ 'INCLUDED'\n- 'EXCLUDED'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2v-payroll-race.integration.cjs:29:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"old-payroll-crosses-rehire\",\"rehireStatus\":201,\"first\":{\"status\":\"INCLUDED\",\"items\":[{\"basicSalary\":6000,\"netPay\":6000}]},\"fresh\":{\"status\":\"EXCLUDED\",\"items\":0}}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15443.4099"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2v_payroll_race_test_bc33fcd63e7774b9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2v_payroll_race_test_bc33fcd63e7774b9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2v_payroll_race_test_bc33fcd63e7774b9\"}\n"
  ]
}

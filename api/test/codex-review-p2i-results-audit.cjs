module.exports = {
  "selected": [
    "codex-review-p2i-independent"
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
    "duration_ms": 6887.8812
  },
  "results": [
    {
      "file": "codex-review-p2i-independent.integration.cjs",
      "name": "P2I delegation audit responses must scope foreign employee identities while preserving stored evidence",
      "ms": 4458.8825,
      "pass": false,
      "error": "Creation and revocation audit JSON must not disclose the foreign employee identity",
      "cause": "Creation and revocation audit JSON must not disclose the foreign employee identity",
      "stack": "AssertionError [ERR_ASSERTION]: Creation and revocation audit JSON must not disclose the foreign employee identity\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2i-independent.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2i-independent.integration.cjs",
      "name": "P2I delegation audit responses must scope foreign employee identities while preserving stored evidence",
      "ms": 4458.8825,
      "pass": false,
      "error": "Creation and revocation audit JSON must not disclose the foreign employee identity",
      "cause": "Creation and revocation audit JSON must not disclose the foreign employee identity",
      "stack": "AssertionError [ERR_ASSERTION]: Creation and revocation audit JSON must not disclose the foreign employee identity\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2i-independent.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"delegation-audit-foreign-id\",\"foreignEmployee\":4,\"returnedEmployeeIds\":[4,4],\"actions\":[\"APPROVAL_DELEGATION_REVOKED\",\"APPROVAL_DELEGATION_CREATED\"],\"nameHidden\":true,\"companyPreserved\":true,\"storedPreserved\":true}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6887.8812"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2i_delegation_test_62d1d1df75fa17fb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2i_delegation_test_62d1d1df75fa17fb\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2i_delegation_test_62d1d1df75fa17fb\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2r-transfer"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 1,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 7498.302
  },
  "results": [
    {
      "file": "codex-review-p2r-transfer.integration.cjs",
      "name": "P2R executed transfer preserves the existing USER_UPDATED audit of account branch and token revocation",
      "ms": 4806.5134,
      "pass": false,
      "error": "A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n",
      "cause": "A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2r-transfer.integration.cjs:28:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2r-transfer.integration.cjs",
      "name": "P2R diagnostic baseline: the previous transfer save emits that audit with the same subscriber and transaction",
      "ms": 128.1937,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2r-transfer.integration.cjs",
      "name": "P2R transfer waiting before its targeted User UPDATE does not restore a binding changed through PATCH",
      "ms": 168.8754,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2r-transfer.integration.cjs",
      "name": "P2R executed transfer preserves the existing USER_UPDATED audit of account branch and token revocation",
      "ms": 4806.5134,
      "pass": false,
      "error": "A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n",
      "cause": "A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: A transfer changing the account scope must retain the central audit event produced by the previous writer\n\n0 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2r-transfer.integration.cjs:28:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"transfer-account-audit\",\"before\":0,\"after\":0,\"branchUpdated\":true,\"sessionRevoked\":true}",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7498.302"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2r_transfer_test_bc2cec531b53bdff\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2r_transfer_test_bc2cec531b53bdff\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2r_transfer_test_bc2cec531b53bdff\"}\n"
  ]
}

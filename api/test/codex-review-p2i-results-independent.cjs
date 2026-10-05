module.exports = {
  "selected": [
    "codex-review-p2i-independent"
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
    "duration_ms": 7757.939
  },
  "results": [
    {
      "file": "codex-review-p2i-independent.integration.cjs",
      "name": "P2I branch-only delegation administrator must not receive the identity of an unrelated foreign delegate",
      "ms": 4362.414,
      "pass": false,
      "error": "Hiding the name alone still discloses the foreign employee identity to a non-party\n\n4 !== null\n",
      "cause": "Hiding the name alone still discloses the foreign employee identity to a non-party\n\n4 !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Hiding the name alone still discloses the foreign employee identity to a non-party\n\n4 !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2i-independent.integration.cjs:30:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2i-independent.integration.cjs",
      "name": "P2I delegated decision and on-behalf audit attribution roll back atomically and retain party access after successful action",
      "ms": 321.2543,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-independent.integration.cjs",
      "name": "P2I revocation committed before the blocked decision obtains its request lock prevents the delegated decision",
      "ms": 242.8542,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2i-independent.integration.cjs",
      "name": "P2I the delegate cannot act on an undelegable step or leak the request after a real branch-scope change",
      "ms": 332.5509,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2i-independent.integration.cjs",
      "name": "P2I branch-only delegation administrator must not receive the identity of an unrelated foreign delegate",
      "ms": 4362.414,
      "pass": false,
      "error": "Hiding the name alone still discloses the foreign employee identity to a non-party\n\n4 !== null\n",
      "cause": "Hiding the name alone still discloses the foreign employee identity to a non-party\n\n4 !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: Hiding the name alone still discloses the foreign employee identity to a non-party\n\n4 !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2i-independent.integration.cjs:30:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"delegation-foreign-id\",\"branchId\":1,\"foreignBranch\":2,\"foreignEmployee\":4,\"returnedEmployee\":4,\"nameHidden\":true,\"partyHasIdentity\":true,\"companyHasIdentity\":true}",
    "{\"case\":\"delegated-attribution-atomicity\",\"failed\":500,\"requestUnchanged\":true,\"approvalCountAfterFailure\":0,\"retryApproved\":1,\"afterRevokeActorStillParty\":true}",
    "{\"case\":\"revocation-before-decision\",\"decision\":403,\"requestUnchanged\":true,\"auditRows\":0}",
    "{\"case\":\"delegation-lock-and-scope\",\"undelegable\":403,\"beforeMove\":200,\"afterMove\":404,\"decisionAfterMove\":403}",
    "tests 4",
    "suites 0",
    "pass 3",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7757.939"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2i_delegation_test_3590f5388be6a8df\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2i_delegation_test_3590f5388be6a8df\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2i_delegation_test_3590f5388be6a8df\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2j-current-scope"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 2,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 12870.575
  },
  "results": [
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J current-branch rule must also conceal the transferred delegate in the audit summary and search",
      "ms": 8983.5205,
      "pass": false,
      "error": "Foreign identity remains in summary after the numeric identity is correctly hidden\n\ntrue !== false\n",
      "cause": "Foreign identity remains in summary after the numeric identity is correctly hidden\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign identity remains in summary after the numeric identity is correctly hidden\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:43:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J both creation and revocation summaries must respect the transferred delegator current branch",
      "ms": 454.997,
      "pass": false,
      "error": "Creation and revocation still expose the now-foreign delegator by name\n+ actual - expected\n\n+ [\n+   'APPROVAL_DELEGATION_REVOKED',\n+   'APPROVAL_DELEGATION_CREATED'\n+ ]\n- []\n",
      "cause": "Creation and revocation still expose the now-foreign delegator by name\n+ actual - expected\n\n+ [\n+   'APPROVAL_DELEGATION_REVOKED',\n+   'APPROVAL_DELEGATION_CREATED'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Creation and revocation still expose the now-foreign delegator by name\n+ actual - expected\n\n+ [\n+   'APPROVAL_DELEGATION_REVOKED',\n+   'APPROVAL_DELEGATION_CREATED'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:60:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J identities become readable after moving into scope, all-branch and party views remain stable, and revoke still works",
      "ms": 362.4573,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J unrelated audit event response remains exactly the same for branch and all-branch readers",
      "ms": 306.7434,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J current-branch rule must also conceal the transferred delegate in the audit summary and search",
      "ms": 8983.5205,
      "pass": false,
      "error": "Foreign identity remains in summary after the numeric identity is correctly hidden\n\ntrue !== false\n",
      "cause": "Foreign identity remains in summary after the numeric identity is correctly hidden\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign identity remains in summary after the numeric identity is correctly hidden\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:43:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2j-current-scope.integration.cjs",
      "name": "P2J both creation and revocation summaries must respect the transferred delegator current branch",
      "ms": 454.997,
      "pass": false,
      "error": "Creation and revocation still expose the now-foreign delegator by name\n+ actual - expected\n\n+ [\n+   'APPROVAL_DELEGATION_REVOKED',\n+   'APPROVAL_DELEGATION_CREATED'\n+ ]\n- []\n",
      "cause": "Creation and revocation still expose the now-foreign delegator by name\n+ actual - expected\n\n+ [\n+   'APPROVAL_DELEGATION_REVOKED',\n+   'APPROVAL_DELEGATION_CREATED'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Creation and revocation still expose the now-foreign delegator by name\n+ actual - expected\n\n+ [\n+   'APPROVAL_DELEGATION_REVOKED',\n+   'APPROVAL_DELEGATION_CREATED'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2j-current-scope.integration.cjs:60:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"transferred-delegate-audit-text\",\"employeeId\":2,\"currentBranchId\":2,\"readerBranchId\":1,\"returnedEmployeeId\":null,\"nameShown\":true,\"matchingCount\":1,\"absentCount\":0,\"listHidden\":true,\"partyPreserved\":true,\"companyAndStorageUnchanged\":true}",
    "{\"case\":\"transferred-delegator-audit-text\",\"employeeId\":3,\"currentBranchId\":4,\"readerBranchId\":3,\"exposedActions\":[\"APPROVAL_DELEGATION_REVOKED\",\"APPROVAL_DELEGATION_CREATED\"],\"idsHidden\":true,\"companyAndStorageUnchanged\":true}",
    "{\"case\":\"allowed-identities-and-revoke\",\"bothParties\":true,\"currentScope\":true,\"allBranchesWithoutAdmin\":true,\"storedPreserved\":true,\"revokeWorks\":true}",
    "{\"case\":\"unrelated-audit-event\",\"responseExactlyUnchanged\":true,\"storageExactlyUnchanged\":true}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12870.575"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2j_current_scope_test_2a0aa7e54be45510\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2j_current_scope_test_2a0aa7e54be45510\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2j_current_scope_test_2a0aa7e54be45510\"}\n"
  ]
}

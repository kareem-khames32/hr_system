module.exports = {
  "selected": [
    "codex-review-round13-boundaries",
    "codex-review-round13-factors"
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
    "duration_ms": 11960.2449
  },
  "results": [
    {
      "file": "codex-review-round13-boundaries.integration.cjs",
      "name": "CR13 an old proxy draft cannot reveal the new administration after the requester transfers out of scope",
      "ms": 6153.4064,
      "pass": false,
      "error": "Submission errors must honor the current viewer scope, not just the requester branch",
      "cause": "Submission errors must honor the current viewer scope, not just the requester branch",
      "stack": "AssertionError [ERR_ASSERTION]: Submission errors must honor the current viewer scope, not just the requester branch\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round13-boundaries.integration.cjs:30:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round13-boundaries.integration.cjs",
      "name": "CR13 usage counts are absent unless both company-wide scope and settings permission are present",
      "ms": 443.6387,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round13-factors.integration.cjs",
      "name": "CR13 inherited keys and invalid owned custom factors are rejected while exact zero and one remain valid",
      "ms": 1.8171,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round13-factors.integration.cjs",
      "name": "CR13 frontend returns text for inherited names and preserves builtin and custom labels",
      "ms": 0.1726,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round13-boundaries.integration.cjs",
      "name": "CR13 an old proxy draft cannot reveal the new administration after the requester transfers out of scope",
      "ms": 6153.4064,
      "pass": false,
      "error": "Submission errors must honor the current viewer scope, not just the requester branch",
      "cause": "Submission errors must honor the current viewer scope, not just the requester branch",
      "stack": "AssertionError [ERR_ASSERTION]: Submission errors must honor the current viewer scope, not just the requester branch\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round13-boundaries.integration.cjs:30:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 3",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11960.2449"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r13boundaries_test_0e914b27adbc3aaf\"}\n",
    "CR13_EVIDENCE {\"case\":\"proxy-draft-after-transfer\",\"createdInBranch\":1,\"currentEmployeeBranch\":2,\"proxyBranch\":1,\"transferViaApi\":true,\"detailOrgHidden\":true,\"status\":400,\"error\":{\"message\":\"الإدارة «CR13_PRIVATE_ADMINISTRATION_B» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\",\"error\":\"Bad Request\",\"statusCode\":400},\"containsForeignName\":true}\n",
    "CR13_EVIDENCE {\"case\":\"usage-permission-matrix\",\"matrix\":[{\"label\":\"branch settings\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"all enumerated branches settings\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"company offboarding reader\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"empty scope settings\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"company settings editor\",\"canEdit\":true,\"usagePresent\":true,\"usage\":2,\"deleteUsedReason\":409}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r13boundaries_test_0e914b27adbc3aaf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r13boundaries_test_0e914b27adbc3aaf\"}\n",
    "CR13_EVIDENCE {\"case\":\"factor-validation\",\"invalidCases\":13,\"validZeroOneAndThird\":[0,30000,10000],\"ownedConstructor\":15000}\n"
  ]
}

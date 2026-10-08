module.exports = {
  "selected": [
    "codex-review-p3h-permission-races"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 3,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 7185.6068
  },
  "results": [
    {
      "file": "codex-review-p3h-permission-races.integration.cjs",
      "name": "P3H-O-bundle: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 4564.8296,
      "pass": false,
      "error": "a permission writer must reject an obsolete authority/scope judgement",
      "cause": "a permission writer must reject an obsolete authority/scope judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a permission writer must reject an obsolete authority/scope judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-permission-races.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3h-permission-races.integration.cjs",
      "name": "P3H-O-overrides: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 87.5075,
      "pass": false,
      "error": "a permission writer must reject an obsolete authority/scope judgement",
      "cause": "a permission writer must reject an obsolete authority/scope judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a permission writer must reject an obsolete authority/scope judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-permission-races.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3h-permission-races.integration.cjs",
      "name": "P3H-O-scope: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 98.9296,
      "pass": false,
      "error": "a permission writer must reject an obsolete authority/scope judgement",
      "cause": "a permission writer must reject an obsolete authority/scope judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a permission writer must reject an obsolete authority/scope judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-permission-races.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3h-permission-races.integration.cjs",
      "name": "P3H-O-bundle: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 4564.8296,
      "pass": false,
      "error": "a permission writer must reject an obsolete authority/scope judgement",
      "cause": "a permission writer must reject an obsolete authority/scope judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a permission writer must reject an obsolete authority/scope judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-permission-races.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3h-permission-races.integration.cjs",
      "name": "P3H-O-overrides: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 87.5075,
      "pass": false,
      "error": "a permission writer must reject an obsolete authority/scope judgement",
      "cause": "a permission writer must reject an obsolete authority/scope judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a permission writer must reject an obsolete authority/scope judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-permission-races.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3h-permission-races.integration.cjs",
      "name": "P3H-O-scope: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 98.9296,
      "pass": false,
      "error": "a permission writer must reject an obsolete authority/scope judgement",
      "cause": "a permission writer must reject an obsolete authority/scope judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a permission writer must reject an obsolete authority/scope judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-permission-races.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7185.6068"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3h_permission_races_test_a8965ba8e0e09e1d\"}\n",
    "REVIEW_MEASURE {\"case\":\"permission-write-after-judgement\",\"mode\":\"bundle\",\"newJudgement\":403,\"oldRequest\":200,\"versionAtJudgement\":1,\"versionAfterInterveningChange\":2,\"finalVersion\":3,\"adminPermissionGranted\":true,\"companyScope\":false,\"employeeViewGranted\":false}\n",
    "REVIEW_MEASURE {\"case\":\"permission-write-after-judgement\",\"mode\":\"overrides\",\"newJudgement\":403,\"oldRequest\":200,\"versionAtJudgement\":0,\"versionAfterInterveningChange\":1,\"finalVersion\":2,\"adminPermissionGranted\":true,\"companyScope\":false,\"employeeViewGranted\":false}\n",
    "REVIEW_MEASURE {\"case\":\"permission-write-after-judgement\",\"mode\":\"scope\",\"newJudgement\":403,\"oldRequest\":200,\"versionAtJudgement\":0,\"versionAfterInterveningChange\":1,\"finalVersion\":2,\"adminPermissionGranted\":false,\"companyScope\":true,\"employeeViewGranted\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3h_permission_races_test_a8965ba8e0e09e1d\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3h_permission_races_test_a8965ba8e0e09e1d\"}\n"
  ]
}

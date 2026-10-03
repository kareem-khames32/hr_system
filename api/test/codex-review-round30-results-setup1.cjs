module.exports = {
  "selected": [
    "codex-review-round30-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 8,
      "failed": 8,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 10139.7354
  },
  "results": [
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation create holds employee lock until save, transfer waits",
      "ms": 4690.5237,
      "pass": false,
      "error": "Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n",
      "cause": "Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:25:29)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation cancel holds employee lock until save, transfer waits",
      "ms": 130.8977,
      "pass": false,
      "error": "Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n",
      "cause": "Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:25:29)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 cancellation rereads APPLIED after a real payroll is paid during its early scope check",
      "ms": 1835.6497,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nNaN !== 9321.09\n",
      "cause": "Expected values to be strictly equal:\n\nNaN !== 9321.09\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nNaN !== 9321.09\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:43:96)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 employees allowance targets are reread after actual transfer; named group is atomic",
      "ms": 259.8664,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:51:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 teams allowance targets are reread after actual transfer; named group is atomic",
      "ms": 205.9077,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:51:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 waiver named target rejects real transfer without any partial save",
      "ms": 105.9453,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:65:105)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-create named target rejects real transfer without any partial save",
      "ms": 164.9086,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:65:105)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-update named target rejects real transfer without any partial save",
      "ms": 195.7517,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:65:105)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation create holds employee lock until save, transfer waits",
      "ms": 4690.5237,
      "pass": false,
      "error": "Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n",
      "cause": "Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:25:29)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation cancel holds employee lock until save, transfer waits",
      "ms": 130.8977,
      "pass": false,
      "error": "Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n",
      "cause": "Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Actual transfer waits while the authorized financial write owns the lock\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:25:29)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 cancellation rereads APPLIED after a real payroll is paid during its early scope check",
      "ms": 1835.6497,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nNaN !== 9321.09\n",
      "cause": "Expected values to be strictly equal:\n\nNaN !== 9321.09\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nNaN !== 9321.09\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:43:96)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 employees allowance targets are reread after actual transfer; named group is atomic",
      "ms": 259.8664,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:51:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 teams allowance targets are reread after actual transfer; named group is atomic",
      "ms": 205.9077,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:51:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 waiver named target rejects real transfer without any partial save",
      "ms": 105.9453,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:65:105)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-create named target rejects real transfer without any partial save",
      "ms": 164.9086,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:65:105)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-update named target rejects real transfer without any partial save",
      "ms": 195.7517,
      "pass": false,
      "error": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"القسم مطلوب ولا يمكن مسحه\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at moveBeforeLock (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:13:178)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round30-independent.integration.cjs:65:105)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 8",
    "suites 0",
    "pass 0",
    "fail 8",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10139.7354"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r30_independent_test_9330d6b6ba8de7d5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r30_independent_test_9330d6b6ba8de7d5\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r30_independent_test_9330d6b6ba8de7d5\"}\n"
  ]
}

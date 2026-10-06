module.exports = {
  "selected": [
    "codex-review-p2t-migration-shape"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 2,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 6943.4844
  },
  "results": [
    {
      "file": "codex-review-p2t-migration-shape.integration.cjs",
      "name": "P2T migration must reject a preexisting ten-column fields table with a wrong required type",
      "ms": 4446.3563,
      "pass": false,
      "error": "094 must not report success on an incompatible same-name table\n\nfalse !== true\n",
      "cause": "094 must not report success on an incompatible same-name table\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: 094 must not report success on an incompatible same-name table\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-migration-shape.integration.cjs:23:82)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-migration-shape.integration.cjs",
      "name": "P2T migration must reject a same-named unique field index on the wrong column",
      "ms": 21.6779,
      "pass": false,
      "error": "Index name and is_unique alone do not verify key columns\n\nfalse !== true\n",
      "cause": "Index name and is_unique alone do not verify key columns\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Index name and is_unique alone do not verify key columns\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-migration-shape.integration.cjs:33:80)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2t-migration-shape.integration.cjs",
      "name": "P2T migration must reject a preexisting ten-column fields table with a wrong required type",
      "ms": 4446.3563,
      "pass": false,
      "error": "094 must not report success on an incompatible same-name table\n\nfalse !== true\n",
      "cause": "094 must not report success on an incompatible same-name table\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: 094 must not report success on an incompatible same-name table\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-migration-shape.integration.cjs:23:82)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-migration-shape.integration.cjs",
      "name": "P2T migration must reject a same-named unique field index on the wrong column",
      "ms": 21.6779,
      "pass": false,
      "error": "Index name and is_unique alone do not verify key columns\n\nfalse !== true\n",
      "cause": "Index name and is_unique alone do not verify key columns\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Index name and is_unique alone do not verify key columns\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-migration-shape.integration.cjs:33:80)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"old-table-required-type\",\"rejected\":false,\"evidence\":[{\"actualType\":\"nvarchar\"}]}",
    "{\"case\":\"old-table-wrong-index\",\"rejected\":false,\"evidence\":{\"duplicateKeys\":2}}",
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6943.4844"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2t_migration_shape_test_8905fd9933662699\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2t_migration_shape_test_8905fd9933662699\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2t_migration_shape_test_8905fd9933662699\"}\n"
  ]
}

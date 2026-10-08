module.exports = {
  "selected": [
    "codex-review-p3i-range-locks"
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
    "duration_ms": 12168.5244
  },
  "results": [
    {
      "file": "codex-review-p3i-range-locks.integration.cjs",
      "name": "P3I-R-gaps: two absent preset codes sharing a unique-index range serialize without a cycle",
      "ms": 5754.4515,
      "pass": false,
      "error": "Completed before barrier",
      "cause": "Completed before barrier",
      "stack": "Error: Completed before barrier\n    at D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:8:91\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async arrived (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:8:43)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:18:63)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3i-range-locks.integration.cjs",
      "name": "P3I-R-create-first: assignment waits for a new role transaction and sees its committed bundle",
      "ms": 3826.2696,
      "pass": false,
      "error": "No SQL lock wait observed",
      "cause": "No SQL lock wait observed",
      "stack": "Error: No SQL lock wait observed\n    at waiting (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:9:343)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:30:87)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3i-range-locks.integration.cjs",
      "name": "P3I-R-gaps: two absent preset codes sharing a unique-index range serialize without a cycle",
      "ms": 5754.4515,
      "pass": false,
      "error": "Completed before barrier",
      "cause": "Completed before barrier",
      "stack": "Error: Completed before barrier\n    at D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:8:91\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async arrived (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:8:43)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:18:63)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3i-range-locks.integration.cjs",
      "name": "P3I-R-create-first: assignment waits for a new role transaction and sees its committed bundle",
      "ms": 3826.2696,
      "pass": false,
      "error": "No SQL lock wait observed",
      "cause": "No SQL lock wait observed",
      "stack": "Error: No SQL lock wait observed\n    at waiting (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:9:343)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3i-range-locks.integration.cjs:30:87)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 0",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12168.5244"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_range_locks_test_7e02c33d8f72cb50\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_range_locks_test_7e02c33d8f72cb50\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_range_locks_test_7e02c33d8f72cb50\"}\n"
  ]
}

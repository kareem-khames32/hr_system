module.exports = {
  "selected": [
    "codex-review-p2t-read-races",
    "codex-review-p2t-concurrency"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 3,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 16659.1891
  },
  "results": [
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T restricted field race must not disclose a new restricted value through an older public definition",
      "ms": 5593.7999,
      "pass": false,
      "error": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
      "cause": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: No point in time made the new value readable to this viewer\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T branch race must not disclose values written in the foreign branch after initial employee check",
      "ms": 85.6878,
      "pass": false,
      "error": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
      "cause": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T post-write response must not pick up a foreign value after its scope check",
      "ms": 86.2994,
      "pass": false,
      "error": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
      "cause": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:59:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-concurrency.integration.cjs",
      "name": "P2T two value saves serialize on employee and retain both distinct keys",
      "ms": 5083.7413,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2t-concurrency.integration.cjs",
      "name": "P2T a transfer holding the employee row forces the waiting writer to recheck branch after lock",
      "ms": 88.0474,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2t-concurrency.integration.cjs",
      "name": "P2T malformed bundle rolls back deletion and update; field definition audit failure rolls back its change",
      "ms": 97.7222,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T restricted field race must not disclose a new restricted value through an older public definition",
      "ms": 5593.7999,
      "pass": false,
      "error": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
      "cause": "No point in time made the new value readable to this viewer\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: No point in time made the new value readable to this viewer\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:37:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T branch race must not disclose values written in the foreign branch after initial employee check",
      "ms": 85.6878,
      "pass": false,
      "error": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
      "cause": "Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Scope check on an old employee row must not authorize newer foreign-branch values\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:48:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2t-read-races.integration.cjs",
      "name": "P2T post-write response must not pick up a foreign value after its scope check",
      "ms": 86.2994,
      "pass": false,
      "error": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
      "cause": "Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Successful write response must not include data saved in another branch after commit\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2t-read-races.integration.cjs:59:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"restricted-after-definition-read\",\"status\":200,\"leaked\":true}",
    "{\"case\":\"branch-after-authorization\",\"status\":200,\"leaked\":true}",
    "{\"case\":\"postwrite-scope-race\",\"status\":200,\"leaked\":true}",
    "{\"rcsi\":true,\"parallelSaves\":[200,200],\"bothKeysPreserved\":true}",
    "{\"rcsi\":true,\"writeAfterMove\":404,\"noWrite\":true}",
    "tests 6",
    "suites 0",
    "pass 3",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16659.1891"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2t_read_races_test_c744d50ce7d66a12\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2t_read_races_test_c744d50ce7d66a12\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2t_read_races_test_c744d50ce7d66a12\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2t_concurrency_test_8dde5097cfa310ad\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2t_concurrency_test_8dde5097cfa310ad\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2t_concurrency_test_8dde5097cfa310ad\"}\n"
  ]
}

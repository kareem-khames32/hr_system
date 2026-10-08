module.exports = {
  "selected": [
    "codex-review-p3j-slot-races"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 9,
      "failed": 1,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 8768.6075
  },
  "results": [
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-create: manual writer rejects a directory account that won the employee slot",
      "ms": 5105.9712,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-rebind: manual writer rejects a directory account that won the employee slot",
      "ms": 168.9012,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-archive-first: a first login waiting on an archive sees the committed closed employee",
      "ms": 149.4479,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-slot-first-archive: employee mutation waits behind account creation and updates that new account",
      "ms": 169.537,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-slot-first-transfer: employee mutation waits behind account creation and updates that new account",
      "ms": 205.3337,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-transfer-first: stale directory match creates in the employee current branch",
      "ms": 182.9625,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-rebind-archive: linking an existing account and archiving its new employee follow one order",
      "ms": 103.9471,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-unlink: freeing the old employee slot does not form a cycle with first domain login",
      "ms": 108.3232,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n409 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n409 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs:52:231)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-manual-branch: employee transfer after the manual link judgement rejects the stale account creation",
      "ms": 95.5729,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-unlink: freeing the old employee slot does not form a cycle with first domain login",
      "ms": 108.3232,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n409 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n409 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3j-slot-races.integration.cjs:52:231)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 9",
    "suites 0",
    "pass 8",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8768.6075"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_slot_races_test_b3d17ea2cf9e0f5b\"}\n",
    "REVIEW_MEASURE {\"case\":\"manual-after-domain\",\"kind\":\"create\",\"status\":409,\"accounts\":1}\n",
    "REVIEW_MEASURE {\"case\":\"manual-after-domain\",\"kind\":\"rebind\",\"status\":409,\"accounts\":1}\n",
    "REVIEW_MEASURE {\"case\":\"archive-before-slot\",\"sqlWait\":true,\"archive\":201,\"login\":401,\"accounts\":0}\n",
    "REVIEW_MEASURE {\"case\":\"slot-before-employee-mutation\",\"mutation\":\"archive\",\"sqlWait\":true,\"change\":201,\"login\":201,\"version\":1,\"active\":false,\"branchUpdated\":false}\n",
    "REVIEW_MEASURE {\"case\":\"slot-before-employee-mutation\",\"mutation\":\"transfer\",\"sqlWait\":true,\"change\":200,\"login\":201,\"version\":1,\"active\":true,\"branchUpdated\":true}\n",
    "REVIEW_MEASURE {\"case\":\"transfer-before-slot\",\"login\":201,\"currentBranchUsed\":true}\n",
    "REVIEW_MEASURE {\"case\":\"rebind-before-archive\",\"sqlWait\":true,\"statuses\":[200,201],\"version\":2}\n",
    "REVIEW_MEASURE {\"case\":\"manual-link-judged-old-branch\",\"status\":409,\"accounts\":0}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_slot_races_test_b3d17ea2cf9e0f5b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_slot_races_test_b3d17ea2cf9e0f5b\"}\n"
  ]
}

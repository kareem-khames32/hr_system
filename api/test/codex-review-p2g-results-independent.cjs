module.exports = {
  "selected": [
    "codex-review-p2g-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 2,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 8713.2873
  },
  "results": [
    {
      "file": "codex-review-p2g-independent.integration.cjs",
      "name": "P2G task scope, role scope and current manager identity are enforced without an existence signal",
      "ms": 4781.1877,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2g-independent.integration.cjs",
      "name": "P2G employee assignment survives a branch move and same-assignee edit; forwarding outside authority is rejected",
      "ms": 247.1029,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2g-independent.integration.cjs",
      "name": "P2G task creation, reassignment and reminder stamps roll back if the outbox write fails",
      "ms": 181.723,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2g-independent.integration.cjs",
      "name": "P2G hiring-document work must reappear in My Tasks when its required catalogue flag changes",
      "ms": 311.7009,
      "pass": false,
      "error": "Current required documents must not depend on opening the source screen first",
      "cause": "Current required documents must not depend on opening the source screen first",
      "stack": "AssertionError [ERR_ASSERTION]: Current required documents must not depend on opening the source screen first\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2g-independent.integration.cjs:96:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2g-independent.integration.cjs",
      "name": "P2G an old reminder cannot become valid again merely because the new due date got a fresh reminder stamp",
      "ms": 752.4261,
      "pass": false,
      "error": "A new stamp must not authorize the old deadline text",
      "cause": "A new stamp must not authorize the old deadline text",
      "stack": "AssertionError [ERR_ASSERTION]: A new stamp must not authorize the old deadline text\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2g-independent.integration.cjs:118:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2g-independent.integration.cjs",
      "name": "P2G hiring-document work must reappear in My Tasks when its required catalogue flag changes",
      "ms": 311.7009,
      "pass": false,
      "error": "Current required documents must not depend on opening the source screen first",
      "cause": "Current required documents must not depend on opening the source screen first",
      "stack": "AssertionError [ERR_ASSERTION]: Current required documents must not depend on opening the source screen first\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2g-independent.integration.cjs:96:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2g-independent.integration.cjs",
      "name": "P2G an old reminder cannot become valid again merely because the new due date got a fresh reminder stamp",
      "ms": 752.4261,
      "pass": false,
      "error": "A new stamp must not authorize the old deadline text",
      "cause": "A new stamp must not authorize the old deadline text",
      "stack": "AssertionError [ERR_ASSERTION]: A new stamp must not authorize the old deadline text\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2g-independent.integration.cjs:118:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"scope-and-relinked-manager\",\"hidden\":404,\"unknown\":404,\"removedCreatorActions\":404,\"unchanged\":true}",
    "{\"case\":\"stamped-branch-and-direct-manager\",\"keptBranch\":true,\"unrelatedTransfer\":403,\"ownerClose\":201}",
    "{\"case\":\"task-outbox-atomicity\",\"create\":500,\"reassign\":500,\"reminded\":0,\"rowAndCountUnchanged\":true}",
    "{\"case\":\"hiring-docs-current-state\",\"beforeSourceRead\":false,\"sourceStatus\":\"PENDING\",\"sourceCanAct\":true,\"afterSourceRead\":true}",
    "{\"case\":\"reminder-rearmed-stamp\",\"results\":[{\"mode\":\"ON\",\"currentDue\":\"2026-10-06\",\"oldDue\":\"2026-10-05\",\"sent\":1,\"oldDateInBody\":true,\"status\":\"SENT\"},{\"mode\":\"DIGEST\",\"currentDue\":\"2026-10-06\",\"oldDue\":\"2026-10-05\",\"sent\":1,\"oldDateInBody\":true,\"status\":\"SENT\"}]}",
    "tests 5",
    "suites 0",
    "pass 3",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8713.2873"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2g_independent_test_05c163d1243d218a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2g_independent_test_05c163d1243d218a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2g_independent_test_05c163d1243d218a\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2e-boundaries"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 5,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 9128.3575
  },
  "results": [
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E control: current approver receives only metadata, branch change before send suppresses it",
      "ms": 5237.3546,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
      "ms": 215.7902,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n200 !== 404\n",
      "cause": "Expected values to be strictly equal:\n\n200 !== 404\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n200 !== 404\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:61:85)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
      "ms": 388.5466,
      "pass": false,
      "error": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n",
      "cause": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:91:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E digest observes quiet hours and resumes after they end",
      "ms": 215.4112,
      "pass": false,
      "error": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n",
      "cause": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: Digest must respect quiet hours like immediate email\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:105:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
      "ms": 458.1646,
      "pass": false,
      "error": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n",
      "cause": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:121:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
      "ms": 103.7641,
      "pass": false,
      "error": "POST /requests/7/act: 400 {\"message\":[\"action must be one of the following values: APPROVE, REJECT, RETURN\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /requests/7/act: 400 {\"message\":[\"action must be one of the following values: APPROVE, REJECT, RETURN\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /requests/7/act: 400 {\"message\":[\"action must be one of the following values: APPROVE, REJECT, RETURN\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:129:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E closed destination module must suppress previously queued immediate mail and digest",
      "ms": 215.7902,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n200 !== 404\n",
      "cause": "Expected values to be strictly equal:\n\n200 !== 404\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n200 !== 404\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:61:85)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E account relink: a previous owners decision must not be mailed to the new employee",
      "ms": 388.5466,
      "pass": false,
      "error": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n",
      "cause": "Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: Relinked account may not receive an inaccessible previous employees request\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:91:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E digest observes quiet hours and resumes after they end",
      "ms": 215.4112,
      "pass": false,
      "error": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n",
      "cause": "Digest must respect quiet hours like immediate email\n\n1 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: Digest must respect quiet hours like immediate email\n\n1 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:105:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E delivery claim must protect a staggered second worker while first SMTP attempt is active",
      "ms": 458.1646,
      "pass": false,
      "error": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n",
      "cause": "The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: The attempts counter is not an exclusive in-flight reservation\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:121:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2e-boundaries.integration.cjs",
      "name": "P2E confidential return becomes stale after resubmission, just like a non-confidential return",
      "ms": 103.7641,
      "pass": false,
      "error": "POST /requests/7/act: 400 {\"message\":[\"action must be one of the following values: APPROVE, REJECT, RETURN\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /requests/7/act: 400 {\"message\":[\"action must be one of the following values: APPROVE, REJECT, RETURN\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /requests/7/act: 400 {\"message\":[\"action must be one of the following values: APPROVE, REJECT, RETURN\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-fixture.cjs:55:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2e-boundaries.integration.cjs:129:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"current-account-scope-control\",\"sent\":1,\"afterBranchChange\":\"SKIPPED\"}",
    "{\"case\":\"relinked-owner-control\",\"requestStatus\":200}",
    "{\"case\":\"relinked-noncreator-account\",\"requestStatus\":404,\"sent\":1,\"containsOldType\":true,\"delivery\":\"SENT\"}",
    "{\"case\":\"quiet-digest\",\"sentInQuiet\":1,\"quietStatus\":\"SENT\",\"resumed\":0,\"sentTotal\":1}",
    "{\"case\":\"staggered-delivery-claim\",\"overlapping\":2,\"sent\":2,\"attempts\":2,\"status\":\"SENT\"}",
    "tests 6",
    "suites 0",
    "pass 1",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9128.3575"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2e_boundaries_test_9b2fad784c8d6b95\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2e_boundaries_test_9b2fad784c8d6b95\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2e_boundaries_test_9b2fad784c8d6b95\"}\n"
  ]
}

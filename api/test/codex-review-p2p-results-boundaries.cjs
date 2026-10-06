module.exports = {
  "selected": [
    "codex-review-p2p-boundaries"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 2,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 8510.0054
  },
  "results": [
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
      "ms": 5855.7274,
      "pass": false,
      "error": "PATCH /users/8: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب 71b1a4bf-574e-4b1d-aa47-bcce06b6bfb6@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "cause": "PATCH /users/8: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب 71b1a4bf-574e-4b1d-aa47-bcce06b6bfb6@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /users/8: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب 71b1a4bf-574e-4b1d-aa47-bcce06b6bfb6@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:12:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "ms": 144.1989,
      "pass": false,
      "error": "GET /portal/notifications: 404 {\"message\":\"Cannot GET /api/portal/notifications\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "GET /portal/notifications: 404 {\"message\":\"Cannot GET /api/portal/notifications\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /portal/notifications: 404 {\"message\":\"Cannot GET /api/portal/notifications\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:26:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P ordinary file owner remains allowed while an unbound upload is private to that account",
      "ms": 33.8111,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P internal attachment must obey current comment visibility after its uploader becomes the requester",
      "ms": 5855.7274,
      "pass": false,
      "error": "PATCH /users/8: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب 71b1a4bf-574e-4b1d-aa47-bcce06b6bfb6@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "cause": "PATCH /users/8: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب 71b1a4bf-574e-4b1d-aa47-bcce06b6bfb6@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /users/8: 409 {\"message\":\"الموظف مرتبط بالفعل بحساب 71b1a4bf-574e-4b1d-aa47-bcce06b6bfb6@review.invalid\",\"error\":\"Conflict\",\"statusCode\":409}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:12:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p2p-boundaries.integration.cjs",
      "name": "P2P in-app mention must not retain a foreign request identifier after recipient account rebinding",
      "ms": 144.1989,
      "pass": false,
      "error": "GET /portal/notifications: 404 {\"message\":\"Cannot GET /api/portal/notifications\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "GET /portal/notifications: 404 {\"message\":\"Cannot GET /api/portal/notifications\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /portal/notifications: 404 {\"message\":\"Cannot GET /api/portal/notifications\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2p-boundaries.integration.cjs:26:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8510.0054"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2p_boundaries_test_8e36732c065c2830\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2p_boundaries_test_8e36732c065c2830\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2p_boundaries_test_8e36732c065c2830\"}\n"
  ]
}

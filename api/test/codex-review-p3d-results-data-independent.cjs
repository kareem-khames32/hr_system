module.exports = {
  "selected": [
    "codex-review-p3d-data-independent"
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
    "duration_ms": 9128.3177
  },
  "results": [
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D01: scheduled report must revalidate its owner after rendering and before sending",
      "ms": 6213.2657,
      "pass": false,
      "error": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n",
      "cause": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:26:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D02: manager team view cannot reveal a department moved outside the reader branch",
      "ms": 93.0837,
      "pass": false,
      "error": "GET /manager/team: 404 {\"message\":\"Cannot GET /api/manager/team\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "GET /manager/team: 404 {\"message\":\"Cannot GET /api/manager/team\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /manager/team: 404 {\"message\":\"Cannot GET /api/manager/team\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:33:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D03: announcements disappear from board, notifications and read route after account rebinding",
      "ms": 27.9609,
      "pass": false,
      "error": "POST /announcements: 404 {\"message\":\"Cannot POST /api/announcements\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "POST /announcements: 404 {\"message\":\"Cannot POST /api/announcements\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /announcements: 404 {\"message\":\"Cannot POST /api/announcements\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:40:21)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D01: scheduled report must revalidate its owner after rendering and before sending",
      "ms": 6213.2657,
      "pass": false,
      "error": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n",
      "cause": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:26:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D02: manager team view cannot reveal a department moved outside the reader branch",
      "ms": 93.0837,
      "pass": false,
      "error": "GET /manager/team: 404 {\"message\":\"Cannot GET /api/manager/team\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "GET /manager/team: 404 {\"message\":\"Cannot GET /api/manager/team\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: GET /manager/team: 404 {\"message\":\"Cannot GET /api/manager/team\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:33:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D03: announcements disappear from board, notifications and read route after account rebinding",
      "ms": 27.9609,
      "pass": false,
      "error": "POST /announcements: 404 {\"message\":\"Cannot POST /api/announcements\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "POST /announcements: 404 {\"message\":\"Cannot POST /api/announcements\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /announcements: 404 {\"message\":\"Cannot POST /api/announcements\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:40:21)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
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
    "duration_ms 9128.3177"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3d_data_test_0de166ee2fcd6436\"}\n",
    "REVIEW_MEASURE {\"case\":\"scheduled-report-scope-after-render\",\"sent\":1,\"foreignBranchInAttachment\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3d_data_test_0de166ee2fcd6436\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3d_data_test_0de166ee2fcd6436\"}\n"
  ]
}

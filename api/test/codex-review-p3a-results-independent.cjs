module.exports = {
  "selected": [
    "codex-review-p3a-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 4,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 11918.0347
  },
  "results": [
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I01: a moved department and team must not expose their foreign identifiers",
      "ms": 4335.0275,
      "pass": false,
      "error": "PATCH /org/departments/1: 404 {\"message\":\"Cannot PATCH /api/org/departments/1\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "PATCH /org/departments/1: 404 {\"message\":\"Cannot PATCH /api/org/departments/1\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /org/departments/1: 404 {\"message\":\"Cannot PATCH /api/org/departments/1\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:20:11)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I02: moving a team alone to a foreign department must hide its current name",
      "ms": 26.4255,
      "pass": false,
      "error": "PATCH /org/teams/1: 404 {\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "PATCH /org/teams/1: 404 {\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /org/teams/1: 404 {\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:30:11)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I03: department validity must survive waiting for the position creation lock",
      "ms": 204.8462,
      "pass": false,
      "error": "PATCH /org/departments/3: 404 {\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "PATCH /org/departments/3: 404 {\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /org/departments/3: 404 {\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:47:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I04: generation must not overwrite a holder assignment committed after its initial plan",
      "ms": 137.6759,
      "pass": false,
      "error": "employee already seated in its unit must be skipped after acquiring its row lock\n\n7 !== 4\n",
      "cause": "employee already seated in its unit must be skipped after acquiring its row lock\n\n7 !== 4\n",
      "stack": "AssertionError [ERR_ASSERTION]: employee already seated in its unit must be skipped after acquiring its row lock\n\n7 !== 4\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:71:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I01: a moved department and team must not expose their foreign identifiers",
      "ms": 4335.0275,
      "pass": false,
      "error": "PATCH /org/departments/1: 404 {\"message\":\"Cannot PATCH /api/org/departments/1\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "PATCH /org/departments/1: 404 {\"message\":\"Cannot PATCH /api/org/departments/1\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /org/departments/1: 404 {\"message\":\"Cannot PATCH /api/org/departments/1\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:20:11)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I02: moving a team alone to a foreign department must hide its current name",
      "ms": 26.4255,
      "pass": false,
      "error": "PATCH /org/teams/1: 404 {\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "PATCH /org/teams/1: 404 {\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /org/teams/1: 404 {\"message\":\"Cannot PATCH /api/org/teams/1\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:30:11)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I03: department validity must survive waiting for the position creation lock",
      "ms": 204.8462,
      "pass": false,
      "error": "PATCH /org/departments/3: 404 {\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}",
      "cause": "PATCH /org/departments/3: 404 {\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /org/departments/3: 404 {\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-fixture.cjs:56:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:47:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3a-independent.integration.cjs",
      "name": "P3A-I04: generation must not overwrite a holder assignment committed after its initial plan",
      "ms": 137.6759,
      "pass": false,
      "error": "employee already seated in its unit must be skipped after acquiring its row lock\n\n7 !== 4\n",
      "cause": "employee already seated in its unit must be skipped after acquiring its row lock\n\n7 !== 4\n",
      "stack": "AssertionError [ERR_ASSERTION]: employee already seated in its unit must be skipped after acquiring its row lock\n\n7 !== 4\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3a-independent.integration.cjs:71:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 0",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11918.0347"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3a_independent_test_f3c4797ef7561259\"}\n",
    "REVIEW_MEASURE {\"case\":\"generation-overwrites-link\",\"assigned\":4,\"final\":7,\"response\":{\"created\":3,\"linked\":3}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3a_independent_test_f3c4797ef7561259\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3a_independent_test_f3c4797ef7561259\"}\n"
  ]
}

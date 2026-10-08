module.exports = {
  "selected": [
    "codex-review-p5d-expense-transitive"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 1,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 30296.2512
  },
  "results": [
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T01: structural approval-chain resolution still requests another connection during expense submit",
      "ms": 12034.785,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T02: final approvals and expense/travel destinations share the held transaction connection",
      "ms": 15577.0449,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n    201,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n    201,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n    201,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n\n    at heldPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:115:22)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:146:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5d-expense-transitive.integration.cjs",
      "name": "P5D-T02: final approvals and expense/travel destinations share the held transaction connection",
      "ms": 15577.0449,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n    201,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n    201,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n+   400,\n    201,\n+   400,\n+   400,\n+   400\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201,\n-   201\n  ]\n\n    at heldPool (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:115:22)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5d-expense-transitive.integration.cjs:146:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"id\":\"P5D-T01\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[500,500,500,500,500,500,500,500,500,500],\"serialRetry\":201}",
    "{\"id\":\"P5D-T01-control\",\"occupied\":{\"used\":10,\"free\":0},\"statuses\":[201,201,201,201,201,201,201,201,201,201]}",
    "Cleanup verified: hr_expense_reports_test_3eb6f97da693160b is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 30296.2512"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_3eb6f97da693160b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_3eb6f97da693160b\"}\n"
  ]
}

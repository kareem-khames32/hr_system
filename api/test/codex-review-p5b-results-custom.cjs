module.exports = {
  "selected": [
    "codex-review-p5b-expenses"
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
    "duration_ms": 12242.0339
  },
  "results": [
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E01: expense money from an auto-approve chain without a reviewer",
      "ms": 9309.0259,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E06: custom expense and travel handlers cannot bypass first human approval",
      "ms": 3.6346,
      "pass": false,
      "error": "Could not find any entity of type \"ApprovalChain\" matching: {\n    \"code\": \"P5A_AUTO\"\n}",
      "cause": "Could not find any entity of type \"ApprovalChain\" matching: {\n    \"code\": \"P5A_AUTO\"\n}",
      "stack": "EntityNotFoundError: Could not find any entity of type \"ApprovalChain\" matching: {\n    \"code\": \"P5A_AUTO\"\n}\n    at D:\\projects\\hr_system\\api\\node_modules\\src\\entity-manager\\EntityManager.ts:1334:25\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5b-expenses.integration.cjs:172:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p5b-expenses.integration.cjs",
      "name": "P5B-E06: custom expense and travel handlers cannot bypass first human approval",
      "ms": 3.6346,
      "pass": false,
      "error": "Could not find any entity of type \"ApprovalChain\" matching: {\n    \"code\": \"P5A_AUTO\"\n}",
      "cause": "Could not find any entity of type \"ApprovalChain\" matching: {\n    \"code\": \"P5A_AUTO\"\n}",
      "stack": "EntityNotFoundError: Could not find any entity of type \"ApprovalChain\" matching: {\n    \"code\": \"P5A_AUTO\"\n}\n    at D:\\projects\\hr_system\\api\\node_modules\\src\\entity-manager\\EntityManager.ts:1334:25\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5b-expenses.integration.cjs:172:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"id\":\"P5B-E01\",\"money\":0,\"ledgerRows\":0,\"humanApprovals\":0}",
    "Cleanup verified: hr_expense_reports_test_679785947e991cb1 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12242.0339"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_679785947e991cb1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_679785947e991cb1\"}\n"
  ]
}

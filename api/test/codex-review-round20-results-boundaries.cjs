module.exports = {
  "selected": [
    "codex-review-round20-boundaries"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 1,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 6783.7156
  },
  "results": [
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 two personal-data approvals cannot clear both identity fields and failed approval leaves no audit",
      "ms": 4015.6445,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 request approval and HR update share identity serialization with normalized duplicates",
      "ms": 169.0508,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 ordinary employee cannot probe identity duplication through submitting requests",
      "ms": 79.0881,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 hiring documents and currency context enforce branch and self-service scope",
      "ms": 105.4123,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 reminder authorization is checked again when employee moves before insertion",
      "ms": 194.2557,
      "pass": false,
      "error": "A reminder must not write after the employee has moved out of scope\n\n201 !== 404\n",
      "cause": "A reminder must not write after the employee has moved out of scope\n\n201 !== 404\n",
      "stack": "AssertionError [ERR_ASSERTION]: A reminder must not write after the employee has moved out of scope\n\n201 !== 404\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\codex-review-round20-boundaries.integration.cjs:108:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 reminder authorization is checked again when employee moves before insertion",
      "ms": 194.2557,
      "pass": false,
      "error": "A reminder must not write after the employee has moved out of scope\n\n201 !== 404\n",
      "cause": "A reminder must not write after the employee has moved out of scope\n\n201 !== 404\n",
      "stack": "AssertionError [ERR_ASSERTION]: A reminder must not write after the employee has moved out of scope\n\n201 !== 404\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\codex-review-round20-boundaries.integration.cjs:108:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"personal-two-clears\",\"waits\":2,\"statuses\":[400,201],\"oneIdentityRetained\":true,\"auditRolledBack\":true}",
    "{\"case\":\"personal-approval-vs-hr-save\",\"waits\":2,\"statuses\":[201,409],\"storedCount\":1}",
    "{\"case\":\"identity-oracle-and-scope\",\"submission\":\"UNDER_REVIEW\",\"unauthorizedApproval\":403,\"conflictingApproval\":400,\"noForeignName\":true}",
    "{\"case\":\"new-endpoint-scope\",\"noPartialReminders\":true,\"duplicateRecipientsDeduplicated\":true,\"visibleBranches\":[{\"id\":1,\"currency\":\"EGP\"}]}",
    "{\"case\":\"reminder-transfer-race\",\"waitObserved\":true,\"transferStatus\":200,\"reminderStatus\":201,\"reminderBody\":{\"sent\":1,\"skipped\":0,\"reminders\":[{\"id\":2,\"employeeId\":8,\"sentAt\":\"2026-09-30T14:28:25.047Z\",\"missing\":[{\"code\":\"contract\",\"nameAr\":\"عقد عمل\"}]}]},\"persistedRemindersOutsideScope\":1}",
    "tests 5",
    "suites 0",
    "pass 4",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6783.7156"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r20_boundaries_test_759838d3222a7d58\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r20_boundaries_test_759838d3222a7d58\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r20_boundaries_test_759838d3222a7d58\"}\n"
  ]
}

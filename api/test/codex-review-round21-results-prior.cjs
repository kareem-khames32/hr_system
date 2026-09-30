module.exports = {
  "selected": [
    "codex-review-round20-boundaries",
    "codex-review-round20-onboarding",
    "codex-review-round20-currency-session"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 7,
      "failed": 0,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 16191.6612
  },
  "results": [
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 two personal-data approvals cannot clear both identity fields and failed approval leaves no audit",
      "ms": 4223.8897,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 request approval and HR update share identity serialization with normalized duplicates",
      "ms": 171.0962,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 ordinary employee cannot probe identity duplication through submitting requests",
      "ms": 87.5075,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 hiring documents and currency context enforce branch and self-service scope",
      "ms": 114.2778,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-boundaries.integration.cjs",
      "name": "CR20 reminder authorization is checked again when employee moves before insertion",
      "ms": 280.9663,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-onboarding.integration.cjs",
      "name": "CR20 saving a system task note cannot restore DONE after a concurrent required document removal",
      "ms": 4324.5879,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round20-currency-session.integration.cjs",
      "name": "CR20 a fresh login by the same user reloads the branch currency context",
      "ms": 93.3204,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"personal-two-clears\",\"waits\":2,\"statuses\":[400,201],\"oneIdentityRetained\":true,\"auditRolledBack\":true}",
    "{\"case\":\"personal-approval-vs-hr-save\",\"waits\":2,\"statuses\":[201,409],\"storedCount\":1}",
    "{\"case\":\"identity-oracle-and-scope\",\"submission\":\"UNDER_REVIEW\",\"unauthorizedApproval\":403,\"conflictingApproval\":400,\"noForeignName\":true}",
    "{\"case\":\"new-endpoint-scope\",\"noPartialReminders\":true,\"duplicateRecipientsDeduplicated\":true,\"visibleBranches\":[{\"id\":1,\"currency\":\"EGP\"}]}",
    "{\"case\":\"reminder-transfer-race\",\"initialMissing\":false,\"documentRemovedAfterTransfer\":true,\"waitObserved\":true,\"transferStatus\":200,\"reminderStatus\":404,\"reminderBody\":{\"message\":\"موظف أو أكتر من المختارين غير موجود\",\"error\":\"Not Found\",\"statusCode\":404},\"persistedRemindersOutsideScope\":0}",
    "{\"case\":\"system-task-stale-save\",\"patchStatus\":200,\"statusAfterDocumentRemoval\":\"PENDING\",\"statusAfterNoteSave\":\"PENDING\",\"returnedStatus\":\"PENDING\",\"returnedProgress\":{\"requiredCount\":1,\"presentCount\":0,\"missing\":[{\"code\":\"contract\",\"nameAr\":\"عقد عمل\"}]},\"statusAfterNextList\":\"PENDING\"}",
    "{\"case\":\"same-user-new-login\",\"httpCalls\":2,\"expectedCurrency\":\"ر.س\",\"shownCurrency\":\"ر.س\",\"sessionBranch\":2,\"cachedBranchIds\":[2]}",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16191.6612"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r20_boundaries_test_17e539c09a8a40e4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r20_boundaries_test_17e539c09a8a40e4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r20_boundaries_test_17e539c09a8a40e4\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r20_onboarding_test_94284b0e41203297\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r20_onboarding_test_94284b0e41203297\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r20_onboarding_test_94284b0e41203297\"}\n"
  ]
}

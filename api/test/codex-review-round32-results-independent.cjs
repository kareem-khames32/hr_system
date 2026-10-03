module.exports = {
  "selected": [
    "codex-review-round32-independent",
    "codex-review-round31-holiday-scope"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 10,
      "failed": 0,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 16405.9025
  },
  "results": [
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 holiday update reply after-commit: a later foreign name must never enter the success fallback",
      "ms": 3998.9129,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 holiday update reply after-reload: a later foreign name must never enter the success fallback",
      "ms": 105.0282,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 ordinary holiday update and cancel retain successful scoped detail replies",
      "ms": 134.0071,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 overtime period update: actual company relocation wins before row lock",
      "ms": 60.444,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 overtime period delete: actual company relocation wins before row lock",
      "ms": 37.3707,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 overtime period update: row lock serializes a later company edit",
      "ms": 314.158,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 overtime period delete: row lock serializes a later company edit",
      "ms": 294.5585,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-holiday-scope.integration.cjs",
      "name": "CR31 holiday update: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 5766.1054,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-holiday-scope.integration.cjs",
      "name": "CR31 holiday cancel: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 873.5997,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-holiday-scope.integration.cjs",
      "name": "CR31 holiday scope controls: ordinary foreign write is refused; authorized branch still updates and cancels",
      "ms": 164.39,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"holiday-response-after-move\",\"phase\":\"after-commit\",\"responseStatus\":200,\"getOldBranch\":404,\"response\":{\"today\":\"2026-10-03\",\"canSeeAmounts\":false,\"order\":{\"id\":1,\"kind\":\"ORDER\",\"name\":\"CR32 known saved 1\",\"status\":\"ACTIVE\",\"movedOutOfScope\":true},\"overtime\":{\"recomputed\":0,\"failed\":0}},\"foreignNamePresent\":false,\"submittedName\":\"CR32 known saved 1\",\"foreignName\":\"CR32 PRIVATE B ONLY 1\"}",
    "{\"case\":\"holiday-response-after-move\",\"phase\":\"after-reload\",\"responseStatus\":200,\"getOldBranch\":404,\"response\":{\"today\":\"2026-10-03\",\"canSeeAmounts\":false,\"order\":{\"id\":2,\"kind\":\"ORDER\",\"name\":\"CR32 known saved 2\",\"status\":\"ACTIVE\",\"movedOutOfScope\":true},\"overtime\":{\"recomputed\":0,\"failed\":0}},\"foreignNamePresent\":false,\"submittedName\":\"CR32 known saved 2\",\"foreignName\":\"CR32 PRIVATE B ONLY 2\"}",
    "{\"case\":\"period-company-first\",\"action\":\"update\",\"companyUpdate\":200,\"oldCommand\":403,\"stateUnchanged\":true}",
    "{\"case\":\"period-company-first\",\"action\":\"delete\",\"companyUpdate\":200,\"oldCommand\":403,\"stateUnchanged\":true}",
    "{\"case\":\"period-old-command-first\",\"action\":\"update\",\"command\":200,\"laterCompany\":200,\"responseFromOwnWrite\":true}",
    "{\"case\":\"period-old-command-first\",\"action\":\"delete\",\"command\":200,\"laterCompany\":404,\"responseFromOwnWrite\":true}",
    "{\"case\":\"holiday-order-branch-race\",\"action\":\"update\",\"companyChange\":200,\"oldBranchReadAfterChange\":404,\"oldMutationStatus\":404,\"before\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"after\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"creditBefore\":{\"status\":\"PENDING\",\"amount\":300},\"creditAfter\":{\"status\":\"PENDING\",\"amount\":300}}",
    "{\"case\":\"holiday-order-branch-race\",\"action\":\"cancel\",\"companyChange\":200,\"oldBranchReadAfterChange\":404,\"oldMutationStatus\":404,\"before\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"after\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"creditBefore\":{\"status\":\"PENDING\",\"amount\":300},\"creditAfter\":{\"status\":\"PENDING\",\"amount\":300}}",
    "{\"case\":\"holiday-order-controls\",\"foreignUpdate\":404,\"foreignCancel\":404,\"authorizedUpdate\":200,\"authorizedCancel\":201}",
    "tests 10",
    "suites 0",
    "pass 10",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16405.9025"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r32_independent_test_0d984fc34e755a77\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r32_independent_test_0d984fc34e755a77\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r32_independent_test_0d984fc34e755a77\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r31_holiday_scope_test_9401aac07f532894\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r31_holiday_scope_test_9401aac07f532894\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r31_holiday_scope_test_9401aac07f532894\"}\n"
  ]
}

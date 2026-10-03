module.exports = {
  "selected": [
    "codex-review-round32-postwrite",
    "codex-review-round32-independent",
    "codex-review-round32-holiday-effects"
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
    "duration_ms": 24477.5754
  },
  "results": [
    {
      "file": "codex-review-round32-postwrite.integration.cjs",
      "name": "CR32 allowance success reply does not expose a new foreign run created after its transaction committed",
      "ms": 5290.8259,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-postwrite.integration.cjs",
      "name": "CR32 allowance reply retains an in-scope run reference and exact amount",
      "ms": 467.6136,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 holiday update reply after-commit: a later foreign name must never enter the success fallback",
      "ms": 4992.1,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 holiday update reply after-reload: a later foreign name must never enter the success fallback",
      "ms": 118.2829,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 ordinary holiday update and cancel retain successful scoped detail replies",
      "ms": 162.3718,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 overtime period update: actual company relocation wins before row lock",
      "ms": 65.3344,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 overtime period delete: actual company relocation wins before row lock",
      "ms": 44.2895,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 overtime period update: row lock serializes a later company edit",
      "ms": 295.5288,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-independent.integration.cjs",
      "name": "CR32 overtime period delete: row lock serializes a later company edit",
      "ms": 285.0696,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round32-holiday-effects.integration.cjs",
      "name": "CR32 update returns ordinary detail, recomputes covered overtime and rebuilds only the unreserved holiday credit",
      "ms": 5823.555,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"allowance-postcommit-foreign-run\",\"responseStatus\":201,\"response\":{\"id\":1,\"created\":1,\"skippedDuplicates\":0,\"amount\":150.25,\"total\":150.25,\"recalculateRuns\":[],\"lockedRuns\":[]},\"foreignRead\":403,\"foreignRunId\":1,\"foreignName\":\"CR32 NEW PRIVATE B PAYROLL\",\"memberBranchIds\":[2],\"leaked\":false}",
    "{\"case\":\"allowance-postcommit-control\",\"created\":1,\"total\":150.25,\"inScopeRunReturned\":true}",
    "{\"case\":\"holiday-response-after-move\",\"phase\":\"after-commit\",\"responseStatus\":200,\"getOldBranch\":404,\"response\":{\"today\":\"2026-10-03\",\"canSeeAmounts\":false,\"order\":{\"id\":1,\"kind\":\"ORDER\",\"name\":\"CR32 known saved 1\",\"status\":\"ACTIVE\",\"movedOutOfScope\":true},\"overtime\":{\"recomputed\":0,\"failed\":0}},\"foreignNamePresent\":false,\"submittedName\":\"CR32 known saved 1\",\"foreignName\":\"CR32 PRIVATE B ONLY 1\"}",
    "{\"case\":\"holiday-response-after-move\",\"phase\":\"after-reload\",\"responseStatus\":200,\"getOldBranch\":404,\"response\":{\"today\":\"2026-10-03\",\"canSeeAmounts\":false,\"order\":{\"id\":2,\"kind\":\"ORDER\",\"name\":\"CR32 known saved 2\",\"status\":\"ACTIVE\",\"movedOutOfScope\":true},\"overtime\":{\"recomputed\":0,\"failed\":0}},\"foreignNamePresent\":false,\"submittedName\":\"CR32 known saved 2\",\"foreignName\":\"CR32 PRIVATE B ONLY 2\"}",
    "{\"case\":\"period-company-first\",\"action\":\"update\",\"companyUpdate\":200,\"oldCommand\":403,\"stateUnchanged\":true}",
    "{\"case\":\"period-company-first\",\"action\":\"delete\",\"companyUpdate\":200,\"oldCommand\":403,\"stateUnchanged\":true}",
    "{\"case\":\"period-old-command-first\",\"action\":\"update\",\"command\":200,\"laterCompany\":200,\"responseFromOwnWrite\":true}",
    "{\"case\":\"period-old-command-first\",\"action\":\"delete\",\"command\":200,\"laterCompany\":404,\"responseFromOwnWrite\":true}",
    "{\"case\":\"holiday-update-financial-effects\",\"initialCredit\":300,\"newCredit\":225,\"afterCancel\":0,\"coveredOvertimeRecomputed\":1,\"replyEqualsGet\":true,\"noDuplicateCredit\":true}",
    "tests 10",
    "suites 0",
    "pass 10",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 24477.5754"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r32_postwrite_test_1b5204e1cc787b0a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r32_postwrite_test_1b5204e1cc787b0a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r32_postwrite_test_1b5204e1cc787b0a\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r32_independent_test_81b66ab62af30f48\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r32_independent_test_81b66ab62af30f48\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r32_independent_test_81b66ab62af30f48\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r32_holiday_effects_test_5c0935f67224ee54\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r32_holiday_effects_test_5c0935f67224ee54\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r32_holiday_effects_test_5c0935f67224ee54\"}\n"
  ]
}

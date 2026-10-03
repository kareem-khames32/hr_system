module.exports = {
  "selected": [
    "codex-review-round31-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 7,
      "failed": 1,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 6946.2824
  },
  "results": [
    {
      "file": "codex-review-round31-independent.integration.cjs",
      "name": "CR31 holiday update reply before-reload: a later foreign name must never enter the success fallback",
      "ms": 3783.8236,
      "pass": false,
      "error": "The success response must not disclose a name saved later in the other branch",
      "cause": "The success response must not disclose a name saved later in the other branch",
      "stack": "AssertionError [ERR_ASSERTION]: The success response must not disclose a name saved later in the other branch\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round31-independent.integration.cjs:32:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round31-independent.integration.cjs",
      "name": "CR31 holiday update reply after-reload: a later foreign name must never enter the success fallback",
      "ms": 104.4169,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-independent.integration.cjs",
      "name": "CR31 ordinary holiday update and cancel retain successful scoped detail replies",
      "ms": 126.9093,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-independent.integration.cjs",
      "name": "CR31 overtime period update: actual company relocation wins before row lock",
      "ms": 54.4469,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-independent.integration.cjs",
      "name": "CR31 overtime period delete: actual company relocation wins before row lock",
      "ms": 33.5761,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-independent.integration.cjs",
      "name": "CR31 overtime period update: row lock serializes a later company edit",
      "ms": 301.6296,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-independent.integration.cjs",
      "name": "CR31 overtime period delete: row lock serializes a later company edit",
      "ms": 304.0844,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round31-independent.integration.cjs",
      "name": "CR31 holiday update reply before-reload: a later foreign name must never enter the success fallback",
      "ms": 3783.8236,
      "pass": false,
      "error": "The success response must not disclose a name saved later in the other branch",
      "cause": "The success response must not disclose a name saved later in the other branch",
      "stack": "AssertionError [ERR_ASSERTION]: The success response must not disclose a name saved later in the other branch\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round31-independent.integration.cjs:32:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"holiday-response-after-move\",\"phase\":\"before-reload\",\"responseStatus\":200,\"getOldBranch\":404,\"response\":{\"today\":\"2026-10-03\",\"canSeeAmounts\":false,\"order\":{\"id\":1,\"kind\":\"ORDER\",\"name\":\"CR31 PRIVATE B ONLY 1\",\"status\":\"ACTIVE\",\"movedOutOfScope\":true},\"overtime\":{\"recomputed\":0,\"failed\":0}},\"foreignNamePresent\":true,\"submittedName\":\"CR31 known saved 1\",\"foreignName\":\"CR31 PRIVATE B ONLY 1\"}",
    "{\"case\":\"holiday-response-after-move\",\"phase\":\"after-reload\",\"responseStatus\":200,\"getOldBranch\":404,\"response\":{\"today\":\"2026-10-03\",\"canSeeAmounts\":false,\"order\":{\"id\":2,\"kind\":\"ORDER\",\"name\":\"CR31 known saved 2\",\"status\":\"ACTIVE\",\"movedOutOfScope\":true},\"overtime\":{\"recomputed\":0,\"failed\":0}},\"foreignNamePresent\":false,\"submittedName\":\"CR31 known saved 2\",\"foreignName\":\"CR31 PRIVATE B ONLY 2\"}",
    "{\"case\":\"period-company-first\",\"action\":\"update\",\"companyUpdate\":200,\"oldCommand\":403,\"stateUnchanged\":true}",
    "{\"case\":\"period-company-first\",\"action\":\"delete\",\"companyUpdate\":200,\"oldCommand\":403,\"stateUnchanged\":true}",
    "{\"case\":\"period-old-command-first\",\"action\":\"update\",\"command\":200,\"laterCompany\":200,\"responseFromOwnWrite\":true}",
    "{\"case\":\"period-old-command-first\",\"action\":\"delete\",\"command\":200,\"laterCompany\":404,\"responseFromOwnWrite\":true}",
    "tests 7",
    "suites 0",
    "pass 6",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6946.2824"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r31_independent_test_2dc719cef23396ce\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r31_independent_test_2dc719cef23396ce\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r31_independent_test_2dc719cef23396ce\"}\n"
  ]
}

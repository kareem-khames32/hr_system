module.exports = {
  "selected": [
    "codex-review-p3k-privacy"
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
    "duration_ms": 32612.9762
  },
  "results": [
    {
      "file": "codex-review-p3k-privacy.integration.cjs",
      "name": "P3K-S01: live aggregates reveal a single anonymous choice by subtraction; sparse question reveals one answer",
      "ms": 5571.078,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-privacy.integration.cjs",
      "name": "P3K-C01: handler account rebound to respondent retains full case and complainant identity",
      "ms": 24512.4924,
      "pass": false,
      "error": "Login failed for user 'sa'.",
      "cause": "Login failed for user 'sa'.",
      "stack": "ConnectionError: Login failed for user 'sa'.\n    at connectListener (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\connection-pool.js:86:17)\n    at Connection.onConnect (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1823:9)\n    at Object.onceWrapper (node:events:623:26)\n    at Connection.emit (node:events:508:28)\n    at Connection.emit (node:domain:489:12)\n    at Connection.emit (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1985:18)\n    at D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1845:14\n    at processTicksAndRejections (node:internal/process/task_queues:84:11)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3k-privacy.integration.cjs",
      "name": "P3K-C01: handler account rebound to respondent retains full case and complainant identity",
      "ms": 24512.4924,
      "pass": false,
      "error": "Login failed for user 'sa'.",
      "cause": "Login failed for user 'sa'.",
      "stack": "ConnectionError: Login failed for user 'sa'.\n    at connectListener (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\connection-pool.js:86:17)\n    at Connection.onConnect (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1823:9)\n    at Object.onceWrapper (node:events:623:26)\n    at Connection.emit (node:events:508:28)\n    at Connection.emit (node:domain:489:12)\n    at Connection.emit (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1985:18)\n    at D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1845:14\n    at processTicksAndRejections (node:internal/process/task_queues:84:11)"
    }
  ],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 32612.9762"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3k_survey_test_901517f470e89c7f\"}\n",
    "REVIEW_MEASURE {\"case\":\"S01\",\"anonymous\":true,\"liveDelta\":[0,1],\"sparseAnswered\":1,\"sparseAverage\":2,\"foreignDepartmentExposed\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3k_survey_test_901517f470e89c7f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3k_survey_test_901517f470e89c7f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3k_case_test_303e7d08145df10b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3k_case_test_303e7d08145df10b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3k_case_test_303e7d08145df10b\"}\n"
  ]
}

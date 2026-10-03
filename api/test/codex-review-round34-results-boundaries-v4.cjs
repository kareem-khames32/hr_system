module.exports = {
  "selected": [
    "codex-review-round34-boundaries"
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
    "duration_ms": 6437.3317
  },
  "results": [
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
      "ms": 3887.3663,
      "pass": false,
      "error": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-POLICY-PERIOD\",\"message\":\"فترة 2025-01 (2024-12-23 → 2025-01-22) خارج سريان نسخة السياسة «Independent Review Policy» رقم 1 (2026-01-23 → مفتوح)\"}",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-POLICY-PERIOD\",\"message\":\"فترة 2025-01 (2024-12-23 → 2025-01-22) خارج سريان نسخة السياسة «Independent Review Policy» رقم 1 (2026-01-23 → مفتوح)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-POLICY-PERIOD\",\"message\":\"فترة 2025-01 (2024-12-23 → 2025-01-22) خارج سريان نسخة السياسة «Independent Review Policy» رقم 1 (2026-01-23 → مفتوح)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-boundaries.integration.cjs:23:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 both obligation reservation guards reject without foreign run numbers or writes",
      "ms": 252.947,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
      "ms": 3887.3663,
      "pass": false,
      "error": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-POLICY-PERIOD\",\"message\":\"فترة 2025-01 (2024-12-23 → 2025-01-22) خارج سريان نسخة السياسة «Independent Review Policy» رقم 1 (2026-01-23 → مفتوح)\"}",
      "cause": "POST /payroll/runs: 400 {\"code\":\"PAYRUN-POLICY-PERIOD\",\"message\":\"فترة 2025-01 (2024-12-23 → 2025-01-22) خارج سريان نسخة السياسة «Independent Review Policy» رقم 1 (2026-01-23 → مفتوح)\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/runs: 400 {\"code\":\"PAYRUN-POLICY-PERIOD\",\"message\":\"فترة 2025-01 (2024-12-23 → 2025-01-22) خارج سريان نسخة السياسة «Independent Review Policy» رقم 1 (2026-01-23 → مفتوح)\"}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-boundaries.integration.cjs:23:13)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"reservation-guards\",\"guardCount\":2,\"status\":409,\"code\":\"PAYRUN-OBLIGATION-RESERVED\",\"foreignRunReferenceAbsent\":true,\"ledgerUnchanged\":true}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6437.3317"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_boundaries_test_5c7a03238c07bf39\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_boundaries_test_5c7a03238c07bf39\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_boundaries_test_5c7a03238c07bf39\"}\n"
  ]
}

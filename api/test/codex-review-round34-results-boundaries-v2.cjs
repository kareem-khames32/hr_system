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
    "duration_ms": 7897.0291
  },
  "results": [
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
      "ms": 5382.8403,
      "pass": false,
      "error": "PATCH /employees/1: 409 {\"message\":\"سريان الدوام أو إسناده يتداخل مع مسير معتمد أو مصروف؛ يلزم تصحيح بتسوية لاحقة\",\"error\":\"Conflict\",\"statusCode\":409}",
      "cause": "PATCH /employees/1: 409 {\"message\":\"سريان الدوام أو إسناده يتداخل مع مسير معتمد أو مصروف؛ يلزم تصحيح بتسوية لاحقة\",\"error\":\"Conflict\",\"statusCode\":409}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/1: 409 {\"message\":\"سريان الدوام أو إسناده يتداخل مع مسير معتمد أو مصروف؛ يلزم تصحيح بتسوية لاحقة\",\"error\":\"Conflict\",\"statusCode\":409}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-boundaries.integration.cjs:31:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 both obligation reservation guards reject without foreign run numbers or writes",
      "ms": 177.0784,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round34-boundaries.integration.cjs",
      "name": "CR34 carried and suspended deduction events must not expose a foreign payroll reference",
      "ms": 5382.8403,
      "pass": false,
      "error": "PATCH /employees/1: 409 {\"message\":\"سريان الدوام أو إسناده يتداخل مع مسير معتمد أو مصروف؛ يلزم تصحيح بتسوية لاحقة\",\"error\":\"Conflict\",\"statusCode\":409}",
      "cause": "PATCH /employees/1: 409 {\"message\":\"سريان الدوام أو إسناده يتداخل مع مسير معتمد أو مصروف؛ يلزم تصحيح بتسوية لاحقة\",\"error\":\"Conflict\",\"statusCode\":409}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/1: 409 {\"message\":\"سريان الدوام أو إسناده يتداخل مع مسير معتمد أو مصروف؛ يلزم تصحيح بتسوية لاحقة\",\"error\":\"Conflict\",\"statusCode\":409}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round34-boundaries.integration.cjs:31:2)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
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
    "duration_ms 7897.0291"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r34_boundaries_test_9e9e299984a18845\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r34_boundaries_test_9e9e299984a18845\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r34_boundaries_test_9e9e299984a18845\"}\n"
  ]
}

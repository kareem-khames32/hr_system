module.exports = {
  "selected": [
    "codex-review-p4a-tiers-race"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 13214.5066
  },
  "results": [
    {
      "file": "codex-review-p4a-tiers-race.integration.cjs",
      "name": "P4A-L01: stale employee tier facts survive employee lock and inflate historic row and carry",
      "ms": 10631.4269,
      "pass": false,
      "error": "{\"message\":\"شرائح الخدمة والسن للإجازة برصيد سنوي بس\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"شرائح الخدمة والسن للإجازة برصيد سنوي بس\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"شرائح الخدمة والسن للإجازة برصيد سنوي بس\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tiers-race.integration.cjs:29:43)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tiers-race.integration.cjs:110:2)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p4a-tiers-race.integration.cjs",
      "name": "P4A-L01: stale employee tier facts survive employee lock and inflate historic row and carry",
      "ms": 10631.4269,
      "pass": false,
      "error": "{\"message\":\"شرائح الخدمة والسن للإجازة برصيد سنوي بس\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"شرائح الخدمة والسن للإجازة برصيد سنوي بس\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"شرائح الخدمة والسن للإجازة برصيد سنوي بس\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tiers-race.integration.cjs:29:43)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p4a-tiers-race.integration.cjs:110:2)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_leave_tiers_test_38b2ac45a6544ad8 is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13214.5066"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_38b2ac45a6544ad8\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_38b2ac45a6544ad8\"}\n"
  ]
}

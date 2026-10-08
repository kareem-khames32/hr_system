module.exports = {
  "selected": [
    "codex-review-p4a-tiers-race"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 14886.7256
  },
  "results": [
    {
      "file": "codex-review-p4a-tiers-race.integration.cjs",
      "name": "P4A-L01: stale employee tier facts survive employee lock and inflate historic row and carry",
      "ms": 12328.8561,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"currentCountry\":\"SA\",\"staleHistoricEntitlement\":30,\"referenceEntitlement\":15,\"carry\":30,\"referenceCarry\":15}",
    "Cleanup verified: hr_leave_tiers_test_e9d397a78ce2d62f is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14886.7256"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_e9d397a78ce2d62f\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_e9d397a78ce2d62f\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p4b-tiers-writers"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 11408.2223
  },
  "results": [
    {
      "file": "codex-review-p4b-tiers-writers.integration.cjs",
      "name": "P4B-L02: rollover recalculates new-row country after waiting for employee",
      "ms": 8706.0712,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tiers-writers.integration.cjs",
      "name": "P4B-L03: daily renewal uses birthday committed before employee lock",
      "ms": 153.8491,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"writer\":\"rollover\",\"country\":\"SA\",\"entitled\":15,\"carry\":30}",
    "{\"writer\":\"renewal\",\"birthDate\":\"2005-01-01\",\"entitled\":15}",
    "Cleanup verified: hr_leave_tiers_test_c6b5986aca37f867 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11408.2223"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_c6b5986aca37f867\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_c6b5986aca37f867\"}\n"
  ]
}

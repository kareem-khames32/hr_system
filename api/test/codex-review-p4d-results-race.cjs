module.exports = {
  "selected": [
    "codex-review-p4d-text-race"
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
    "duration_ms": 12245.3879
  },
  "results": [
    {
      "file": "codex-review-p4d-text-race.integration.cjs",
      "name": "P4D-X04: a confidential request commits after the text snapshot and before exporting its copied custody field",
      "ms": 9388.3369,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"requestCommittedBeforeExportContinued\":true,\"firstExportLeaked\":true,\"nextExportRedacted\":true,\"requestHidden\":true}",
    "Cleanup verified: hr_employee_privacy_test_33882dc8f9bc7944 is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12245.3879"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_33882dc8f9bc7944\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_33882dc8f9bc7944\"}\n"
  ]
}

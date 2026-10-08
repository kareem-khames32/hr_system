module.exports = {
  "selected": [
    "codex-review-p4b-export-derived"
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
    "duration_ms": 12037.4834
  },
  "results": [
    {
      "file": "codex-review-p4b-export-derived.integration.cjs",
      "name": "P4B-D03: confidential executed request remains visible through sourceRequestId obligation label",
      "ms": 9168.9702,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"requestEndpointMasked\":true,\"requestsSectionOmitted\":true,\"obligationLeaksReason\":true,\"sourceRequestId\":1,\"amount\":321}",
    "Cleanup verified: hr_employee_privacy_test_203ddb756df6f15d is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12037.4834"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_203ddb756df6f15d\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_203ddb756df6f15d\"}\n"
  ]
}

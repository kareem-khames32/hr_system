module.exports = {
  "selected": [
    "codex-review-p4a-export"
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
    "duration_ms": 15174.3782
  },
  "results": [
    {
      "file": "codex-review-p4a-export.integration.cjs",
      "name": "P4A-D01: canonical confidential leave definition leaks through data export",
      "ms": 11799.5008,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4a-export.integration.cjs",
      "name": "P4A-D02: export reads new branch documents after old branch authorization",
      "ms": 297.1304,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"requestMasked\":true,\"exportContainsConfidentialPayload\":true,\"requestId\":1}",
    "{\"oldScopeExport\":200,\"newBranchDocumentLeaked\":true,\"nextRead\":404}",
    "Cleanup verified: hr_employee_privacy_test_a832990979215209 is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15174.3782"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_a832990979215209\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_a832990979215209\"}\n"
  ]
}

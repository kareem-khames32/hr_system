module.exports = {
  "selected": [
    "codex-review-p4c-updated-sources",
    "codex-review-p4c-export-controls"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 13686.1053
  },
  "results": [
    {
      "file": "codex-review-p4c-updated-sources.integration.cjs",
      "name": "P4C-S01: confidential dependent removal copies reason onto an existing unlinked row",
      "ms": 10460.62,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-updated-sources.integration.cjs",
      "name": "P4C-S02: confidential custody loss copies description onto the old assignment",
      "ms": 220.0989,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-updated-sources.integration.cjs",
      "name": "P4C-S03: confidential archive request copies its reason into the exported employee",
      "ms": 150.0566,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-P01: current parent request confidentiality hides both offboarding and closed employment period",
      "ms": 10159.7631,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-R01: rollback after the audit insert leaves exactly one audit; retries bounded to three",
      "ms": 408.2474,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-R02: a branch transfer between rolled-back attempt and retry causes a fresh 404 scope decision",
      "ms": 215.4614,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"requestHidden\":true,\"historyHidden\":true,\"section\":\"dependents\",\"privateReasonExported\":true,\"creationRequestId\":null}",
    "{\"requestHidden\":true,\"section\":\"custody\",\"privateDescriptionExported\":true,\"creationRequestId\":null}",
    "{\"requestHidden\":true,\"historyHidden\":true,\"section\":\"employee.archiveReason\",\"privateReasonExported\":true}",
    "Cleanup verified: hr_employee_privacy_test_a62189c28fd6e859 is absent from sys.databases.",
    "{\"publicParentAndPeriod\":[true,true],\"confidentialParentAndPeriod\":[false,false]}",
    "{\"successAttempts\":3,\"committedAudits\":1,\"exhaustedAttempts\":3,\"exhaustedAudits\":0}",
    "{\"attempts\":2,\"status\":404,\"audits\":0,\"scopeReevaluated\":true}",
    "Cleanup verified: hr_employee_privacy_test_0380d11fb3f36636 is absent from sys.databases.",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13686.1053"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_a62189c28fd6e859\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_a62189c28fd6e859\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_0380d11fb3f36636\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_0380d11fb3f36636\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p4c-export-controls"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 12480.1936
  },
  "results": [
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-P01: current parent request confidentiality hides both offboarding and closed employment period",
      "ms": 9130.2429,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-R01: rollback after the audit insert leaves exactly one audit; retries bounded to three",
      "ms": 346.073,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-P02: installment section is skipped even for a public loan because it lacks employeeId",
      "ms": 81.6308,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-controls.integration.cjs",
      "name": "P4C-R02: a branch transfer between rolled-back attempt and retry causes a fresh 404 scope decision",
      "ms": 191.0214,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"publicParentAndPeriod\":[true,true],\"confidentialParentAndPeriod\":[false,false]}",
    "{\"successAttempts\":3,\"committedAudits\":1,\"exhaustedAttempts\":3,\"exhaustedAudits\":0}",
    "{\"publicLoanExported\":true,\"installmentExists\":true,\"installmentSectionPresent\":false}",
    "{\"attempts\":2,\"status\":404,\"audits\":0,\"scopeReevaluated\":true}",
    "Cleanup verified: hr_employee_privacy_test_09c684004cf231bf is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12480.1936"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_09c684004cf231bf\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_09c684004cf231bf\"}\n"
  ]
}

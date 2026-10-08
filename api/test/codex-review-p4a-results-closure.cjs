module.exports = {
  "selected": [
    "codex-review-p4a-tax",
    "codex-review-p4a-overtime-history",
    "codex-review-p4a-tiers-race",
    "codex-review-p4a-export"
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
    "duration_ms": 28311.4947
  },
  "results": [
    {
      "file": "codex-review-p4a-tax.integration.cjs",
      "name": "P4A-F01: API activation accepts a verified successor but payroll deducts with its unverified predecessor",
      "ms": 9893.9779,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4a-tax.integration.cjs",
      "name": "P4A-F03: cancelled previous-month draft remains in tax of an approved later month",
      "ms": 2371.7794,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4a-overtime-history.integration.cjs",
      "name": "P4A-F02: verified current rule enables historical unverified overtime pricing",
      "ms": 8360.7595,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4a-tiers-race.integration.cjs",
      "name": "P4A-L01: stale employee tier facts survive employee lock and inflate historic row and carry",
      "ms": 10873.3038,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4a-export.integration.cjs",
      "name": "P4A-D01: canonical confidential leave definition leaks through data export",
      "ms": 9884.5111,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4a-export.integration.cjs",
      "name": "P4A-D02: export reads new branch documents after old branch authorization",
      "ms": 239.6916,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"oldVerified\":false,\"tableVerified\":false,\"tax\":1482.5,\"net\":11867.5,\"approved\":true}",
    "{\"firstTax\":9566.67,\"secondTax\":1024.16,\"referenceTax\":1482.5,\"ytdNetIncome\":48350,\"days\":30,\"firstCancelled\":true,\"secondApproved\":true}",
    "Cleanup verified: hr_payroll_statutory_test_e13541c204865ac5 is absent from sys.databases.",
    "{\"date\":\"2026-09-04\",\"multiplier\":2,\"legalVerified\":false,\"companyMultiplier\":1.5}",
    "Cleanup verified: hr_overtime_legal_test_d6ca25e624dc2f97 is absent from sys.databases.",
    "{\"currentCountry\":\"SA\",\"staleHistoricEntitlement\":30,\"referenceEntitlement\":15,\"carry\":30,\"referenceCarry\":15}",
    "Cleanup verified: hr_leave_tiers_test_6a84c876c76b6c10 is absent from sys.databases.",
    "{\"requestMasked\":true,\"exportContainsConfidentialPayload\":true,\"requestId\":1}",
    "{\"oldScopeExport\":200,\"newBranchDocumentLeaked\":true,\"nextRead\":404}",
    "Cleanup verified: hr_employee_privacy_test_cb3a7ef908b0f71b is absent from sys.databases.",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 28311.4947"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_e13541c204865ac5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_e13541c204865ac5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_overtime_legal_test_d6ca25e624dc2f97\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_overtime_legal_test_d6ca25e624dc2f97\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_6a84c876c76b6c10\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_6a84c876c76b6c10\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_cb3a7ef908b0f71b\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_cb3a7ef908b0f71b\"}\n"
  ]
}

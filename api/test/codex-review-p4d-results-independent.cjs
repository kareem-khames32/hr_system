module.exports = {
  "selected": [
    "codex-review-p4d-export",
    "codex-review-p4d-export-derived",
    "codex-review-p4d-export-locks",
    "codex-review-p4d-closures",
    "codex-review-p4d-export-controls",
    "codex-review-p4d-text-bypasses"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 14,
      "failed": 0,
      "passed": 14,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 14,
      "suites": 0
    },
    "duration_ms": 48769.451
  },
  "results": [
    {
      "file": "codex-review-p4d-export.integration.cjs",
      "name": "P4D-D01: canonical confidential request and requestId-linked rows stay out",
      "ms": 11985.8604,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-export.integration.cjs",
      "name": "P4D-D02: export holds employee scope until final read, so a branch transfer waits",
      "ms": 959.4824,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-export-derived.integration.cjs",
      "name": "P4D-D03: confidential executed request and obligation omitted; public control remains visible",
      "ms": 13321.1239,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-export-locks.integration.cjs",
      "name": "P4D-N01: real export deadlock retries successfully with one committed audit",
      "ms": 14368.7371,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-closures.integration.cjs",
      "name": "P4D-S01: confidential dependent removal copies reason onto an existing unlinked row",
      "ms": 11833.9333,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-closures.integration.cjs",
      "name": "P4D-S02: confidential custody loss copies description onto the old assignment",
      "ms": 214.4383,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-closures.integration.cjs",
      "name": "P4D-S03: confidential archive request copies its reason into the exported employee",
      "ms": 152.4752,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-export-controls.integration.cjs",
      "name": "P4D-P01: current parent request confidentiality hides both offboarding and closed employment period",
      "ms": 11089.7129,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-export-controls.integration.cjs",
      "name": "P4D-R01: rollback after the audit insert leaves exactly one audit; retries bounded to three",
      "ms": 483.2528,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-export-controls.integration.cjs",
      "name": "P4D-P02: public loan installments exported; confidential parent and foreign owner excluded",
      "ms": 264.1592,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-export-controls.integration.cjs",
      "name": "P4D-R02: a branch transfer between rolled-back attempt and retry causes a fresh 404 scope decision",
      "ms": 262.3541,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-text-bypasses.integration.cjs",
      "name": "P4D-X01: real dependent destination normalizes whitespace and defeats confidential text matching",
      "ms": 11161.7707,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-text-bypasses.integration.cjs",
      "name": "P4D-X02: three-letter sensitive narrative is copied by the real destination and not scrubbed",
      "ms": 222.6027,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4d-text-bypasses.integration.cjs",
      "name": "P4D-X03: free-text custody condition is not a narrative key; a one-word description leaks",
      "ms": 188.7491,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"confidentialRequestOmitted\":true}",
    "{\"transferWaited\":true,\"exportBranch\":1,\"nextRead\":404}",
    "Cleanup verified: hr_employee_privacy_test_14cc3017d81d6ef3 is absent from sys.databases.",
    "{\"requestEndpointMasked\":true,\"requestsSectionOmitted\":true,\"obligationOmitted\":true,\"publicControlVisible\":true}",
    "Cleanup verified: hr_employee_privacy_test_d259e9c4b9df4977 is absent from sys.databases.",
    "{\"exportStatus\":200,\"requestStatus\":201,\"oppositeLockOrder\":true,\"sqlErrors\":[1205]}",
    "Cleanup verified: hr_employee_privacy_test_fed2b67495c1c499 is absent from sys.databases.",
    "{\"requestHidden\":true,\"historyHidden\":true,\"section\":\"dependents\",\"privateReasonExported\":false,\"creationRequestId\":null}",
    "{\"requestHidden\":true,\"section\":\"custody\",\"privateDescriptionExported\":false,\"creationRequestId\":null}",
    "{\"requestHidden\":true,\"historyHidden\":true,\"section\":\"employee.archiveReason\",\"privateReasonExported\":false}",
    "Cleanup verified: hr_employee_privacy_test_04c09234aa9a37e5 is absent from sys.databases.",
    "{\"publicParentAndPeriod\":[true,true],\"confidentialParentAndPeriod\":[false,false]}",
    "{\"successAttempts\":3,\"committedAudits\":1,\"exhaustedAttempts\":3,\"exhaustedAudits\":0}",
    "{\"publicInstallment\":true,\"confidentialInstallment\":false,\"foreignInstallment\":false}",
    "{\"attempts\":2,\"status\":404,\"audits\":0,\"scopeReevaluated\":true}",
    "Cleanup verified: hr_employee_privacy_test_c1f13e08c5e60f08 is absent from sys.databases.",
    "{\"requestHidden\":true,\"historyHidden\":true,\"normalizedPrivateTextExported\":true}",
    "{\"requestHidden\":true,\"shortPrivateTextExported\":true}",
    "{\"requestHidden\":true,\"freeTextConditionExported\":true}",
    "Cleanup verified: hr_employee_privacy_test_6dc0c00fe87a45ad is absent from sys.databases.",
    "tests 14",
    "suites 0",
    "pass 14",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 48769.451"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_14cc3017d81d6ef3\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_14cc3017d81d6ef3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_d259e9c4b9df4977\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_d259e9c4b9df4977\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_fed2b67495c1c499\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_fed2b67495c1c499\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_04c09234aa9a37e5\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_04c09234aa9a37e5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_c1f13e08c5e60f08\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_c1f13e08c5e60f08\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_6dc0c00fe87a45ad\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_6dc0c00fe87a45ad\"}\n"
  ]
}

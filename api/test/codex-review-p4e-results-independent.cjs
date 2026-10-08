module.exports = {
  "selected": [
    "codex-review-p4e-export",
    "codex-review-p4e-export-derived",
    "codex-review-p4e-export-locks",
    "codex-review-p4e-closures",
    "codex-review-p4e-export-controls",
    "codex-review-p4e-text-controls",
    "codex-review-p4e-text-race"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 16,
      "failed": 0,
      "passed": 16,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 16,
      "suites": 0
    },
    "duration_ms": 62463.3335
  },
  "results": [
    {
      "file": "codex-review-p4e-export.integration.cjs",
      "name": "P4E-D01: canonical confidential request and requestId-linked rows stay out",
      "ms": 12268.6029,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-export.integration.cjs",
      "name": "P4E-D02: export holds employee scope until final read, so a branch transfer waits",
      "ms": 911.8645,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-export-derived.integration.cjs",
      "name": "P4E-D03: confidential executed request and obligation omitted; public control remains visible",
      "ms": 12672.3919,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-export-locks.integration.cjs",
      "name": "P4E-N01: real export deadlock retries successfully with one committed audit",
      "ms": 15761.6033,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-closures.integration.cjs",
      "name": "P4E-S01: confidential dependent removal copies reason onto an existing unlinked row",
      "ms": 12315.3275,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-closures.integration.cjs",
      "name": "P4E-S02: confidential custody loss copies description onto the old assignment",
      "ms": 263.4743,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-closures.integration.cjs",
      "name": "P4E-S03: confidential archive request copies its reason into the exported employee",
      "ms": 152.8356,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-export-controls.integration.cjs",
      "name": "P4E-P01: current parent request confidentiality hides both offboarding and closed employment period",
      "ms": 11861.2033,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-export-controls.integration.cjs",
      "name": "P4E-R01: rollback after the audit insert leaves exactly one audit; retries bounded to three",
      "ms": 496.2956,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-export-controls.integration.cjs",
      "name": "P4E-P02: public loan installments exported; confidential parent and foreign owner excluded",
      "ms": 238.3635,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-export-controls.integration.cjs",
      "name": "P4E-R02: a branch transfer between rolled-back attempt and retry causes a fresh 404 scope decision",
      "ms": 261.9887,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-text-controls.integration.cjs",
      "name": "P4E-X01: real dependent destination normalizes whitespace and remains redacted after whitespace normalization",
      "ms": 11556.7582,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-text-controls.integration.cjs",
      "name": "P4E-X02: three-letter sensitive narrative is copied by the real destination and redacted",
      "ms": 285.4172,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-text-controls.integration.cjs",
      "name": "P4E-X03: free-text custody condition is not a narrative key; a one-word description is redacted",
      "ms": 222.5365,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-text-race.integration.cjs",
      "name": "P4E-X04a: final secret read follows a concurrent confidential custody effect",
      "ms": 10452.3708,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4e-text-race.integration.cjs",
      "name": "P4E-X04b: request after final secret read cannot change already-read section data",
      "ms": 256.8183,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"confidentialRequestOmitted\":true}",
    "{\"transferWaited\":true,\"exportBranch\":1,\"nextRead\":404}",
    "Cleanup verified: hr_employee_privacy_test_f600d4d357e52d8f is absent from sys.databases.",
    "{\"requestEndpointMasked\":true,\"requestsSectionOmitted\":true,\"obligationOmitted\":true,\"publicControlVisible\":true}",
    "Cleanup verified: hr_employee_privacy_test_37e204e5cc2d39db is absent from sys.databases.",
    "{\"exportStatus\":200,\"requestStatus\":201,\"oppositeLockOrder\":true,\"sqlErrors\":[1205]}",
    "Cleanup verified: hr_employee_privacy_test_bb4e19b14590e384 is absent from sys.databases.",
    "{\"requestHidden\":true,\"historyHidden\":true,\"section\":\"dependents\",\"privateReasonExported\":false,\"creationRequestId\":null}",
    "{\"requestHidden\":true,\"section\":\"custody\",\"privateDescriptionExported\":false,\"creationRequestId\":null}",
    "{\"requestHidden\":true,\"historyHidden\":true,\"section\":\"employee.archiveReason\",\"privateReasonExported\":false}",
    "Cleanup verified: hr_employee_privacy_test_59e5bfc06896bcf5 is absent from sys.databases.",
    "{\"publicParentAndPeriod\":[true,true],\"confidentialParentAndPeriod\":[false,false]}",
    "{\"successAttempts\":3,\"committedAudits\":1,\"exhaustedAttempts\":3,\"exhaustedAudits\":0}",
    "{\"publicInstallment\":true,\"confidentialInstallment\":false,\"foreignInstallment\":false}",
    "{\"attempts\":2,\"status\":404,\"audits\":0,\"scopeReevaluated\":true}",
    "Cleanup verified: hr_employee_privacy_test_22e431b6ed995b86 is absent from sys.databases.",
    "{\"requestHidden\":true,\"historyHidden\":true,\"normalizedPrivateTextExported\":false}",
    "{\"requestHidden\":true,\"shortPrivateTextExported\":false}",
    "{\"requestHidden\":true,\"freeTextConditionExported\":false}",
    "Cleanup verified: hr_employee_privacy_test_253cda7d8fea0475 is absent from sys.databases.",
    "{\"beforeCustody\":true,\"requestCommittedBeforeExportContinued\":true,\"firstExportLeaked\":false,\"nextExportRedacted\":true}",
    "{\"beforeCustody\":false,\"requestCommittedBeforeExportContinued\":true,\"firstExportLeaked\":false,\"nextExportRedacted\":true}",
    "Cleanup verified: hr_employee_privacy_test_635ec8a0fb14724e is absent from sys.databases.",
    "tests 16",
    "suites 0",
    "pass 16",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 62463.3335"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_f600d4d357e52d8f\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_f600d4d357e52d8f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_37e204e5cc2d39db\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_37e204e5cc2d39db\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_bb4e19b14590e384\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_bb4e19b14590e384\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_59e5bfc06896bcf5\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_59e5bfc06896bcf5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_22e431b6ed995b86\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_22e431b6ed995b86\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_253cda7d8fea0475\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_253cda7d8fea0475\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_635ec8a0fb14724e\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_635ec8a0fb14724e\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p4c-export",
    "codex-review-p4c-export-derived",
    "codex-review-p4c-export-locks",
    "codex-review-p4c-updated-sources"
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
    "duration_ms": 26686.7526
  },
  "results": [
    {
      "file": "codex-review-p4c-export.integration.cjs",
      "name": "P4C-D01: canonical confidential request and requestId-linked rows stay out",
      "ms": 9906.6202,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export.integration.cjs",
      "name": "P4C-D02: export holds employee scope until final read, so a branch transfer waits",
      "ms": 860.2251,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-derived.integration.cjs",
      "name": "P4C-D03: confidential executed request and obligation omitted; public control remains visible",
      "ms": 10099.8579,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-export-locks.integration.cjs",
      "name": "P4C-N01: real export deadlock retries successfully with one committed audit",
      "ms": 10898.5496,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-updated-sources.integration.cjs",
      "name": "P4C-S01: confidential dependent removal copies reason onto an existing unlinked row",
      "ms": 9475.9812,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4c-updated-sources.integration.cjs",
      "name": "P4C-S02: confidential custody loss copies description onto the old assignment",
      "ms": 206.3329,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"confidentialRequestOmitted\":true}",
    "{\"transferWaited\":true,\"exportBranch\":1,\"nextRead\":404}",
    "Cleanup verified: hr_employee_privacy_test_4533c98b35edba47 is absent from sys.databases.",
    "{\"requestEndpointMasked\":true,\"requestsSectionOmitted\":true,\"obligationOmitted\":true,\"publicControlVisible\":true}",
    "Cleanup verified: hr_employee_privacy_test_85f617e2fc0a4ef2 is absent from sys.databases.",
    "{\"exportStatus\":200,\"requestStatus\":201,\"oppositeLockOrder\":true,\"sqlErrors\":[1205]}",
    "Cleanup verified: hr_employee_privacy_test_cb100b2b4a6db469 is absent from sys.databases.",
    "{\"requestHidden\":true,\"historyHidden\":true,\"section\":\"dependents\",\"privateReasonExported\":true,\"creationRequestId\":null}",
    "{\"requestHidden\":true,\"section\":\"custody\",\"privateDescriptionExported\":true,\"creationRequestId\":null}",
    "Cleanup verified: hr_employee_privacy_test_c0dac7b8355c3c85 is absent from sys.databases.",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 26686.7526"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_4533c98b35edba47\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_4533c98b35edba47\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_85f617e2fc0a4ef2\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_85f617e2fc0a4ef2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_cb100b2b4a6db469\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_cb100b2b4a6db469\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_c0dac7b8355c3c85\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_c0dac7b8355c3c85\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p4b-tax",
    "codex-review-p4b-tiers-race",
    "codex-review-p4b-export",
    "codex-review-p4b-export-derived",
    "codex-review-p4b-export-locks"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 8,
      "failed": 0,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 39397.3379
  },
  "results": [
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
      "ms": 9275.5585,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation",
      "ms": 2315.9024,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F03: missing source IDs in a legacy snapshot force recalculation",
      "ms": 779.9076,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tiers-race.integration.cjs",
      "name": "P4B-L01: stale employee tier facts survive employee lock and inflate historic row and carry",
      "ms": 10331.8808,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-export.integration.cjs",
      "name": "P4B-D01: canonical confidential request and requestId-linked rows stay out",
      "ms": 10184.3856,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-export.integration.cjs",
      "name": "P4B-D02: export holds employee scope until final read, so a branch transfer waits",
      "ms": 882.1163,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-export-derived.integration.cjs",
      "name": "P4B-D03: confidential executed request remains visible through sourceRequestId obligation label",
      "ms": 9745.3272,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-export-locks.integration.cjs",
      "name": "P4B-N01: employee export and request execution have opposite employee/request locks",
      "ms": 9499.3076,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"activation\":400,\"historicalTax\":false,\"verifiedSuccessorTax\":true}",
    "{\"unfinalizedSource\":409,\"cancelledSource\":409,\"recalculatedTax\":1482.5,\"dependentReopen\":409}",
    "Cleanup verified: hr_payroll_statutory_test_ee75f42dced9b8fb is absent from sys.databases.",
    "{\"currentCountry\":\"SA\",\"staleHistoricEntitlement\":15,\"referenceEntitlement\":15,\"carry\":15,\"referenceCarry\":15}",
    "Cleanup verified: hr_leave_tiers_test_753b837184bba613 is absent from sys.databases.",
    "{\"confidentialRequestOmitted\":true}",
    "{\"transferWaited\":true,\"exportBranch\":1,\"nextRead\":404}",
    "Cleanup verified: hr_employee_privacy_test_43af73d565b45b4a is absent from sys.databases.",
    "{\"requestEndpointMasked\":true,\"requestsSectionOmitted\":true,\"obligationLeaksReason\":true,\"sourceRequestId\":1,\"amount\":321}",
    "Cleanup verified: hr_employee_privacy_test_a85a25bd02e0615c is absent from sys.databases.",
    "{\"exportStatus\":500,\"requestStatus\":201,\"oppositeLockOrder\":true,\"sqlErrors\":[1205]}",
    "Cleanup verified: hr_employee_privacy_test_a9129aba55eb8f32 is absent from sys.databases.",
    "tests 8",
    "suites 0",
    "pass 8",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 39397.3379"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_ee75f42dced9b8fb\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_ee75f42dced9b8fb\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_753b837184bba613\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_753b837184bba613\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_43af73d565b45b4a\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_43af73d565b45b4a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_a85a25bd02e0615c\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_a85a25bd02e0615c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_a9129aba55eb8f32\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_a9129aba55eb8f32\"}\n"
  ]
}

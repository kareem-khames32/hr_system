module.exports = {
  "selected": [
    "codex-review-round12-boundaries",
    "codex-review-round12-money"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 9,
      "failed": 0,
      "passed": 9,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 19037.6096
  },
  "results": [
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 missing foreign executive manager must not disclose its stored name in a submission error",
      "ms": 5189.0447,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 reason catalog must not reveal usage by offboarding cases outside the readers branch",
      "ms": 198.5517,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 cross-branch administration approver needs the request branch in scope; authorization remains intact",
      "ms": 188.2223,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 moving a requester out of scope hides administrationName as well as the other current organization fields",
      "ms": 60.7146,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 custom EOS uses full seven-year benefit and six salary components with literal cent expectations",
      "ms": 6701.672,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 factor edits require recalculation before approval; disabled used reasons and settled money stay stable",
      "ms": 635.4512,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 concurrent revision edits have one winner and deleted codes are not reused",
      "ms": 110.5853,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 open-versus-delete race cannot leave an offboarding case with a removed reason",
      "ms": 68.4774,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 unknown inherited object key must fail closed and preserve previously generated EOS",
      "ms": 127.4192,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 9",
    "suites 0",
    "pass 9",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 19037.6096"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r12boundaries_test_2e5b67b4124a85b8\"}\n",
    "CR12_EVIDENCE {\"case\":\"foreign-administration-error\",\"listHidesName\":true,\"status\":400,\"error\":{\"message\":\"الإدارة «الإدارة التنفيذية» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\",\"error\":\"Bad Request\",\"statusCode\":400},\"containsForeignName\":false}\n",
    "CR12_EVIDENCE {\"case\":\"foreign-case-usage\",\"visibleCases\":0,\"foreignDetail\":404,\"canEdit\":false}\n",
    "CR12_EVIDENCE {\"case\":\"cross-branch-approver\",\"submissionStatus\":\"UNDER_REVIEW\",\"limitedApproverBlocked\":true,\"cardUsesGenericName\":true,\"companyScopeFinalStatus\":\"COMPLETED\"}\n",
    "CR12_EVIDENCE {\"case\":\"transferred-requester-card\",\"orgHidden\":true,\"allOrganizationFieldsNull\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r12boundaries_test_2e5b67b4124a85b8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r12boundaries_test_2e5b67b4124a85b8\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r12money_test_5798606f6cc4f712\"}\n",
    "CR12_EVIDENCE {\"case\":\"manual-seven-year-EOS\",\"gross\":12000.03,\"excludedPressure\":9999,\"months\":4.5,\"full\":54000.13,\"oneThird\":18000.04,\"builtinAndDefaultAmounts\":{\"resignation\":36000.08,\"termination\":54000.13,\"dismissal\":0,\"contract_end\":54000.13,\"retirement\":54000.13,\"death\":54000.13,\"disability\":54000.13,\"force_majeure\":54000.13,\"absence\":0}}\n",
    "CR12_EVIDENCE {\"case\":\"EOS-recalc-approval-freeze\",\"before\":18000.04,\"staleApproval\":409,\"recalculated\":27000.06,\"repeatedEOSCount\":1,\"finalStatus\":\"CLOSED\",\"approvedLinesUnchanged\":true,\"usedReasonDelete\":409}\n",
    "CR12_EVIDENCE {\"case\":\"concurrent-reason-edit\",\"statuses\":[200,409],\"deletedCode\":\"custom_2\",\"newCode\":\"custom_3\"}\n",
    "CR12_EVIDENCE {\"case\":\"open-versus-delete\",\"statuses\":[400,200],\"cases\":0,\"reasonRemains\":false}\n",
    "CR12_EVIDENCE {\"case\":\"unknown-prototype-key\",\"ordinaryUnknown\":409,\"constructorStatus\":409,\"EOSBefore\":54000.13,\"EOSAfter\":[54000.13],\"normalCreateBlocked\":true,\"requiresCorruptStoredCode\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r12money_test_5798606f6cc4f712\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r12money_test_5798606f6cc4f712\"}\n"
  ]
}

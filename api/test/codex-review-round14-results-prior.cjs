module.exports = {
  "selected": [
    "codex-review-round13-boundaries",
    "codex-review-round12-boundaries",
    "codex-review-round12-money"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 11,
      "failed": 0,
      "passed": 11,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 11,
      "suites": 0
    },
    "duration_ms": 26669.888
  },
  "results": [
    {
      "file": "codex-review-round13-boundaries.integration.cjs",
      "name": "CR13 an old proxy draft cannot reveal the new administration after the requester transfers out of scope",
      "ms": 5561.0546,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round13-boundaries.integration.cjs",
      "name": "CR13 usage counts are absent unless both company-wide scope and settings permission are present",
      "ms": 348.2207,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 missing foreign executive manager must not disclose its stored name in a submission error",
      "ms": 5366.8952,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 reason catalog must not reveal usage by offboarding cases outside the readers branch",
      "ms": 205.8948,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 cross-branch administration approver needs the request branch in scope; authorization remains intact",
      "ms": 172.1447,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-boundaries.integration.cjs",
      "name": "CR12 moving a requester out of scope hides administrationName as well as the other current organization fields",
      "ms": 65.5357,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 custom EOS uses full seven-year benefit and six salary components with literal cent expectations",
      "ms": 5887.2885,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 factor edits require recalculation before approval; disabled used reasons and settled money stay stable",
      "ms": 725.025,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 concurrent revision edits have one winner and deleted codes are not reused",
      "ms": 114.7547,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 open-versus-delete race cannot leave an offboarding case with a removed reason",
      "ms": 69.5533,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round12-money.integration.cjs",
      "name": "CR12 unknown inherited object key must fail closed and preserve previously generated EOS",
      "ms": 123.1492,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 11",
    "suites 0",
    "pass 11",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 26669.888"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r13boundaries_test_18135f2b30e74007\"}\n",
    "CR13_EVIDENCE {\"case\":\"proxy-draft-after-transfer\",\"createdInBranch\":1,\"currentEmployeeBranch\":2,\"proxyBranch\":1,\"transferViaApi\":true,\"detailOrgHidden\":true,\"status\":400,\"error\":{\"message\":\"الإدارة «إدارة في فرع تاني» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\",\"error\":\"Bad Request\",\"statusCode\":400},\"containsForeignName\":false}\n",
    "CR13_EVIDENCE {\"case\":\"usage-permission-matrix\",\"matrix\":[{\"label\":\"branch settings\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"all enumerated branches settings\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"company offboarding reader\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"empty scope settings\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"company settings editor\",\"canEdit\":true,\"usagePresent\":true,\"usage\":2,\"deleteUsedReason\":409}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r13boundaries_test_18135f2b30e74007\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r13boundaries_test_18135f2b30e74007\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r12boundaries_test_e0001161b3b71ecc\"}\n",
    "CR12_EVIDENCE {\"case\":\"foreign-administration-error\",\"listHidesName\":true,\"status\":400,\"error\":{\"message\":\"الإدارة «الإدارة التنفيذية» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\",\"error\":\"Bad Request\",\"statusCode\":400},\"containsForeignName\":false}\n",
    "CR12_EVIDENCE {\"case\":\"foreign-case-usage\",\"visibleCases\":0,\"foreignDetail\":404,\"canEdit\":false}\n",
    "CR12_EVIDENCE {\"case\":\"cross-branch-approver\",\"submissionStatus\":\"UNDER_REVIEW\",\"limitedApproverBlocked\":true,\"cardUsesGenericName\":true,\"companyScopeFinalStatus\":\"COMPLETED\"}\n",
    "CR12_EVIDENCE {\"case\":\"transferred-requester-card\",\"orgHidden\":true,\"allOrganizationFieldsNull\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r12boundaries_test_e0001161b3b71ecc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r12boundaries_test_e0001161b3b71ecc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r12money_test_e54b32574a2d0d57\"}\n",
    "CR12_EVIDENCE {\"case\":\"manual-seven-year-EOS\",\"gross\":12000.03,\"excludedPressure\":9999,\"months\":4.5,\"full\":54000.13,\"oneThird\":18000.04,\"builtinAndDefaultAmounts\":{\"resignation\":36000.08,\"termination\":54000.13,\"dismissal\":0,\"contract_end\":54000.13,\"retirement\":54000.13,\"death\":54000.13,\"disability\":54000.13,\"force_majeure\":54000.13,\"absence\":0}}\n",
    "CR12_EVIDENCE {\"case\":\"EOS-recalc-approval-freeze\",\"before\":18000.04,\"staleApproval\":409,\"recalculated\":27000.06,\"repeatedEOSCount\":1,\"finalStatus\":\"CLOSED\",\"approvedLinesUnchanged\":true,\"usedReasonDelete\":409}\n",
    "CR12_EVIDENCE {\"case\":\"concurrent-reason-edit\",\"statuses\":[200,409],\"deletedCode\":\"custom_2\",\"newCode\":\"custom_3\"}\n",
    "CR12_EVIDENCE {\"case\":\"open-versus-delete\",\"statuses\":[400,200],\"cases\":0,\"reasonRemains\":false}\n",
    "CR12_EVIDENCE {\"case\":\"unknown-prototype-key\",\"ordinaryUnknown\":409,\"constructorStatus\":409,\"EOSBefore\":54000.13,\"EOSAfter\":[54000.13],\"normalCreateBlocked\":true,\"requiresCorruptStoredCode\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r12money_test_e54b32574a2d0d57\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r12money_test_e54b32574a2d0d57\"}\n"
  ]
}

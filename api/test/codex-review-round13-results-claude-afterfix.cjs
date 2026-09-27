module.exports = {
  "selected": [
    "codex-review-round13-boundaries"
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
    "duration_ms": 8593.8311
  },
  "results": [
    {
      "file": "codex-review-round13-boundaries.integration.cjs",
      "name": "CR13 an old proxy draft cannot reveal the new administration after the requester transfers out of scope",
      "ms": 5652.4001,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round13-boundaries.integration.cjs",
      "name": "CR13 usage counts are absent unless both company-wide scope and settings permission are present",
      "ms": 398.1669,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8593.8311"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r13boundaries_test_3da1e62f1fcf317e\"}\n",
    "CR13_EVIDENCE {\"case\":\"proxy-draft-after-transfer\",\"createdInBranch\":1,\"currentEmployeeBranch\":2,\"proxyBranch\":1,\"transferViaApi\":true,\"detailOrgHidden\":true,\"status\":400,\"error\":{\"message\":\"الإدارة «إدارة في فرع تاني» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\",\"error\":\"Bad Request\",\"statusCode\":400},\"containsForeignName\":false}\n",
    "CR13_EVIDENCE {\"case\":\"usage-permission-matrix\",\"matrix\":[{\"label\":\"branch settings\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"all enumerated branches settings\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"company offboarding reader\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"empty scope settings\",\"canEdit\":false,\"usagePresent\":false},{\"label\":\"company settings editor\",\"canEdit\":true,\"usagePresent\":true,\"usage\":2,\"deleteUsedReason\":409}]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r13boundaries_test_3da1e62f1fcf317e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r13boundaries_test_3da1e62f1fcf317e\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round6-requests"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 7006.3165
  },
  "results": [
    {
      "file": "codex-review-round6-requests.integration.cjs",
      "name": "CR6 inbox scope matrix hides only current foreign organization and retains all pending requests",
      "ms": 4424.0062,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-requests.integration.cjs",
      "name": "CR6 all request reading routes keep transferred organization hidden from historical parties",
      "ms": 246.3384,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-requests.integration.cjs",
      "name": "CR6 concealment preserves approve reject return and exactly one financial effect after transfer",
      "ms": 198.9182,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"inboxScopeMatrix\":[{\"label\":\"legacy A\",\"rows\":6,\"currentTitleVisible\":false},{\"label\":\"A+B\",\"rows\":6,\"currentTitleVisible\":false},{\"label\":\"A+C\",\"rows\":6,\"currentTitleVisible\":true},{\"label\":\"all branches\",\"rows\":6,\"currentTitleVisible\":true},{\"label\":\"super admin\",\"rows\":6,\"currentTitleVisible\":true},{\"label\":\"C only\",\"rows\":0},{\"label\":\"empty scope\",\"rows\":0},{\"label\":\"viewer without approval\",\"rows\":0}],\"transferViaApi\":true}",
    "{\"requestListChecks\":12,\"historicalRequests\":6,\"reportTotal\":6,\"foreignDirectoryHidden\":true,\"confidentialNonPartyMasked\":true,\"ownOrganizationVisible\":true}",
    "{\"decisions\":[{\"action\":\"APPROVE\",\"status\":\"COMPLETED\",\"decisionRows\":1},{\"action\":\"REJECT\",\"status\":\"REJECTED\",\"decisionRows\":1},{\"action\":\"RETURN\",\"status\":\"RETURNED_FOR_INFO\",\"decisionRows\":1}],\"financialExpected\":123.45,\"financialActual\":123.45,\"financialRows\":1,\"retryStatuses\":[400,400],\"pendingRemaining\":2,\"decisionHistory\":4}",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7006.3165"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r6requests_test_1afb4c9edb425e50\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r6requests_test_1afb4c9edb425e50\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r6requests_test_1afb4c9edb425e50\"}\n"
  ]
}

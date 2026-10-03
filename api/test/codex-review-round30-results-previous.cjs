module.exports = {
  "selected": [
    "codex-review-round29-obligations",
    "codex-review-round29-independent",
    "codex-review-round6-requests"
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
    "duration_ms": 27852.8196
  },
  "results": [
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation create: current-branch financial permission must survive a real transfer before the write",
      "ms": 5680.8814,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation cancel: current-branch financial permission must survive a real transfer before the write",
      "ms": 263.3544,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation controls: allowed create/cancel and explicit foreign-branch refusal",
      "ms": 139.0018,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 5599.8592,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 233.5989,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 208.0151,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 229.9733,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 453.1696,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 238.9169,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 224.9343,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 252.9629,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 early loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 554.4594,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 defer loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 364.0934,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-requests.integration.cjs",
      "name": "CR6 inbox scope matrix hides only current foreign organization and retains all pending requests",
      "ms": 4863.4097,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-requests.integration.cjs",
      "name": "CR6 all request reading routes keep transferred organization hidden from historical parties",
      "ms": 269.3371,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-requests.integration.cjs",
      "name": "CR6 concealment preserves approve reject return and exactly one financial effect after transfer",
      "ms": 217.0091,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"obligation-transfer-race\",\"action\":\"create\",\"realTransferStatus\":200,\"transferCommittedFirst\":true,\"oldBranchWriteStatus\":403,\"oldBranchReply\":{\"message\":\"الموظف خارج نطاق فرعك — لا يمكنك إدارة مديونياته\",\"error\":\"Forbidden\",\"statusCode\":403},\"newBranchBefore\":[],\"newBranchAfter\":[],\"ordinaryPostTransferDenied\":403}",
    "{\"case\":\"obligation-transfer-race\",\"action\":\"cancel\",\"realTransferStatus\":200,\"transferCommittedFirst\":true,\"oldBranchWriteStatus\":403,\"oldBranchReply\":{\"message\":\"الموظف خارج نطاق فرعك — لا يمكنك إدارة مديونياته\",\"error\":\"Forbidden\",\"statusCode\":403},\"newBranchBefore\":[{\"id\":1,\"status\":\"PENDING\",\"amount\":321.09}],\"newBranchAfter\":[{\"id\":1,\"status\":\"PENDING\",\"amount\":321.09}],\"ordinaryPostTransferDenied\":403}",
    "{\"case\":\"obligation-controls\",\"create\":201,\"foreignCreate\":403,\"foreignCancel\":403,\"authorizedCancel\":201}",
    "{\"case\":\"instant-manual-equality\",\"kind\":\"bonus\",\"amount\":123.45,\"eachObligations\":1,\"replay\":409,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"bonus\",\"action\":\"approve\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"bonus\",\"action\":\"reject\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"bonus\",\"action\":\"cancel\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"instant-manual-equality\",\"kind\":\"deduction\",\"amount\":123.45,\"eachObligations\":1,\"replay\":409,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"deduction\",\"action\":\"approve\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"deduction\",\"action\":\"reject\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"response-atomicity\",\"kind\":\"deduction\",\"action\":\"cancel\",\"exclusiveEmployeeLock\":true,\"failureRolledBack\":true,\"retry\":201,\"responseEqualsDetail\":true}",
    "{\"case\":\"loan-request-branch-recheck\",\"kind\":\"early\",\"transfer\":200,\"oldApproval\":403,\"rollbackComplete\":true,\"newBranchApproval\":201,\"replayNoEffect\":true,\"amount\":123.45}",
    "{\"case\":\"loan-request-branch-recheck\",\"kind\":\"defer\",\"transfer\":200,\"oldApproval\":403,\"rollbackComplete\":true,\"newBranchApproval\":201,\"replayNoEffect\":true,\"amount\":900}",
    "{\"inboxScopeMatrix\":[{\"label\":\"legacy A\",\"rows\":6,\"currentTitleVisible\":false},{\"label\":\"A+B\",\"rows\":6,\"currentTitleVisible\":false},{\"label\":\"A+C\",\"rows\":6,\"currentTitleVisible\":true},{\"label\":\"all branches\",\"rows\":6,\"currentTitleVisible\":true},{\"label\":\"super admin\",\"rows\":6,\"currentTitleVisible\":true},{\"label\":\"C only\",\"rows\":0},{\"label\":\"empty scope\",\"rows\":0},{\"label\":\"viewer without approval\",\"rows\":0}],\"transferViaApi\":true}",
    "{\"requestListChecks\":12,\"historicalRequests\":6,\"reportTotal\":6,\"foreignDirectoryHidden\":true,\"confidentialNonPartyMasked\":true,\"ownOrganizationVisible\":true}",
    "{\"decisions\":[{\"action\":\"APPROVE\",\"status\":\"COMPLETED\",\"decisionRows\":1},{\"action\":\"REJECT\",\"status\":\"REJECTED\",\"decisionRows\":1},{\"action\":\"RETURN\",\"status\":\"RETURNED_FOR_INFO\",\"decisionRows\":1}],\"financialExpected\":123.45,\"financialActual\":123.45,\"financialRows\":1,\"retryStatuses\":[400,400],\"pendingRemaining\":2,\"decisionHistory\":4}",
    "tests 16",
    "suites 0",
    "pass 16",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 27852.8196"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r29_obligations_test_3663e47b3c21ad96\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r29_obligations_test_3663e47b3c21ad96\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r29_obligations_test_3663e47b3c21ad96\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r29_independent_test_a2a67dbe14f0025f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r29_independent_test_a2a67dbe14f0025f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r29_independent_test_a2a67dbe14f0025f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r6requests_test_99d140bde00917e6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r6requests_test_99d140bde00917e6\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r6requests_test_99d140bde00917e6\"}\n"
  ]
}

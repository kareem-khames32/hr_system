module.exports = {
  "selected": [
    "codex-review-round31-holiday-scope",
    "codex-review-round30-independent",
    "codex-review-round29-obligations",
    "codex-review-round29-independent"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 24,
      "failed": 0,
      "passed": 24,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 24,
      "suites": 0
    },
    "duration_ms": 39565.6155
  },
  "results": [
    {
      "file": "codex-review-round31-holiday-scope.integration.cjs",
      "name": "CR31 holiday update: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 7115.2577,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-holiday-scope.integration.cjs",
      "name": "CR31 holiday cancel: old branch must not overwrite or cancel an order reassigned to another branch",
      "ms": 1355.5683,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round31-holiday-scope.integration.cjs",
      "name": "CR31 holiday scope controls: ordinary foreign write is refused; authorized branch still updates and cancels",
      "ms": 182.4339,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation create holds employee lock until save, transfer waits",
      "ms": 5163.6877,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 direct obligation cancel holds employee lock until save, transfer waits",
      "ms": 436.7533,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 cancellation rereads APPLIED after a real payroll is paid during its early scope check",
      "ms": 2051.9162,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 employees allowance targets are reread after actual transfer; named group is atomic",
      "ms": 266.8678,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 teams allowance targets are reread after actual transfer; named group is atomic",
      "ms": 393.0498,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 waiver named target rejects real transfer without any partial save",
      "ms": 144.8939,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-create named target rejects real transfer without any partial save",
      "ms": 149.8851,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round30-independent.integration.cjs",
      "name": "CR30 holiday-update named target rejects real transfer without any partial save",
      "ms": 246.7544,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation create: current-branch financial permission must survive a real transfer before the write",
      "ms": 4126.4295,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation cancel: current-branch financial permission must survive a real transfer before the write",
      "ms": 194.3467,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation controls: allowed create/cancel and explicit foreign-branch refusal",
      "ms": 109.0204,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 4813.7177,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 277.7145,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 259.8734,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 bonus cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 281.0514,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction: immediate HR and separate approval give exactly one 123.45 obligation",
      "ms": 384.2626,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction approve: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 210.9578,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction reject: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 272.833,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 deduction cancel: response under finance lock, response failure rolls back, retry returns stored detail",
      "ms": 291.6705,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 early loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 544.0006,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round29-independent.integration.cjs",
      "name": "CR29 defer loan request: transfer before final approval cannot execute; fresh branch request executes once",
      "ms": 377.3756,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"holiday-order-branch-race\",\"action\":\"update\",\"companyChange\":200,\"oldBranchReadAfterChange\":404,\"oldMutationStatus\":404,\"before\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"after\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"creditBefore\":{\"status\":\"PENDING\",\"amount\":300},\"creditAfter\":{\"status\":\"PENDING\",\"amount\":300}}",
    "{\"case\":\"holiday-order-branch-race\",\"action\":\"cancel\",\"companyChange\":200,\"oldBranchReadAfterChange\":404,\"oldMutationStatus\":404,\"before\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"after\":{\"branchId\":2,\"status\":\"ACTIVE\"},\"creditBefore\":{\"status\":\"PENDING\",\"amount\":300},\"creditAfter\":{\"status\":\"PENDING\",\"amount\":300}}",
    "{\"case\":\"holiday-order-controls\",\"foreignUpdate\":404,\"foreignCancel\":404,\"authorizedUpdate\":200,\"authorizedCancel\":201}",
    "{\"case\":\"financial-write-first\",\"action\":\"create\",\"exclusiveLock\":true,\"write\":201,\"transfer\":200,\"afterTransfer\":403,\"amount\":321.09}",
    "{\"case\":\"financial-write-first\",\"action\":\"cancel\",\"exclusiveLock\":true,\"write\":201,\"transfer\":200,\"afterTransfer\":403,\"amount\":321.09}",
    "{\"case\":\"paid-state-recheck\",\"cancelStatus\":400,\"ledger\":\"APPLIED\",\"net\":9321.09,\"expected\":9321.09}",
    "{\"case\":\"allowance-target-recheck\",\"level\":\"employees\",\"transfer\":200,\"status\":400,\"employees\":[],\"remainingExpected\":0,\"total\":0}",
    "{\"case\":\"allowance-target-recheck\",\"level\":\"teams\",\"transfer\":200,\"status\":201,\"employees\":[7],\"remainingExpected\":1,\"total\":150.25}",
    "{\"case\":\"named-target-recheck\",\"kind\":\"waiver\",\"transfer\":200,\"status\":400,\"noPartialSave\":true}",
    "{\"case\":\"named-target-recheck\",\"kind\":\"holiday-create\",\"transfer\":200,\"status\":400,\"noPartialSave\":true}",
    "{\"case\":\"named-target-recheck\",\"kind\":\"holiday-update\",\"transfer\":200,\"status\":400,\"noPartialSave\":true}",
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
    "tests 24",
    "suites 0",
    "pass 24",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 39565.6155"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r31_holiday_scope_test_032a38878d8842b9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r31_holiday_scope_test_032a38878d8842b9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r31_holiday_scope_test_032a38878d8842b9\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r30_independent_test_59bbfda7ecffbb63\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r30_independent_test_59bbfda7ecffbb63\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r30_independent_test_59bbfda7ecffbb63\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r29_obligations_test_3627a94a5762e96a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r29_obligations_test_3627a94a5762e96a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r29_obligations_test_3627a94a5762e96a\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r29_independent_test_cb23b81990a20bfd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r29_independent_test_cb23b81990a20bfd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r29_independent_test_cb23b81990a20bfd\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round24-mutations"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 9774.7814
  },
  "results": [
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 membership mutation responses cannot bypass the run read permission",
      "ms": 7156.0184,
      "pass": false,
      "error": "Membership operations must use the same limited run response as calculation\n+ actual - expected\n\n  [\n+   'actors',\n+   'approvalGuard',\n+   'approvedAt',\n+   'approvedBy',\n    'branchId',\n+   'calculatedAt',\n+   'calculatedBy',\n+   'collection',\n+   'conflicts',\n+   'correction',\n    'correctionReason',\n+   'createdAt',\n+   'definition',\n+   'employeeIds',\n    'endDate',\n+   'engine',\n+   'engineMode',\n    'id',\n+   'items',\n+   'members',\n    'name',\n    'paidAt',\n+   'paidBy',\n    'parentRunId',\n+   'parityExcludedAt',\n+   'parityExcludedBy',\n+   'parityExcludedReason',\n    'payChannel',\n+   'payRecord',\n    'payReference',\n+   'pendingOvertime',\n    'period',\n+   'periodContinuity',\n+   'policyId',\n+   'policySnapshotHash',\n+   'policyVersion',\n+   'policyVersionId',\n    'runType',\n+   'scopeIds',\n+   'scopeType',\n+   'selection',\n+   'snapshotVersion',\n    'startDate',\n    'status',\n+   'totalNet'\n  ]\n",
      "cause": "Membership operations must use the same limited run response as calculation\n+ actual - expected\n\n  [\n+   'actors',\n+   'approvalGuard',\n+   'approvedAt',\n+   'approvedBy',\n    'branchId',\n+   'calculatedAt',\n+   'calculatedBy',\n+   'collection',\n+   'conflicts',\n+   'correction',\n    'correctionReason',\n+   'createdAt',\n+   'definition',\n+   'employeeIds',\n    'endDate',\n+   'engine',\n+   'engineMode',\n    'id',\n+   'items',\n+   'members',\n    'name',\n    'paidAt',\n+   'paidBy',\n    'parentRunId',\n+   'parityExcludedAt',\n+   'parityExcludedBy',\n+   'parityExcludedReason',\n    'payChannel',\n+   'payRecord',\n    'payReference',\n+   'pendingOvertime',\n    'period',\n+   'periodContinuity',\n+   'policyId',\n+   'policySnapshotHash',\n+   'policyVersion',\n+   'policyVersionId',\n    'runType',\n+   'scopeIds',\n+   'scopeType',\n+   'selection',\n+   'snapshotVersion',\n    'startDate',\n    'status',\n+   'totalNet'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Membership operations must use the same limited run response as calculation\n+ actual - expected\n\n  [\n+   'actors',\n+   'approvalGuard',\n+   'approvedAt',\n+   'approvedBy',\n    'branchId',\n+   'calculatedAt',\n+   'calculatedBy',\n+   'collection',\n+   'conflicts',\n+   'correction',\n    'correctionReason',\n+   'createdAt',\n+   'definition',\n+   'employeeIds',\n    'endDate',\n+   'engine',\n+   'engineMode',\n    'id',\n+   'items',\n+   'members',\n    'name',\n    'paidAt',\n+   'paidBy',\n    'parentRunId',\n+   'parityExcludedAt',\n+   'parityExcludedBy',\n+   'parityExcludedReason',\n    'payChannel',\n+   'payRecord',\n    'payReference',\n+   'pendingOvertime',\n    'period',\n+   'periodContinuity',\n+   'policyId',\n+   'policySnapshotHash',\n+   'policyVersion',\n+   'policyVersionId',\n    'runType',\n+   'scopeIds',\n+   'scopeType',\n+   'selection',\n+   'snapshotVersion',\n    'startDate',\n    'status',\n+   'totalNet'\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round24-mutations.integration.cjs:126:38)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 membership mutation responses cannot bypass the run read permission",
      "ms": 7156.0184,
      "pass": false,
      "error": "Membership operations must use the same limited run response as calculation\n+ actual - expected\n\n  [\n+   'actors',\n+   'approvalGuard',\n+   'approvedAt',\n+   'approvedBy',\n    'branchId',\n+   'calculatedAt',\n+   'calculatedBy',\n+   'collection',\n+   'conflicts',\n+   'correction',\n    'correctionReason',\n+   'createdAt',\n+   'definition',\n+   'employeeIds',\n    'endDate',\n+   'engine',\n+   'engineMode',\n    'id',\n+   'items',\n+   'members',\n    'name',\n    'paidAt',\n+   'paidBy',\n    'parentRunId',\n+   'parityExcludedAt',\n+   'parityExcludedBy',\n+   'parityExcludedReason',\n    'payChannel',\n+   'payRecord',\n    'payReference',\n+   'pendingOvertime',\n    'period',\n+   'periodContinuity',\n+   'policyId',\n+   'policySnapshotHash',\n+   'policyVersion',\n+   'policyVersionId',\n    'runType',\n+   'scopeIds',\n+   'scopeType',\n+   'selection',\n+   'snapshotVersion',\n    'startDate',\n    'status',\n+   'totalNet'\n  ]\n",
      "cause": "Membership operations must use the same limited run response as calculation\n+ actual - expected\n\n  [\n+   'actors',\n+   'approvalGuard',\n+   'approvedAt',\n+   'approvedBy',\n    'branchId',\n+   'calculatedAt',\n+   'calculatedBy',\n+   'collection',\n+   'conflicts',\n+   'correction',\n    'correctionReason',\n+   'createdAt',\n+   'definition',\n+   'employeeIds',\n    'endDate',\n+   'engine',\n+   'engineMode',\n    'id',\n+   'items',\n+   'members',\n    'name',\n    'paidAt',\n+   'paidBy',\n    'parentRunId',\n+   'parityExcludedAt',\n+   'parityExcludedBy',\n+   'parityExcludedReason',\n    'payChannel',\n+   'payRecord',\n    'payReference',\n+   'pendingOvertime',\n    'period',\n+   'periodContinuity',\n+   'policyId',\n+   'policySnapshotHash',\n+   'policyVersion',\n+   'policyVersionId',\n    'runType',\n+   'scopeIds',\n+   'scopeType',\n+   'selection',\n+   'snapshotVersion',\n    'startDate',\n    'status',\n+   'totalNet'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Membership operations must use the same limited run response as calculation\n+ actual - expected\n\n  [\n+   'actors',\n+   'approvalGuard',\n+   'approvedAt',\n+   'approvedBy',\n    'branchId',\n+   'calculatedAt',\n+   'calculatedBy',\n+   'collection',\n+   'conflicts',\n+   'correction',\n    'correctionReason',\n+   'createdAt',\n+   'definition',\n+   'employeeIds',\n    'endDate',\n+   'engine',\n+   'engineMode',\n    'id',\n+   'items',\n+   'members',\n    'name',\n    'paidAt',\n+   'paidBy',\n    'parentRunId',\n+   'parityExcludedAt',\n+   'parityExcludedBy',\n+   'parityExcludedReason',\n    'payChannel',\n+   'payRecord',\n    'payReference',\n+   'pendingOvertime',\n    'period',\n+   'periodContinuity',\n+   'policyId',\n+   'policySnapshotHash',\n+   'policyVersion',\n+   'policyVersionId',\n    'runType',\n+   'scopeIds',\n+   'scopeType',\n+   'selection',\n+   'snapshotVersion',\n    'startDate',\n    'status',\n+   'totalNet'\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round24-mutations.integration.cjs:126:38)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"membership-mutation-run-leak\",\"permissions\":[\"payroll.calculate\"],\"getStatus\":403,\"bulkDidNotChangeMembership\":true,\"bulk\":{\"kind\":\"bulk\",\"status\":201,\"runKeys\":[\"id\",\"name\",\"scopeType\",\"scopeIds\",\"employeeIds\",\"branchId\",\"policyId\",\"policyVersionId\",\"definition\",\"period\",\"startDate\",\"endDate\",\"status\",\"totalNet\",\"approvedBy\",\"approvedAt\",\"paidAt\",\"paidBy\",\"payChannel\",\"payReference\",\"calculatedBy\",\"calculatedAt\",\"parityExcludedReason\",\"parityExcludedBy\",\"parityExcludedAt\",\"createdAt\",\"snapshotVersion\",\"policySnapshotHash\",\"engineMode\",\"runType\",\"parentRunId\",\"correctionReason\",\"items\",\"members\",\"conflicts\",\"pendingOvertime\",\"periodContinuity\",\"selection\",\"policyVersion\",\"engine\",\"actors\",\"approvalGuard\",\"payRecord\",\"collection\",\"correction\"],\"items\":[{\"employeeId\":1,\"netPay\":6000},{\"employeeId\":2,\"netPay\":17341.37}],\"members\":[{\"employeeId\":1,\"name\":\"موظف راتبه محجوب 1\"},{\"employeeId\":2,\"name\":\"موظف راتبه محجوب 2\"}],\"hasEngine\":true},\"single\":{\"kind\":\"single\",\"status\":201,\"runKeys\":[\"id\",\"name\",\"scopeType\",\"scopeIds\",\"employeeIds\",\"branchId\",\"policyId\",\"policyVersionId\",\"definition\",\"period\",\"startDate\",\"endDate\",\"status\",\"totalNet\",\"approvedBy\",\"approvedAt\",\"paidAt\",\"paidBy\",\"payChannel\",\"payReference\",\"calculatedBy\",\"calculatedAt\",\"parityExcludedReason\",\"parityExcludedBy\",\"parityExcludedAt\",\"createdAt\",\"snapshotVersion\",\"policySnapshotHash\",\"engineMode\",\"runType\",\"parentRunId\",\"correctionReason\",\"items\",\"members\",\"conflicts\",\"pendingOvertime\",\"periodContinuity\",\"selection\",\"policyVersion\",\"engine\",\"actors\",\"approvalGuard\",\"payRecord\",\"collection\",\"correction\"],\"items\":[{\"employeeId\":1,\"netPay\":6000},{\"employeeId\":2,\"netPay\":17341.37},{\"employeeId\":3,\"netPay\":8123.45}],\"members\":[{\"employeeId\":1,\"name\":\"موظف راتبه محجوب 1\"},{\"employeeId\":2,\"name\":\"موظف راتبه محجوب 2\"},{\"employeeId\":3,\"name\":\"موظف راتبه محجوب 3\"}],\"hasEngine\":true},\"storedTotal\":31464.82,\"authorizedViewerContractMatched\":true}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9774.7814"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_mutations_test_cfee69ab889dd015\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_mutations_test_cfee69ab889dd015\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r24_mutations_test_cfee69ab889dd015\"}\n"
  ]
}

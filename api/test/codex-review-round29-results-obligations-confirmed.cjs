module.exports = {
  "selected": [
    "codex-review-round29-obligations"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 2,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 6406.578
  },
  "results": [
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation create: current-branch financial permission must survive a real transfer before the write",
      "ms": 3900.4286,
      "pass": false,
      "error": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n\n+ [\n+   {\n+     amount: 321.09,\n+     appliedAmount: null,\n+     appliedAt: null,\n+     appliedPayrollRunId: null,\n+     bonusRequestId: null,\n+     carriedFromObligationId: null,\n+     category: 'manual',\n+     createdAt: '2026-10-02T22:33:27.396Z',\n+     createdByUserId: 3,\n+     deductionRequestId: null,\n+     effectiveDate: null,\n+     employeeId: 1,\n+     financialExemptionId: null,\n+     id: 1,\n+     label: 'مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات',\n+     payrollReversalOfObligationId: null,\n+     payrollReversalRunId: null,\n+     reservedAt: null,\n+     reservedPayrollRunId: null,\n+     sourceRef: null,\n+     sourceRequestId: null,\n+     status: 'PENDING',\n+     targetPeriod: null,\n+     type: 'CREDIT'\n+   }\n+ ]\n- []\n",
      "cause": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n\n+ [\n+   {\n+     amount: 321.09,\n+     appliedAmount: null,\n+     appliedAt: null,\n+     appliedPayrollRunId: null,\n+     bonusRequestId: null,\n+     carriedFromObligationId: null,\n+     category: 'manual',\n+     createdAt: '2026-10-02T22:33:27.396Z',\n+     createdByUserId: 3,\n+     deductionRequestId: null,\n+     effectiveDate: null,\n+     employeeId: 1,\n+     financialExemptionId: null,\n+     id: 1,\n+     label: 'مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات',\n+     payrollReversalOfObligationId: null,\n+     payrollReversalRunId: null,\n+     reservedAt: null,\n+     reservedPayrollRunId: null,\n+     sourceRef: null,\n+     sourceRequestId: null,\n+     status: 'PENDING',\n+     targetPeriod: null,\n+     type: 'CREDIT'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n\n+ [\n+   {\n+     amount: 321.09,\n+     appliedAmount: null,\n+     appliedAt: null,\n+     appliedPayrollRunId: null,\n+     bonusRequestId: null,\n+     carriedFromObligationId: null,\n+     category: 'manual',\n+     createdAt: '2026-10-02T22:33:27.396Z',\n+     createdByUserId: 3,\n+     deductionRequestId: null,\n+     effectiveDate: null,\n+     employeeId: 1,\n+     financialExemptionId: null,\n+     id: 1,\n+     label: 'مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات',\n+     payrollReversalOfObligationId: null,\n+     payrollReversalRunId: null,\n+     reservedAt: null,\n+     reservedPayrollRunId: null,\n+     sourceRef: null,\n+     sourceRequestId: null,\n+     status: 'PENDING',\n+     targetPeriod: null,\n+     type: 'CREDIT'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-obligations.integration.cjs:38:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation cancel: current-branch financial permission must survive a real transfer before the write",
      "ms": 166.5479,
      "pass": false,
      "error": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n... Skipped lines\n\n  [\n    {\n      amount: 321.09,\n      appliedAmount: null,\n      appliedAt: null,\n...\n      sourceRequestId: null,\n+     status: 'CANCELLED',\n-     status: 'PENDING',\n      targetPeriod: null,\n      type: 'CREDIT'\n    }\n  ]\n",
      "cause": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n... Skipped lines\n\n  [\n    {\n      amount: 321.09,\n      appliedAmount: null,\n      appliedAt: null,\n...\n      sourceRequestId: null,\n+     status: 'CANCELLED',\n-     status: 'PENDING',\n      targetPeriod: null,\n      type: 'CREDIT'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n... Skipped lines\n\n  [\n    {\n      amount: 321.09,\n      appliedAmount: null,\n      appliedAt: null,\n...\n      sourceRequestId: null,\n+     status: 'CANCELLED',\n-     status: 'PENDING',\n      targetPeriod: null,\n      type: 'CREDIT'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-obligations.integration.cjs:38:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation controls: allowed create/cancel and explicit foreign-branch refusal",
      "ms": 96.2011,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation create: current-branch financial permission must survive a real transfer before the write",
      "ms": 3900.4286,
      "pass": false,
      "error": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n\n+ [\n+   {\n+     amount: 321.09,\n+     appliedAmount: null,\n+     appliedAt: null,\n+     appliedPayrollRunId: null,\n+     bonusRequestId: null,\n+     carriedFromObligationId: null,\n+     category: 'manual',\n+     createdAt: '2026-10-02T22:33:27.396Z',\n+     createdByUserId: 3,\n+     deductionRequestId: null,\n+     effectiveDate: null,\n+     employeeId: 1,\n+     financialExemptionId: null,\n+     id: 1,\n+     label: 'مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات',\n+     payrollReversalOfObligationId: null,\n+     payrollReversalRunId: null,\n+     reservedAt: null,\n+     reservedPayrollRunId: null,\n+     sourceRef: null,\n+     sourceRequestId: null,\n+     status: 'PENDING',\n+     targetPeriod: null,\n+     type: 'CREDIT'\n+   }\n+ ]\n- []\n",
      "cause": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n\n+ [\n+   {\n+     amount: 321.09,\n+     appliedAmount: null,\n+     appliedAt: null,\n+     appliedPayrollRunId: null,\n+     bonusRequestId: null,\n+     carriedFromObligationId: null,\n+     category: 'manual',\n+     createdAt: '2026-10-02T22:33:27.396Z',\n+     createdByUserId: 3,\n+     deductionRequestId: null,\n+     effectiveDate: null,\n+     employeeId: 1,\n+     financialExemptionId: null,\n+     id: 1,\n+     label: 'مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات',\n+     payrollReversalOfObligationId: null,\n+     payrollReversalRunId: null,\n+     reservedAt: null,\n+     reservedPayrollRunId: null,\n+     sourceRef: null,\n+     sourceRequestId: null,\n+     status: 'PENDING',\n+     targetPeriod: null,\n+     type: 'CREDIT'\n+   }\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n\n+ [\n+   {\n+     amount: 321.09,\n+     appliedAmount: null,\n+     appliedAt: null,\n+     appliedPayrollRunId: null,\n+     bonusRequestId: null,\n+     carriedFromObligationId: null,\n+     category: 'manual',\n+     createdAt: '2026-10-02T22:33:27.396Z',\n+     createdByUserId: 3,\n+     deductionRequestId: null,\n+     effectiveDate: null,\n+     employeeId: 1,\n+     financialExemptionId: null,\n+     id: 1,\n+     label: 'مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات',\n+     payrollReversalOfObligationId: null,\n+     payrollReversalRunId: null,\n+     reservedAt: null,\n+     reservedPayrollRunId: null,\n+     sourceRef: null,\n+     sourceRequestId: null,\n+     status: 'PENDING',\n+     targetPeriod: null,\n+     type: 'CREDIT'\n+   }\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-obligations.integration.cjs:38:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round29-obligations.integration.cjs",
      "name": "CR29 obligation cancel: current-branch financial permission must survive a real transfer before the write",
      "ms": 166.5479,
      "pass": false,
      "error": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n... Skipped lines\n\n  [\n    {\n      amount: 321.09,\n      appliedAmount: null,\n      appliedAt: null,\n...\n      sourceRequestId: null,\n+     status: 'CANCELLED',\n-     status: 'PENDING',\n      targetPeriod: null,\n      type: 'CREDIT'\n    }\n  ]\n",
      "cause": "Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n... Skipped lines\n\n  [\n    {\n      amount: 321.09,\n      appliedAmount: null,\n      appliedAt: null,\n...\n      sourceRequestId: null,\n+     status: 'CANCELLED',\n-     status: 'PENDING',\n      targetPeriod: null,\n      type: 'CREDIT'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Once the real transfer commits, stale old-branch permission must not change a financial source\n+ actual - expected\n... Skipped lines\n\n  [\n    {\n      amount: 321.09,\n      appliedAmount: null,\n      appliedAt: null,\n...\n      sourceRequestId: null,\n+     status: 'CANCELLED',\n-     status: 'PENDING',\n      targetPeriod: null,\n      type: 'CREDIT'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round29-obligations.integration.cjs:38:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"obligation-transfer-race\",\"action\":\"create\",\"realTransferStatus\":200,\"transferCommittedFirst\":true,\"oldBranchWriteStatus\":201,\"oldBranchReply\":{\"employeeId\":1,\"type\":\"CREDIT\",\"category\":\"manual\",\"amount\":321.09,\"label\":\"مراجعة مستقلة لنقل موظف أثناء كتابة مالية في دفتر المستحقات\",\"status\":\"PENDING\",\"effectiveDate\":null,\"createdByUserId\":3,\"sourceRequestId\":null,\"sourceRef\":null,\"appliedPayrollRunId\":null,\"appliedAt\":null,\"deductionRequestId\":null,\"targetPeriod\":null,\"reservedPayrollRunId\":null,\"reservedAt\":null,\"appliedAmount\":null,\"carriedFromObligationId\":null,\"bonusRequestId\":null,\"financialExemptionId\":null,\"payrollReversalRunId\":null,\"payrollReversalOfObligationId\":null,\"id\":1,\"createdAt\":\"2026-10-02T22:33:27.396Z\"},\"newBranchBefore\":[],\"newBranchAfter\":[{\"id\":1,\"status\":\"PENDING\",\"amount\":321.09}],\"ordinaryPostTransferDenied\":403}",
    "{\"case\":\"obligation-transfer-race\",\"action\":\"cancel\",\"realTransferStatus\":200,\"transferCommittedFirst\":true,\"oldBranchWriteStatus\":201,\"oldBranchReply\":{\"id\":2,\"status\":\"CANCELLED\"},\"newBranchBefore\":[{\"id\":2,\"status\":\"PENDING\",\"amount\":321.09}],\"newBranchAfter\":[{\"id\":2,\"status\":\"CANCELLED\",\"amount\":321.09}],\"ordinaryPostTransferDenied\":403}",
    "{\"case\":\"obligation-controls\",\"create\":201,\"foreignCreate\":403,\"foreignCancel\":403,\"authorizedCancel\":201}",
    "tests 3",
    "suites 0",
    "pass 1",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 6406.578"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r29_obligations_test_7c1d4ece5395b7e8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r29_obligations_test_7c1d4ece5395b7e8\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r29_obligations_test_7c1d4ece5395b7e8\"}\n"
  ]
}

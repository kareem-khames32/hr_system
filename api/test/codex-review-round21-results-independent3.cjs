module.exports = {
  "selected": [
    "codex-review-round21-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 2,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 9609.2321
  },
  "results": [
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 real payroll filtered totals and register equal the hand sum; excluded department and branch add nothing",
      "ms": 6784.5595,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 mark-filtered serializes two stale callers and writes exactly the filtered employees once",
      "ms": 149.9348,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 old request counts must not reveal the transferred requester department or team outside viewer scope",
      "ms": 212.5668,
      "pass": false,
      "error": "Foreign department must be indistinguishable from missing\n+ actual - expected\n\n  {\n+   byType: [\n+     {\n+       category: 'personal_data',\n+       status: 'UNDER_REVIEW',\n+       total: 1\n+     }\n+   ]\n-   byType: []\n  }\n",
      "cause": "Foreign department must be indistinguishable from missing\n+ actual - expected\n\n  {\n+   byType: [\n+     {\n+       category: 'personal_data',\n+       status: 'UNDER_REVIEW',\n+       total: 1\n+     }\n+   ]\n-   byType: []\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign department must be indistinguishable from missing\n+ actual - expected\n\n  {\n+   byType: [\n+     {\n+       category: 'personal_data',\n+       status: 'UNDER_REVIEW',\n+       total: 1\n+     }\n+   ]\n-   byType: []\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:87:37)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 bank-sheet client filter and financial register use the same payroll snapshot after employee transfer",
      "ms": 132.2471,
      "pass": false,
      "error": "Bank sheet must match payroll snapshot filter and register\n+ actual - expected\n\n+ 3000.22\n- 9000.33\n",
      "cause": "Bank sheet must match payroll snapshot filter and register\n+ actual - expected\n\n+ 3000.22\n- 9000.33\n",
      "stack": "AssertionError [ERR_ASSERTION]: Bank sheet must match payroll snapshot filter and register\n+ actual - expected\n\n+ 3000.22\n- 9000.33\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:99:41)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 old request counts must not reveal the transferred requester department or team outside viewer scope",
      "ms": 212.5668,
      "pass": false,
      "error": "Foreign department must be indistinguishable from missing\n+ actual - expected\n\n  {\n+   byType: [\n+     {\n+       category: 'personal_data',\n+       status: 'UNDER_REVIEW',\n+       total: 1\n+     }\n+   ]\n-   byType: []\n  }\n",
      "cause": "Foreign department must be indistinguishable from missing\n+ actual - expected\n\n  {\n+   byType: [\n+     {\n+       category: 'personal_data',\n+       status: 'UNDER_REVIEW',\n+       total: 1\n+     }\n+   ]\n-   byType: []\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign department must be indistinguishable from missing\n+ actual - expected\n\n  {\n+   byType: [\n+     {\n+       category: 'personal_data',\n+       status: 'UNDER_REVIEW',\n+       total: 1\n+     }\n+   ]\n-   byType: []\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:87:37)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round21-independent.integration.cjs",
      "name": "CR21 bank-sheet client filter and financial register use the same payroll snapshot after employee transfer",
      "ms": 132.2471,
      "pass": false,
      "error": "Bank sheet must match payroll snapshot filter and register\n+ actual - expected\n\n+ 3000.22\n- 9000.33\n",
      "cause": "Bank sheet must match payroll snapshot filter and register\n+ actual - expected\n\n+ 3000.22\n- 9000.33\n",
      "stack": "AssertionError [ERR_ASSERTION]: Bank sheet must match payroll snapshot filter and register\n+ actual - expected\n\n+ 3000.22\n- 9000.33\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round21-snapshot\\api\\test\\codex-review-round21-independent.integration.cjs:99:41)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"filtered-real-payroll\",\"netAmounts\":[6000.11,3000.22,2000.33],\"filteredHandSum\":9000.33,\"report\":{\"id\":1,\"name\":\"مسير فلتر أ\",\"period\":\"2026-09\",\"status\":\"APPROVED\",\"scopeType\":\"BRANCH\",\"scopeLabel\":\"فرع: فرع أ\",\"runType\":\"REGULAR\",\"parentRunId\":null,\"branchId\":null,\"branchName\":null,\"startDate\":\"2026-08-23\",\"endDate\":\"2026-09-22\",\"storedTotalNet\":null,\"employees\":2,\"excluded\":0,\"totalNet\":\"9000.33\",\"reversedEmployees\":0,\"reversedNet\":\"0.00\",\"partial\":true},\"disbursement\":{\"paid\":{\"count\":0,\"total\":0,\"bank\":0,\"cash\":0},\"unpaid\":{\"count\":2,\"total\":9000.33,\"bank\":0,\"cash\":9000.33},\"payable\":{\"count\":2,\"total\":9000.33,\"bank\":0,\"cash\":9000.33},\"settlement\":{\"count\":0,\"total\":0},\"noAmount\":0,\"issues\":0}}",
    "{\"case\":\"mark-filtered-race\",\"sqlWaiters\":2,\"statuses\":[201,409],\"markedIds\":[1,2],\"events\":1}",
    "{\"case\":\"request-count-org-oracle\",\"all\":2,\"foreignDepartment\":{\"byType\":[{\"category\":\"personal_data\",\"status\":\"UNDER_REVIEW\",\"total\":1}]},\"foreignTeam\":{\"byType\":[{\"category\":\"personal_data\",\"status\":\"UNDER_REVIEW\",\"total\":1}]},\"missingDepartment\":{\"byType\":[]}}",
    "{\"case\":\"bank-filter-after-transfer\",\"registerEmployeeIds\":[1,2],\"bankEmployeeIds\":[2],\"registerTotal\":9000.33,\"bankTotal\":3000.22}",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9609.2321"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r21_independent_test_70918e521bc9e1c9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r21_independent_test_70918e521bc9e1c9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r21_independent_test_70918e521bc9e1c9\"}\n"
  ]
}

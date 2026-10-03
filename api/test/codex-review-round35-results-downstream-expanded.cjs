module.exports = {
  "selected": [
    "codex-review-round35-downstream"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 3,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 12378.3179
  },
  "results": [
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 preview-create: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 6216.8055,
      "pass": false,
      "error": "Preview must not include the foreign downstream payroll identifier",
      "cause": "Preview must not include the foreign downstream payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: Preview must not include the foreign downstream payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 approve: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 1815.2312,
      "pass": false,
      "error": "Preview must not include the foreign downstream payroll identifier",
      "cause": "Preview must not include the foreign downstream payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: Preview must not include the foreign downstream payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 pay: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 1882.9825,
      "pass": false,
      "error": "Preview must not include the foreign downstream payroll identifier",
      "cause": "Preview must not include the foreign downstream payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: Preview must not include the foreign downstream payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 preview-create: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 6216.8055,
      "pass": false,
      "error": "Preview must not include the foreign downstream payroll identifier",
      "cause": "Preview must not include the foreign downstream payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: Preview must not include the foreign downstream payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 approve: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 1815.2312,
      "pass": false,
      "error": "Preview must not include the foreign downstream payroll identifier",
      "cause": "Preview must not include the foreign downstream payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: Preview must not include the foreign downstream payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 pay: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 1882.9825,
      "pass": false,
      "error": "Preview must not include the foreign downstream payroll identifier",
      "cause": "Preview must not include the foreign downstream payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: Preview must not include the foreign downstream payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:38:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"foreign-downstream-run-reference\",\"stage\":\"preview-create\",\"ownRun\":1,\"foreignRun\":2,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":2}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":2}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر عكس الصرف: قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا (و1 مانعًا آخر)\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":2}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "{\"case\":\"foreign-downstream-run-reference\",\"stage\":\"approve\",\"ownRun\":3,\"foreignRun\":5,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #2 في هذا المسير معكوس بالفعل بمسير العكس #4 (بانتظار تنفيذ العكس)\",\"employeeId\":2,\"details\":{\"reversalRunId\":4}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":2,\"details\":{\"installmentId\":4,\"runId\":5}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #4 حركة لاحقة (RESERVED)\",\"employeeId\":2,\"details\":{\"installmentId\":4}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #2 في هذا المسير معكوس بالفعل بمسير العكس #4 (بانتظار تنفيذ العكس)\",\"employeeId\":2,\"details\":{\"reversalRunId\":4}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":2,\"details\":{\"installmentId\":4,\"runId\":5}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #4 حركة لاحقة (RESERVED)\",\"employeeId\":2,\"details\":{\"installmentId\":4}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر المتابعة في مسير العكس: قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":2,\"details\":{\"installmentId\":4,\"runId\":5}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #4 حركة لاحقة (RESERVED)\",\"employeeId\":2,\"details\":{\"installmentId\":4}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "{\"case\":\"foreign-downstream-run-reference\",\"stage\":\"pay\",\"ownRun\":6,\"foreignRun\":8,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #3 في هذا المسير معكوس بالفعل بمسير العكس #7 (بانتظار تنفيذ العكس)\",\"employeeId\":3,\"details\":{\"reversalRunId\":7}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":3,\"details\":{\"installmentId\":6,\"runId\":8}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #6 حركة لاحقة (RESERVED)\",\"employeeId\":3,\"details\":{\"installmentId\":6}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #3 في هذا المسير معكوس بالفعل بمسير العكس #7 (بانتظار تنفيذ العكس)\",\"employeeId\":3,\"details\":{\"reversalRunId\":7}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":3,\"details\":{\"installmentId\":6,\"runId\":8}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #6 حركة لاحقة (RESERVED)\",\"employeeId\":3,\"details\":{\"installmentId\":6}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر المتابعة في مسير العكس: قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":3,\"details\":{\"installmentId\":6,\"runId\":8}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #6 حركة لاحقة (RESERVED)\",\"employeeId\":3,\"details\":{\"installmentId\":6}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12378.3179"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r35_downstream_test_8c162577f443a4be\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r35_downstream_test_8c162577f443a4be\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r35_downstream_test_8c162577f443a4be\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round35-downstream"
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
    "duration_ms": 9729.5378
  },
  "results": [
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 7321.585,
      "pass": false,
      "error": "Preview must not include the foreign downstream payroll identifier",
      "cause": "Preview must not include the foreign downstream payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: Preview must not include the foreign downstream payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:30:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 7321.585,
      "pass": false,
      "error": "Preview must not include the foreign downstream payroll identifier",
      "cause": "Preview must not include the foreign downstream payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: Preview must not include the foreign downstream payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-downstream.integration.cjs:30:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"foreign-downstream-run-reference\",\"ownRun\":1,\"foreignRun\":2,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":2}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":2}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر عكس الصرف: قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا (و1 مانعًا آخر)\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":2}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9729.5378"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r35_downstream_test_3b1f6648e748d6cc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r35_downstream_test_3b1f6648e748d6cc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r35_downstream_test_3b1f6648e748d6cc\"}\n"
  ]
}

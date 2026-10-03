module.exports = {
  "selected": [
    "codex-review-round35-independent",
    "codex-review-round35-downstream",
    "codex-review-round35-payload"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 61496.7526
  },
  "results": [
    {
      "file": "codex-review-round35-independent.integration.cjs",
      "name": "CR35 real bonus deduction and loan reversal: foreign references hidden",
      "ms": 21632.6337,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round35-independent.integration.cjs",
      "name": "CR35 real bonus deduction and loan reversal: in-scope references preserved",
      "ms": 7290.9742,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 preview-create: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 13793.1238,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 approve: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 1927.5595,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round35-downstream.integration.cjs",
      "name": "CR35 pay: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 1852.5205,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round35-payload.integration.cjs",
      "name": "CR35 recursive event masking preserves allowed references, amounts and the original JSON",
      "ms": 1.0823,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"real-reversal-visibility\",\"foreign\":true,\"direct\":[403,403],\"net\":8755.44,\"loanCollected\":300.12,\"loanRestored\":600.24,\"storedEvidenceUnchanged\":true,\"checks\":[{\"route\":\"bonuses\",\"actual\":[null,null],\"expected\":[null,null],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد 123.45 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 123.45 قيدًا مستحقًا (#3) للمسير التكميلي أو التالي\"},{\"route\":\"deductions\",\"actual\":[null,null],\"expected\":[null,null],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد 67.89 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 67.89 قيدًا مستحقًا (#4) للمسير التكميلي أو التالي\"},{\"route\":\"loan-RESERVED\",\"actual\":[null],\"expected\":[null],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-PAYROLL_POSTED\",\"actual\":[null],\"expected\":[null],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-REVERSAL\",\"actual\":[null],\"expected\":[null],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\"}]}",
    "{\"case\":\"real-reversal-visibility\",\"foreign\":false,\"direct\":[200,200],\"net\":8755.44,\"loanCollected\":300.12,\"loanRestored\":600.24,\"storedEvidenceUnchanged\":true,\"checks\":[{\"route\":\"bonuses\",\"actual\":[3,4],\"expected\":[3,4],\"reason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي\"},{\"route\":\"deductions\",\"actual\":[3,4],\"expected\":[3,4],\"reason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي\"},{\"route\":\"loan-RESERVED\",\"actual\":[3],\"expected\":[3],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-PAYROLL_POSTED\",\"actual\":[3],\"expected\":[3],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-REVERSAL\",\"actual\":[4],\"expected\":[4],\"reason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\"}]}",
    "{\"case\":\"foreign-downstream-run-reference\",\"stage\":\"preview-create\",\"ownRun\":1,\"foreignRun\":2,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":2}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر عكس الصرف: قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده (و1 مانعًا آخر)\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "{\"case\":\"foreign-downstream-run-reference\",\"stage\":\"approve\",\"ownRun\":3,\"foreignRun\":5,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #2 في هذا المسير معكوس بالفعل بمسير العكس #4 (بانتظار تنفيذ العكس)\",\"employeeId\":2,\"details\":{\"reversalRunId\":4}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":2,\"details\":{\"installmentId\":4,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #4 حركة لاحقة (RESERVED)\",\"employeeId\":2,\"details\":{\"installmentId\":4}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #2 في هذا المسير معكوس بالفعل بمسير العكس #4 (بانتظار تنفيذ العكس)\",\"employeeId\":2,\"details\":{\"reversalRunId\":4}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":2,\"details\":{\"installmentId\":4,\"runId\":5}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #4 حركة لاحقة (RESERVED)\",\"employeeId\":2,\"details\":{\"installmentId\":4}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر المتابعة في مسير العكس: قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":2,\"details\":{\"installmentId\":4,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #4 حركة لاحقة (RESERVED)\",\"employeeId\":2,\"details\":{\"installmentId\":4}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "{\"case\":\"foreign-downstream-run-reference\",\"stage\":\"pay\",\"ownRun\":6,\"foreignRun\":8,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #3 في هذا المسير معكوس بالفعل بمسير العكس #7 (بانتظار تنفيذ العكس)\",\"employeeId\":3,\"details\":{\"reversalRunId\":7}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":3,\"details\":{\"installmentId\":6,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #6 حركة لاحقة (RESERVED)\",\"employeeId\":3,\"details\":{\"installmentId\":6}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #3 في هذا المسير معكوس بالفعل بمسير العكس #7 (بانتظار تنفيذ العكس)\",\"employeeId\":3,\"details\":{\"reversalRunId\":7}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":3,\"details\":{\"installmentId\":6,\"runId\":8}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #6 حركة لاحقة (RESERVED)\",\"employeeId\":3,\"details\":{\"installmentId\":6}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر المتابعة في مسير العكس: قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":3,\"details\":{\"installmentId\":6,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #6 حركة لاحقة (RESERVED)\",\"employeeId\":3,\"details\":{\"installmentId\":6}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "{\"case\":\"nested-payload-redaction\",\"allowedRetained\":true,\"hiddenAtMultipleDepths\":true,\"amountsAndOriginalPreserved\":true,\"companyDeepEqual\":true}",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 61496.7526"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r35_independent_test_9d61b2816fc3a35b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r35_independent_test_9d61b2816fc3a35b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r35_independent_test_9d61b2816fc3a35b\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r35_downstream_test_5bbca6a8ea1d8a36\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r35_downstream_test_5bbca6a8ea1d8a36\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r35_downstream_test_5bbca6a8ea1d8a36\"}\n"
  ]
}

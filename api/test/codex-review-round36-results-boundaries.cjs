module.exports = {
  "selected": [
    "codex-review-round36-boundaries"
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
    "duration_ms": 16817.5622
  },
  "results": [
    {
      "file": "codex-review-round36-boundaries.integration.cjs",
      "name": "CR36 preview-create: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 7233.0434,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-boundaries.integration.cjs",
      "name": "CR36 approve: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 2950.1936,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-boundaries.integration.cjs",
      "name": "CR36 pay: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 2348.2117,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"scoped-reversal-blockers\",\"stage\":\"preview-create\",\"hashIdentical\":true,\"lineBlockersEqual\":true,\"foreignIdAndStatusHidden\":true,\"ownReversalVisible\":false,\"internalFieldAbsent\":true,\"branchAndCompanyStatus\":409,\"fullFinancialAndAuditStateUnchanged\":true}",
    "{\"case\":\"foreign-downstream-run-reference\",\"stage\":\"preview-create\",\"ownRun\":1,\"foreignRun\":2,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل المسير #2 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":2}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر عكس الصرف: قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده (و1 مانعًا آخر)\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #2 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":1,\"details\":{\"installmentId\":2,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #2 حركة لاحقة (RESERVED)\",\"employeeId\":1,\"details\":{\"installmentId\":2}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "{\"case\":\"scoped-reversal-blockers\",\"stage\":\"approve\",\"hashIdentical\":true,\"lineBlockersEqual\":true,\"foreignIdAndStatusHidden\":true,\"ownReversalVisible\":true,\"internalFieldAbsent\":true,\"branchAndCompanyStatus\":409,\"fullFinancialAndAuditStateUnchanged\":true}",
    "{\"case\":\"foreign-downstream-run-reference\",\"stage\":\"approve\",\"ownRun\":3,\"foreignRun\":5,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #2 في هذا المسير معكوس بالفعل بمسير العكس #4 (بانتظار تنفيذ العكس)\",\"employeeId\":2,\"details\":{\"reversalRunId\":4}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":2,\"details\":{\"installmentId\":4,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #4 حركة لاحقة (RESERVED)\",\"employeeId\":2,\"details\":{\"installmentId\":4}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #2 في هذا المسير معكوس بالفعل بمسير العكس #4 (بانتظار تنفيذ العكس)\",\"employeeId\":2,\"details\":{\"reversalRunId\":4}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #4 دخل المسير #5 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":2,\"details\":{\"installmentId\":4,\"runId\":5}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #4 حركة لاحقة (RESERVED)\",\"employeeId\":2,\"details\":{\"installmentId\":4}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر المتابعة في مسير العكس: قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #4 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":2,\"details\":{\"installmentId\":4,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #4 حركة لاحقة (RESERVED)\",\"employeeId\":2,\"details\":{\"installmentId\":4}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "{\"case\":\"scoped-reversal-blockers\",\"stage\":\"pay\",\"hashIdentical\":true,\"lineBlockersEqual\":true,\"foreignIdAndStatusHidden\":true,\"ownReversalVisible\":true,\"internalFieldAbsent\":true,\"branchAndCompanyStatus\":409,\"fullFinancialAndAuditStateUnchanged\":true}",
    "{\"case\":\"foreign-downstream-run-reference\",\"stage\":\"pay\",\"ownRun\":6,\"foreignRun\":8,\"ownRead\":200,\"foreignRead\":403,\"previewBlocked\":true,\"branchBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #3 في هذا المسير معكوس بالفعل بمسير العكس #7 (بانتظار تنفيذ العكس)\",\"employeeId\":3,\"details\":{\"reversalRunId\":7}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":3,\"details\":{\"installmentId\":6,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #6 حركة لاحقة (RESERVED)\",\"employeeId\":3,\"details\":{\"installmentId\":6}}],\"companyBlockers\":[{\"code\":\"PAYRUN-REVERSAL-EXISTS\",\"message\":\"بند الموظف #3 في هذا المسير معكوس بالفعل بمسير العكس #7 (بانتظار تنفيذ العكس)\",\"employeeId\":3,\"details\":{\"reversalRunId\":7}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #6 دخل المسير #8 (معتمد)؛ اعكس ذلك المسير أو أعد فتحه أولًا\",\"employeeId\":3,\"details\":{\"installmentId\":6,\"runId\":8}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #6 حركة لاحقة (RESERVED)\",\"employeeId\":3,\"details\":{\"installmentId\":6}}],\"refusal\":{\"code\":\"PAYRUN-REVERSAL-BLOCKED\",\"message\":\"تعذر المتابعة في مسير العكس: قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"blockers\":[{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"قسط الترحيل #6 دخل مسير لاحق برّه نطاق صلاحيتك؛ لازم يتعكس أو يتفتح من الحساب اللي يشوفه قبل عكس المسير ده\",\"employeeId\":3,\"details\":{\"installmentId\":6,\"runId\":null}},{\"code\":\"PAYRUN-REVERSAL-DOWNSTREAM\",\"message\":\"لقسط الترحيل #6 حركة لاحقة (RESERVED)\",\"employeeId\":3,\"details\":{\"installmentId\":6}}]},\"sourceNet\":0,\"sourcePaid\":1000,\"heldInstallment\":500,\"heldNet\":500,\"ledgerAndRunsUnchanged\":true}",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16817.5622"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r36_downstream_test_beb43f01f61756bd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r36_downstream_test_beb43f01f61756bd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r36_downstream_test_beb43f01f61756bd\"}\n"
  ]
}

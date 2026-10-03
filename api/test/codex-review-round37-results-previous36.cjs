module.exports = {
  "selected": [
    "codex-review-round36-boundaries",
    "codex-review-round36-ledger",
    "codex-review-round36-ledger-response"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 8,
      "failed": 0,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 33999.3863
  },
  "results": [
    {
      "file": "codex-review-round36-boundaries.integration.cjs",
      "name": "CR36 preview-create: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 7830.8598,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-boundaries.integration.cjs",
      "name": "CR36 approve: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 2219.2313,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-boundaries.integration.cjs",
      "name": "CR36 pay: reversal blocker must not expose a foreign payroll holding the carried loan installment",
      "ms": 2233.822,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-ledger.integration.cjs",
      "name": "CR36 raw obligations APPROVED: foreign run references must be hidden after employee transfer",
      "ms": 6174.8253,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-ledger.integration.cjs",
      "name": "CR36 raw obligations PAID: foreign run references must be hidden after employee transfer",
      "ms": 930.8981,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-ledger.integration.cjs",
      "name": "CR36 raw obligations REVERSED: foreign run references must be hidden after employee transfer",
      "ms": 1023.6474,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-ledger-response.integration.cjs",
      "name": "CR36 cancellation response: authorized payroll reference and amounts are preserved",
      "ms": 4976.394,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round36-ledger-response.integration.cjs",
      "name": "CR36 cancellation response: foreign payroll reference is hidden",
      "ms": 1300.749,
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
    "{\"case\":\"raw-obligation-run-reference\",\"stage\":\"APPROVED\",\"runReadStatus\":403,\"listStatus\":200,\"branchRefs\":{\"reserved\":null,\"applied\":null,\"reversal\":null},\"companyRefs\":{\"reserved\":1,\"applied\":null,\"reversal\":null},\"cancelRefs\":{\"reserved\":null,\"applied\":null,\"reversal\":null},\"cancelStatus\":\"CANCELLED\",\"amount\":123.45,\"net\":9123.45,\"readsLeaveLedgerUnchanged\":true}",
    "{\"case\":\"raw-obligation-run-reference\",\"stage\":\"PAID\",\"runReadStatus\":403,\"listStatus\":200,\"branchRefs\":{\"reserved\":null,\"applied\":null,\"reversal\":null},\"companyRefs\":{\"reserved\":2,\"applied\":2,\"reversal\":null},\"cancelRefs\":null,\"cancelStatus\":null,\"amount\":123.45,\"net\":9123.45,\"readsLeaveLedgerUnchanged\":true}",
    "{\"case\":\"raw-obligation-run-reference\",\"stage\":\"REVERSED\",\"runReadStatus\":403,\"listStatus\":200,\"branchRefs\":{\"reserved\":null,\"applied\":null,\"reversal\":null},\"companyRefs\":{\"reserved\":3,\"applied\":3,\"reversal\":4},\"cancelRefs\":null,\"cancelStatus\":null,\"amount\":123.45,\"net\":9123.45,\"readsLeaveLedgerUnchanged\":true}",
    "{\"case\":\"obligation-cancellation-response\",\"foreign\":false,\"runReadStatus\":200,\"cancellationStatus\":201,\"storedStatus\":\"CANCELLED\",\"responseReservedRunId\":1,\"companyReservedRunId\":1,\"amount\":123.45,\"approvedNet\":9123.45,\"financialFieldsOtherThanCancellationUnchanged\":true}",
    "{\"case\":\"obligation-cancellation-response\",\"foreign\":true,\"runReadStatus\":403,\"cancellationStatus\":201,\"storedStatus\":\"CANCELLED\",\"responseReservedRunId\":null,\"companyReservedRunId\":2,\"amount\":123.45,\"approvedNet\":9123.45,\"financialFieldsOtherThanCancellationUnchanged\":true}",
    "tests 8",
    "suites 0",
    "pass 8",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 33999.3863"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r36_downstream_test_db6202f5b6d3c8ff\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r36_downstream_test_db6202f5b6d3c8ff\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r36_downstream_test_db6202f5b6d3c8ff\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r36_ledger_test_309dfac02f4bfa8a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r36_ledger_test_309dfac02f4bfa8a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r36_ledger_test_309dfac02f4bfa8a\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r36_ledger_response_test_092279566f49ee99\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r36_ledger_response_test_092279566f49ee99\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r36_ledger_response_test_092279566f49ee99\"}\n"
  ]
}

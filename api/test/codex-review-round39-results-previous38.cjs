module.exports = {
  "selected": [
    "codex-review-round38-event-period",
    "codex-review-round38-unassigned",
    "codex-review-round38-related-periods"
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
    "duration_ms": 32390.6563
  },
  "results": [
    {
      "file": "codex-review-round38-event-period.integration.cjs",
      "name": "CR38 overtime event must hide the foreign payment period as well as its numbers",
      "ms": 11422.6645,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned lastRun conceals all foreign metadata and preserves the permitted head and stored finance",
      "ms": 5850.6349,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned top-level runs must exclude a wholly foreign historical membership after transfer",
      "ms": 72.3311,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round38-unassigned.integration.cjs",
      "name": "CR38 unassigned reversal reason conceals the foreign head while the company sees it and real reversal balances",
      "ms": 254.1546,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round38-related-periods.integration.cjs",
      "name": "CR38 real bonus deduction and loan reversal: foreign references hidden",
      "ms": 6087.0088,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round38-related-periods.integration.cjs",
      "name": "CR38 real bonus deduction and loan reversal: in-scope references preserved",
      "ms": 1322.1626,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"overtime-request-event-run-reference\",\"directRunStatus\":403,\"requestStatus\":200,\"originalRun\":2,\"reversalRun\":3,\"branchReason\":\"عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: عاد السجل معتمدًا بلا مسير\",\"companyReason\":\"عكس صرف مسير 2026-08 (#2) بمسير العكس #3: عاد السجل معتمدًا بلا مسير\",\"selfReason\":\"عكس صرف مسير 2026-08 (#2) بمسير العكس #3: عاد السجل معتمدًا بلا مسير\",\"amount\":126.56,\"status\":\"APPROVED\",\"storedHistoryUnchanged\":true}",
    "Cleanup verified: hr_codex_r38_ot_test_926eb50b3c9a1c25 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "{\"case\":\"unassigned-last-run-closure\",\"foreignDirectRead\":403,\"foreignLastRun\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":null,\"status\":null,\"startDate\":null,\"endDate\":null},\"permittedLastRun\":{\"id\":1,\"name\":\"CR38 payroll فرع ألف\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\"},\"netEach\":9000,\"storedFinanceUnchanged\":true}",
    "{\"case\":\"unassigned-top-level-foreign-run\",\"foreignDirectRead\":403,\"foreignRun\":2,\"foreignBranch\":\"فرع باء المحجوب\",\"branchRuns\":[{\"id\":1,\"name\":\"CR38 payroll فرع ألف\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\",\"scopeLabel\":\"فرع: فرع ألف\"}],\"companyRuns\":[{\"id\":1,\"name\":\"CR38 payroll فرع ألف\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\",\"scopeLabel\":\"فرع: فرع ألف\",\"members\":1,\"excluded\":0},{\"id\":2,\"name\":\"CR38 payroll فرع باء المحجوب\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\",\"scopeLabel\":\"فرع: فرع باء المحجوب\",\"members\":1,\"excluded\":0}],\"branchSummary\":{\"from\":\"2026-07-01\",\"to\":\"2026-07-22\",\"onJob\":2,\"covered\":2,\"unassigned\":0,\"suspended\":0,\"dataIssues\":0,\"duplicates\":0},\"storedFinanceUnchanged\":true}",
    "{\"case\":\"unassigned-reversal-reason-closure\",\"branchReason\":{\"code\":\"REVERSED_IN_RUN\",\"label\":\"عُكس صرف بنده في مسير للفترة ولم يُصرف بمسير تكميلي بعد\",\"detail\":\"نُفّذ عكس صرف بنده؛ اصرفه بمسير تكميلي مربوط بالمسير\",\"run\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":null,\"status\":null,\"startDate\":null,\"endDate\":null}},\"companyReason\":{\"code\":\"REVERSED_IN_RUN\",\"label\":\"عُكس صرف بنده في مسير للفترة ولم يُصرف بمسير تكميلي بعد\",\"detail\":\"نُفّذ عكس صرف بنده؛ اصرفه بمسير تكميلي مربوط بالمسير\",\"run\":{\"id\":2,\"name\":\"CR38 payroll فرع باء المحجوب\",\"period\":\"2026-07\",\"status\":\"PAID\",\"startDate\":\"2026-06-23\",\"endDate\":\"2026-07-22\"}},\"originalNet\":9000,\"reversalNet\":-9000,\"storedFinanceUnchanged\":true}",
    "{\"case\":\"real-reversal-visibility\",\"foreign\":true,\"direct\":[403,403],\"net\":8755.44,\"loanCollected\":300.12,\"loanRestored\":600.24,\"storedEvidenceUnchanged\":true,\"checks\":[{\"route\":\"bonuses\",\"actual\":[null,null],\"expected\":[null,null],\"reason\":\"عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: أُعيد 123.45 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 123.45 قيدًا مستحقًا (#3) للمسير التكميلي أو التالي\"},{\"route\":\"deductions\",\"actual\":[null,null],\"expected\":[null,null],\"reason\":\"عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: أُعيد 67.89 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 67.89 قيدًا مستحقًا (#4) للمسير التكميلي أو التالي\"},{\"route\":\"loan-RESERVED\",\"actual\":[null],\"expected\":[null],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-PAYROLL_POSTED\",\"actual\":[null],\"expected\":[null],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-REVERSAL\",\"actual\":[null],\"expected\":[null],\"reason\":\"عكس صرف مسير خارج نطاق صلاحيتك بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\"}]}",
    "{\"case\":\"real-reversal-visibility\",\"foreign\":false,\"direct\":[200,200],\"net\":8755.44,\"loanCollected\":300.12,\"loanRestored\":600.24,\"storedEvidenceUnchanged\":true,\"checks\":[{\"route\":\"bonuses\",\"actual\":[3,4],\"expected\":[3,4],\"reason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي\"},{\"route\":\"deductions\",\"actual\":[3,4],\"expected\":[3,4],\"reason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي\"},{\"route\":\"loan-RESERVED\",\"actual\":[3],\"expected\":[3],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-PAYROLL_POSTED\",\"actual\":[3],\"expected\":[3],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-REVERSAL\",\"actual\":[4],\"expected\":[4],\"reason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\"}]}",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 32390.6563"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r38_ot_test_926eb50b3c9a1c25\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r38_ot_test_926eb50b3c9a1c25\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r38_unassigned_test_eec838821b3c3702\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r38_unassigned_test_eec838821b3c3702\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r38_unassigned_test_eec838821b3c3702\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r38_independent_test_2946f06e071868ea\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r38_independent_test_2946f06e071868ea\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r38_independent_test_2946f06e071868ea\"}\n"
  ]
}

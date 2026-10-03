module.exports = {
  "selected": [
    "codex-review-round37-overtime",
    "codex-review-round37-payload"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 61541.0299
  },
  "results": [
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 real paid/deferred overtime: log and request references scoped; permitted rows, dates, amounts and stored history preserved",
      "ms": 40761.3271,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 overtime request reversal event must not expose foreign original and reversal payroll numbers",
      "ms": 5888.3802,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round37-overtime.integration.cjs",
      "name": "CR37 payroll overtime report must not expose foreign payment and deferred payroll references",
      "ms": 4578.4635,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round37-payload.integration.cjs",
      "name": "CR37 scopeRunRefRows: nested references, Date values, allowed identity and immutable source",
      "ms": 1.641,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"overtime-read-closure\",\"originalRun\":1,\"paidRun\":2,\"foreignRead\":403,\"hidden\":[null,null,null,null],\"allowedBeforeTransfer\":true,\"companyAndSelfVisible\":true,\"minutes\":135,\"hourlyRate\":37.5,\"multiplier\":1.5,\"amount\":126.56,\"timestampsPreserved\":true,\"storedHistoryUnchanged\":true}",
    "{\"case\":\"overtime-request-event-run-reference\",\"directRunStatus\":403,\"requestStatus\":200,\"originalRun\":4,\"reversalRun\":5,\"branchReason\":\"عكس صرف مسير 2026-08 بمسير العكس: عاد السجل معتمدًا بلا مسير\",\"companyReason\":\"عكس صرف مسير 2026-08 (#4) بمسير العكس #5: عاد السجل معتمدًا بلا مسير\",\"selfReason\":\"عكس صرف مسير 2026-08 (#4) بمسير العكس #5: عاد السجل معتمدًا بلا مسير\",\"amount\":126.56,\"status\":\"APPROVED\",\"storedHistoryUnchanged\":true}",
    "{\"case\":\"overtime-report-run-reference\",\"directRunStatus\":403,\"reportStatus\":200,\"branchRun\":{\"id\":null,\"name\":\"مسير خارج نطاق صلاحيتك\",\"period\":null,\"status\":null,\"startDate\":null,\"endDate\":null},\"branchDeferredFromRunId\":null,\"companyRun\":{\"id\":7,\"name\":\"مسير قبول مصادر الإضافي 6\",\"period\":\"2026-08\",\"status\":\"PAID\",\"startDate\":\"2026-08-01\",\"endDate\":\"2026-08-31\"},\"companyDeferredFromRunId\":6,\"amount\":126.56,\"storedHistoryUnchanged\":true}",
    "Cleanup verified: hr_codex_r37_ot_test_2f1fdfcae43472ae no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "{\"case\":\"scope-raw-row-helper\",\"nestedForeignRefsNull\":true,\"allowedRowsSameObject\":true,\"dateIdentityPreserved\":true,\"moneyPreserved\":true,\"sourceUnchanged\":true,\"companyInternalAndSelfUnchanged\":true,\"kind\":\"unit with explicit repository fixture\"}",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 61541.0299"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r37_ot_test_2f1fdfcae43472ae\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r37_ot_test_2f1fdfcae43472ae\"}\n"
  ]
}

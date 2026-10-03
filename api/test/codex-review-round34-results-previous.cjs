module.exports = {
  "selected": [
    "codex-review-round33-independent"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 10,
      "failed": 0,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 18649.8894
  },
  "results": [
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 own payroll references in list and line cancellation; recalculation removes the exact amount",
      "ms": 6922.1535,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 own payroll references in list and grant cancellation; recalculation removes the exact amount",
      "ms": 1335.1991,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 foreign payroll references in list and line cancellation; recalculation removes the exact amount",
      "ms": 1048.0905,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 foreign payroll references in list and grant cancellation; recalculation removes the exact amount",
      "ms": 1259.2591,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 a mixed run header is hidden for an allowance whose own employee snapshot is foreign",
      "ms": 803.3795,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign approved payroll must not expose its identifier",
      "ms": 820.8116,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign paid payroll must not expose its identifier",
      "ms": 844.8859,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 post-commit lockedRuns keeps the own approved payroll",
      "ms": 644.8571,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 post-commit lockedRuns hides the foreign approved payroll",
      "ms": 839.6956,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 legacy payroll without membership uses its stamped branch and preserves company visibility",
      "ms": 1095.8071,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"allowance-cancellation\",\"foreign\":false,\"action\":\"line\",\"rows\":1,\"referenceVisible\":true,\"netBefore\":9150.25,\"netAfter\":9000,\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-cancellation\",\"foreign\":false,\"action\":\"grant\",\"rows\":2,\"referenceVisible\":true,\"netBefore\":9150.25,\"netAfter\":9000,\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-cancellation\",\"foreign\":true,\"action\":\"line\",\"rows\":1,\"referenceVisible\":false,\"netBefore\":9150.25,\"netAfter\":9000,\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-cancellation\",\"foreign\":true,\"action\":\"grant\",\"rows\":2,\"referenceVisible\":false,\"netBefore\":9150.25,\"netAfter\":9000,\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-mixed-member-scope\",\"members\":2,\"allowanceEmployeeBranch\":2,\"otherEmployeeBranch\":1,\"referenceHidden\":true}",
    "{\"case\":\"allowance-refusal-reference\",\"paid\":false,\"responseStatus\":409,\"response\":{\"message\":\"البدل ده في مسير معتمد برّه نطاق صلاحيتك — محتاج حساب يشوف المسير يفتحه الأول\",\"error\":\"Conflict\",\"statusCode\":409},\"foreignRunId\":6,\"listRunId\":null,\"directRead\":403,\"ledgerUnchanged\":true,\"leaked\":false}",
    "{\"case\":\"allowance-refusal-reference\",\"paid\":true,\"responseStatus\":409,\"response\":{\"message\":\"البدل ده اتصرف في مسير برّه نطاق صلاحيتك — مينفعش يتلغي\",\"error\":\"Conflict\",\"statusCode\":409},\"foreignRunId\":7,\"listRunId\":null,\"directRead\":403,\"ledgerUnchanged\":true,\"leaked\":false}",
    "{\"case\":\"allowance-locked-response\",\"foreign\":false,\"total\":150.25,\"lockedRuns\":[{\"id\":8,\"name\":\"CR33 locked VISIBLE A 8\",\"status\":\"APPROVED\"}],\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-locked-response\",\"foreign\":true,\"total\":150.25,\"lockedRuns\":[],\"companyReferenceVisible\":true}",
    "{\"case\":\"legacy-payroll-reference\",\"ownVisible\":true,\"foreignHidden\":true,\"companyBothVisible\":true,\"fixture\":\"explicit pre-membership shape in disposable database only\"}",
    "tests 10",
    "suites 0",
    "pass 10",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18649.8894"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r33_independent_test_795004133abb8d75\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r33_independent_test_795004133abb8d75\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r33_independent_test_795004133abb8d75\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round33-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 7,
      "failed": 2,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 12982.2072
  },
  "results": [
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 own payroll references in list and line cancellation; recalculation removes the exact amount",
      "ms": 5186.9983,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 own payroll references in list and grant cancellation; recalculation removes the exact amount",
      "ms": 1141.6029,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 foreign payroll references in list and line cancellation; recalculation removes the exact amount",
      "ms": 860.6881,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 foreign payroll references in list and grant cancellation; recalculation removes the exact amount",
      "ms": 1156.5466,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 a mixed run header is hidden for an allowance whose own employee snapshot is foreign",
      "ms": 697.9838,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign approved payroll must not expose its identifier",
      "ms": 752.2645,
      "pass": false,
      "error": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "cause": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: A refusal must preserve financial protection without disclosing the hidden payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round33-independent.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign paid payroll must not expose its identifier",
      "ms": 852.3274,
      "pass": false,
      "error": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "cause": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: A refusal must preserve financial protection without disclosing the hidden payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round33-independent.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign approved payroll must not expose its identifier",
      "ms": 752.2645,
      "pass": false,
      "error": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "cause": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: A refusal must preserve financial protection without disclosing the hidden payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round33-independent.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign paid payroll must not expose its identifier",
      "ms": 852.3274,
      "pass": false,
      "error": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "cause": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: A refusal must preserve financial protection without disclosing the hidden payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round33-independent.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"allowance-cancellation\",\"foreign\":false,\"action\":\"line\",\"rows\":1,\"referenceVisible\":true,\"netBefore\":9150.25,\"netAfter\":9000,\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-cancellation\",\"foreign\":false,\"action\":\"grant\",\"rows\":2,\"referenceVisible\":true,\"netBefore\":9150.25,\"netAfter\":9000,\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-cancellation\",\"foreign\":true,\"action\":\"line\",\"rows\":1,\"referenceVisible\":false,\"netBefore\":9150.25,\"netAfter\":9000,\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-cancellation\",\"foreign\":true,\"action\":\"grant\",\"rows\":2,\"referenceVisible\":false,\"netBefore\":9150.25,\"netAfter\":9000,\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-mixed-member-scope\",\"members\":2,\"allowanceEmployeeBranch\":2,\"otherEmployeeBranch\":1,\"referenceHidden\":true}",
    "{\"case\":\"allowance-refusal-reference\",\"paid\":false,\"responseStatus\":409,\"response\":{\"message\":\"البدل ده في مسير معتمد (#6) — افتح المسير الأول وبعدين الغيه\",\"error\":\"Conflict\",\"statusCode\":409},\"foreignRunId\":6,\"listRunId\":null,\"directRead\":403,\"ledgerUnchanged\":true,\"leaked\":true}",
    "{\"case\":\"allowance-refusal-reference\",\"paid\":true,\"responseStatus\":409,\"response\":{\"message\":\"البدل ده اتصرف في مسير #7 — مينفعش يتلغي\",\"error\":\"Conflict\",\"statusCode\":409},\"foreignRunId\":7,\"listRunId\":null,\"directRead\":403,\"ledgerUnchanged\":true,\"leaked\":true}",
    "tests 7",
    "suites 0",
    "pass 5",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12982.2072"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r33_independent_test_97a8ca08e5b5e7e4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r33_independent_test_97a8ca08e5b5e7e4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r33_independent_test_97a8ca08e5b5e7e4\"}\n"
  ]
}

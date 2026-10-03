module.exports = {
  "selected": [
    "codex-review-round33-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 10,
      "failed": 2,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 10,
      "suites": 0
    },
    "duration_ms": 13732.929
  },
  "results": [
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 own payroll references in list and line cancellation; recalculation removes the exact amount",
      "ms": 4620.8407,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 own payroll references in list and grant cancellation; recalculation removes the exact amount",
      "ms": 889.7175,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 foreign payroll references in list and line cancellation; recalculation removes the exact amount",
      "ms": 844.7554,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 foreign payroll references in list and grant cancellation; recalculation removes the exact amount",
      "ms": 1059.1299,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 a mixed run header is hidden for an allowance whose own employee snapshot is foreign",
      "ms": 626.6304,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign approved payroll must not expose its identifier",
      "ms": 647.039,
      "pass": false,
      "error": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "cause": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: A refusal must preserve financial protection without disclosing the hidden payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round33-independent.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign paid payroll must not expose its identifier",
      "ms": 711.7082,
      "pass": false,
      "error": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "cause": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: A refusal must preserve financial protection without disclosing the hidden payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round33-independent.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 post-commit lockedRuns keeps the own approved payroll",
      "ms": 555.5468,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 post-commit lockedRuns hides the foreign approved payroll",
      "ms": 617.5912,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 legacy payroll without membership uses its stamped branch and preserves company visibility",
      "ms": 848.4031,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign approved payroll must not expose its identifier",
      "ms": 647.039,
      "pass": false,
      "error": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "cause": "A refusal must preserve financial protection without disclosing the hidden payroll identifier",
      "stack": "AssertionError [ERR_ASSERTION]: A refusal must preserve financial protection without disclosing the hidden payroll identifier\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round33-independent.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round33-independent.integration.cjs",
      "name": "CR33 cancellation refusal for foreign paid payroll must not expose its identifier",
      "ms": 711.7082,
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
    "{\"case\":\"allowance-locked-response\",\"foreign\":false,\"total\":150.25,\"lockedRuns\":[{\"id\":8,\"name\":\"CR33 locked VISIBLE A 8\",\"status\":\"APPROVED\"}],\"companyReferenceVisible\":true}",
    "{\"case\":\"allowance-locked-response\",\"foreign\":true,\"total\":150.25,\"lockedRuns\":[],\"companyReferenceVisible\":true}",
    "{\"case\":\"legacy-payroll-reference\",\"ownVisible\":true,\"foreignHidden\":true,\"companyBothVisible\":true,\"fixture\":\"explicit pre-membership shape in disposable database only\"}",
    "tests 10",
    "suites 0",
    "pass 8",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13732.929"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r33_independent_test_bc4ca84846fc020c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r33_independent_test_bc4ca84846fc020c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r33_independent_test_bc4ca84846fc020c\"}\n"
  ]
}

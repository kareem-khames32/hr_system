module.exports = {
  "selected": [
    "codex-review-round26-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 3,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 18293.9326
  },
  "results": [
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 full-scope correction views preserve the old serialized contract and employee self links",
      "ms": 7659.5058,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 a transfer between supplementary creation and calculation must not leave the old branch able to read or revoke its exemption",
      "ms": 2544.9817,
      "pass": false,
      "error": "The original grantor must not read a carried copy in a foreign payroll\n\n200 !== 403\n",
      "cause": "The original grantor must not read a carried copy in a foreign payroll\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: The original grantor must not read a carried copy in a foreign payroll\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round26-independent.integration.cjs:71:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 dated organisation must govern the carried exemption just as it governs supplementary membership",
      "ms": 2037.617,
      "pass": false,
      "error": "Current profile placement must not disclose an exemption belonging to historical branch A\n\n200 !== 403\n",
      "cause": "Current profile placement must not disclose an exemption belonging to historical branch A\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Current profile placement must not disclose an exemption belonging to historical branch A\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round26-independent.integration.cjs:91:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 mixed supplementary header must not expose a foreign carried exemption reference in the parent event",
      "ms": 3620.6701,
      "pass": false,
      "error": "The parent payroll event must apply the same reference redaction as the exemption event",
      "cause": "The parent payroll event must apply the same reference redaction as the exemption event",
      "stack": "AssertionError [ERR_ASSERTION]: The parent payroll event must apply the same reference redaction as the exemption event\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round26-independent.integration.cjs:109:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 a transfer between supplementary creation and calculation must not leave the old branch able to read or revoke its exemption",
      "ms": 2544.9817,
      "pass": false,
      "error": "The original grantor must not read a carried copy in a foreign payroll\n\n200 !== 403\n",
      "cause": "The original grantor must not read a carried copy in a foreign payroll\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: The original grantor must not read a carried copy in a foreign payroll\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round26-independent.integration.cjs:71:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 dated organisation must govern the carried exemption just as it governs supplementary membership",
      "ms": 2037.617,
      "pass": false,
      "error": "Current profile placement must not disclose an exemption belonging to historical branch A\n\n200 !== 403\n",
      "cause": "Current profile placement must not disclose an exemption belonging to historical branch A\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Current profile placement must not disclose an exemption belonging to historical branch A\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round26-independent.integration.cjs:91:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round26-independent.integration.cjs",
      "name": "CR26 mixed supplementary header must not expose a foreign carried exemption reference in the parent event",
      "ms": 3620.6701,
      "pass": false,
      "error": "The parent payroll event must apply the same reference redaction as the exemption event",
      "cause": "The parent payroll event must apply the same reference redaction as the exemption event",
      "stack": "AssertionError [ERR_ASSERTION]: The parent payroll event must apply the same reference redaction as the exemption event\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round26-independent.integration.cjs:109:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"full-contract\",\"fullCorrectionDeepEqual\":true,\"fullItemDeepEqual\":true,\"readers\":[\"branch\",\"company\",\"admin\",\"employee-own\"],\"net\":7319.17}",
    "{\"case\":\"carry-before-transfer\",\"savedExemptionBranch\":1,\"memberBranch\":2,\"oldBranchRunStatus\":403,\"oldBranchExemptionStatus\":200,\"newBranchExemptionStatus\":403,\"oldBranchCanRevoke\":true,\"revokeStatus\":201,\"storedExemptionStatus\":\"REVOKED\",\"netBefore\":9000,\"netAfter\":8700}",
    "{\"case\":\"dated-carry-organisation\",\"effectiveTransfer\":\"2026-09-01\",\"payrollPeriod\":\"2026-07\",\"currentBranch\":2,\"memberBranch\":1,\"exemptionBranch\":2,\"rightfulStatus\":403,\"foreignStatus\":200,\"foreignAmount\":\"320.00\"}",
    "{\"case\":\"mixed-supplementary-event\",\"headerVisible\":true,\"headerNet\":null,\"foreignExemptionDirectStatus\":403,\"individualEventForeignId\":null,\"nearCopyId\":7,\"foreignCopyId\":8,\"scopedCarriedExemptions\":[{\"fromExemptionId\":5,\"exemptionId\":7,\"employeeId\":4},{\"fromExemptionId\":6,\"exemptionId\":8,\"employeeId\":5}],\"companyCopies\":2}",
    "tests 4",
    "suites 0",
    "pass 1",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18293.9326"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r26_independent_test_1006a08d67870986\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r26_independent_test_1006a08d67870986\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r26_independent_test_1006a08d67870986\"}\n"
  ]
}

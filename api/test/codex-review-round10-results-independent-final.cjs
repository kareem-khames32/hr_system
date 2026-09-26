module.exports = {
  "selected": [
    "codex-review-round10-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 1,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 20992.7712
  },
  "results": [
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 skip-level uses the same team then department fallback and routes confidential requests only to the resolved second manager",
      "ms": 10720.3334,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 top-step deduplication works when the removed step is first and the surviving named step is second",
      "ms": 312.2877,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 three-person manager cycle created through employee API must stop skip-level submission",
      "ms": 471.4714,
      "pass": false,
      "error": "Submission must reject a documented three-person manager cycle\n\n201 !== 400\n",
      "cause": "Submission must reject a documented three-person manager cycle\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Submission must reject a documented three-person manager cycle\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round10-independent.integration.cjs:66:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 executive parent does not expose its fields to branch B or extend its holiday and payroll scope",
      "ms": 2175.8118,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 simultaneous linking and executive reassignment cannot leave a foreign child under an ordinary parent",
      "ms": 142.8096,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 three-person manager cycle created through employee API must stop skip-level submission",
      "ms": 471.4714,
      "pass": false,
      "error": "Submission must reject a documented three-person manager cycle\n\n201 !== 400\n",
      "cause": "Submission must reject a documented three-person manager cycle\n\n201 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Submission must reject a documented three-person manager cycle\n\n201 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round10-independent.integration.cjs:66:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 4",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 20992.7712"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r10independent_test_3ea39cb84c2ccb1c\"}\n",
    "CR10_EVIDENCE {\"case\":\"team-department-fallback-confidential\",\"expected\":4,\"resolved\":4,\"directManagerBlocked\":true,\"finalStatus\":\"COMPLETED\"}\n",
    "CR10_EVIDENCE {\"case\":\"dedup-first-step\",\"remainingStepOrder\":2,\"finalStatus\":\"COMPLETED\",\"repeatRejected\":true}\n",
    "CR10_EVIDENCE {\"case\":\"three-person-cycle\",\"patchStatuses\":[200,200,200],\"submission\":201,\"resolved\":[10],\"expected\":\"reject circular manager structure\"}\n",
    "CR10_EVIDENCE {\"case\":\"tree-boundary-real-calculation\",\"foreignParentFieldsHidden\":true,\"foreignLink\":403,\"foreignHolidayOrder\":400,\"payrollEmployees\":[2],\"net\":6000,\"foreignSalaryExcluded\":9000}\n",
    "CR10_EVIDENCE {\"case\":\"department-tree-race\",\"statuses\":[200,400],\"foreignParentInvariant\":true,\"executiveCount\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r10independent_test_3ea39cb84c2ccb1c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r10independent_test_3ea39cb84c2ccb1c\"}\n"
  ]
}

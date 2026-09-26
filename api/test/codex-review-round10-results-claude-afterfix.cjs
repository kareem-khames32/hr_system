module.exports = {
  "selected": [
    "codex-review-round10-independent"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 5,
      "failed": 0,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 26534.1735
  },
  "results": [
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 skip-level uses the same team then department fallback and routes confidential requests only to the resolved second manager",
      "ms": 6209.9176,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 top-step deduplication works when the removed step is first and the surviving named step is second",
      "ms": 142.2551,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 three-person manager cycle created through employee API must stop skip-level submission",
      "ms": 171.3568,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 executive parent does not expose its fields to branch B or extend its holiday and payroll scope",
      "ms": 760.5438,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round10-independent.integration.cjs",
      "name": "CR10 simultaneous linking and executive reassignment cannot leave a foreign child under an ordinary parent",
      "ms": 54.2265,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 26534.1735"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r10independent_test_cf1c82a27b32e2d9\"}\n",
    "CR10_EVIDENCE {\"case\":\"team-department-fallback-confidential\",\"expected\":4,\"resolved\":4,\"directManagerBlocked\":true,\"finalStatus\":\"COMPLETED\"}\n",
    "CR10_EVIDENCE {\"case\":\"dedup-first-step\",\"remainingStepOrder\":2,\"finalStatus\":\"COMPLETED\",\"repeatRejected\":true}\n",
    "CR10_EVIDENCE {\"case\":\"three-person-cycle\",\"patchStatuses\":[200,200,200],\"submission\":400,\"resolved\":[],\"expected\":\"reject circular manager structure\"}\n",
    "CR10_EVIDENCE {\"case\":\"tree-boundary-real-calculation\",\"foreignParentFieldsHidden\":true,\"foreignLink\":403,\"foreignHolidayOrder\":400,\"payrollEmployees\":[2],\"net\":6000,\"foreignSalaryExcluded\":9000}\n",
    "CR10_EVIDENCE {\"case\":\"department-tree-race\",\"statuses\":[200,400],\"foreignParentInvariant\":true,\"executiveCount\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r10independent_test_cf1c82a27b32e2d9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r10independent_test_cf1c82a27b32e2d9\"}\n"
  ]
}

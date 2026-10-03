module.exports = {
  "selected": [
    "codex-review-round35-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 1,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 9167.3898
  },
  "results": [
    {
      "file": "codex-review-round35-independent.integration.cjs",
      "name": "CR35 real bonus deduction and loan reversal: foreign references hidden",
      "ms": 5494.2624,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round35-independent.integration.cjs",
      "name": "CR35 real bonus deduction and loan reversal: in-scope references preserved",
      "ms": 1433.1377,
      "pass": false,
      "error": "bonuses\n+ actual - expected\n\n  [\n    3,\n+   null\n-   4\n  ]\n",
      "cause": "bonuses\n+ actual - expected\n\n  [\n    3,\n+   null\n-   4\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: bonuses\n+ actual - expected\n\n  [\n    3,\n+   null\n-   4\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-independent.integration.cjs:59:32)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round35-independent.integration.cjs",
      "name": "CR35 real bonus deduction and loan reversal: in-scope references preserved",
      "ms": 1433.1377,
      "pass": false,
      "error": "bonuses\n+ actual - expected\n\n  [\n    3,\n+   null\n-   4\n  ]\n",
      "cause": "bonuses\n+ actual - expected\n\n  [\n    3,\n+   null\n-   4\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: bonuses\n+ actual - expected\n\n  [\n    3,\n+   null\n-   4\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round35-independent.integration.cjs:59:32)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"real-reversal-visibility\",\"foreign\":true,\"direct\":[403,403],\"net\":8755.44,\"loanCollected\":300.12,\"loanRestored\":600.24,\"storedEvidenceUnchanged\":true,\"checks\":[{\"route\":\"bonuses\",\"actual\":[null,null],\"expected\":[null,null],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد 123.45 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 123.45 قيدًا مستحقًا (#3) للمسير التكميلي أو التالي\"},{\"route\":\"deductions\",\"actual\":[null,null],\"expected\":[null,null],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد 67.89 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 67.89 قيدًا مستحقًا (#4) للمسير التكميلي أو التالي\"},{\"route\":\"loan-RESERVED\",\"actual\":[null],\"expected\":[null],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-PAYROLL_POSTED\",\"actual\":[null],\"expected\":[null],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-REVERSAL\",\"actual\":[null],\"expected\":[null],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\"}]}",
    "{\"case\":\"real-reversal-visibility\",\"foreign\":false,\"direct\":[200,200],\"net\":8755.44,\"loanCollected\":300.12,\"loanRestored\":600.24,\"storedEvidenceUnchanged\":true,\"checks\":[{\"route\":\"bonuses\",\"actual\":[3,null],\"expected\":[3,4],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد 123.45 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي\"},{\"route\":\"deductions\",\"actual\":[3,null],\"expected\":[3,4],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد 67.89 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي\"},{\"route\":\"loan-RESERVED\",\"actual\":[3],\"expected\":[3],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-PAYROLL_POSTED\",\"actual\":[3],\"expected\":[3],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-REVERSAL\",\"actual\":[null],\"expected\":[4],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\"}]}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9167.3898"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r35_independent_test_417e6f4d520cb9ca\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r35_independent_test_417e6f4d520cb9ca\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r35_independent_test_417e6f4d520cb9ca\"}\n"
  ]
}

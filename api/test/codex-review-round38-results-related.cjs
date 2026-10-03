module.exports = {
  "selected": [
    "codex-review-round38-related-periods"
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
    "duration_ms": 9824.8765
  },
  "results": [
    {
      "file": "codex-review-round38-related-periods.integration.cjs",
      "name": "CR38 real bonus deduction and loan reversal: foreign references hidden",
      "ms": 6030.5879,
      "pass": false,
      "error": "Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n",
      "cause": "Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round38-related-periods.integration.cjs:60:20)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round38-related-periods.integration.cjs",
      "name": "CR38 real bonus deduction and loan reversal: in-scope references preserved",
      "ms": 1508.1087,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round38-related-periods.integration.cjs",
      "name": "CR38 real bonus deduction and loan reversal: foreign references hidden",
      "ms": 6030.5879,
      "pass": false,
      "error": "Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n",
      "cause": "Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n",
      "stack": "AssertionError [ERR_ASSERTION]: Foreign payroll period must not survive event reference masking in bonus, deduction or loan views\n+ actual - expected\n\n+ [\n+   'bonuses',\n+   'deductions',\n+   'loan-REVERSAL'\n+ ]\n- []\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round38-related-periods.integration.cjs:60:20)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"real-reversal-visibility\",\"foreign\":true,\"direct\":[403,403],\"net\":8755.44,\"loanCollected\":300.12,\"loanRestored\":600.24,\"storedEvidenceUnchanged\":true,\"checks\":[{\"route\":\"bonuses\",\"actual\":[null,null],\"expected\":[null,null],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد 123.45 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 123.45 قيدًا مستحقًا (#3) للمسير التكميلي أو التالي\"},{\"route\":\"deductions\",\"actual\":[null,null],\"expected\":[null,null],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد 67.89 قيدًا مستحقًا للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد 67.89 قيدًا مستحقًا (#4) للمسير التكميلي أو التالي\"},{\"route\":\"loan-RESERVED\",\"actual\":[null],\"expected\":[null],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-PAYROLL_POSTED\",\"actual\":[null],\"expected\":[null],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-REVERSAL\",\"actual\":[null],\"expected\":[null],\"reason\":\"عكس صرف مسير 2026-07 بمسير العكس: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\",\"companyReason\":\"عكس صرف مسير 2026-07 (#1) بمسير العكس #2: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\"}]}",
    "{\"case\":\"real-reversal-visibility\",\"foreign\":false,\"direct\":[200,200],\"net\":8755.44,\"loanCollected\":300.12,\"loanRestored\":600.24,\"storedEvidenceUnchanged\":true,\"checks\":[{\"route\":\"bonuses\",\"actual\":[3,4],\"expected\":[3,4],\"reason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 123.45 قيدًا مستحقًا (#7) للمسير التكميلي أو التالي\"},{\"route\":\"deductions\",\"actual\":[3,4],\"expected\":[3,4],\"reason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد 67.89 قيدًا مستحقًا (#8) للمسير التكميلي أو التالي\"},{\"route\":\"loan-RESERVED\",\"actual\":[3],\"expected\":[3],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-PAYROLL_POSTED\",\"actual\":[3],\"expected\":[3],\"reason\":null,\"companyReason\":null},{\"route\":\"loan-REVERSAL\",\"actual\":[4],\"expected\":[4],\"reason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\",\"companyReason\":\"عكس صرف مسير 2026-07 (#3) بمسير العكس #4: أُعيد القسط مستحقًا (300.12 مخصوم سابقًا)\"}]}",
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9824.8765"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r38_independent_test_92df5ee4401da004\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r38_independent_test_92df5ee4401da004\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r38_independent_test_92df5ee4401da004\"}\n"
  ]
}

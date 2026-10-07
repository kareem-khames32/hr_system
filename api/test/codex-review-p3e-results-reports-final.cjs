module.exports = {
  "selected": [
    "codex-review-p3e-report-controls"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 12255.8204
  },
  "results": [
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-permission: final report identity rejects permission after real rendering",
      "ms": 9654.0031,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-disabled: final report identity rejects disabled after real rendering",
      "ms": 69.097,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3e-report-controls.integration.cjs",
      "name": "P3E-S-churn: final report identity rejects churn after real rendering",
      "ms": 129.9978,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12255.8204"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3e_reports_test_7f68c1c57cced1f9\"}\n",
    "REVIEW_MEASURE {\"case\":\"report-final-identity-permission\",\"builds\":1,\"sent\":0,\"failed\":1}\n",
    "REVIEW_MEASURE {\"case\":\"report-final-identity-disabled\",\"builds\":1,\"sent\":0,\"failed\":1}\n",
    "REVIEW_MEASURE {\"case\":\"report-final-identity-churn\",\"builds\":3,\"sent\":0,\"failed\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3e_reports_test_7f68c1c57cced1f9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3e_reports_test_7f68c1c57cced1f9\"}\n"
  ]
}

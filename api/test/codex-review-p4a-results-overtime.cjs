module.exports = {
  "selected": [
    "codex-review-p4a-overtime-history"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 10262.5512
  },
  "results": [
    {
      "file": "codex-review-p4a-overtime-history.integration.cjs",
      "name": "P4A-F02: verified current rule enables historical unverified overtime pricing",
      "ms": 7581.4671,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"date\":\"2026-09-04\",\"multiplier\":2,\"legalVerified\":false,\"companyMultiplier\":1.5}",
    "Cleanup verified: hr_overtime_legal_test_b04c664947efb136 is absent from sys.databases.",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10262.5512"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_overtime_legal_test_b04c664947efb136\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_overtime_legal_test_b04c664947efb136\"}\n"
  ]
}

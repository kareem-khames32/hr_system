module.exports = {
  "selected": [
    "codex-review-p4a-tax"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 12510.4302
  },
  "results": [
    {
      "file": "codex-review-p4a-tax.integration.cjs",
      "name": "P4A-F01: API activation accepts a verified successor but payroll deducts with its unverified predecessor",
      "ms": 8625.2022,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4a-tax.integration.cjs",
      "name": "P4A-F03: cancelled previous-month draft remains in tax of an approved later month",
      "ms": 1197.822,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"oldVerified\":false,\"tableVerified\":false,\"tax\":1482.5,\"net\":11867.5,\"approved\":true}",
    "{\"firstTax\":9566.67,\"secondTax\":1024.16,\"ytdNetIncome\":48350,\"days\":30,\"firstCancelled\":true,\"secondApproved\":true}",
    "Cleanup verified: hr_payroll_statutory_test_7cc9ed57be9311ea is absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12510.4302"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_7cc9ed57be9311ea\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_7cc9ed57be9311ea\"}\n"
  ]
}

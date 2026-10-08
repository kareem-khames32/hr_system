module.exports = {
  "selected": [
    "codex-review-p4b-tax"
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
    "duration_ms": 18938.0702
  },
  "results": [
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
      "ms": 8400.4298,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation",
      "ms": 1872.2796,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F03: missing source IDs in a legacy snapshot force recalculation",
      "ms": 576.5124,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F04: final approval and source reopening serialize in both actual request orders",
      "ms": 3696.0474,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F05: reversal after dependent approval removes both historical income and tax from the next calculation",
      "ms": 1681.153,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"activation\":400,\"historicalTax\":false,\"verifiedSuccessorTax\":true}",
    "{\"unfinalizedSource\":409,\"cancelledSource\":409,\"recalculatedTax\":1482.5,\"dependentReopen\":409}",
    "[{\"order\":\"approve-first\",\"first\":201,\"second\":409,\"waited\":true},{\"order\":\"reopen-first\",\"first\":201,\"second\":409,\"waited\":true}]",
    "{\"reversal\":13,\"dependentUnchanged\":true,\"nextSources\":[13],\"ytdIncome\":13350,\"ytdTax\":1482.5}",
    "Cleanup verified: hr_payroll_statutory_test_d046697bc57d9008 is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18938.0702"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_d046697bc57d9008\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_d046697bc57d9008\"}\n"
  ]
}

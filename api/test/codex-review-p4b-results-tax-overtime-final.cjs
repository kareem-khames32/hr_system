module.exports = {
  "selected": [
    "codex-review-p4b-tax",
    "codex-review-p4b-overtime-history"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 7,
      "failed": 0,
      "passed": 7,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 22180.6643
  },
  "results": [
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F01: activation rejects historical unverified rows; forced seed state cannot price them",
      "ms": 10154.9679,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F02: cancelling a calculated tax source blocks approval until actual recalculation",
      "ms": 1981.4102,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F03: missing source IDs in a legacy snapshot force recalculation",
      "ms": 594.5212,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F04: final approval and source reopening serialize in both actual request orders",
      "ms": 3699.1782,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F05: reversal after dependent approval removes both historical income and tax from the next calculation",
      "ms": 1738.1141,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-tax.integration.cjs",
      "name": "P4B-F06: the final approval-chain step also enforces finalized tax sources",
      "ms": 1103.1692,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p4b-overtime-history.integration.cjs",
      "name": "P4B-O01: both activation and runtime reject historical unverified overtime prices",
      "ms": 9034.5355,
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
    "{\"lastStep\":409,\"code\":\"PAYRUN-TAX-SOURCES-CHANGED\",\"sourceStatus\":\"CALCULATED\"}",
    "Cleanup verified: hr_payroll_statutory_test_68abebc25974c94d is absent from sys.databases.",
    "{\"activation\":400,\"ignoredMultiplier\":1.5,\"verifiedMultiplier\":2,\"unverifiedFingerprintUnchanged\":true}",
    "Cleanup verified: hr_overtime_legal_test_cb5dfb57daf974be is absent from sys.databases.",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 22180.6643"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_68abebc25974c94d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_68abebc25974c94d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_overtime_legal_test_cb5dfb57daf974be\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_overtime_legal_test_cb5dfb57daf974be\"}\n"
  ]
}

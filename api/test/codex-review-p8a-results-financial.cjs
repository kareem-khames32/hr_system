module.exports = {
  "selected": [
    "codex-review-p8a-payroll"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 30877.5887
  },
  "results": [
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F00: off payroll calculation, policy fingerprint and slip match approved baseline",
      "ms": 21945.1497,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F01: late pending correction versus final payroll approval",
      "ms": 1703.851,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F02: exemption preview omits missing-punch amount that execution later drops",
      "ms": 1207.7679,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F03: global lateness waiver also removes missing punch with exact slip sum",
      "ms": 1024.4166,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_ec7fa967f730c33e is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 30877.5887"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_ec7fa967f730c33e\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F00\",\"baseline\":\"cfd56bd4\",\"items\":2,\"snapshotAndHashEqual\":true,\"breakdownAndSlipEqual\":true}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F01\",\"approval\":201,\"pendingCorrection\":5,\"deduction\":75}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F02\",\"before\":93.75,\"estimated\":\"18.75\",\"after\":0,\"actualDropped\":93.75}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_ec7fa967f730c33e\"}\n"
  ]
}

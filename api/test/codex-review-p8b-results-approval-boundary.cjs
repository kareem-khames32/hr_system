module.exports = {
  "selected": [
    "codex-review-p8b-payroll"
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
    "duration_ms": 22342.7616
  },
  "results": [
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F00: off payroll calculation, policy fingerprint and slip match approved baseline",
      "ms": 13684.815,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F01: late pending correction versus final payroll approval",
      "ms": 1108.0324,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F02: exemption preview omits missing-punch amount that execution later drops",
      "ms": 953.0306,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F03: global lateness waiver also removes missing punch with exact slip sum",
      "ms": 769.3553,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F04: missing punch respects the net floor and exact payslip cents",
      "ms": 613.9715,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F05: enabled penalty does not waive an unrelated attendance review reason",
      "ms": 727.5362,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8b-payroll.integration.cjs",
      "name": "P8B-F06: request committed after the approval source check must not leave a stale approved charge",
      "ms": 787.9207,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_52e92f5bf79d6b8e is absent from sys.databases.",
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 22342.7616"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_52e92f5bf79d6b8e\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F00\",\"baseline\":\"cfd56bd4\",\"items\":2,\"snapshotAndHashEqual\":true,\"breakdownAndSlipEqual\":true}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F01\",\"approval\":409,\"code\":\"PAYRUN-MISSING-PUNCH-STALE\",\"pendingCorrection\":5,\"deduction\":75}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F02\",\"before\":93.75,\"estimated\":\"93.75\",\"after\":0,\"actualDropped\":93.75}\n",
    "REVIEW_MEASURE {\"case\":\"P8B-F06\",\"request\":201,\"requestState\":\"UNDER_REVIEW\",\"approval\":201,\"deduction\":75}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_52e92f5bf79d6b8e\"}\n"
  ]
}

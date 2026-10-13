module.exports = {
  "selected": [
    "codex-review-p8a-payroll",
    "codex-review-p8a-evaluator"
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
    "duration_ms": 25820.9163
  },
  "results": [
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F00: off payroll calculation, policy fingerprint and slip match approved baseline",
      "ms": 19687.6407,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F01: late pending correction versus final payroll approval",
      "ms": 1593.1689,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-evaluator.integration.cjs",
      "name": "P8A-R01: employee transferred after scope judgment before evaluator write",
      "ms": 17627.6839,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_fa73e787370b3b8a is absent from sys.databases.",
    "Cleanup verified: hr_review_evaluator_test_98114b234c397d39 is absent from sys.databases.",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 25820.9163"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_fa73e787370b3b8a\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F00\",\"baseline\":\"cfd56bd4\",\"items\":2,\"snapshotAndHashEqual\":true,\"breakdownAndSlipEqual\":true}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F01\",\"approval\":201,\"pendingCorrection\":5,\"deduction\":75}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_fa73e787370b3b8a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_98114b234c397d39\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R01-transfer\",\"status\":200}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R01\",\"status\":200,\"branch\":2,\"hrBranch\":1,\"manager\":3,\"chosen\":3}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_98114b234c397d39\"}\n"
  ]
}

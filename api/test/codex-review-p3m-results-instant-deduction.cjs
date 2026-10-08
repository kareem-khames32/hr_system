module.exports = {
  "selected": [
    "codex-review-p3m-penalties"
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
    "duration_ms": 10177.4671
  },
  "results": [
    {
      "file": "codex-review-p3m-penalties.integration.cjs",
      "name": "P3M-P05: penalty hook failure after instant approval rolls back finance and link together",
      "ms": 7294.9841,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10177.4671"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_e0be81bcbc08ec98\"}\n",
    "REVIEW_MEASURE {\"case\":\"P05\",\"approvedInside\":true,\"linkAndFinanceRolledBack\":true,\"retry\":201}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_e0be81bcbc08ec98\"}\n"
  ]
}

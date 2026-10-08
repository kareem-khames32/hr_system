module.exports = {
  "selected": [
    "codex-review-p3k-penalties"
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
    "duration_ms": 9706.2408
  },
  "results": [
    {
      "file": "codex-review-p3k-penalties.integration.cjs",
      "name": "P3K-P01: unchanged occurrence accepts a different monetary penalty than preview",
      "ms": 6984.6029,
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
    "duration_ms 9706.2408"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_e9077b36343303eb\"}\n",
    "REVIEW_MEASURE {\"case\":\"P01\",\"previewDays\":1,\"signedDays\":2,\"deductionDays\":2,\"deductionStatus\":\"IN_APPROVAL\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_e9077b36343303eb\"}\n"
  ]
}

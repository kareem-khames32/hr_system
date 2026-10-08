module.exports = {
  "selected": [
    "codex-review-p3k-preboarding"
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
    "duration_ms": 10496.8333
  },
  "results": [
    {
      "file": "codex-review-p3k-preboarding.integration.cjs",
      "name": "P3K-B01: a preboarding HR manager still reads and completes HR role tasks",
      "ms": 7868.464,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_preboarding_test_fe7fe2525f75d3dd",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10496.8333"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_preboarding_test_fe7fe2525f75d3dd\"}\n",
    "REVIEW_MEASURE {\"case\":\"B01\",\"preboarding\":true,\"permissions\":[],\"roleTaskRead\":200,\"roleTaskComplete\":201}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_preboarding_test_fe7fe2525f75d3dd\"}\n"
  ]
}

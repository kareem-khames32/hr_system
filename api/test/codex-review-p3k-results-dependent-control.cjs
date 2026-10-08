module.exports = {
  "selected": [
    "codex-review-p3k-dependent-control"
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
    "duration_ms": 7408.1601
  },
  "results": [
    {
      "file": "codex-review-p3k-dependent-control.integration.cjs",
      "name": "P3K-D01: dependent write waits for employee, then applies current branch and serializes duplicate identity",
      "ms": 4944.7451,
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
    "duration_ms 7408.1601"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3k_dependent_control_test_7807e20a8069a196\"}\n",
    "REVIEW_MEASURE {\"case\":\"D01\",\"waited\":true,\"movedEmployeeWrite\":404,\"concurrentDuplicate\":[201,409],\"rows\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3k_dependent_control_test_7807e20a8069a196\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3k_dependent_control_test_7807e20a8069a196\"}\n"
  ]
}

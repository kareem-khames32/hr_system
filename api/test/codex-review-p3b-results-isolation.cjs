module.exports = {
  "selected": [
    "codex-review-p3b-isolation"
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
    "duration_ms": 7147.808
  },
  "results": [
    {
      "file": "codex-review-p3b-isolation.integration.cjs",
      "name": "P3B-H01: moved department identities are hidden and aggregated with identical update responses",
      "ms": 4595.807,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3b-isolation.integration.cjs",
      "name": "P3B-H02: same-branch team moves remain visible; outside moves hide name and ID until returned",
      "ms": 126.1761,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7147.808"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3b_isolation_test_0b083fdf2dd9564b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3b_isolation_test_0b083fdf2dd9564b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3b_isolation_test_0b083fdf2dd9564b\"}\n"
  ]
}

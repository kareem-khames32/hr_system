module.exports = {
  "selected": [
    "codex-review-p3i-range-locks"
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
    "duration_ms": 7580.9353
  },
  "results": [
    {
      "file": "codex-review-p3i-range-locks.integration.cjs",
      "name": "P3I-R-gaps: two absent preset codes sharing a unique-index range serialize without a cycle",
      "ms": 4958.1517,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3i-range-locks.integration.cjs",
      "name": "P3I-R-create-first: assignment waits for a new role transaction and sees its committed bundle",
      "ms": 100.6404,
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
    "duration_ms 7580.9353"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3i_range_locks_test_4b5948925c26e602\"}\n",
    "REVIEW_MEASURE {\"case\":\"adjacent-absent-role-ranges\",\"realSqlWait\":true,\"statuses\":[200,200]}\n",
    "REVIEW_MEASURE {\"case\":\"role-create-before-assignment\",\"realSqlWait\":true,\"statuses\":[201,200]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3i_range_locks_test_4b5948925c26e602\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3i_range_locks_test_4b5948925c26e602\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p3j-slot-races"
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
    "duration_ms": 6991.3823
  },
  "results": [
    {
      "file": "codex-review-p3j-slot-races.integration.cjs",
      "name": "P3J-S-unlink: freeing the old employee slot does not form a cycle with first domain login",
      "ms": 4550.7597,
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
    "duration_ms 6991.3823"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3j_slot_races_test_9faab8e0c9043caa\"}\n",
    "REVIEW_MEASURE {\"case\":\"unlink-and-first-domain-login\",\"sqlWait\":true,\"statuses\":[200,409],\"retry\":201,\"accounts\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3j_slot_races_test_9faab8e0c9043caa\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3j_slot_races_test_9faab8e0c9043caa\"}\n"
  ]
}

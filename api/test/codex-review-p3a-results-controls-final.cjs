module.exports = {
  "selected": [
    "codex-review-p3a-controls",
    "codex-review-p3a-seat-races",
    "codex-review-p3a-seat-snapshot"
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
    "duration_ms": 14438.8986
  },
  "results": [
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C01: hidden position and employee responses equal nonexistent resources",
      "ms": 4933.93,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C02: holder move removes identity from the old branch detail and counts",
      "ms": 140.8646,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C03: department staging overrides input; concurrent approvals combine once",
      "ms": 243.8907,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C04: an already moved request department rejects before waiting; serial generation preserves a team holder",
      "ms": 214.6804,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C05: position mutations and request execution use only their transaction SQL connection",
      "ms": 204.1118,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-seat-races.integration.cjs",
      "name": "P3A-S1: competing holders on the final seat (RCSI=false)",
      "ms": 5000.1581,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-seat-snapshot.integration.cjs",
      "name": "P3A-S2: competing holders on the final seat (RCSI=true)",
      "ms": 4584.435,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 7",
    "suites 0",
    "pass 7",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14438.8986"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3a_controls_test_9a8df310c6c2f30f\"}\n",
    "REVIEW_MEASURE {\"case\":\"transaction-connection-trace\",\"calls\":{\"own\":57,\"foreign\":0},\"bad\":[]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3a_controls_test_9a8df310c6c2f30f\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3a_controls_test_9a8df310c6c2f30f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3a_seat_locking_test_3ff6ac04bf98b21c\"}\n",
    "REVIEW_MEASURE {\"case\":\"last-seat\",\"rcsi\":false,\"statuses\":[201,409],\"occupied\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3a_seat_locking_test_3ff6ac04bf98b21c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3a_seat_locking_test_3ff6ac04bf98b21c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3a_seat_snapshot_test_b0fd1e2ffdcd40b1\"}\n",
    "REVIEW_MEASURE {\"case\":\"last-seat\",\"rcsi\":true,\"statuses\":[409,201],\"occupied\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3a_seat_snapshot_test_b0fd1e2ffdcd40b1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3a_seat_snapshot_test_b0fd1e2ffdcd40b1\"}\n"
  ]
}

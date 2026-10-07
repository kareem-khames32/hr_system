module.exports = {
  "selected": [
    "codex-review-p3a-controls",
    "codex-review-p3a-seat-races"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 7,
      "failed": 1,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 7,
      "suites": 0
    },
    "duration_ms": 32497.3755
  },
  "results": [
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C01: hidden position and employee responses equal nonexistent resources",
      "ms": 5020.4182,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C02: holder move removes identity from the old branch detail and counts",
      "ms": 163.0791,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C03: department staging overrides input; concurrent approvals combine once",
      "ms": 225.561,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C04: an already moved request department rejects before waiting; serial generation preserves a team holder",
      "ms": 227.3819,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-controls.integration.cjs",
      "name": "P3A-C05: position mutations and request execution use only their transaction SQL connection",
      "ms": 208.9455,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-seat-races.integration.cjs",
      "name": "P3A-S1: competing holders on the final seat (RCSI=false)",
      "ms": 5159.8915,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3a-seat-races.integration.cjs",
      "name": "P3A-S2: competing holders on the final seat (RCSI=true)",
      "ms": 24878.3083,
      "pass": false,
      "error": "Login failed for user 'sa'.",
      "cause": "Login failed for user 'sa'.",
      "stack": "ConnectionError: Login failed for user 'sa'.\n    at connectListener (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\connection-pool.js:86:17)\n    at Connection.onConnect (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1823:9)\n    at Object.onceWrapper (node:events:623:26)\n    at Connection.emit (node:events:508:28)\n    at Connection.emit (node:domain:489:12)\n    at Connection.emit (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1985:18)\n    at D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1845:14\n    at processTicksAndRejections (node:internal/process/task_queues:84:11)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3a-seat-races.integration.cjs",
      "name": "P3A-S2: competing holders on the final seat (RCSI=true)",
      "ms": 24878.3083,
      "pass": false,
      "error": "Login failed for user 'sa'.",
      "cause": "Login failed for user 'sa'.",
      "stack": "ConnectionError: Login failed for user 'sa'.\n    at connectListener (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\connection-pool.js:86:17)\n    at Connection.onConnect (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1823:9)\n    at Object.onceWrapper (node:events:623:26)\n    at Connection.emit (node:events:508:28)\n    at Connection.emit (node:domain:489:12)\n    at Connection.emit (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1985:18)\n    at D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1845:14\n    at processTicksAndRejections (node:internal/process/task_queues:84:11)"
    }
  ],
  "diagnostics": [
    "tests 7",
    "suites 0",
    "pass 6",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 32497.3755"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3a_controls_test_29a11abd275eb466\"}\n",
    "REVIEW_MEASURE {\"case\":\"transaction-connection-trace\",\"calls\":{\"own\":57,\"foreign\":0},\"bad\":[]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3a_controls_test_29a11abd275eb466\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3a_controls_test_29a11abd275eb466\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3a_seat_locking_test_79e20f7788e9db15\"}\n",
    "REVIEW_MEASURE {\"case\":\"last-seat\",\"rcsi\":false,\"statuses\":[201,409],\"occupied\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3a_seat_locking_test_79e20f7788e9db15\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3a_seat_locking_test_79e20f7788e9db15\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3a_seat_snapshot_test_89b7e1187b142ccc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3a_seat_snapshot_test_89b7e1187b142ccc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3a_seat_snapshot_test_89b7e1187b142ccc\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2n-concurrency",
    "codex-review-p2n-streams"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 1,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 36145.6093
  },
  "results": [
    {
      "file": "codex-review-p2n-concurrency.integration.cjs",
      "name": "P2N concurrent issue, ack/cancel and late task links with RCSI=false",
      "ms": 6499.2236,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2n-concurrency.integration.cjs",
      "name": "P2N concurrent issue, ack/cancel and late task links with RCSI=true",
      "ms": 24758.9955,
      "pass": false,
      "error": "Login failed for user 'sa'.",
      "cause": "Login failed for user 'sa'.",
      "stack": "ConnectionError: Login failed for user 'sa'.\n    at connectListener (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\connection-pool.js:86:17)\n    at Connection.onConnect (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1823:9)\n    at Object.onceWrapper (node:events:623:26)\n    at Connection.emit (node:events:508:28)\n    at Connection.emit (node:domain:489:12)\n    at Connection.emit (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1985:18)\n    at D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1845:14\n    at processTicksAndRejections (node:internal/process/task_queues:84:11)"
    },
    {
      "file": "codex-review-p2n-streams.integration.cjs",
      "name": "P2N stream: exact bytes across chunk boundaries; preflight hashes the same bytes",
      "ms": 83.3943,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2n-streams.integration.cjs",
      "name": "P2N stream: same-size, shorter, larger and trailing-chunk replacements cannot complete the advertised length",
      "ms": 8.3103,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2n-streams.integration.cjs",
      "name": "P2N stream: disconnect and source failure close file descriptors; subsequent requests remain healthy",
      "ms": 16.4243,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2n-concurrency.integration.cjs",
      "name": "P2N concurrent issue, ack/cancel and late task links with RCSI=true",
      "ms": 24758.9955,
      "pass": false,
      "error": "Login failed for user 'sa'.",
      "cause": "Login failed for user 'sa'.",
      "stack": "ConnectionError: Login failed for user 'sa'.\n    at connectListener (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\connection-pool.js:86:17)\n    at Connection.onConnect (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1823:9)\n    at Object.onceWrapper (node:events:623:26)\n    at Connection.emit (node:events:508:28)\n    at Connection.emit (node:domain:489:12)\n    at Connection.emit (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1985:18)\n    at D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:1845:14\n    at processTicksAndRejections (node:internal/process/task_queues:84:11)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"isolation-and-late-links\",\"rcsi\":false,\"concurrentIssuers\":3,\"documents\":1,\"ackCancel\":[404,201],\"lateLinkCases\":4}",
    "tests 5",
    "suites 0",
    "pass 4",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 36145.6093"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2n_rc_test_232e4892e2e127a7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2n_rc_test_232e4892e2e127a7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2n_rc_test_232e4892e2e127a7\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2n_rcsi_test_f1ef018981429d25\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2n_rcsi_test_f1ef018981429d25\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2n_rcsi_test_f1ef018981429d25\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n"
  ]
}

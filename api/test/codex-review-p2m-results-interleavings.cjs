module.exports = {
  "selected": [
    "codex-review-p2m-interleavings"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 2835.1656
  },
  "results": [
    {
      "file": "codex-review-p2m-interleavings.integration.cjs",
      "name": "P2M interleavings: later completed flag read wins for every true/false/failure pair and return order",
      "ms": 3.0358,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-interleavings.integration.cjs",
      "name": "P2M interleavings: two overlapping writes, either failure and either finish order release all write state",
      "ms": 7.3897,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-interleavings.integration.cjs",
      "name": "P2M interleavings: failed post-write probe preserves success and error; delayed pre-write read and check cannot seed cache",
      "ms": 0.6615,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-interleavings.integration.cjs",
      "name": "P2M identity cache: account, employee and token version are independent cache boundaries; a declined account check is not cached",
      "ms": 0.1955,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"flag-order-matrix\",\"cases\":18}",
    "{\"case\":\"overlapping-writes\",\"cases\":8}",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 2835.1656"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n"
  ]
}

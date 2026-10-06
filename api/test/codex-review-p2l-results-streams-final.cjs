module.exports = {
  "selected": [
    "codex-review-p2l-streams"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 2486.2079
  },
  "results": [
    {
      "file": "codex-review-p2l-streams.integration.cjs",
      "name": "P2L stream: exact bytes across chunk boundaries; preflight hashes the same bytes",
      "ms": 80.4498,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2l-streams.integration.cjs",
      "name": "P2L stream: same-size, shorter, larger and trailing-chunk replacements cannot complete the advertised length",
      "ms": 18.5214,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2l-streams.integration.cjs",
      "name": "P2L stream: disconnect and source failure close file descriptors; subsequent requests remain healthy",
      "ms": 7.0699,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 2486.2079"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n"
  ]
}

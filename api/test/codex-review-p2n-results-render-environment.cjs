module.exports = {
  "selected": [
    "codex-review-p2n-render-environment"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 0,
      "cancelled": 0,
      "skipped": 1,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 3570.6501
  },
  "results": [
    {
      "file": "codex-review-p2n-render-environment.integration.cjs",
      "name": "P2N classify native PDF rendering availability without starting any service",
      "ms": 730.8305,
      "pass": true,
      "skip": "Native Chromium is unavailable in the review sandbox; use deterministic PDF bytes for changed paths"
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"nativeRenderer\":false,\"name\":\"Error\",\"code\":null,\"message\":\"The browser is already running for D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p2n-tmp\\\\puppeteer_dev_chrome_profile-RNhH0W. Use a different `userDataDir` or stop the running browser first.\"}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 0",
    "cancelled 0",
    "skipped 1",
    "todo 0",
    "duration_ms 3570.6501"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round20-currency-session"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 1,
      "failed": 1,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 2371.5698
  },
  "results": [
    {
      "file": "codex-review-round20-currency-session.integration.cjs",
      "name": "CR20 a fresh login by the same user reloads the branch currency context",
      "ms": 132.9066,
      "pass": false,
      "error": "New login must not reuse the previous branch currency\n\n'ج.م' !== 'ر.س'\n",
      "cause": "New login must not reuse the previous branch currency\n\n'ج.م' !== 'ر.س'\n",
      "stack": "AssertionError [ERR_ASSERTION]: New login must not reuse the previous branch currency\n\n'ج.م' !== 'ر.س'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\codex-review-round20-currency-session.integration.cjs:25:12)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round20-currency-session.integration.cjs",
      "name": "CR20 a fresh login by the same user reloads the branch currency context",
      "ms": 132.9066,
      "pass": false,
      "error": "New login must not reuse the previous branch currency\n\n'ج.م' !== 'ر.س'\n",
      "cause": "New login must not reuse the previous branch currency\n\n'ج.م' !== 'ر.س'\n",
      "stack": "AssertionError [ERR_ASSERTION]: New login must not reuse the previous branch currency\n\n'ج.م' !== 'ر.س'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\codex-review-round20-currency-session.integration.cjs:25:12)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"same-user-new-login\",\"httpCalls\":1,\"expectedCurrency\":\"ر.س\",\"shownCurrency\":\"ج.م\",\"sessionBranch\":2,\"cachedBranchIds\":[1]}",
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 2371.5698"
  ],
  "stdout": []
}

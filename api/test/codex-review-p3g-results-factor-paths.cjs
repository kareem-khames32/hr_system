module.exports = {
  "selected": [
    "codex-review-p3g-factor-paths"
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
    "duration_ms": 7156.3337
  },
  "results": [
    {
      "file": "codex-review-p3g-factor-paths.integration.cjs",
      "name": "P3G-F-domain: domain login rechecks enrollment after opening the new session",
      "ms": 4598.5268,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3g-factor-paths.integration.cjs",
      "name": "P3G-F-client: a client cannot claim factorProven in a password login",
      "ms": 78.4648,
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
    "duration_ms 7156.3337"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3g_factor_paths_test_f9848f35ee87c753\"}\n",
    "REVIEW_MEASURE {\"case\":\"domain-activation-and-client-factor-proven\",\"activation\":200,\"login\":401,\"tokenIssued\":false,\"activeSessions\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3g_factor_paths_test_f9848f35ee87c753\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3g_factor_paths_test_f9848f35ee87c753\"}\n"
  ]
}

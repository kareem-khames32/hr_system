module.exports = {
  "selected": [
    "codex-review-p2y-independent"
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
    "duration_ms": 7822.249
  },
  "results": [
    {
      "file": "codex-review-p2y-independent.integration.cjs",
      "name": "P2Y creator loses new read and decision routes when assign_any is revoked",
      "ms": 4715.0671,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2y-independent.integration.cjs",
      "name": "P2Y a personal task follows its current direct manager across detail, log and comments",
      "ms": 178.6341,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2y-independent.integration.cjs",
      "name": "P2Y two ratings serialize and feature-off reopening clears the old rating atomically",
      "ms": 231.6631,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2y-independent.integration.cjs",
      "name": "P2Y system comments use live access when distributing an extension mention",
      "ms": 180.874,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7822.249"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2y_controls_test_15a411aab0f11c93\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2y_controls_test_15a411aab0f11c93\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2y_controls_test_15a411aab0f11c93\"}\n"
  ]
}

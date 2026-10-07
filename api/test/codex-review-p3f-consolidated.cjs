module.exports = {
  "target": "419a41eb1fb0c85574185e01184d64ac50a897d7",
  "total": 96,
  "passed": 92,
  "failed": 4,
  "runs": [
    {
      "file": "codex-review-p3f-results-closure.cjs",
      "counts": {
        "tests": 18,
        "failed": 0,
        "passed": 18,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 18,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3f-results-new-races.cjs",
      "counts": {
        "tests": 5,
        "failed": 3,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3f-results-role-writer.cjs",
      "counts": {
        "tests": 1,
        "failed": 1,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 1,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3f-results-regression.cjs",
      "counts": {
        "tests": 72,
        "failed": 0,
        "passed": 72,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 72,
        "suites": 0
      }
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3f-session-boundary.integration.cjs",
      "name": "P3F-S-password: password-only login cannot open a new full session after TOTP activation committed",
      "ms": 266.7908,
      "pass": false,
      "error": "a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n",
      "cause": "a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n",
      "stack": "AssertionError [ERR_ASSERTION]: a password-only login must not issue a usable session whose row opened after activation\n\n200 !== null\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-session-boundary.integration.cjs:47:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3f-version-writers.integration.cjs",
      "name": "P3F-V-role: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 5087.4126,
      "pass": false,
      "error": "a stale reset cannot pass after promotion and ordinary account editing",
      "cause": "a stale reset cannot pass after promotion and ordinary account editing",
      "stack": "AssertionError [ERR_ASSERTION]: a stale reset cannot pass after promotion and ordinary account editing\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-version-writers.integration.cjs:31:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3f-version-writers.integration.cjs",
      "name": "P3F-V-override: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset",
      "ms": 325.9586,
      "pass": false,
      "error": "a stale reset cannot pass after promotion and ordinary account editing",
      "cause": "a stale reset cannot pass after promotion and ordinary account editing",
      "stack": "AssertionError [ERR_ASSERTION]: a stale reset cannot pass after promotion and ordinary account editing\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-version-writers.integration.cjs:31:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3f-version-writers.integration.cjs",
      "name": "P3F-V-role-name: renaming a stale role cannot restore elevated permissions without moving the account version",
      "ms": 19460.4152,
      "pass": false,
      "error": "restoring a stronger role must invalidate an earlier reset judgement",
      "cause": "restoring a stronger role must invalidate an earlier reset judgement",
      "stack": "AssertionError [ERR_ASSERTION]: restoring a stronger role must invalidate an earlier reset judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3f-version-writers.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "staticChecks": {
    "target": "419a41eb1fb0c85574185e01184d64ac50a897d7",
    "results": [
      {
        "area": "api",
        "exitCode": 0,
        "diagnostics": ""
      },
      {
        "area": ".",
        "exitCode": 0,
        "diagnostics": ""
      }
    ]
  }
}

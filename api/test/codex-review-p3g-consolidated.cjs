module.exports = {
  "target": "f0983dfdc263836113a5a2875b77b6058afc9dce",
  "total": 126,
  "passed": 123,
  "failed": 3,
  "runs": [
    {
      "file": "codex-review-p3g-results-closure.cjs",
      "counts": {
        "tests": 21,
        "failed": 0,
        "passed": 21,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 21,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3g-results-writers.cjs",
      "counts": {
        "tests": 6,
        "failed": 2,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 6,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3g-results-overlap-final.cjs",
      "counts": {
        "tests": 3,
        "failed": 1,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3g-results-factor-paths.cjs",
      "counts": {
        "tests": 2,
        "failed": 0,
        "passed": 2,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3g-results-regression.cjs",
      "counts": {
        "tests": 94,
        "failed": 0,
        "passed": 94,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 94,
        "suites": 0
      }
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3g-password-race.integration.cjs",
      "name": "P3G-P-role: changing a password must not reissue revoked authority with the current version",
      "ms": 5336.5057,
      "pass": false,
      "error": "new password session must not restore authority revoked before its row was opened",
      "cause": "new password session must not restore authority revoked before its row was opened",
      "stack": "AssertionError [ERR_ASSERTION]: new password session must not restore authority revoked before its row was opened\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-password-race.integration.cjs:32:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3g-password-race.integration.cjs",
      "name": "P3G-P-legacy-grant: changing a password must not reissue revoked authority with the current version",
      "ms": 381.5497,
      "pass": false,
      "error": "new password session must not restore authority revoked before its row was opened",
      "cause": "new password session must not restore authority revoked before its row was opened",
      "stack": "AssertionError [ERR_ASSERTION]: new password session must not restore authority revoked before its row was opened\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-password-race.integration.cjs:32:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3g-account-role-concurrency.integration.cjs",
      "name": "P3G-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated",
      "ms": 108.4062,
      "pass": false,
      "error": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "cause": "a manager must not assign a role that acquired admin-only permissions after the original judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a manager must not assign a role that acquired admin-only permissions after the original judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3g-account-role-concurrency.integration.cjs:40:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "staticChecks": {
    "target": "f0983dfdc263836113a5a2875b77b6058afc9dce",
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
  },
  "fixtureCorrections": [
    {
      "run": "codex-review-p3g-results-overlap.cjs",
      "detail": "Two lock-order controls initially asserted a displayName update that the account DTO does not expose. Changed only our new test to isActive:false, an accepted field; both real SQL lock orders then passed. No product defect counted from these two initial assertions."
    }
  ]
}

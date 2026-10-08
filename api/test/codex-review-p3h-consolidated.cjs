module.exports = {
  "target": "b53a0115a2e74448ca1d97220142ccc7394857de",
  "total": 161,
  "passed": 156,
  "failed": 5,
  "runs": [
    {
      "file": "codex-review-p3h-results-closure.cjs",
      "counts": {
        "tests": 23,
        "failed": 0,
        "passed": 23,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 23,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3h-results-permission-races.cjs",
      "counts": {
        "tests": 3,
        "failed": 3,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3h-results-remaining-paths.cjs",
      "counts": {
        "tests": 2,
        "failed": 2,
        "passed": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 2,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3h-results-fix-controls.cjs",
      "counts": {
        "tests": 3,
        "failed": 0,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 3,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3h-results-regression.cjs",
      "counts": {
        "tests": 130,
        "failed": 0,
        "passed": 130,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 130,
        "suites": 0
      }
    },
    {
      "file": "codex-review-p3h-results-domain-final.cjs",
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
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3h-permission-races.integration.cjs",
      "name": "P3H-O-bundle: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 4564.8296,
      "pass": false,
      "error": "a permission writer must reject an obsolete authority/scope judgement",
      "cause": "a permission writer must reject an obsolete authority/scope judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a permission writer must reject an obsolete authority/scope judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-permission-races.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3h-permission-races.integration.cjs",
      "name": "P3H-O-overrides: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 87.5075,
      "pass": false,
      "error": "a permission writer must reject an obsolete authority/scope judgement",
      "cause": "a permission writer must reject an obsolete authority/scope judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a permission writer must reject an obsolete authority/scope judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-permission-races.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3h-permission-races.integration.cjs",
      "name": "P3H-O-scope: permission replacement must retain the identity and effective-rights judgement through the write",
      "ms": 98.9296,
      "pass": false,
      "error": "a permission writer must reject an obsolete authority/scope judgement",
      "cause": "a permission writer must reject an obsolete authority/scope judgement",
      "stack": "AssertionError [ERR_ASSERTION]: a permission writer must reject an obsolete authority/scope judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-permission-races.integration.cjs:28:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3h-unseeded-role.integration.cjs",
      "name": "P3H-U-preset: a missing role row must stay pinned after the final roleStamp read",
      "ms": 4987.5038,
      "pass": false,
      "error": "role creation after the final absent-row read must not bypass the assignment judgement",
      "cause": "role creation after the final absent-row read must not bypass the assignment judgement",
      "stack": "AssertionError [ERR_ASSERTION]: role creation after the final absent-row read must not bypass the assignment judgement\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-unseeded-role.integration.cjs:26:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3h-domain-rebinding.integration.cjs",
      "name": "P3H-D-link: a sync link must not attach a directory identity to an account rebound to a different employee",
      "ms": 19383.6022,
      "pass": false,
      "error": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "cause": "directory identity matched to employee A must not enter as employee B through the obsolete sync plan",
      "stack": "AssertionError [ERR_ASSERTION]: directory identity matched to employee A must not enter as employee B through the obsolete sync plan\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3h-domain-rebinding.integration.cjs:25:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "staticChecks": {
    "target": "b53a0115a2e74448ca1d97220142ccc7394857de",
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
  "excludedByRunner": [
    "domain-login-two-factor.integration.cjs"
  ],
  "notes": [
    "The domain-rebinding case was repeated with a protected /auth/me request proving the returned session enters as employee B. The final result replaces the earlier result for distinct-test counting.",
    "No product or pre-existing test was changed. Old P3G next-role barrier was moved in a new P3H copy to before the first role-row lock."
  ]
}

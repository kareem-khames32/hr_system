module.exports = {
  "selected": [
    "codex-review-p3d-auth-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 3,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 9889.1131
  },
  "results": [
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 6303.1658,
      "pass": false,
      "error": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n",
      "cause": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:22:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 527.2729,
      "pass": false,
      "error": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n",
      "cause": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n",
      "stack": "AssertionError [ERR_ASSERTION]: the obsolete email factor must not open a fresh full session\n\n200 !== 401\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:36:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 333.3937,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:43:85)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 6303.1658,
      "pass": false,
      "error": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n",
      "cause": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:22:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 527.2729,
      "pass": false,
      "error": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n",
      "cause": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n",
      "stack": "AssertionError [ERR_ASSERTION]: the obsolete email factor must not open a fresh full session\n\n200 !== 401\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:36:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 333.3937,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n404 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n404 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n404 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:43:85)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 0",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9889.1131"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3d_auth_test_1149e0334036eaa1\"}\n",
    "REVIEW_MEASURE {\"case\":\"mfa-reset-stronger-account\",\"passwordReset\":403,\"totpReset\":200,\"enabledAfter\":false}\n",
    "REVIEW_MEASURE {\"case\":\"email-challenge-after-totp-enrollment\",\"verifyStatus\":200,\"unrestrictedAccess\":200}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3d_auth_test_1149e0334036eaa1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3d_auth_test_1149e0334036eaa1\"}\n"
  ]
}

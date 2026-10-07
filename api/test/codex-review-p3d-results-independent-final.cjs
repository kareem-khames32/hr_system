module.exports = {
  "selected": [
    "codex-review-p3d-auth-independent",
    "codex-review-p3d-data-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 4,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 10169.7547
  },
  "results": [
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 6340.9681,
      "pass": false,
      "error": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n",
      "cause": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:22:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 528.591,
      "pass": false,
      "error": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n",
      "cause": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n",
      "stack": "AssertionError [ERR_ASSERTION]: the obsolete email factor must not open a fresh full session\n\n200 !== 401\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:36:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes",
      "ms": 392.0609,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D01: scheduled report must revalidate its owner after rendering and before sending",
      "ms": 6273.547,
      "pass": false,
      "error": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n",
      "cause": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:26:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D02: manager team view cannot reveal a department moved outside the reader branch",
      "ms": 138.1264,
      "pass": false,
      "error": "a current foreign unit name must not be projected through an in-scope employee",
      "cause": "a current foreign unit name must not be projected through an in-scope employee",
      "stack": "AssertionError [ERR_ASSERTION]: a current foreign unit name must not be projected through an in-scope employee\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:36:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D03: announcements disappear from board, notifications and read route after account rebinding",
      "ms": 322.5638,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A01: a delegated users manager cannot reset MFA on a stronger administrative account",
      "ms": 6340.9681,
      "pass": false,
      "error": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n",
      "cause": "MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: MFA reset must apply the existing stronger-account boundary\n\n200 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:22:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3d-auth-independent.integration.cjs",
      "name": "P3D-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation",
      "ms": 528.591,
      "pass": false,
      "error": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n",
      "cause": "the obsolete email factor must not open a fresh full session\n\n200 !== 401\n",
      "stack": "AssertionError [ERR_ASSERTION]: the obsolete email factor must not open a fresh full session\n\n200 !== 401\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-auth-independent.integration.cjs:36:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D01: scheduled report must revalidate its owner after rendering and before sending",
      "ms": 6273.547,
      "pass": false,
      "error": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n",
      "cause": "the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: the outgoing attachment must not retain the revoked scope\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:26:10)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-p3d-data-independent.integration.cjs",
      "name": "P3D-D02: manager team view cannot reveal a department moved outside the reader branch",
      "ms": 138.1264,
      "pass": false,
      "error": "a current foreign unit name must not be projected through an in-scope employee",
      "cause": "a current foreign unit name must not be projected through an in-scope employee",
      "stack": "AssertionError [ERR_ASSERTION]: a current foreign unit name must not be projected through an in-scope employee\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3d-data-independent.integration.cjs:36:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 6",
    "suites 0",
    "pass 2",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10169.7547"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3d_auth_test_17c192625c7281bd\"}\n",
    "REVIEW_MEASURE {\"case\":\"mfa-reset-stronger-account\",\"passwordReset\":403,\"totpReset\":200,\"enabledAfter\":false}\n",
    "REVIEW_MEASURE {\"case\":\"email-challenge-after-totp-enrollment\",\"verifyStatus\":200,\"unrestrictedAccess\":200}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3d_auth_test_17c192625c7281bd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3d_auth_test_17c192625c7281bd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3d_data_test_c6dc52a0f18acf0a\"}\n",
    "REVIEW_MEASURE {\"case\":\"scheduled-report-scope-after-render\",\"sent\":1,\"foreignBranchInAttachment\":true}\n",
    "REVIEW_MEASURE {\"case\":\"team-foreign-unit-name\",\"employeeInReaderBranch\":true,\"departmentInOtherBranch\":true,\"shownDepartment\":\"Synthetic private department\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3d_data_test_c6dc52a0f18acf0a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3d_data_test_c6dc52a0f18acf0a\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round25-boundaries"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 1,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 15204.1606
  },
  "results": [
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 preview hides amounts and hash, retains identical allowed rows, and preserves full internal event",
      "ms": 8001.8669,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 forward membership skips foreign definitions, updates own empty drafts, and bulk exclusions hide origins",
      "ms": 2557.3568,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 monthly overview metadata and waiver references follow recorded branches, including after transfer",
      "ms": 1795.1158,
      "pass": false,
      "error": "POST /payroll/overview/waivers: 400 {\"message\":[\"اختار على مين\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /payroll/overview/waivers: 400 {\"message\":[\"اختار على مين\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/overview/waivers: 400 {\"message\":[\"اختار على مين\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-boundaries.integration.cjs:70:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 obligation cancellation hides amounts on first and repeated cancel while payroll reader retains them",
      "ms": 205.7762,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 monthly overview metadata and waiver references follow recorded branches, including after transfer",
      "ms": 1795.1158,
      "pass": false,
      "error": "POST /payroll/overview/waivers: 400 {\"message\":[\"اختار على مين\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "POST /payroll/overview/waivers: 400 {\"message\":[\"اختار على مين\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/overview/waivers: 400 {\"message\":[\"اختار على مين\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\codex-review-round25-boundaries.integration.cjs:70:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"preview-and-ack\",\"monthlyGross\":7319.17,\"blindGross\":null,\"previewEqualExceptMoney\":true,\"eventRetainedMoney\":true,\"foreignRunNameHidden\":true,\"companyAcknowledgementRedacted\":true}",
    "{\"case\":\"forward-and-bulk\",\"foreignFutureUnchanged\":true,\"ownDraftUpdated\":true,\"unknownEqualsForeign\":true,\"hiddenSourceId\":null,\"added\":1}",
    "{\"case\":\"cancel-obligation\",\"repeatedLimitedResponse\":true,\"readerAmount\":871.26,\"foreignStatus\":403}",
    "tests 4",
    "suites 0",
    "pass 3",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15204.1606"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_boundaries_test_464a940ef94d6b88\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_boundaries_test_464a940ef94d6b88\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_boundaries_test_464a940ef94d6b88\"}\n"
  ]
}

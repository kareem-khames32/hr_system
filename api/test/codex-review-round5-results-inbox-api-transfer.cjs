module.exports = {
  "selected": [
    "codex-review-round5-boundaries"
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
    "duration_ms": 7728.6395
  },
  "results": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 5361.0827,
      "pass": false,
      "error": "PATCH /employees/1: 400 {\"message\":[\"calendarChange.expectedRevision must not be less than 0\",\"calendarChange.expectedRevision must be an integer number\",\"calendarChange.expectedCurrentSourceHash must match /^[a-f0-9]{64}$/ regular expression\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "PATCH /employees/1: 400 {\"message\":[\"calendarChange.expectedRevision must not be less than 0\",\"calendarChange.expectedRevision must be an integer number\",\"calendarChange.expectedCurrentSourceHash must match /^[a-f0-9]{64}$/ regular expression\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/1: 400 {\"message\":[\"calendarChange.expectedRevision must not be less than 0\",\"calendarChange.expectedRevision must be an integer number\",\"calendarChange.expectedCurrentSourceHash must match /^[a-f0-9]{64}$/ regular expression\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round5-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:172:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round5-boundaries.integration.cjs",
      "name": "CR5 transferred employee current title must not leak through the approval inbox",
      "ms": 5361.0827,
      "pass": false,
      "error": "PATCH /employees/1: 400 {\"message\":[\"calendarChange.expectedRevision must not be less than 0\",\"calendarChange.expectedRevision must be an integer number\",\"calendarChange.expectedCurrentSourceHash must match /^[a-f0-9]{64}$/ regular expression\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "cause": "PATCH /employees/1: 400 {\"message\":[\"calendarChange.expectedRevision must not be less than 0\",\"calendarChange.expectedRevision must be an integer number\",\"calendarChange.expectedCurrentSourceHash must match /^[a-f0-9]{64}$/ regular expression\"],\"error\":\"Bad Request\",\"statusCode\":400}",
      "stack": "AssertionError [ERR_ASSERTION]: PATCH /employees/1: 400 {\"message\":[\"calendarChange.expectedRevision must not be less than 0\",\"calendarChange.expectedRevision must be an integer number\",\"calendarChange.expectedCurrentSourceHash must match /^[a-f0-9]{64}$/ regular expression\"],\"error\":\"Bad Request\",\"statusCode\":400}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round5-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round5-boundaries.integration.cjs:172:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "tests 1",
    "suites 0",
    "pass 0",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7728.6395"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r5boundaries_test_f445207c07e176dd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r5boundaries_test_f445207c07e176dd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r5boundaries_test_f445207c07e176dd\"}\n"
  ]
}

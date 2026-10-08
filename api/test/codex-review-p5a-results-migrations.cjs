module.exports = {
  "selected": [
    "codex-review-p5a-migrations"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 46689.1384
  },
  "results": [
    {
      "file": "codex-review-p5a-migrations.integration.cjs",
      "name": "P5A-G01: all 41 migrations accept synchronized shape and refuse malformed owned shape",
      "ms": 39860.1524,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"id\":\"P5A-G01\",\"migrations\":41,\"malformedRejected\":41}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 46689.1384"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p5a_schema_test_76f4bc5272a57a03\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p5a_schema_test_76f4bc5272a57a03\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p5a_schema_test_76f4bc5272a57a03\"}\n"
  ]
}

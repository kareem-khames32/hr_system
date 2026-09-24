module.exports = {
  "selected": [
    "codex-review-round2-member-batch"
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
    "duration_ms": 11088.9467
  },
  "results": [
    {
      "file": "codex-review-round2-member-batch.integration.cjs",
      "name": "CR2 isolate the same 500-member save used at payroll.service.ts:1185",
      "ms": 8410.8895,
      "pass": true
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"batch\":500,\"failure\":{\"name\":\"QueryFailedError\",\"code\":\"EREQUEST\",\"number\":8003,\"parameters\":3000,\"message\":\"The incoming request has too many parameters. The server supports a maximum of 2100 parameters. Reduce the number of parameters and resend the request.\"},\"rowsPersisted\":0}",
    "{\"controlChunk\":100,\"identicalRowsSaved\":500}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11088.9467"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_memberbatch_test_cbf65df5cacc900a\"}\n"
  ]
}

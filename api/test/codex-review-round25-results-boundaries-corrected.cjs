module.exports = {
  "selected": [
    "codex-review-round25-boundaries"
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
    "duration_ms": 13998.4736
  },
  "results": [
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 preview hides amounts and hash, retains identical allowed rows, and preserves full internal event",
      "ms": 7221.0046,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 forward membership skips foreign definitions, updates own empty drafts, and bulk exclusions hide origins",
      "ms": 2381.8148,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 monthly overview metadata and waiver references follow recorded branches, including after transfer",
      "ms": 1604.4561,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-boundaries.integration.cjs",
      "name": "CR25 obligation cancellation hides amounts on first and repeated cancel while payroll reader retains them",
      "ms": 190.8193,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"preview-and-ack\",\"monthlyGross\":7319.17,\"blindGross\":null,\"previewEqualExceptMoney\":true,\"eventRetainedMoney\":true,\"foreignRunNameHidden\":true,\"companyAcknowledgementRedacted\":true}",
    "{\"case\":\"forward-and-bulk\",\"foreignFutureUnchanged\":true,\"ownDraftUpdated\":true,\"unknownEqualsForeign\":true,\"hiddenSourceId\":null,\"added\":1}",
    "{\"case\":\"overview-recorded-branches\",\"visibleRuns\":1,\"foreignRunHidden\":true,\"currentProfilesSwapped\":true}",
    "{\"case\":\"cancel-obligation\",\"repeatedLimitedResponse\":true,\"readerAmount\":871.26,\"foreignStatus\":403}",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13998.4736"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_boundaries_test_e2c2a01b3b93efb3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_boundaries_test_e2c2a01b3b93efb3\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_boundaries_test_e2c2a01b3b93efb3\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round39-bonus-control"
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
    "duration_ms": 26730.7736
  },
  "results": [
    {
      "file": "codex-review-round39-bonus-control.integration.cjs",
      "name": "CR39 paid bonus: hide foreign applied period in payout/obligations/status while own, company and allowed branch retain it",
      "ms": 19452.9236,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"bonus-payout-period-control\",\"directForeignRead\":403,\"hiddenStatus\":\"مصروف\",\"hiddenPayout\":{\"state\":\"PAID\",\"label\":\"مصروف\",\"runId\":null,\"period\":null},\"companyPayout\":{\"state\":\"PAID\",\"label\":\"مصروف\",\"runId\":1,\"period\":\"2026-07\"},\"selfPayout\":{\"state\":\"PAID\",\"label\":\"مصروف\",\"runId\":1,\"period\":\"2026-07\"},\"amount\":123.45,\"net\":9123.45,\"storedUnchanged\":true}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 26730.7736"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r39_bonus_test_4bd5229cd5e00878\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r39_bonus_test_4bd5229cd5e00878\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r39_bonus_test_4bd5229cd5e00878\"}\n"
  ]
}

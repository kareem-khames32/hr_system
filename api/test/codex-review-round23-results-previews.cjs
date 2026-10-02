module.exports = {
  "selected": [
    "codex-review-round23-previews"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 8310.6094
  },
  "results": [
    {
      "file": "codex-review-round23-previews.integration.cjs",
      "name": "CR23 preview and stale bulk protect both inactive and outside-basis definitions from unlinked and structural users",
      "ms": 5164.1306,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round23-previews.integration.cjs",
      "name": "CR23 allowed HR without employeeId and structural manager retain correct preview money and foreign rows are anonymous",
      "ms": 280.0718,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"definition-response-matrix\",\"outsideBasis403\":16,\"authorizedInactive400\":4}",
    "{\"case\":\"authorized-financial-preview\",\"kind\":\"bonuses\",\"amount\":77.77,\"obligationCount\":1,\"bulkStatus\":\"returned\",\"foreignNameHidden\":true}",
    "{\"case\":\"authorized-financial-preview\",\"kind\":\"deductions\",\"amount\":77.77,\"obligationCount\":1,\"bulkStatus\":\"returned\",\"foreignNameHidden\":true}",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8310.6094"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r23_previews_test_eebe90a840338618\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r23_previews_test_eebe90a840338618\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r23_previews_test_eebe90a840338618\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round25-exemption-edges"
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
    "duration_ms": 11079.5324
  },
  "results": [
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 account without a grant basis is denied identically before payroll reads and application locks",
      "ms": 5591.5701,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 a foreign member, foreign non-member and missing employee give identical exemption denials",
      "ms": 130.9671,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 payroll approval keeps attachment rejection but discloses its amount only to payroll readers",
      "ms": 2241.2174,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round25-exemption-edges.integration.cjs",
      "name": "CR25 an own historical grant remains readable after scope change without granting new candidates",
      "ms": 677.8146,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"early-exemption-refusal\",\"probes\":8,\"payrollRead\":false,\"applicationLock\":false,\"noEmployeeId\":true,\"all403\":true}",
    "{\"case\":\"foreign-exemption-membership\",\"routes\":3,\"eachCompared\":3,\"all403\":true,\"identicalBodies\":true}",
    "{\"case\":\"attachment-approval-refusal\",\"readerAmount\":\"600.00\",\"readerThreshold\":\"300.00\",\"limited409\":true,\"limitedHasAmounts\":false,\"netAfterExemption\":9000}",
    "{\"case\":\"historical-own-grant\",\"retainedOwnAmount\":\"300.00\",\"retainedRunHeader\":true,\"newCandidates\":0,\"newGrant403\":true}",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11079.5324"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r25_exemption_edges_test_a2a2b9584ccdcbdf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r25_exemption_edges_test_a2a2b9584ccdcbdf\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r25_exemption_edges_test_a2a2b9584ccdcbdf\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round22-independent"
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
    "duration_ms": 9258.9259
  },
  "results": [
    {
      "file": "codex-review-round22-independent.integration.cjs",
      "name": "CR22 legacy missing membership snapshot falls back to current placement; explicit snapshot nulls do not",
      "ms": 6985.834,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"bank-legacy-placement\",\"explicitSnapshotNullDoesNotUseCurrent\":true,\"missingSnapshotAndMissingMemberUseCurrent\":true,\"legacyFilteredNet\":5000.55}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 9258.9259"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r22_independent_test_9e2ba64eead4eec4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r22_independent_test_9e2ba64eead4eec4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r22_independent_test_9e2ba64eead4eec4\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2m-boundaries"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 5,
      "failed": 0,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 11232.2768
  },
  "results": [
    {
      "file": "codex-review-p2m-boundaries.integration.cjs",
      "name": "P2M SQL: two locked publications keep the gate safe until the last commit and do not cache a pre-commit clear result",
      "ms": 7168.1172,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-boundaries.integration.cjs",
      "name": "P2M SQL: committed publish plus failed flag refresh succeeds once; rollback, withdrawal and no-op release the gate state",
      "ms": 199.0089,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-boundaries.integration.cjs",
      "name": "P2M SQL: role change and deactivate/reactivate invalidate old sessions and do not inherit clear cache",
      "ms": 291.9742,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-boundaries.integration.cjs",
      "name": "P2M SQL: unknown state gates ordinary employee requests but preserves explicit exemptions, unlinked accounts and public routes",
      "ms": 123.9342,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2m-boundaries.integration.cjs",
      "name": "P2M SQL: policy-only role catalog is exactly four fields; every other role-management endpoint stays forbidden",
      "ms": 243.8107,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"real-concurrent-publications\",\"firstBlockedWhileSecondPending\":true,\"secondClearNotCached\":true,\"bothBlockedAfterCommit\":true}",
    "{\"case\":\"write-outcomes\",\"oneVersion\":true,\"postCommitFailurePreserves201\":true,\"rejectionPreserved\":true,\"withdrawOpens\":true}",
    "{\"case\":\"role-catalog\",\"minimalFields\":true,\"fullReadersUnchanged\":true,\"branchDenied\":true,\"otherEndpointsDenied\":5,\"storageUnchanged\":true}",
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11232.2768"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2m_boundaries_test_f0f4a2345f0d8b58\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2m_boundaries_test_f0f4a2345f0d8b58\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2m_boundaries_test_f0f4a2345f0d8b58\"}\n"
  ]
}

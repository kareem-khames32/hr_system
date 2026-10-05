module.exports = {
  "selected": [
    "codex-review-p2f-independent"
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
    "duration_ms": 11176.9991
  },
  "results": [
    {
      "file": "codex-review-p2f-independent.integration.cjs",
      "name": "P2F delivery lock spans SMTP across service instances and releases after failure without changing the request",
      "ms": 5542.8871,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-independent.integration.cjs",
      "name": "P2F deferred digest is deduplicated, requeues when quiet hours extend, then is delivered once by the queue",
      "ms": 358.0339,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-independent.integration.cjs",
      "name": "P2F self creator retains request read access after account relink but no longer receives the owners decision",
      "ms": 1156.315,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2f-independent.integration.cjs",
      "name": "P2F making a request type confidential after distribution suppresses its prepared approver mail in both channels",
      "ms": 600.4271,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"lock-release-and-independent-instances\",\"whileSending\":0,\"afterFailure\":1,\"smtpCalls\":2,\"sent\":1,\"requestUnchanged\":true}",
    "{\"case\":\"digest-queue-requeue\",\"initialJobs\":1,\"afterExtension\":2,\"sentInQuiet\":0,\"sentAfter\":1,\"utcRunAfterCorrect\":true}",
    "{\"case\":\"creator-is-not-current-owner\",\"outcomes\":[{\"mode\":\"ON\",\"read\":200,\"delivery\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"read\":200,\"delivery\":\"SKIPPED\"}]}",
    "{\"case\":\"new-confidentiality\",\"outcomes\":[{\"mode\":\"ON\",\"sent\":0,\"status\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"sent\":0,\"status\":\"SKIPPED\"}]}",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11176.9991"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2f_independent_test_8a86c721a05388e1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2f_independent_test_8a86c721a05388e1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2f_independent_test_8a86c721a05388e1\"}\n"
  ]
}

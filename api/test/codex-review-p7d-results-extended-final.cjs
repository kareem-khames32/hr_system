module.exports = {
  "selected": [
    "codex-review-p7d-extended"
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
    "duration_ms": 13206.3482
  },
  "results": [
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N08: one final rule query, no single-event reads, handover then skipped-row persistence",
      "ms": 8816.9344,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N09: all closed, absent-row default, duplicates, unknown code, and reopened skipped items",
      "ms": 517.1553,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N10: provider throw skips closed rows, counts failed open rows, and retries only authorized rows",
      "ms": 317.0657,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N11 observation: SQL failure recording a skipped row after successful handover repeats the open event",
      "ms": 582.871,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N12: readiness precedes final query; pre-187 default sends the old digest without channel tables",
      "ms": 281.9535,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P7D-N08\",\"trace\":[\"rules-read\",\"handover\",\"skip-write\"],\"queries\":1}",
    "{\"case\":\"P7D-N09\",\"allClosedSent\":0,\"reopenedSkippedSent\":0,\"absentRuleSent\":1,\"unknownCode\":\"ignored; no product writer\"}",
    "{\"case\":\"P7D-N10\",\"providerThrew\":true,\"closed\":\"SKIPPED\",\"openAttemptsAfterFailure\":1,\"retrySent\":1}",
    "{\"case\":\"P7D-N11\",\"sqlNumber\":1222,\"firstHandover\":1,\"storedAfterError\":\"DIGEST\",\"attemptsAfterError\":0,\"messagesAfterRetry\":2,\"closedEventSent\":false}",
    "{\"case\":\"P7D-N12\",\"trace\":[\"ready\",\"rules\"],\"channelTables\":0,\"legacyDigestSent\":1}",
    "Cleanup verified: hr_codex_p7d_channels_test_d8a8d08642c9b3cf is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13206.3482"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p7d_channels_test_d8a8d08642c9b3cf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p7d_channels_test_d8a8d08642c9b3cf\"}\n"
  ]
}

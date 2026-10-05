module.exports = {
  "selected": [
    "codex-review-p2a-migrations"
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
    "duration_ms": 10462.8524
  },
  "results": [
    {
      "file": "codex-review-p2a-migrations.integration.cjs",
      "name": "P2A combined 084 085 086 allow true pre-migration boot, preserve old records and replay to zero schema diff",
      "ms": 7014.72,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P2A-combined-migrations\",\"files\":[\"20261003_084_audit_log.sql\",\"20261003_085_stored_file_sha256.sql\",\"20261003_086_queue_outbox.sql\"],\"oldSchemaBoot\":true,\"synchronize\":false,\"schemaDifference\":0,\"replayUnchanged\":true,\"existingRowsPreserved\":true,\"compatibility\":150}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10462.8524"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2a_migrations_test_9b8b0b0d9fd07c27\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2a_migrations_test_9b8b0b0d9fd07c27\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2a_migrations_test_9b8b0b0d9fd07c27\"}\n"
  ]
}

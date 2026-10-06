module.exports = {
  "selected": [
    "codex-review-p2o-migration-races"
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
    "duration_ms": 11589.4024
  },
  "results": [
    {
      "file": "codex-review-p2o-migration-races.integration.cjs",
      "name": "P2O migration during a blocked task mutation: fresh link checks under RC and RCSI",
      "ms": 9203.0225,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"rcsi\":false,\"migrationWhileBlocked\":[{\"kind\":\"document\",\"method\":\"POST\",\"status\":409,\"ordinaryBeforeAndAfter\":true},{\"kind\":\"document\",\"method\":\"PATCH\",\"status\":409,\"ordinaryBeforeAndAfter\":true},{\"kind\":\"execution\",\"method\":\"POST\",\"status\":409,\"ordinaryBeforeAndAfter\":true},{\"kind\":\"execution\",\"method\":\"PATCH\",\"status\":409,\"ordinaryBeforeAndAfter\":true}]}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11589.4024"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2o_migrate_race_test_a274b51e0431260b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2o_migrate_race_test_a274b51e0431260b\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2o_migrate_race_test_a274b51e0431260b\"}\n"
  ]
}

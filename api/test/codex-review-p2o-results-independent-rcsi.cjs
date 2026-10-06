module.exports = {
  "selected": [
    "codex-review-p2o-schema-cache",
    "codex-review-p2o-concurrency",
    "codex-review-p2o-migration-races"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 42691.2748
  },
  "results": [
    {
      "file": "codex-review-p2o-schema-cache.integration.cjs",
      "name": "P2O schema transition: an older application cache must not permit status or assignee edits on newly linked document tasks",
      "ms": 16909.2791,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-concurrency.integration.cjs",
      "name": "P2O concurrent issue, ack/cancel and late task links with RCSI=true",
      "ms": 8899.8685,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2o-migration-races.integration.cjs",
      "name": "P2O migration during a blocked task mutation: fresh link checks under RC and RCSI",
      "ms": 9680.1692,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"negative-schema-cache-across-processes\",\"rcsi\":true,\"statusCode\":400,\"editCode\":400,\"states\":[{\"id\":1,\"status\":\"OPEN\",\"assigneeEmployeeId\":1},{\"id\":2,\"status\":\"OPEN\",\"assigneeEmployeeId\":1}],\"acknowledgements\":0,\"expectedEmployeeId\":1,\"otherEmployeeId\":3}",
    "{\"case\":\"isolation-and-late-links\",\"rcsi\":true,\"concurrentIssuers\":3,\"documents\":1,\"ackCancel\":[404,201],\"lateLinkCases\":4}",
    "{\"rcsi\":true,\"migrationWhileBlocked\":[{\"kind\":\"document\",\"method\":\"POST\",\"status\":409,\"ordinaryBeforeAndAfter\":true},{\"kind\":\"document\",\"method\":\"PATCH\",\"status\":409,\"ordinaryBeforeAndAfter\":true},{\"kind\":\"execution\",\"method\":\"POST\",\"status\":409,\"ordinaryBeforeAndAfter\":true},{\"kind\":\"execution\",\"method\":\"PATCH\",\"status\":409,\"ordinaryBeforeAndAfter\":true}]}",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 42691.2748"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2o_cache_test_69080b248aefdf38\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2o_cache_test_69080b248aefdf38\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2o_cache_test_69080b248aefdf38\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2o_rcsi_test_c14b24a4aaa0369d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2o_rcsi_test_c14b24a4aaa0369d\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2o_rcsi_test_c14b24a4aaa0369d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2o_migrate_race_test_3a818c7dd5e665bc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2o_migrate_race_test_3a818c7dd5e665bc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2o_migrate_race_test_3a818c7dd5e665bc\"}\n"
  ]
}

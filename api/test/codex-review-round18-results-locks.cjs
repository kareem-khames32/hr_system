module.exports = {
  "selected": [
    "codex-review-round18-locks"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 1,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 10893.0409
  },
  "results": [
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 four unique fields reject create/update collision after both real preflights pass",
      "ms": 6759.2973,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 existing identity lock does not prevent unrelated phone save",
      "ms": 50.6918,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 real finance wait followed by simultaneous creation identity update schedule assignment and ordinary save completes without deadlock",
      "ms": 299.3452,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 concurrent clearing of the two identity fields must preserve at least one on fresh state",
      "ms": 72.5469,
      "pass": false,
      "error": "Two accepted partial clears must not erase both identities",
      "cause": "Two accepted partial clears must not erase both identities",
      "stack": "AssertionError [ERR_ASSERTION]: Two accepted partial clears must not erase both identities\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-locks.integration.cjs:78:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 legacy unchanged values allowed but newly invalid values types and lengths still rejected",
      "ms": 90.9364,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 concurrent clearing of the two identity fields must preserve at least one on fresh state",
      "ms": 72.5469,
      "pass": false,
      "error": "Two accepted partial clears must not erase both identities",
      "cause": "Two accepted partial clears must not erase both identities",
      "stack": "AssertionError [ERR_ASSERTION]: Two accepted partial clears must not erase both identities\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-locks.integration.cjs:78:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"four-unique-fields-create-update\",\"evidence\":[{\"field\":\"passportNo\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"nationalId\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"email\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"fingerprintCode\",\"statuses\":[201,409],\"persisted\":1}]}",
    "{\"case\":\"ordinary-save-with-identity-lock-held\",\"status\":200}",
    "{\"case\":\"lock-order\",\"waitObserved\":true,\"statuses\":[200,201,201,200],\"identityPaths\":[[\"attendance\",\"finance\",\"identity\"],[\"attendance\",\"finance\",\"identity\"]]}",
    "{\"case\":\"concurrent-clear-pair\",\"statuses\":[200,200],\"nationalId\":null,\"passportNo\":null}",
    "tests 5",
    "suites 0",
    "pass 4",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10893.0409"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r18_locks_test_9a3028747ade124e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r18_locks_test_9a3028747ade124e\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r18_locks_test_9a3028747ade124e\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round18-locks",
    "codex-review-round18-overtime"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 9,
      "failed": 4,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 20453.3165
  },
  "results": [
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 four unique fields reject create/update collision after both real preflights pass",
      "ms": 6552.8857,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 existing identity lock does not prevent unrelated phone save",
      "ms": 58.6244,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 real finance wait followed by simultaneous creation identity update schedule assignment and ordinary save completes without deadlock",
      "ms": 323.2849,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 concurrent clearing of the two identity fields must preserve at least one on fresh state",
      "ms": 192.9173,
      "pass": false,
      "error": "Two accepted partial clears must not erase both identities",
      "cause": "Two accepted partial clears must not erase both identities",
      "stack": "AssertionError [ERR_ASSERTION]: Two accepted partial clears must not erase both identities\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-locks.integration.cjs:87:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 legacy unchanged values allowed but newly invalid values types and lengths still rejected",
      "ms": 107.8015,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 all overtime read surfaces hide historical foreign window names and governing IDs without modifying stored evidence",
      "ms": 7918.2182,
      "pass": false,
      "error": "{\"message\":\"لا تملك صلاحية معاينة طلب إضافي نيابة عن موظف\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 200\n",
      "cause": "{\"message\":\"لا تملك صلاحية معاينة طلب إضافي نيابة عن موظف\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"لا تملك صلاحية معاينة طلب إضافي نيابة عن موظف\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:248:124)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 foreign period ID must also be absent from automatic approval marker in monthly response",
      "ms": 1.7335,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(D.marker)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(D.marker)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(D.marker)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:266:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 redaction must preserve automatic pending status for branch reader",
      "ms": 0.3936,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(D.waitingFlags)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(D.waitingFlags)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(D.waitingFlags)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:271:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 recursive projection preserves input and handles mixed scopes deleted periods and nested review evidence",
      "ms": 0.9334,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 concurrent clearing of the two identity fields must preserve at least one on fresh state",
      "ms": 192.9173,
      "pass": false,
      "error": "Two accepted partial clears must not erase both identities",
      "cause": "Two accepted partial clears must not erase both identities",
      "stack": "AssertionError [ERR_ASSERTION]: Two accepted partial clears must not erase both identities\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-locks.integration.cjs:87:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 all overtime read surfaces hide historical foreign window names and governing IDs without modifying stored evidence",
      "ms": 7918.2182,
      "pass": false,
      "error": "{\"message\":\"لا تملك صلاحية معاينة طلب إضافي نيابة عن موظف\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 200\n",
      "cause": "{\"message\":\"لا تملك صلاحية معاينة طلب إضافي نيابة عن موظف\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"لا تملك صلاحية معاينة طلب إضافي نيابة عن موظف\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:248:124)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 foreign period ID must also be absent from automatic approval marker in monthly response",
      "ms": 1.7335,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(D.marker)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(D.marker)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(D.marker)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:266:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 redaction must preserve automatic pending status for branch reader",
      "ms": 0.3936,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(D.waitingFlags)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(D.waitingFlags)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(D.waitingFlags)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:271:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"four-unique-fields-create-update\",\"evidence\":[{\"field\":\"passportNo\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"nationalId\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"email\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"fingerprintCode\",\"statuses\":[201,409],\"persisted\":1}]}",
    "{\"case\":\"ordinary-save-with-identity-lock-held\",\"status\":200}",
    "{\"case\":\"lock-order\",\"waitObserved\":true,\"statuses\":[200,201,201,200],\"identityPaths\":[[\"attendance\",\"finance\",\"identity\"],[\"attendance\",\"finance\",\"identity\"]]}",
    "{\"case\":\"concurrent-clear-pair\",\"realSqlWaiters\":2,\"statuses\":[200,200],\"nationalId\":null,\"passportNo\":null}",
    "Cleanup verified: hr_ot_auto_approve_test_4fc19ed0e6587609 is absent from sys.databases.",
    "tests 9",
    "suites 0",
    "pass 5",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 20453.3165"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r18_locks_test_9fe602c40b6c13dc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r18_locks_test_9fe602c40b6c13dc\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r18_locks_test_9fe602c40b6c13dc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_4fc19ed0e6587609\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_4fc19ed0e6587609\"}\n"
  ]
}

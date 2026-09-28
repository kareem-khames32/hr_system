module.exports = {
  "selected": [
    "codex-review-round18-locks",
    "codex-review-round18-overtime"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 9,
      "failed": 3,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 25229.1138
  },
  "results": [
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 four unique fields reject create/update collision after both real preflights pass",
      "ms": 6590.0662,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 existing identity lock does not prevent unrelated phone save",
      "ms": 76.073,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 real finance wait followed by simultaneous creation identity update schedule assignment and ordinary save completes without deadlock",
      "ms": 316.5102,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 concurrent clearing of the two identity fields must preserve at least one on fresh state",
      "ms": 167.5238,
      "pass": false,
      "error": "Two accepted partial clears must not erase both identities",
      "cause": "Two accepted partial clears must not erase both identities",
      "stack": "AssertionError [ERR_ASSERTION]: Two accepted partial clears must not erase both identities\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-locks.integration.cjs:87:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 legacy unchanged values allowed but newly invalid values types and lengths still rejected",
      "ms": 136.5571,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 all overtime read surfaces hide historical foreign window names and governing IDs without modifying stored evidence",
      "ms": 10934.3779,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 foreign period ID must also be absent from automatic approval marker in monthly response",
      "ms": 2.2833,
      "pass": false,
      "error": "Redacted financial view must not expose the hidden period ID through autoApproval.periodIds",
      "cause": "Redacted financial view must not expose the hidden period ID through autoApproval.periodIds",
      "stack": "AssertionError [ERR_ASSERTION]: Redacted financial view must not expose the hidden period ID through autoApproval.periodIds\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:267:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 redaction must preserve automatic pending status for branch reader",
      "ms": 0.6298,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "cause": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:272:99)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 recursive projection preserves input and handles mixed scopes deleted periods and nested review evidence",
      "ms": 1.1384,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 concurrent clearing of the two identity fields must preserve at least one on fresh state",
      "ms": 167.5238,
      "pass": false,
      "error": "Two accepted partial clears must not erase both identities",
      "cause": "Two accepted partial clears must not erase both identities",
      "stack": "AssertionError [ERR_ASSERTION]: Two accepted partial clears must not erase both identities\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-locks.integration.cjs:87:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 foreign period ID must also be absent from automatic approval marker in monthly response",
      "ms": 2.2833,
      "pass": false,
      "error": "Redacted financial view must not expose the hidden period ID through autoApproval.periodIds",
      "cause": "Redacted financial view must not expose the hidden period ID through autoApproval.periodIds",
      "stack": "AssertionError [ERR_ASSERTION]: Redacted financial view must not expose the hidden period ID through autoApproval.periodIds\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:267:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 redaction must preserve automatic pending status for branch reader",
      "ms": 0.6298,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "cause": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:272:99)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"four-unique-fields-create-update\",\"evidence\":[{\"field\":\"passportNo\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"nationalId\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"email\",\"statuses\":[409,200],\"persisted\":1},{\"field\":\"fingerprintCode\",\"statuses\":[201,409],\"persisted\":1}]}",
    "{\"case\":\"ordinary-save-with-identity-lock-held\",\"status\":200}",
    "{\"case\":\"lock-order\",\"waitObserved\":true,\"statuses\":[200,201,201,200],\"identityPaths\":[[\"attendance\",\"finance\",\"identity\"],[\"attendance\",\"finance\",\"identity\"]]}",
    "{\"case\":\"concurrent-clear-pair\",\"realSqlWaiters\":2,\"statuses\":[200,200],\"nationalId\":null,\"passportNo\":null}",
    "{\"case\":\"all-window-surfaces\",\"checked\":[\"pending\",\"monthly-detected\",\"preview\",\"request-detail\",\"monthly-approved\"],\"storedSnapshotsUnchanged\":true,\"amount\":140.62,\"waitingFlags\":{\"branch\":false,\"company\":true,\"status\":\"DETECTED\"},\"marker\":{\"periodId\":1,\"shownMarker\":{\"periodIds\":[1]},\"storedMarker\":{\"periodIds\":[1]}}}",
    "{\"case\":\"foreign-approval-marker\",\"periodId\":1,\"shownMarker\":{\"periodIds\":[1]},\"storedMarker\":{\"periodIds\":[1]}}",
    "{\"case\":\"pending-status\",\"branch\":false,\"company\":true,\"status\":\"DETECTED\"}",
    "Cleanup verified: hr_ot_auto_approve_test_2e7c67411611d872 is absent from sys.databases.",
    "tests 9",
    "suites 0",
    "pass 6",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 25229.1138"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r18_locks_test_cf925c6367f12aea\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r18_locks_test_cf925c6367f12aea\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r18_locks_test_cf925c6367f12aea\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_2e7c67411611d872\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_2e7c67411611d872\"}\n"
  ]
}

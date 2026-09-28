module.exports = {
  "selected": [
    "codex-review-round18-overtime"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 2,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 13873.3338
  },
  "results": [
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 all overtime read surfaces hide historical foreign window names and governing IDs without modifying stored evidence",
      "ms": 10605.7351,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 foreign period ID must also be absent from automatic approval marker in monthly response",
      "ms": 2.6177,
      "pass": false,
      "error": "Redacted financial view must not expose the hidden period ID through autoApproval.periodIds",
      "cause": "Redacted financial view must not expose the hidden period ID through autoApproval.periodIds",
      "stack": "AssertionError [ERR_ASSERTION]: Redacted financial view must not expose the hidden period ID through autoApproval.periodIds\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:267:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 redaction must preserve automatic pending status for branch reader",
      "ms": 0.7632,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "cause": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:272:99)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 recursive projection preserves input and handles mixed scopes deleted periods and nested review evidence",
      "ms": 1.3706,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 foreign period ID must also be absent from automatic approval marker in monthly response",
      "ms": 2.6177,
      "pass": false,
      "error": "Redacted financial view must not expose the hidden period ID through autoApproval.periodIds",
      "cause": "Redacted financial view must not expose the hidden period ID through autoApproval.periodIds",
      "stack": "AssertionError [ERR_ASSERTION]: Redacted financial view must not expose the hidden period ID through autoApproval.periodIds\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:267:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 redaction must preserve automatic pending status for branch reader",
      "ms": 0.7632,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "cause": "Expected values to be strictly equal:\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round18-overtime.integration.cjs:272:99)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"all-window-surfaces\",\"checked\":[\"pending\",\"monthly-detected\",\"preview\",\"request-detail\",\"monthly-approved\"],\"storedSnapshotsUnchanged\":true,\"amount\":140.62,\"waitingFlags\":{\"branch\":false,\"company\":true,\"status\":\"DETECTED\"},\"marker\":{\"periodId\":1,\"shownMarker\":{\"periodIds\":[1]},\"storedMarker\":{\"periodIds\":[1]}}}",
    "{\"case\":\"foreign-approval-marker\",\"periodId\":1,\"shownMarker\":{\"periodIds\":[1]},\"storedMarker\":{\"periodIds\":[1]}}",
    "{\"case\":\"pending-status\",\"branch\":false,\"company\":true,\"status\":\"DETECTED\"}",
    "Cleanup verified: hr_ot_auto_approve_test_67b9b7fe1639988f is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 13873.3338"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_67b9b7fe1639988f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_67b9b7fe1639988f\"}\n"
  ]
}

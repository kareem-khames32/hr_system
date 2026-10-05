module.exports = {
  "selected": [
    "codex-review-p2h-execution-independent"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 3,
      "failed": 1,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 11132.0924
  },
  "results": [
    {
      "file": "codex-review-p2h-execution-independent.integration.cjs",
      "name": "P2H confidential execution access, hidden task proof and post-completion party rights remain bounded",
      "ms": 7488.1334,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2h-execution-independent.integration.cjs",
      "name": "P2H failed completion event rolls task and request and approval history back together",
      "ms": 436.9581,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2h-execution-independent.integration.cjs",
      "name": "P2H a current confidential execution party should remain a party in the pending report and reject-execution action",
      "ms": 299.9412,
      "pass": false,
      "error": "The same current execution party is masked in the console report\n\ntrue !== false\n",
      "cause": "The same current execution party is masked in the console report\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The same current execution party is masked in the console report\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2h-execution-independent.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2h-execution-independent.integration.cjs",
      "name": "P2H a current confidential execution party should remain a party in the pending report and reject-execution action",
      "ms": 299.9412,
      "pass": false,
      "error": "The same current execution party is masked in the console report\n\ntrue !== false\n",
      "cause": "The same current execution party is masked in the console report\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: The same current execution party is masked in the console report\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2h-execution-independent.integration.cjs:63:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"execution-party-bounds\",\"hidden\":404,\"viewerClose\":403,\"viewerReject\":403,\"ownerStatus\":\"COMPLETED\",\"storedExecutions\":1}",
    "{\"case\":\"execution-event-atomicity\",\"failedStatus\":500,\"allRowsUnchanged\":true,\"retryExecutions\":1}",
    "{\"case\":\"execution-party-consistency\",\"detailMasked\":false,\"reportMasked\":true,\"rejectStatus\":403,\"message\":\"رفض تنفيذ طلب سري لأطرافه بس\",\"requestStatus\":\"IN_EXECUTION\"}",
    "tests 3",
    "suites 0",
    "pass 2",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11132.0924"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2h_execution_test_f64d469608ffbec4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2h_execution_test_f64d469608ffbec4\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2h_execution_test_f64d469608ffbec4\"}\n"
  ]
}

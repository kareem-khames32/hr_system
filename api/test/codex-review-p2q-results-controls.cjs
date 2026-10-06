module.exports = {
  "selected": [
    "codex-review-p2q-controls",
    "codex-review-p2q-independent",
    "codex-review-p2q-concurrency",
    "codex-review-p2q-decision-race"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 19,
      "failed": 1,
      "passed": 18,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 19,
      "suites": 0
    },
    "duration_ms": 49750.7439
  },
  "results": [
    {
      "file": "codex-review-p2q-controls.integration.cjs",
      "name": "P2Q history insertion failure refuses relinking; an account save failure after history remains conservative",
      "ms": 7582.65,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-controls.integration.cjs",
      "name": "P2Q historical owner stays restricted after detach/relink, deactivate/reactivate, and replacement account; history is absent from projected responses",
      "ms": 843.3093,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-controls.integration.cjs",
      "name": "P2Q in-app mentions hide without a reader callback and after identity loss, do not mark hidden rows read, and return unchanged when visibility returns",
      "ms": 785.8918,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-controls.integration.cjs",
      "name": "P2Q hidden notifications must not crowd a still-readable notification out of the returned list",
      "ms": 6965.3597,
      "pass": false,
      "error": "Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n",
      "cause": "Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-controls.integration.cjs:69:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p2q-independent.integration.cjs",
      "name": "P2Q internal rows cannot alter public truncation, reply references or author identity after transfer",
      "ms": 6232.666,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-independent.integration.cjs",
      "name": "P2Q comment rollback and deadlock retry leave exactly one comment, attachment binding and outbox event",
      "ms": 666.7127,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-independent.integration.cjs",
      "name": "P2Q immediate and digest email recheck current requester identity, with active-recipient controls",
      "ms": 899.737,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-independent.integration.cjs",
      "name": "P2Q all four comment endpoints and upload remain behind the policy acknowledgement gate",
      "ms": 208.2594,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q two comments race for one attachment with RCSI=false",
      "ms": 5228.7602,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q task transfer while comment waits rechecks the new assignee with RCSI=false",
      "ms": 101.4031,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-concurrency.integration.cjs",
      "name": "P2Q late document/execution task mapping rejects comments with RCSI=false",
      "ms": 189.7847,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 8312.0732,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 110.6926,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 99.3174,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 80.9853,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 100.568,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 75.8509,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 53.9139,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2q-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 49.3338,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2q-controls.integration.cjs",
      "name": "P2Q hidden notifications must not crowd a still-readable notification out of the returned list",
      "ms": 6965.3597,
      "pass": false,
      "error": "Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n",
      "cause": "Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n",
      "stack": "AssertionError [ERR_ASSERTION]: Filter hidden mentions before applying the visible-notification limit, or continue paging\n\nfalse !== true\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2q-controls.integration.cjs:69:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"notification-filter-after-limit\",\"hiddenNewer\":60,\"stillReadableMentionReturned\":false,\"returnedCount\":0}",
    "{\"emailIdentityChecks\":[{\"mode\":\"ON\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"ON\",\"revoked\":true,\"status\":\"SKIPPED\"},{\"mode\":\"DIGEST\",\"revoked\":false,\"status\":\"SENT\"},{\"mode\":\"DIGEST\",\"revoked\":true,\"status\":\"SKIPPED\"}],\"realMail\":false}",
    "{\"rcsi\":false,\"sharedFileStatuses\":[201,400],\"comments\":1,\"mentionEvents\":1}",
    "{\"rcsi\":false,\"lateLinks\":[{\"kind\":\"document\",\"initial\":409,\"retry\":400,\"comments\":0},{\"kind\":\"execution\",\"initial\":409,\"retry\":400,\"comments\":0}]}",
    "tests 19",
    "suites 0",
    "pass 18",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 49750.7439"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_controls_test_bc5bb5ec0e34eda1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_controls_test_bc5bb5ec0e34eda1\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2q_controls_test_bc5bb5ec0e34eda1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_independent_test_043baabe83e0ce90\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_independent_test_043baabe83e0ce90\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2q_independent_test_043baabe83e0ce90\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_concurrency_test_ccb3986a2d22a277\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_concurrency_test_ccb3986a2d22a277\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2q_concurrency_test_ccb3986a2d22a277\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2q_decision_race_test_3e352b4a27daa956\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2q_decision_race_test_3e352b4a27daa956\"}\n"
  ]
}

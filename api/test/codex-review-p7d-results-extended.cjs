module.exports = {
  "selected": [
    "codex-review-p7d-extended"
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
    "duration_ms": 27885.9478
  },
  "results": [
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N08: one final rule query, no single-event reads, handover then skipped-row persistence",
      "ms": 8839.9378,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N09: all closed, absent-row default, duplicates, unknown code, and reopened skipped items",
      "ms": 451.2612,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N10: provider throw skips closed rows, counts failed open rows, and retries only authorized rows",
      "ms": 285.2067,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N11 observation: SQL failure recording a skipped row after successful handover repeats the open event",
      "ms": 15268.0773,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'ETIMEOUT' !== 1222\n",
      "cause": "Expected values to be strictly equal:\n\n'ETIMEOUT' !== 1222\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'ETIMEOUT' !== 1222\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7d-extended.integration.cjs:252:85)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N12: readiness precedes final query; pre-187 default sends the old digest without channel tables",
      "ms": 412.0673,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p7d-extended.integration.cjs",
      "name": "P7D-N11 observation: SQL failure recording a skipped row after successful handover repeats the open event",
      "ms": 15268.0773,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n'ETIMEOUT' !== 1222\n",
      "cause": "Expected values to be strictly equal:\n\n'ETIMEOUT' !== 1222\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n'ETIMEOUT' !== 1222\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p7d-extended.integration.cjs:252:85)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"P7D-N08\",\"trace\":[\"rules-read\",\"handover\",\"skip-write\"],\"queries\":1}",
    "{\"case\":\"P7D-N09\",\"allClosedSent\":0,\"reopenedSkippedSent\":0,\"absentRuleSent\":1,\"unknownCode\":\"ignored; no product writer\"}",
    "{\"case\":\"P7D-N10\",\"providerThrew\":true,\"closed\":\"SKIPPED\",\"openAttemptsAfterFailure\":1,\"retrySent\":1}",
    "{\"case\":\"P7D-N12\",\"trace\":[\"ready\",\"rules\"],\"channelTables\":0,\"legacyDigestSent\":1}",
    "Cleanup verified: hr_codex_p7d_channels_test_d57adb2f6ab61462 is absent from sys.databases.",
    "tests 5",
    "suites 0",
    "pass 4",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 27885.9478"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p7d_channels_test_d57adb2f6ab61462\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p7d_channels_test_d57adb2f6ab61462\"}\n"
  ]
}

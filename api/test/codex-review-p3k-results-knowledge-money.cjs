module.exports = {
  "selected": [
    "codex-review-p3k-knowledge",
    "codex-review-p3k-penalties"
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
    "duration_ms": 27836.1351
  },
  "results": [
    {
      "file": "codex-review-p3k-knowledge.integration.cjs",
      "name": "P3K-K01: article can reference and expose a policy outside both editor and reader audience",
      "ms": 18532.3839,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-penalties.integration.cjs",
      "name": "P3K-P02: a failing reserved penalty increases the successful concurrent deduction recurrence",
      "ms": 19244.4324,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3k-penalties.integration.cjs",
      "name": "P3K-P01: unchanged occurrence accepts a different monetary penalty than preview",
      "ms": 138.924,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 27836.1351"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3k_knowledge_test_9d9b4a4e0d655cd7\"}\n",
    "REVIEW_MEASURE {\"case\":\"K01\",\"editorForeignPolicyTitle\":true,\"ordinaryReaderForeignDraftPolicy\":{\"id\":1,\"title\":\"PRIVATE_POLICY_BRANCH_B\"}}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3k_knowledge_test_9d9b4a4e0d655cd7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3k_knowledge_test_9d9b4a4e0d655cd7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_66a93e14ba0f187f\"}\n",
    "REVIEW_MEASURE {\"case\":\"P02\",\"failedFirst\":403,\"remainingPenalties\":1,\"chargedOccurrence\":2,\"chargedDays\":2}\n",
    "REVIEW_MEASURE {\"case\":\"P01\",\"previewDays\":1,\"signedDays\":2,\"deductionDays\":2,\"deductionStatus\":\"IN_APPROVAL\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_66a93e14ba0f187f\"}\n"
  ]
}

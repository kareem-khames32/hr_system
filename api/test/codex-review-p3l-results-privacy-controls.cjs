module.exports = {
  "selected": [
    "codex-review-p3l-surveys",
    "codex-review-p3l-unit-scope",
    "codex-review-p3l-case-privacy",
    "codex-review-p3l-knowledge"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 6,
      "failed": 1,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 16604.3716
  },
  "results": [
    {
      "file": "codex-review-p3l-surveys.integration.cjs",
      "name": "P3L-S01 control: open results blocked, sparse question hidden, closed survey cannot reopen",
      "ms": 5621.5467,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-surveys.integration.cjs",
      "name": "P3L-S02: optional question leaks hidden group by complementary subtraction",
      "ms": 260.2061,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-surveys.integration.cjs",
      "name": "P3L-S03: response inserted after close changes already published anonymous result",
      "ms": 176.0983,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n200 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n200 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n200 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3l-surveys.integration.cjs:37:28)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p3l-unit-scope.integration.cjs",
      "name": "P3L-U01: calibration and mandatory-training views hide current foreign department names",
      "ms": 5579.1932,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-case-privacy.integration.cjs",
      "name": "P3L-C01: handler account rebound to respondent loses full case and complainant identity",
      "ms": 5489.14,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-knowledge.integration.cjs",
      "name": "P3L-K01: article cannot reference or expose a policy outside both editor and reader audience",
      "ms": 5397.0788,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3l-surveys.integration.cjs",
      "name": "P3L-S03: response inserted after close changes already published anonymous result",
      "ms": 176.0983,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n200 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n200 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n200 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3l-surveys.integration.cjs:37:28)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 6",
    "suites 0",
    "pass 5",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16604.3716"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3l_surveys_test_63608cf5d718c91a\"}\n",
    "REVIEW_MEASURE {\"case\":\"S01\",\"openResults\":400,\"sparseHidden\":true,\"reopen\":400}\n",
    "REVIEW_MEASURE {\"case\":\"S02\",\"groupBHidden\":true,\"inferredAnswerCount\":1,\"inferredCounts\":[0,1]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3l_surveys_test_63608cf5d718c91a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3l_surveys_test_63608cf5d718c91a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3l_unit_scope_test_2743a060cae3b8c7\"}\n",
    "REVIEW_MEASURE {\"case\":\"U01\",\"calibrationForeignUnit\":false,\"trainingForeignUnit\":false,\"hiddenParentDirect\":404,\"hiddenParentTitleViaChild\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3l_unit_scope_test_2743a060cae3b8c7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3l_unit_scope_test_2743a060cae3b8c7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3l_case_test_a69777c088229ff6\"}\n",
    "REVIEW_MEASURE {\"case\":\"C01\",\"unlistedAdmin\":404,\"reboundRespondent\":404,\"complainantExposed\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3l_case_test_a69777c088229ff6\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3l_case_test_a69777c088229ff6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3l_knowledge_test_44c7a20207a19c4a\"}\n",
    "REVIEW_MEASURE {\"case\":\"K01\",\"editorForeignPolicyTitle\":false,\"ordinaryReaderForeignDraftPolicy\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3l_knowledge_test_44c7a20207a19c4a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3l_knowledge_test_44c7a20207a19c4a\"}\n"
  ]
}

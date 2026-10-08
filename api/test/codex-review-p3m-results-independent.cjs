module.exports = {
  "selected": [
    "codex-review-p3m-surveys",
    "codex-review-p3m-policy-pool",
    "codex-review-p3m-rewards",
    "codex-review-p3m-penalties",
    "codex-review-p3m-preboarding",
    "codex-review-p3m-case-privacy",
    "codex-review-p3m-knowledge",
    "codex-review-p3m-unit-scope"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 18,
      "failed": 0,
      "passed": 18,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 18,
      "suites": 0
    },
    "duration_ms": 76247.036
  },
  "results": [
    {
      "file": "codex-review-p3m-surveys.integration.cjs",
      "name": "P3M-S01 control: open results blocked, sparse question hidden, closed survey cannot reopen",
      "ms": 6091.4296,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-surveys.integration.cjs",
      "name": "P3M-S02: optional question leaks hidden group by complementary subtraction",
      "ms": 215.7289,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-surveys.integration.cjs",
      "name": "P3M-S03: close waits for the response, times out cleanly, then publishes immutable results",
      "ms": 5519.8788,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-surveys.integration.cjs",
      "name": "P3M-S04: insertion failure rolls back the invitation mark and permits a single retry",
      "ms": 127.004,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-policy-pool.integration.cjs",
      "name": "P3M-K02: ten article updates exhaust pool while referenceFor needs an eleventh connection",
      "ms": 6177.0551,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-rewards.integration.cjs",
      "name": "P3M-R01 control: detail failure after financial commit links one bonus",
      "ms": 20848.9937,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-rewards.integration.cjs",
      "name": "P3M-R02: editable manual reason hijacks reward reference with a different value",
      "ms": 477.1431,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-rewards.integration.cjs",
      "name": "P3M-R03: failure after link update rolls back the request and releases the attempt",
      "ms": 391.9664,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-rewards.integration.cjs",
      "name": "P3M-R04: stale live writer cannot commit after another attempt takes its claim",
      "ms": 451.241,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-rewards.integration.cjs",
      "name": "P3M-R05: hook failure after instant approval rolls back ledger, request, audit and notification outbox",
      "ms": 150.8254,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-penalties.integration.cjs",
      "name": "P3M-P01 control: changed penalty rejects old fingerprint",
      "ms": 30764.5242,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-penalties.integration.cjs",
      "name": "P3M-P02 control: pending failure cannot increase concurrent recurrence",
      "ms": 613.9143,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-penalties.integration.cjs",
      "name": "P3M-P03: expired pending reservation is deleted while its writer can still create a deduction",
      "ms": 571.4466,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-penalties.integration.cjs",
      "name": "P3M-P04: manual HTTP financial reason is accepted as an unrelated penalty request",
      "ms": 333.7924,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-preboarding.integration.cjs",
      "name": "P3M-B01: preboarding role is employee but structural manager still reads another employee task",
      "ms": 22013.7271,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-case-privacy.integration.cjs",
      "name": "P3M-C01: handler account rebound to respondent loses full case and complainant identity",
      "ms": 6408.2393,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-knowledge.integration.cjs",
      "name": "P3M-K01: article cannot reference or expose a policy outside both editor and reader audience",
      "ms": 6129.7576,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3m-unit-scope.integration.cjs",
      "name": "P3M-U01: calibration and mandatory-training views hide current foreign department names",
      "ms": 5939.5389,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_preboarding_test_9501a69f33b12b1b",
    "tests 18",
    "suites 0",
    "pass 18",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 76247.036"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3m_surveys_test_2b0e8e7bb6f694fd\"}\n",
    "REVIEW_MEASURE {\"case\":\"S01\",\"openResults\":400,\"sparseHidden\":true,\"reopen\":400}\n",
    "REVIEW_MEASURE {\"case\":\"S02\",\"bothGroupsHidden\":true,\"overallAnswers\":6}\n",
    "REVIEW_MEASURE {\"case\":\"S03\",\"timeoutStatus\":409,\"elapsedMs\":5036,\"waited\":true,\"closedCount\":6,\"stable\":true,\"connectionTimeouts\":[{\"before\":{\"timeout\":-1,\"spid\":59},\"after\":{\"timeout\":-1,\"spid\":59},\"failed\":true},{\"before\":{\"timeout\":-1,\"spid\":59},\"after\":{\"timeout\":-1,\"spid\":59},\"failed\":false}]}\n",
    "REVIEW_MEASURE {\"case\":\"S04\",\"rollback\":true,\"retryRows\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3m_surveys_test_2b0e8e7bb6f694fd\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3m_surveys_test_2b0e8e7bb6f694fd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3m_policy_pool_test_1146722d3e22f293\"}\n",
    "REVIEW_MEASURE {\"case\":\"K02\",\"occupied\":{\"used\":10,\"free\":0,\"max\":10,\"referenceCalls\":10},\"pendingReads\":0,\"statuses\":[200,200,200,200,200,200,200,200,200,200],\"acquireTimeoutMs\":1500}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3m_policy_pool_test_1146722d3e22f293\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3m_policy_pool_test_1146722d3e22f293\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_rewards_test_c63f62877e8cec69\"}\n",
    "REVIEW_MEASURE {\"case\":\"R01\",\"first\":200,\"retry\":409,\"bonusRequests\":1,\"linked\":true}\n",
    "REVIEW_MEASURE {\"case\":\"R02\",\"suggested\":123,\"linkedValue\":123,\"linkedManual\":false,\"requests\":2}\n",
    "REVIEW_MEASURE {\"case\":\"R03\",\"first\":500,\"rolledBack\":true,\"released\":true,\"retry\":200,\"requests\":1}\n",
    "REVIEW_MEASURE {\"case\":\"R04\",\"oldWriter\":409,\"newWriter\":200,\"requests\":1,\"oldTokenUnmodified\":true}\n",
    "REVIEW_MEASURE {\"case\":\"R05\",\"approvedInside\":true,\"rollbackTables\":[\"BonusRequest\",\"EmployeeObligation\"]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_rewards_test_c63f62877e8cec69\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalties_test_7fb76c53442568de\"}\n",
    "REVIEW_MEASURE {\"case\":\"P01\",\"staleFingerprint\":409,\"penalties\":0}\n",
    "REVIEW_MEASURE {\"case\":\"P02\",\"concurrent\":409,\"failedFirst\":403,\"finalOccurrence\":1,\"days\":1}\n",
    "REVIEW_MEASURE {\"case\":\"P03\",\"firstStatus\":409,\"secondStatus\":201,\"remainingPenalties\":1,\"financialRequests\":1,\"oldReservationDeleted\":true}\n",
    "REVIEW_MEASURE {\"case\":\"P04\",\"manualHttp\":201,\"penaltyHttp\":500,\"penalties\":0,\"manualLinked\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalties_test_7fb76c53442568de\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_preboarding_test_9501a69f33b12b1b\"}\n",
    "REVIEW_MEASURE {\"case\":\"B01\",\"role\":\"employee\",\"preboarding\":true,\"roleTask\":404,\"subordinateTask\":404}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_preboarding_test_9501a69f33b12b1b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3m_case_test_c7d92d65562e74e3\"}\n",
    "REVIEW_MEASURE {\"case\":\"C01\",\"unlistedAdmin\":404,\"reboundRespondent\":404,\"complainantExposed\":false,\"oldUploaderFile\":404,\"write\":404,\"upload\":403}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3m_case_test_c7d92d65562e74e3\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3m_case_test_c7d92d65562e74e3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3m_knowledge_test_332317c312c8e1a7\"}\n",
    "REVIEW_MEASURE {\"case\":\"K01\",\"editorForeignPolicyTitle\":false,\"ordinaryReaderForeignDraftPolicy\":null}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3m_knowledge_test_332317c312c8e1a7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3m_knowledge_test_332317c312c8e1a7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3m_unit_scope_test_ec76998482840401\"}\n",
    "REVIEW_MEASURE {\"case\":\"U01\",\"calibrationForeignUnit\":false,\"trainingForeignUnit\":false,\"hiddenParentDirect\":404,\"hiddenParentTitleViaChild\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3m_unit_scope_test_ec76998482840401\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3m_unit_scope_test_ec76998482840401\"}\n"
  ]
}

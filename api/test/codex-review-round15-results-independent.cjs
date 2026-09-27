module.exports = {
  "selected": [
    "codex-review-round15-boundaries"
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
    "duration_ms": 8475.3577
  },
  "results": [
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 inactive empty and missing chains honor viewer scope and preserve general names",
      "ms": 5430.726,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 undeclared fields redact branch type on submit and resubmit without saving the rejected payload",
      "ms": 333.8325,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 leave date and duration rules cannot disclose a newly renamed foreign type through an old proxy draft",
      "ms": 232.5173,
      "pass": false,
      "error": "Leave rule errors must not disclose a current hidden branch definition name",
      "cause": "Leave rule errors must not disclose a current hidden branch definition name",
      "stack": "AssertionError [ERR_ASSERTION]: Leave rule errors must not disclose a current hidden branch definition name\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round15-boundaries.integration.cjs:76:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 unsupported historical definition must not reveal its private name before branch authorization",
      "ms": 76.0916,
      "pass": false,
      "error": "The unsupported-destination error precedes branch checks and must not reveal the type name",
      "cause": "The unsupported-destination error precedes branch checks and must not reveal the type name",
      "stack": "AssertionError [ERR_ASSERTION]: The unsupported-destination error precedes branch checks and must not reveal the type name\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round15-boundaries.integration.cjs:91:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 leave date and duration rules cannot disclose a newly renamed foreign type through an old proxy draft",
      "ms": 232.5173,
      "pass": false,
      "error": "Leave rule errors must not disclose a current hidden branch definition name",
      "cause": "Leave rule errors must not disclose a current hidden branch definition name",
      "stack": "AssertionError [ERR_ASSERTION]: Leave rule errors must not disclose a current hidden branch definition name\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round15-boundaries.integration.cjs:76:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 unsupported historical definition must not reveal its private name before branch authorization",
      "ms": 76.0916,
      "pass": false,
      "error": "The unsupported-destination error precedes branch checks and must not reveal the type name",
      "cause": "The unsupported-destination error precedes branch checks and must not reveal the type name",
      "stack": "AssertionError [ERR_ASSERTION]: The unsupported-destination error precedes branch checks and must not reveal the type name\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round15-boundaries.integration.cjs:91:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 2",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 8475.3577"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r15boundaries_test_a81bf713d97d8d91\"}\n",
    "CR15_EVIDENCE {\"case\":\"chain-scope-matrix\",\"checks\":30,\"matrix\":[{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"outside\",\"namesVisible\":false,\"message\":\"سلسلة اعتماد نوع الطلب ده (سلسلة الفرع بتاعته) معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"empty\",\"namesVisible\":false,\"message\":\"سلسلة اعتماد نوع الطلب ده (سلسلة الفرع بتاعته) معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_3» (سلسلة «CR15_CHAIN_3») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_3» (سلسلة «CR15_CHAIN_3») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_3» (سلسلة «CR15_CHAIN_3») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"outside\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"empty\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"outside\",\"namesVisible\":false,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع الطلب ده بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة الفرع بتاعته ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"empty\",\"namesVisible\":false,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع الطلب ده بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة الفرع بتاعته ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_9» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_9» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_9» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_9» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_9» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_9» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"outside\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"empty\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"outside\",\"namesVisible\":false,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع الطلب ده — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"empty\",\"namesVisible\":false,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع الطلب ده — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_15» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_15» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_15» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"outside\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"empty\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"}]}\n",
    "CR15_EVIDENCE {\"case\":\"payload-rejection-and-recovery\",\"submission\":\"حقول غير معرّفة لنوع الطلب ده: obsolete — أزِلها أو عرّفها في «أنواع الطلبات»\",\"resubmission\":\"حقول غير معرّفة لنوع الطلب ده: intruder — أزِلها أو عرّفها في «أنواع الطلبات»\",\"creation\":\"حقول غير معرّفة لنوع «CR15_PRIVATE_RENAMED_REQUEST_TYPE_A»: intruder — أزِلها أو عرّفها في «أنواع الطلبات»\",\"rejectedStatesPreserved\":true,\"validResubmission\":\"UNDER_REVIEW\",\"final\":\"COMPLETED\"}\n",
    "CR15_EVIDENCE {\"case\":\"leave-rules-foreign-name\",\"catalogHidesName\":true,\"scopeChangedViaApi\":true,\"renamedAfterScopeChange\":true,\"half\":{\"status\":400,\"message\":\"«CR15_PRIVATE_RENAMED_LEAVE_A» مينفعش تتاخد نص يوم — اختار يوم كامل\"},\"duration\":{\"status\":400,\"message\":\"«CR15_PRIVATE_RENAMED_LEAVE_A» أقل مدة للطلب 2 يوم (أيام تقويم) — إنت طالب 1\"},\"requestsUnchanged\":true,\"leavesCreated\":0}\n",
    "CR15_EVIDENCE {\"case\":\"legacy-unsupported-definition\",\"requiresSeededLegacyDefinition\":true,\"normalChangeBlocked\":400,\"activationBlocked\":400,\"catalogHidesName\":true,\"status\":400,\"error\":{\"message\":\"نوع «CR15_PRIVATE_LEGACY_UNSUPPORTED_A» ليس له تنفيذ بعد الاعتماد (الوجهة «cr15_unbuilt_handler» لم تُبنَ) — لا يُقبل عليه طلب حتى تختار الموارد البشرية وجهة منفّذة أو «سجل فقط» من «بانِي الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400},\"requestsCreated\":0}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r15boundaries_test_a81bf713d97d8d91\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r15boundaries_test_a81bf713d97d8d91\"}\n"
  ]
}

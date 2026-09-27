module.exports = {
  "selected": [
    "codex-review-round15-boundaries",
    "codex-review-round14-messages"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 8,
      "failed": 0,
      "passed": 8,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 8,
      "suites": 0
    },
    "duration_ms": 14387.1987
  },
  "results": [
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 inactive empty and missing chains honor viewer scope and preserve general names",
      "ms": 4762.6005,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 undeclared fields redact branch type on submit and resubmit without saving the rejected payload",
      "ms": 283.1776,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 leave date and duration rules cannot disclose a newly renamed foreign type through an old proxy draft",
      "ms": 201.4264,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round15-boundaries.integration.cjs",
      "name": "CR15 unsupported historical definition must not reveal its private name before branch authorization",
      "ms": 67.4735,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round14-messages.integration.cjs",
      "name": "CR14 all three administration failures obey the submitter scope after an API transfer",
      "ms": 4365.5345,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round14-messages.integration.cjs",
      "name": "CR14 missing skip-level manager redacts a foreign manager and preserves local and company diagnostics",
      "ms": 273.3723,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round14-messages.integration.cjs",
      "name": "CR14 a foreign leave type must not disclose its private name in a submission rejection",
      "ms": 91.274,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round14-messages.integration.cjs",
      "name": "CR14 an old draft cannot reveal a newly named branch approval chain after viewer scope revocation",
      "ms": 102.2357,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 8",
    "suites 0",
    "pass 8",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 14387.1987"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r15boundaries_test_f20b9bc855b3f4cb\"}\n",
    "CR15_EVIDENCE {\"case\":\"chain-scope-matrix\",\"checks\":30,\"matrix\":[{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"outside\",\"namesVisible\":false,\"message\":\"سلسلة اعتماد نوع الطلب ده (سلسلة الفرع بتاعته) معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"empty\",\"namesVisible\":false,\"message\":\"سلسلة اعتماد نوع الطلب ده (سلسلة الفرع بتاعته) معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_3» (سلسلة «CR15_CHAIN_3») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_3» (سلسلة «CR15_CHAIN_3») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":false,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_3» (سلسلة «CR15_CHAIN_3») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"outside\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"empty\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"inactive\",\"publicDefinition\":true,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"سلسلة اعتماد نوع «CR15_TYPE_6» (سلسلة «CR15_CHAIN_6») معطّلة — لا تُقبل عليها طلبات جديدة. فعّلها من «سلاسل الاعتماد» أو اربط النوع بسلسلة مفعّلة ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"outside\",\"namesVisible\":false,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع الطلب ده بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة الفرع بتاعته ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"empty\",\"namesVisible\":false,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع الطلب ده بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة الفرع بتاعته ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_9» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_9» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_9» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_9» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":false,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_9» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_9» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"outside\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"empty\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"empty\",\"publicDefinition\":true,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «CR15_TYPE_12» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة «CR15_CHAIN_12» ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"outside\",\"namesVisible\":false,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع الطلب ده — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"empty\",\"namesVisible\":false,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع الطلب ده — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_15» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_15» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":false,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_15» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"outside\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"empty\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"local\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"multi\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"},{\"state\":\"missing\",\"publicDefinition\":true,\"scope\":\"company\",\"namesVisible\":true,\"message\":\"لا توجد سلسلة اعتماد مربوطة بنوع «CR15_TYPE_18» — اربطه بسلسلة من «سلاسل الاعتماد» وأضِف المعتمدين ثم أعد التقديم\"}]}\n",
    "CR15_EVIDENCE {\"case\":\"payload-rejection-and-recovery\",\"submission\":\"حقول غير معرّفة لنوع الطلب ده: obsolete — أزِلها أو عرّفها في «أنواع الطلبات»\",\"resubmission\":\"حقول غير معرّفة لنوع الطلب ده: intruder — أزِلها أو عرّفها في «أنواع الطلبات»\",\"creation\":\"حقول غير معرّفة لنوع «CR15_PRIVATE_RENAMED_REQUEST_TYPE_A»: intruder — أزِلها أو عرّفها في «أنواع الطلبات»\",\"rejectedStatesPreserved\":true,\"validResubmission\":\"UNDER_REVIEW\",\"final\":\"COMPLETED\"}\n",
    "CR15_EVIDENCE {\"case\":\"leave-rules-foreign-name\",\"catalogHidesName\":true,\"scopeChangedViaApi\":true,\"renamedAfterScopeChange\":true,\"half\":{\"status\":400,\"message\":\"«نوع الإجازة ده» مينفعش تتاخد نص يوم — اختار يوم كامل\"},\"duration\":{\"status\":400,\"message\":\"«نوع الإجازة ده» أقل مدة للطلب 2 يوم (أيام تقويم) — إنت طالب 1\"},\"requestsUnchanged\":true,\"leavesCreated\":0}\n",
    "CR15_EVIDENCE {\"case\":\"legacy-unsupported-definition\",\"requiresSeededLegacyDefinition\":true,\"normalChangeBlocked\":400,\"activationBlocked\":400,\"catalogHidesName\":true,\"status\":400,\"error\":{\"message\":\"نوع الطلب ده ليس له تنفيذ بعد الاعتماد (الوجهة «cr15_unbuilt_handler» لم تُبنَ) — لا يُقبل عليه طلب حتى تختار الموارد البشرية وجهة منفّذة أو «سجل فقط» من «بانِي الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400},\"requestsCreated\":0}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r15boundaries_test_f20b9bc855b3f4cb\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r15boundaries_test_f20b9bc855b3f4cb\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r14messages_test_8615368f5b2c27ad\"}\n",
    "CR14_EVIDENCE {\"case\":\"administration-message-matrix\",\"matrix\":[{\"kind\":\"missing-manager\",\"scope\":\"old branch\",\"nameVisible\":false,\"message\":\"الإدارة «إدارة في فرع تاني» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-manager\",\"scope\":\"empty scope\",\"nameVisible\":false,\"message\":\"الإدارة «إدارة في فرع تاني» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-manager\",\"scope\":\"both branches\",\"nameVisible\":true,\"message\":\"الإدارة «CR14_PRIVATE_missing-manager» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-manager\",\"scope\":\"company scope\",\"nameVisible\":true,\"message\":\"الإدارة «CR14_PRIVATE_missing-manager» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-administration\",\"scope\":\"old branch\",\"nameVisible\":false,\"message\":\"قسم مقدّم الطلب «قسم في فرع تاني» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-administration\",\"scope\":\"empty scope\",\"nameVisible\":false,\"message\":\"قسم مقدّم الطلب «قسم في فرع تاني» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-administration\",\"scope\":\"both branches\",\"nameVisible\":true,\"message\":\"قسم مقدّم الطلب «CR14_PRIVATE_missing-administration» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-administration\",\"scope\":\"company scope\",\"nameVisible\":true,\"message\":\"قسم مقدّم الطلب «CR14_PRIVATE_missing-administration» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"self-manager\",\"scope\":\"old branch\",\"nameVisible\":false,\"message\":\"مقدّم الطلب هو نفسه مدير «إدارة في فرع تاني» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»\"},{\"kind\":\"self-manager\",\"scope\":\"empty scope\",\"nameVisible\":false,\"message\":\"مقدّم الطلب هو نفسه مدير «إدارة في فرع تاني» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»\"},{\"kind\":\"self-manager\",\"scope\":\"both branches\",\"nameVisible\":true,\"message\":\"مقدّم الطلب هو نفسه مدير «CR14_PRIVATE_self-manager» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»\"},{\"kind\":\"self-manager\",\"scope\":\"company scope\",\"nameVisible\":true,\"message\":\"مقدّم الطلب هو نفسه مدير «CR14_PRIVATE_self-manager» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»\"}]}\n",
    "CR14_EVIDENCE {\"case\":\"skip-level-message-matrix\",\"matrix\":[{\"scope\":\"old branch\",\"nameVisible\":false,\"message\":\"مفيش «مدير المدير المباشر»: «المدير المباشر» لمقدّم الطلب مالوش مدير مسجّل في ملفه — سجّله، أو عدّل سلسلة الاعتماد\"},{\"scope\":\"empty scope\",\"nameVisible\":false,\"message\":\"مفيش «مدير المدير المباشر»: «المدير المباشر» لمقدّم الطلب مالوش مدير مسجّل في ملفه — سجّله، أو عدّل سلسلة الاعتماد\"},{\"scope\":\"manager branch\",\"nameVisible\":true,\"message\":\"مفيش «مدير المدير المباشر»: سجّل المدير المباشر لـ«CR14_PRIVATE_DIRECT_MANAGER_B» في ملفه، أو عدّل سلسلة الاعتماد\"},{\"scope\":\"both branches\",\"nameVisible\":true,\"message\":\"مفيش «مدير المدير المباشر»: سجّل المدير المباشر لـ«CR14_PRIVATE_DIRECT_MANAGER_B» في ملفه، أو عدّل سلسلة الاعتماد\"},{\"scope\":\"company scope\",\"nameVisible\":true,\"message\":\"مفيش «مدير المدير المباشر»: سجّل المدير المباشر لـ«CR14_PRIVATE_DIRECT_MANAGER_B» في ملفه، أو عدّل سلسلة الاعتماد\"}]}\n",
    "CR14_EVIDENCE {\"case\":\"foreign-leave-type-message\",\"catalogHidesName\":true,\"status\":400,\"error\":{\"message\":\"نوع الإجازة المختار خاص بفرع تاني — اختر من الأنواع المتاحة\",\"error\":\"Bad Request\",\"statusCode\":400},\"containsForeignName\":false}\n",
    "CR14_EVIDENCE {\"case\":\"foreign-chain-message\",\"viewerBranch\":2,\"requestBranch\":1,\"listHidesName\":true,\"status\":400,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «R14_20» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة الفرع بتاعته ثم أعد التقديم\",\"containsForeignName\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r14messages_test_8615368f5b2c27ad\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r14messages_test_8615368f5b2c27ad\"}\n"
  ]
}

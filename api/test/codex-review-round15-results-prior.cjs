module.exports = {
  "selected": [
    "codex-review-round14-messages"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 4,
      "failed": 0,
      "passed": 4,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 7975.2878
  },
  "results": [
    {
      "file": "codex-review-round14-messages.integration.cjs",
      "name": "CR14 all three administration failures obey the submitter scope after an API transfer",
      "ms": 5142.7278,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round14-messages.integration.cjs",
      "name": "CR14 missing skip-level manager redacts a foreign manager and preserves local and company diagnostics",
      "ms": 346.254,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round14-messages.integration.cjs",
      "name": "CR14 a foreign leave type must not disclose its private name in a submission rejection",
      "ms": 115.5254,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round14-messages.integration.cjs",
      "name": "CR14 an old draft cannot reveal a newly named branch approval chain after viewer scope revocation",
      "ms": 135.144,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7975.2878"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r14messages_test_9eac62bdfa0ea772\"}\n",
    "CR14_EVIDENCE {\"case\":\"administration-message-matrix\",\"matrix\":[{\"kind\":\"missing-manager\",\"scope\":\"old branch\",\"nameVisible\":false,\"message\":\"الإدارة «إدارة في فرع تاني» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-manager\",\"scope\":\"empty scope\",\"nameVisible\":false,\"message\":\"الإدارة «إدارة في فرع تاني» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-manager\",\"scope\":\"both branches\",\"nameVisible\":true,\"message\":\"الإدارة «CR14_PRIVATE_missing-manager» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-manager\",\"scope\":\"company scope\",\"nameVisible\":true,\"message\":\"الإدارة «CR14_PRIVATE_missing-manager» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-administration\",\"scope\":\"old branch\",\"nameVisible\":false,\"message\":\"قسم مقدّم الطلب «قسم في فرع تاني» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-administration\",\"scope\":\"empty scope\",\"nameVisible\":false,\"message\":\"قسم مقدّم الطلب «قسم في فرع تاني» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-administration\",\"scope\":\"both branches\",\"nameVisible\":true,\"message\":\"قسم مقدّم الطلب «CR14_PRIVATE_missing-administration» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"missing-administration\",\"scope\":\"company scope\",\"nameVisible\":true,\"message\":\"قسم مقدّم الطلب «CR14_PRIVATE_missing-administration» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد\"},{\"kind\":\"self-manager\",\"scope\":\"old branch\",\"nameVisible\":false,\"message\":\"مقدّم الطلب هو نفسه مدير «إدارة في فرع تاني» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»\"},{\"kind\":\"self-manager\",\"scope\":\"empty scope\",\"nameVisible\":false,\"message\":\"مقدّم الطلب هو نفسه مدير «إدارة في فرع تاني» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»\"},{\"kind\":\"self-manager\",\"scope\":\"both branches\",\"nameVisible\":true,\"message\":\"مقدّم الطلب هو نفسه مدير «CR14_PRIVATE_self-manager» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»\"},{\"kind\":\"self-manager\",\"scope\":\"company scope\",\"nameVisible\":true,\"message\":\"مقدّم الطلب هو نفسه مدير «CR14_PRIVATE_self-manager» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»\"}]}\n",
    "CR14_EVIDENCE {\"case\":\"skip-level-message-matrix\",\"matrix\":[{\"scope\":\"old branch\",\"nameVisible\":false,\"message\":\"مفيش «مدير المدير المباشر»: «المدير المباشر» لمقدّم الطلب مالوش مدير مسجّل في ملفه — سجّله، أو عدّل سلسلة الاعتماد\"},{\"scope\":\"empty scope\",\"nameVisible\":false,\"message\":\"مفيش «مدير المدير المباشر»: «المدير المباشر» لمقدّم الطلب مالوش مدير مسجّل في ملفه — سجّله، أو عدّل سلسلة الاعتماد\"},{\"scope\":\"manager branch\",\"nameVisible\":true,\"message\":\"مفيش «مدير المدير المباشر»: سجّل المدير المباشر لـ«CR14_PRIVATE_DIRECT_MANAGER_B» في ملفه، أو عدّل سلسلة الاعتماد\"},{\"scope\":\"both branches\",\"nameVisible\":true,\"message\":\"مفيش «مدير المدير المباشر»: سجّل المدير المباشر لـ«CR14_PRIVATE_DIRECT_MANAGER_B» في ملفه، أو عدّل سلسلة الاعتماد\"},{\"scope\":\"company scope\",\"nameVisible\":true,\"message\":\"مفيش «مدير المدير المباشر»: سجّل المدير المباشر لـ«CR14_PRIVATE_DIRECT_MANAGER_B» في ملفه، أو عدّل سلسلة الاعتماد\"}]}\n",
    "CR14_EVIDENCE {\"case\":\"foreign-leave-type-message\",\"catalogHidesName\":true,\"status\":400,\"error\":{\"message\":\"نوع الإجازة المختار خاص بفرع تاني — اختر من الأنواع المتاحة\",\"error\":\"Bad Request\",\"statusCode\":400},\"containsForeignName\":false}\n",
    "CR14_EVIDENCE {\"case\":\"foreign-chain-message\",\"viewerBranch\":2,\"requestBranch\":1,\"listHidesName\":true,\"status\":400,\"message\":\"لم تُحدَّد خطوات الاعتماد لنوع «R14_20» بعد — افتح «سلاسل الاعتماد» وأضِف المعتمدين لسلسلة الفرع بتاعته ثم أعد التقديم\",\"containsForeignName\":false}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r14messages_test_9eac62bdfa0ea772\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r14messages_test_9eac62bdfa0ea772\"}\n"
  ]
}

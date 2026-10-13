module.exports = {
  "selected": [
    "missing-punch-deduction",
    "mailbox",
    "request-holder",
    "review-evaluator",
    "tasks-assignment-rules",
    "performance-reviews"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 38,
      "failed": 1,
      "passed": 37,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 38,
      "suites": 0
    },
    "duration_ms": 83709.2117
  },
  "results": [
    {
      "file": "missing-punch-deduction.integration.cjs",
      "name": "MPD-01: المعامل مقفول (الافتراضي) — يوم البصمة الناقصة من غير خصم ولا أثر في اللقطة والقسيمة، وبيوقّف اعتماد المسير زي الأول",
      "ms": 17522.7212,
      "pass": true,
      "skip": false
    },
    {
      "file": "missing-punch-deduction.integration.cjs",
      "name": "MPD-02: المعامل مفعّل — يوم ببصمة واحدة ومن غير طلب بيتخصم بعد المسموح، واللي قدّم طلب لأ، والمستثنى برّه، والمسير بيتعتمد",
      "ms": 2394.1141,
      "pass": true,
      "skip": false
    },
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-01: الموديول مقفول افتراضيًا — كل مسارات البريد 404 حتى لمدير النظام، وبتتفتح لما يتفعّل",
      "ms": 16076.489,
      "pass": true,
      "skip": false
    },
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-02: البريد مش مضبوط على الخادم — الحالة بتقول، وكل مسار 503 بكود ثابت، ومفيش طلب بيطلع",
      "ms": 49.8508,
      "pass": true,
      "skip": false
    },
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-03: «افتح بريدك» على السلك — المقفول 428، والغلط مرفوض ومعدود (خمسة = قفل ربع ساعة)، والصح بيفتح والمفتاح في cookie بس",
      "ms": 1214.3404,
      "pass": true,
      "skip": false
    },
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-04: المخزن عبر HTTP — مفتاح حساب أو جلسة تانية مايفتحش؛ والقفل والخروج وتغيير إصدار التوكن ونهاية التوكن ورفض خادم البريد بيمسحوه",
      "ms": 2679.9761,
      "pass": true,
      "skip": false
    },
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-05: العزل — كل نداء بهوية صاحب الجلسة؛ ومعرّف رسالة أو مرفق حد تاني = غير موجود؛ وصندوق حد تاني بـmbx مرفوض قبل أي نداء",
      "ms": 317.0744,
      "pass": true,
      "skip": false
    },
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-06: الصناديق المشتركة — الإدارة بالصلاحية، والفتح للمضاف عليه بس، وخادم البريد له الكلمة الأخيرة؛ وقبل الترحيل 192 وبعده",
      "ms": 6025.8843,
      "pass": true,
      "skip": false
    },
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-07: الإرسال — نموذج متعدد الأجزاء بمرفق باسم عربي، والهوية من الجلسة، والقيم الغلط مرفوضة قبل خادم البريد",
      "ms": 114.9269,
      "pass": true,
      "skip": false
    },
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-08: «الدخول بحساب الشركة» بيمسك كلمة السر للجلسة لما الموديول مفعّل للحساب — البريد بيفتح من غير نموذج؛ والخروج بيمسح",
      "ms": 595.6132,
      "pass": true,
      "skip": false
    },
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-09: ولا كلمة سر في أي رد ولا سطر سجل ولا طلب على السلك ولا عمود في القاعدة",
      "ms": 452.3247,
      "pass": false,
      "error": "",
      "cause": "",
      "stack": "AssertionError [ERR_ASSERTION]\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\mailbox.integration.cjs:726:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-holder.integration.cjs",
      "name": "RH-01: خطوة «المدير المباشر» — اسم المدير ومسمّاه ومن إمتى، في طلباتي والتفاصيل ولوحة الطلبات؛ والطلب في صندوقه هو",
      "ms": 16626.7057,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-holder.integration.cjs",
      "name": "RH-02: «مدير المدير المباشر» بعد اعتماد الأولى — «من إمتى» وقت الاعتماد؛ الاسم لصاحب الطلب دايمًا ولغيره بفرع الشخص الحالي",
      "ms": 1071.7967,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-holder.integration.cjs",
      "name": "RH-03: خطوة دور وظيفي بكذا حامل — أول خمسة و«+N»؛ برّه نطاق فرع الطلب ومدير النظام مش منهم؛ وصاحب الطلب مش مستني على نفسه",
      "ms": 952.1016,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-holder.integration.cjs",
      "name": "RH-04: خطوة عند بديل بتفويض ساري — «البديل بالنيابة عن المفوِّض»؛ والمقفولة وطلب البديل نفسه عند المعتمد؛ وبعد الإلغاء بترجع",
      "ms": 1460.3912,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-holder.integration.cjs",
      "name": "RH-05: النوع السري — المحجوب في لوحة الطلبات وتفاصيله من غير «واقف عند»؛ وصاحبه والمعتمد بيشوفوا",
      "ms": 245.0541,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-holder.integration.cjs",
      "name": "RH-06: برّه السلسلة والنطاق مفيش حاجة جديدة؛ والطلب اللي مش قيد المراجعة من غير «واقف عند»",
      "ms": 463.7908,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-holder.integration.cjs",
      "name": "RH-07: مجموعة متوازية (اسم لكل خطوة، والاعتماد الجزئي مابيحركش «من إمتى»)، والتصعيد (المعتمد الجديد ووقت التصعيد)",
      "ms": 929.7595,
      "pass": true,
      "skip": false
    },
    {
      "file": "review-evaluator.integration.cjs",
      "name": "RE-01: الموظف من غير مدير بياخد مقيِّم — التكليف بيظهر عند الجديد وبيسلّم، والقديم بيخرج",
      "ms": 16355.005,
      "pass": true,
      "skip": false
    },
    {
      "file": "review-evaluator.integration.cjs",
      "name": "RE-02: القواعد — الصلاحية والنطاق، مش نفسه، على رأس العمل، مش بعد التسليم، والدورة شغالة، وسطر تدقيق للتغيير الفعلي بس",
      "ms": 410.4741,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-01: اختبارات المالك الخمسة — زميل مرفوض، وتحت المدير المرؤوس مقبول، وقسم تاني مرفوض برسالة الطلب، والمسؤول مايحوّلش، وHR برّه فروعه 404",
      "ms": 15112.1815,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-02: «تحته في الشجرة» — المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، ومش لفوق ولا للجنب؛ و«كل اللي تحته» بنفس حكم «تحته؟»",
      "ms": 4732.1418,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-03: المهمة الشخصية — لصاحبها ومديره المباشر بس، وبيديرها صاحبها، وبرّه قايمة «المهام» والتقرير، ومن غير إشعار تكليف ولا تبليغ تأخير",
      "ms": 1955.4886,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-04: «تكليف أي موظف» — أي موظف في نطاق الحساب، وبيدير اللي كلّف بيه هو بس وبحقه دلوقتي، والصلاحية مش في أي دور جاهز",
      "ms": 275.8329,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-05: اللي كلّف بيها بيديرها بحقه دلوقتي — مسؤولها خرج من تحته = لا يشوفها ولا يديرها، ورجع = رجعت؛ و«فريقي» فيه اللي كلّف بيه حد أبعد من مرؤوسيه",
      "ms": 284.7788,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-06: المسؤول مايرفضش ولا يحوّل ولا يلغي ولا يغيّر الموعد؛ و«مش بتاعتي» تعليق بعلامته بيتشاور فيه للي كلّف من الخادم",
      "ms": 438.1019,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-07: طلب تمديد الميعاد — للمسؤول بسبب، واحد معلّق، واللي بيدير المهمة يوافق أو يرفض، وبيتشال مع تغيير الموعد أو التحويل أو الإقفال",
      "ms": 1175.417,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-08: «خلص لما» والميزة مفتوحة — مهمة معلّمة، اتقفلت متأخر يومين بإثبات، اترجّعت مرة بسبب، واتقبلت واتقيّمت 4؛ وكله في السجل والتقرير",
      "ms": 1302.4988,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-09: نفس السيناريو والميزة مقفولة — من غير علامة ولا تقييم ولا خاناتهم، والالتزام والرجوع شغالين",
      "ms": 1069.3013,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-10: التقرير — صاحب «عرض كل المهام» في نطاقه، والمدير على اللي يشوفه، وغيرهم فاضي؛ ومهمة الدور والشخصية برّاه؛ وحدود الفترة",
      "ms": 458.9033,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-11: سجل المهمة — كل تغيير سطر في حوارها بعلامة نوعه وباسم اللي عمله، بيتقري بحكم المهمة",
      "ms": 800.3087,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-12: حالة ميزة التقييم بتتقري قبل معاملة المهمة مش جواها (CRP2Y-B02) — تعديل العلامة، والإقفال، والرجوع، والتقييم",
      "ms": 502.1127,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-01: النماذج والدورات — القيم، ونطاق الفروع، والإطلاق بتكليف لكل موظف شغال بمديره ونسخة نموذج متجمّدة",
      "ms": 15074.8067,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-02: التقييم الذاتي وتقييم المدير — مرة واحدة، على النموذج المتجمّد وأهداف الفترة، والدرجة بالأوزان، والأدلة بتتجمّد مع الرد",
      "ms": 801.5326,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-03: إدارة الأداء — تكليفات الدورة بدرجاتها بنطاق الفروع، وقفل الدورة بيوقّف التسليم، والموديول المقفول بيقفل المسارات",
      "ms": 293.3496,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-04: الاعتماد والإعلان والإقرار — المدير سلّم ← معتمد ← معلن ← الموظف أقرّ، وتقييم المدير بيظهر للموظف بعد الإعلان بس",
      "ms": 468.1129,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-05: المعايرة والاعتراض — تعديل بسبب قبل الاعتماد بيتسجّل (قبل/بعد/مين)، وتوزيع التقديرات لكل مدير، والاعتراض طلب مربوط بتقييم معلن في مهلته ومرة واحدة، والمعايرة بعد اعتراض اتقبل",
      "ms": 2024.1149,
      "pass": true,
      "skip": false
    },
    {
      "file": "performance-reviews.integration.cjs",
      "name": "RV-06: a cycle with a unified audience (a unit with what is under it, minus the excluded) launches for its people only, inside the manager's branches",
      "ms": 219.2056,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "mailbox.integration.cjs",
      "name": "MB-09: ولا كلمة سر في أي رد ولا سطر سجل ولا طلب على السلك ولا عمود في القاعدة",
      "ms": 452.3247,
      "pass": false,
      "error": "",
      "cause": "",
      "stack": "AssertionError [ERR_ASSERTION]\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\mailbox.integration.cjs:726:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_028785b8f74c131c is absent from sys.databases.",
    "Cleanup verified: hr_request_holder_test_e746b146d011fa07 is absent from sys.databases.",
    "Cleanup verified: hr_review_evaluator_test_669b0bbaaf79135e is absent from sys.databases.",
    "Cleanup verified: hr_task_rules_test_95c23fee25c3cf16 is absent from sys.databases.",
    "Cleanup verified: hr_perf_reviews_test_c3026fba2dfb4e48 is absent from sys.databases.",
    "tests 38",
    "suites 0",
    "pass 37",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 83709.2117"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_028785b8f74c131c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_028785b8f74c131c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mailbox_test_a2816acfbb6d0f83\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mailbox_test_a2816acfbb6d0f83\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_request_holder_test_e746b146d011fa07\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_request_holder_test_e746b146d011fa07\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_669b0bbaaf79135e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_669b0bbaaf79135e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_task_rules_test_95c23fee25c3cf16\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_task_rules_test_95c23fee25c3cf16\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_reviews_test_c3026fba2dfb4e48\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_reviews_test_c3026fba2dfb4e48\"}\n"
  ]
}

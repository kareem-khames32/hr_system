module.exports = {
  "selected": [
    "tasks-assignment-rules",
    "tasks-assignment-rules-migration",
    "employee-suspension",
    "comments",
    "request-execution-tasks"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 45,
      "failed": 0,
      "passed": 45,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 45,
      "suites": 0
    },
    "duration_ms": 58433.8455
  },
  "results": [
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-01: اختبارات المالك الخمسة — زميل مرفوض، وتحت المدير المرؤوس مقبول، وقسم تاني مرفوض برسالة الطلب، والمسؤول مايحوّلش، وHR برّه فروعه 404",
      "ms": 6390.6704,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-02: «تحته في الشجرة» — المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، ومش لفوق ولا للجنب؛ و«كل اللي تحته» بنفس حكم «تحته؟»",
      "ms": 2642.0649,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-03: المهمة الشخصية — لصاحبها ومديره المباشر بس، وبيديرها صاحبها، وبرّه قايمة «المهام» والتقرير، ومن غير إشعار تكليف ولا تبليغ تأخير",
      "ms": 1017.4031,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-04: «تكليف أي موظف» — أي موظف في نطاق الحساب، وبيدير اللي كلّف بيه هو بس وبحقه دلوقتي، والصلاحية مش في أي دور جاهز",
      "ms": 152.7138,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-05: اللي كلّف بيها بيديرها بحقه دلوقتي — مسؤولها خرج من تحته = لا يشوفها ولا يديرها، ورجع = رجعت؛ و«فريقي» فيه اللي كلّف بيه حد أبعد من مرؤوسيه",
      "ms": 157.5694,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-06: المسؤول مايرفضش ولا يحوّل ولا يلغي ولا يغيّر الموعد؛ و«مش بتاعتي» تعليق بعلامته بيتشاور فيه للي كلّف من الخادم",
      "ms": 267.9371,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-07: طلب تمديد الميعاد — للمسؤول بسبب، واحد معلّق، واللي بيدير المهمة يوافق أو يرفض، وبيتشال مع تغيير الموعد أو التحويل أو الإقفال",
      "ms": 1030.5681,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-08: «خلص لما» والميزة مفتوحة — مهمة معلّمة، اتقفلت متأخر يومين بإثبات، اترجّعت مرة بسبب، واتقبلت واتقيّمت 4؛ وكله في السجل والتقرير",
      "ms": 918.7398,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-09: نفس السيناريو والميزة مقفولة — من غير علامة ولا تقييم ولا خاناتهم، والالتزام والرجوع شغالين",
      "ms": 1024.2009,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-10: التقرير — صاحب «عرض كل المهام» في نطاقه، والمدير على اللي يشوفه، وغيرهم فاضي؛ ومهمة الدور والشخصية برّاه؛ وحدود الفترة",
      "ms": 356.5848,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-11: سجل المهمة — كل تغيير سطر في حوارها بعلامة نوعه وباسم اللي عمله، بيتقري بحكم المهمة",
      "ms": 573.8902,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-12: حالة ميزة التقييم بتتقري قبل معاملة المهمة مش جواها (CRP2Y-B02) — تعديل العلامة، والإقفال، والرجوع، والتقييم",
      "ms": 306.5112,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules-migration.integration.cjs",
      "name": "TRM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر، وجدول المهام بأعمدته العشرين",
      "ms": 7290.3362,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules-migration.integration.cjs",
      "name": "TRM-2: من غير الجدولين المهام زي الأول والجديد مقفول برسالته؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الجديد شغال",
      "ms": 6992.8642,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules-migration.integration.cjs",
      "name": "TRM-3: آمن للتكرار",
      "ms": 991.2795,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية أو الجواز بأي صيغة وفريدة، ورقم البصمة فريد",
      "ms": 6924.258,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو «موقوف» بلا تواريخ مرفوض، وتغيير الجنسية مابيعيدش فحص الهوية",
      "ms": 140.4609,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 337.4019,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 333.4107,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 707.9848,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "CRP2X-N01: تسجيل إيقاف بيتقاطع مع اعتماد طلب بيغيّر ملف نفس الموظف — الإيقاف بيتعاد بعد التقاطع والاتنين بيكمّلوا",
      "ms": 2252.983,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "CRP2Y-X-N01: تجديد عقد بيتقاطع مع اعتماد طلب بيغيّر ملف نفس الموظف — التجديد بيتعاد بعد التقاطع والاتنين بيكمّلوا",
      "ms": 4994.0552,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل",
      "ms": 7424.9462,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب",
      "ms": 251.1018,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي",
      "ms": 1321.2178,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر",
      "ms": 153.79,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام",
      "ms": 359.4641,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار",
      "ms": 458.1544,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال",
      "ms": 4760.0549,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
      "ms": 770.9426,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق",
      "ms": 3292.2544,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-10: قفل تعديل الحساب مايستنفدش اتصالات القاعدة — نص المخزن بالكتير، والباقي بيستنى دوره من غير اتصال",
      "ms": 1365.4963,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-01: نوع من غير الإعداد — الاعتماد بيكمّل الطلب في لحظتها ومن غير مهمة",
      "ms": 8108.3401,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-02: الإعداد على نوع الطلب — الدور والمهلة والإثبات بحدودهم، وشيل الدور بيشيل الباقي",
      "ms": 510.9875,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-03: نوع عليه مهمة — الطلب «قيد التنفيذ» ومهمة واحدة على الدور في فرع الطلب، وفي «مهامي» والتقرير",
      "ms": 346.5722,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-04: اللي المهمة عليه بيقرا الطلب، وحامل الدور في فرع تاني والغريب لأ",
      "ms": 130.6612,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-05: إقفال المهمة — الطلب «مكتمل» وسطر «اتنفّذ» وبريد لصاحبه؛ والإثبات الإجباري، وإقفالين في نفس اللحظة، ومن غير إعادة فتح",
      "ms": 1449.3158,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-06: مهمة التنفيذ ماتتلغيش ولا تتعدّل ولا تتحوّل من شاشة المهام — رفض التنفيذ من لوحة الطلبات بيلغيها ويرفض الطلب",
      "ms": 413.0267,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-07: الطلب السري — عنوان المهمة عام ومن غير اسم معتمده، وأصحاب «عرض كل المهام» و«إدارة المهام» مالهمش طريق له، والمنفّذ بيقراه",
      "ms": 2337.4908,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-08: المهمة والاعتماد معاملة واحدة — لو المهمة ماتكتبتش، الاعتماد كله بيرجع",
      "ms": 154.6132,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-09: باقي مداخل الاعتماد — سلسلة فاضية باعتماد تلقائي، وطلب الموارد البشرية نيابةً؛ ومعالج لسه ماخلّصش من غير مهمة",
      "ms": 496.0395,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-10: محدش ينفّذ طلبه — صاحب الطلب ومنشئه نيابةً مايشتغلوش على مهمته، ومدير النظام بيفكّ الانسداد",
      "ms": 776.1166,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-11: إثبات مهمة التنفيذ وسبب تعليقها ومين قفلها — للي يقدر يفتح الطلب بس، وملف إثباتها لرافعه",
      "ms": 730.6046,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-12: إقفال المهمة ورفض تنفيذ الطلب في نفس اللحظة — واحد بس بيكسب والتاني بيترفض برسالة، من غير تعليق متبادل",
      "ms": 320.8489,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-tasks.integration.cjs",
      "name": "RX-13: مهمة ربطها بطلبها اتثبّت والنداء واقف على صفها — مابتتعاملش كمهمة عادية",
      "ms": 471.3419,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_task_rules_test_d635c1ce9d619767 is absent from sys.databases.",
    "Cleanup verified: hr_taskrules_migration_test_ffeadbe151b8295b is absent from sys.databases.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_bd2c0ffd13a1e20e is absent from sys.databases.",
    "Cleanup verified: hr_comments_test_ae6f49941b51e94e is absent from sys.databases.",
    "Cleanup verified: hr_reqexec_test_4a7279eb6f8758f3 is absent from sys.databases.",
    "tests 45",
    "suites 0",
    "pass 45",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 58433.8455"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_task_rules_test_d635c1ce9d619767\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_task_rules_test_d635c1ce9d619767\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_taskrules_migration_test_ffeadbe151b8295b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_taskrules_migration_test_ffeadbe151b8295b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_suspension_test_bd2c0ffd13a1e20e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_suspension_test_bd2c0ffd13a1e20e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comments_test_ae6f49941b51e94e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comments_test_ae6f49941b51e94e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_reqexec_test_4a7279eb6f8758f3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_reqexec_test_4a7279eb6f8758f3\"}\n"
  ]
}

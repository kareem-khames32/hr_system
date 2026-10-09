module.exports = {
  "selected": [
    "ai-assistant",
    "ai-action-assistant",
    "ai-assist",
    "ai-reports",
    "crp6a"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 22,
      "failed": 0,
      "passed": 22,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 22,
      "suites": 0
    },
    "duration_ms": 64005.7495
  },
  "results": [
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 15249.3642,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 326.5044,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 605.6002,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 198.3319,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 593.2815,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 19538.0103,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 924.9016,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 2455.5791,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 199.5253,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 367.1499,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 788.8801,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 18106.8125,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 576.971,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 153.1403,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 185.7329,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-01: «عدد الغياب في فرع جدة الشهر ده» — نفس رقم تقرير المؤشرات بالحرف (النسبة وعدد أيام الغياب)، والنموذج مابيبعتش غير مفتاح مؤشر واسم فرع",
      "ms": 15489.6469,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-02: الحدود — من غير صلاحية التقارير الأداة مش موجودة؛ فرع برّه النطاق واسم مش موجود ومؤشر مش في القاموس وشهر غلط ومؤشر صلاحيته ناقصة = «مش متاح»؛ والاسم الغامض بيرجع باختياراته",
      "ms": 378.4442,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-03: خادم MCP فوق الـAPI العام — بمفتاح تكامل بيقرا اللي نطاقاته وفروعه تسمح بيه بس، والرد = رد المسار نفسه؛ ومفيش أداة كتابة",
      "ms": 245.7479,
      "pass": true,
      "skip": false
    },
    {
      "file": "crp6a.integration.cjs",
      "name": "CR6-01 (B01): الاستيراد بحراس مسار كل نوع — صلاحية الإعدادات لوحدها مابتعملش فرع ولا موظف ولا رصيد ولا سلفة (زي المسارات الأصلية)، وبصلاحية النوع بيعدّي الحارس",
      "ms": 16338.0023,
      "pass": true,
      "skip": false
    },
    {
      "file": "crp6a.integration.cjs",
      "name": "CR6-02 (B03): الـAPI العام — رقم القسم والفريق والمدير وأب الوحدة بيرجعوا بس لو فرع المرجع الحالي جوه نطاق المفتاح (المدير من فرع تاني، والقسم بعد نقله)؛ وأداة البحث من غير أرقام مراجع",
      "ms": 471.754,
      "pass": true,
      "skip": false
    },
    {
      "file": "crp6a.integration.cjs",
      "name": "CR6-03 (B05): الاقتراح مربوط بملف الموظف اللي اتجهّز له — بعد تغيير ربط الحساب بموظف تاني مابيظهرش ومابيتأكدش ومابيتلغيش، وولا طلب بيتعمل؛ وقرار اقتراحات التوظيف كذلك",
      "ms": 495.7525,
      "pass": true,
      "skip": false
    },
    {
      "file": "crp6a.integration.cjs",
      "name": "CR6-04 (B06): ترتيب المرشحين — تليفون وآيبان وبريد ورقم هوية مكتوبين جوه ملاحظات المرشح مابيوصلوش للمزوّد (بيتحجبوا)، وباقي الملاحظة بتوصل",
      "ms": 214.3986,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_aiassist_test_302fe774c5c5dca7 is absent from sys.databases.",
    "Cleanup verified: hr_aiaction_test_47b18a6ded945f91 is absent from sys.databases.",
    "Cleanup verified: hr_aiassistx_test_4d5d8dd538f9649a is absent from sys.databases.",
    "Cleanup verified: hr_aireports_test_2076fa0a757ffff4 is absent from sys.databases.",
    "Cleanup verified: hr_crp6a_test_bc222653bd252eb4 is absent from sys.databases.",
    "tests 22",
    "suites 0",
    "pass 22",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 64005.7495"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_302fe774c5c5dca7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_302fe774c5c5dca7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_47b18a6ded945f91\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_47b18a6ded945f91\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_4d5d8dd538f9649a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_4d5d8dd538f9649a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aireports_test_2076fa0a757ffff4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aireports_test_2076fa0a757ffff4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_crp6a_test_bc222653bd252eb4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_crp6a_test_bc222653bd252eb4\"}\n"
  ]
}

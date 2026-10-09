module.exports = {
  "selected": [
    "setup-import",
    "public-api",
    "webhooks",
    "ai-assistant",
    "ai-action-assistant",
    "ai-assist",
    "ai-reports",
    "crp6a"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 37,
      "failed": 0,
      "passed": 37,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 37,
      "suites": 0
    },
    "duration_ms": 55603.9378
  },
  "results": [
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-01: الصلاحية والملف — بصلاحية الإعدادات ولحساب بكل الفروع؛ القالب بعناوينه؛ وملف بعناوين غلط أو فاضي مرفوض قبل أي حاجة",
      "ms": 9175.9448,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-02: الهيكل — المعاينة مابتكتبش وبتقول الجديد والموجود والأخطاء بالصف؛ ملف فيه خطأ مابيتطبقش منه حاجة؛ والتطبيق بخدمة الفروع والأقسام، وإعادة الرفع بتتخطّى الموجود",
      "ms": 196.7334,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-03: الموظفين — نفس قواعد إنشاء الموظف في المعاينة (الإلزام والشكل والفرع والقسم والتكرار)، والتطبيق بخدمة إنشاء الموظف (الكود بيتولّد)، والموجود برقم بصمته بيتخطّى",
      "ms": 537.4272,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-04: (ج) الأرصدة الافتتاحية — بصلاحية الأرصدة فوق صلاحية الإعدادات؛ المعاينة مابتكتبش؛ والتطبيق بخدمة تعديل الرصيد (سبب وسجل) لحد ما المتبقي يساوي الملف؛ واللي رصيده زي الملف بيتخطّى",
      "ms": 383.7033,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-05: (ج) السلف القائمة — بصلاحيتَي النيابة والاستثنائية؛ كل صف طلب سلفة بالنيابة بحكم النيابة القايم (من غير سلطة الموارد البشرية بيستنى سلسلته ومفيش سلفة، وبسلطتها بيتعتمد باسم اللي رفع)؛ والطلب القايم بيتخطّى",
      "ms": 345.0519,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-01: الموديول مقفول افتراضيًا = مفيش مسار (إدارة ولا عام)؛ وقبل ترحيل 183 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9248.756,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-02: إدارة المفاتيح — بصلاحيتها ولحساب بكل الفروع؛ القيم بتتفحص؛ المفتاح بيظهر مرة في رد الإنشاء وبيتخزن بصمة؛ والإلغاء مرة واحدة",
      "ms": 136.1832,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-03: الـAPI العام — مفتاح صالح بس (ناقص وغلط وملغي نفس الرد)، والنطاق المطلوب، وفروع المفتاح جوه القراءة بفرع الموظف الحالي، ومن غير بيانات حساسة، وللقراءة بس",
      "ms": 188.7063,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-04: حد الطلبات لكل مفتاح — بعد الحد 429، ومفتاح تاني لسه شغال؛ وقفل الموديول بيقفل الـAPI العام",
      "ms": 761.7332,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-05: (ب) الحضور والإجازات وملخص المسير — نطاق القراءة لكل مسار، فروع المفتاح بفرع الموظف الحالي، المعتمد بس، إجمالي من غير مبلغ لموظف، وموديول البيانات المقفول بيقفل مساره",
      "ms": 328.2115,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9681.8822,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-02: الإدارة — بصلاحيتها ولحساب بكل الفروع؛ العنوان لازم https عام (العنوان الداخلي والمحلي مرفوض من غير «محلي مسموح»)؛ السر بيظهر مرة ومختوم في القاعدة؛ والإيقاف والتشغيل",
      "ms": 155.0039,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-03: الإرسال — تعديل موظف من مساره بيطلع رسالة موقّعة بمراجع بس؛ نطاق فروع النقطة بفرع الموظف الحالي وقت التوزيع ووقت الإرسال؛ ومفيش تكرار",
      "ms": 342.3603,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-04: الفشل وإعادة المحاولة والتحويل — رد غير 2xx بيرجّع المهمة للطابور والنقطة بتسجّل الفشل؛ بعد النجاح العدّاد بيتصفّر؛ والتحويل مابيتتبعش",
      "ms": 163.5281,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-05: المسير والنقطة الواقفة والموديول — اعتماد مسير بيوصل للنقطة اللي فيه موظف من فروعها بس؛ النقطة الواقفة والموديول المقفول مفيش إرسال",
      "ms": 404.4211,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9683.4258,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 142.6052,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 245.4641,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 86.6838,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 295.7317,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 11229.6162,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 402.0726,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 978.3873,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 147.9621,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 199.7673,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 357.9191,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 9506.9786,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 295.7943,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 87.1203,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 137.7626,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-01: «عدد الغياب في فرع جدة الشهر ده» — نفس رقم تقرير المؤشرات بالحرف (النسبة وعدد أيام الغياب)، والنموذج مابيبعتش غير مفتاح مؤشر واسم فرع",
      "ms": 9579.4449,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-02: الحدود — من غير صلاحية التقارير الأداة مش موجودة؛ فرع برّه النطاق واسم مش موجود ومؤشر مش في القاموس وشهر غلط ومؤشر صلاحيته ناقصة = «مش متاح»؛ والاسم الغامض بيرجع باختياراته",
      "ms": 192.577,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-03: خادم MCP فوق الـAPI العام — بمفتاح تكامل بيقرا اللي نطاقاته وفروعه تسمح بيه بس، والرد = رد المسار نفسه؛ ومفيش أداة كتابة",
      "ms": 102.613,
      "pass": true,
      "skip": false
    },
    {
      "file": "crp6a.integration.cjs",
      "name": "CR6-01 (B01): الاستيراد بحراس مسار كل نوع — صلاحية الإعدادات لوحدها مابتعملش فرع ولا موظف ولا رصيد ولا سلفة (زي المسارات الأصلية)، وبصلاحية النوع بيعدّي الحارس",
      "ms": 9036.94,
      "pass": true,
      "skip": false
    },
    {
      "file": "crp6a.integration.cjs",
      "name": "CR6-02 (B03): الـAPI العام — رقم القسم والفريق والمدير وأب الوحدة بيرجعوا بس لو فرع المرجع الحالي جوه نطاق المفتاح (المدير من فرع تاني، والقسم بعد نقله)؛ وأداة البحث من غير أرقام مراجع",
      "ms": 137.4823,
      "pass": true,
      "skip": false
    },
    {
      "file": "crp6a.integration.cjs",
      "name": "CR6-03 (B05): الاقتراح مربوط بملف الموظف اللي اتجهّز له — بعد تغيير ربط الحساب بموظف تاني مابيظهرش ومابيتأكدش ومابيتلغيش، وولا طلب بيتعمل؛ وقرار اقتراحات التوظيف كذلك",
      "ms": 81.1864,
      "pass": true,
      "skip": false
    },
    {
      "file": "crp6a.integration.cjs",
      "name": "CR6-04 (B06): ترتيب المرشحين — تليفون وآيبان وبريد ورقم هوية مكتوبين جوه ملاحظات المرشح مابيوصلوش للمزوّد (بيتحجبوا)، وباقي الملاحظة بتوصل",
      "ms": 59.8366,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_setup_import_test_3b413f39ecba5812 is absent from sys.databases.",
    "Cleanup verified: hr_public_api_test_89efe239d58c6e71 is absent from sys.databases.",
    "Cleanup verified: hr_webhooks_test_6f487b6d4c25192e is absent from sys.databases.",
    "Cleanup verified: hr_aiassist_test_311f23f06373870e is absent from sys.databases.",
    "Cleanup verified: hr_aiaction_test_96db7dc17dc95945 is absent from sys.databases.",
    "Cleanup verified: hr_aiassistx_test_3ef64e3e345b2ee1 is absent from sys.databases.",
    "Cleanup verified: hr_aireports_test_19600fcfca7b8370 is absent from sys.databases.",
    "Cleanup verified: hr_crp6a_test_595fc0842e332327 is absent from sys.databases.",
    "tests 37",
    "suites 0",
    "pass 37",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 55603.9378"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_setup_import_test_3b413f39ecba5812\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_setup_import_test_3b413f39ecba5812\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_api_test_89efe239d58c6e71\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_api_test_89efe239d58c6e71\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_webhooks_test_6f487b6d4c25192e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_webhooks_test_6f487b6d4c25192e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_311f23f06373870e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_311f23f06373870e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_96db7dc17dc95945\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_96db7dc17dc95945\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_3ef64e3e345b2ee1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_3ef64e3e345b2ee1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aireports_test_19600fcfca7b8370\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aireports_test_19600fcfca7b8370\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_crp6a_test_595fc0842e332327\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_crp6a_test_595fc0842e332327\"}\n"
  ]
}

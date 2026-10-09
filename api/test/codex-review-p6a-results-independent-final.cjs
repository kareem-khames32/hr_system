module.exports = {
  "selected": [
    "codex-review-p6a-setup",
    "codex-review-p6a-public",
    "codex-review-p6a-webhooks",
    "codex-review-p6a-ai",
    "codex-review-p6a-ai-assist",
    "codex-review-p6a-ai-read"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 38,
      "failed": 0,
      "passed": 38,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 38,
      "suites": 0
    },
    "duration_ms": 44665.0822
  },
  "results": [
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-01: الصلاحية والملف — بصلاحية الإعدادات ولحساب بكل الفروع؛ القالب بعناوينه؛ وملف بعناوين غلط أو فاضي مرفوض قبل أي حاجة",
      "ms": 9153.6723,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-02: الهيكل — المعاينة مابتكتبش وبتقول الجديد والموجود والأخطاء بالصف؛ ملف فيه خطأ مابيتطبقش منه حاجة؛ والتطبيق بخدمة الفروع والأقسام، وإعادة الرفع بتتخطّى الموجود",
      "ms": 251.5161,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-03: الموظفين — نفس قواعد إنشاء الموظف في المعاينة (الإلزام والشكل والفرع والقسم والتكرار)، والتطبيق بخدمة إنشاء الموظف (الكود بيتولّد)، والموجود برقم بصمته بيتخطّى",
      "ms": 549.9187,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-04: (ج) الأرصدة الافتتاحية — بصلاحية الأرصدة فوق صلاحية الإعدادات؛ المعاينة مابتكتبش؛ والتطبيق بخدمة تعديل الرصيد (سبب وسجل) لحد ما المتبقي يساوي الملف؛ واللي رصيده زي الملف بيتخطّى",
      "ms": 361.5906,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-05: (ج) السلف القائمة — بصلاحيتَي النيابة والاستثنائية؛ كل صف طلب سلفة بالنيابة بحكم النيابة القايم (من غير سلطة الموارد البشرية بيستنى سلسلته ومفيش سلفة، وبسلطتها بيتعتمد باسم اللي رفع)؛ والطلب القايم بيتخطّى",
      "ms": 333.3247,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "P6A-I01: settings-only account can create an employee despite original route refusing it",
      "ms": 105.9113,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "P6A-I03: balance import bypasses the leave module audience while the original adjustment route refuses",
      "ms": 125.2218,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "P6A-I04: settings-only account can create organization structure despite original route refusal",
      "ms": 65.1519,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-01: الموديول مقفول افتراضيًا = مفيش مسار (إدارة ولا عام)؛ وقبل ترحيل 183 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9343.4168,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-02: إدارة المفاتيح — بصلاحيتها ولحساب بكل الفروع؛ القيم بتتفحص؛ المفتاح بيظهر مرة في رد الإنشاء وبيتخزن بصمة؛ والإلغاء مرة واحدة",
      "ms": 173.0843,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-03: الـAPI العام — مفتاح صالح بس (ناقص وغلط وملغي نفس الرد)، والنطاق المطلوب، وفروع المفتاح جوه القراءة بفرع الموظف الحالي، ومن غير بيانات حساسة، وللقراءة بس",
      "ms": 193.5584,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-04: حد الطلبات لكل مفتاح — بعد الحد 429، ومفتاح تاني لسه شغال؛ وقفل الموديول بيقفل الـAPI العام",
      "ms": 716.4951,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-05: (ب) الحضور والإجازات وملخص المسير — نطاق القراءة لكل مسار، فروع المفتاح بفرع الموظف الحالي، المعتمد بس، إجمالي من غير مبلغ لموظف، وموديول البيانات المقفول بيقفل مساره",
      "ms": 319.1894,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "P6A-P01: public employee exposes ids of units and manager currently outside key branches",
      "ms": 109.2396,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9816.1324,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-02: الإدارة — بصلاحيتها ولحساب بكل الفروع؛ العنوان لازم https عام (العنوان الداخلي والمحلي مرفوض من غير «محلي مسموح»)؛ السر بيظهر مرة ومختوم في القاعدة؛ والإيقاف والتشغيل",
      "ms": 134.7697,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-03: الإرسال — تعديل موظف من مساره بيطلع رسالة موقّعة بمراجع بس؛ نطاق فروع النقطة بفرع الموظف الحالي وقت التوزيع ووقت الإرسال؛ ومفيش تكرار",
      "ms": 401.7683,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-04: الفشل وإعادة المحاولة والتحويل — رد غير 2xx بيرجّع المهمة للطابور والنقطة بتسجّل الفشل؛ بعد النجاح العدّاد بيتصفّر؛ والتحويل مابيتتبعش",
      "ms": 157.2753,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "WH-05: المسير والنقطة الواقفة والموديول — اعتماد مسير بيوصل للنقطة اللي فيه موظف من فروعها بس؛ النقطة الواقفة والموديول المقفول مفيش إرسال",
      "ms": 386.9485,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-webhooks.integration.cjs",
      "name": "P6A-W01: hostname is resolved again after the public-address check (local TLS receiver only)",
      "ms": 154.5902,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 11826.1055,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 385.949,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 921.4491,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 131.9393,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 247.8653,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 333.5617,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "P6A-A01: self-leave proposal follows the account to a different employee at confirmation",
      "ms": 229.1975,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 10081.4636,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 305.5098,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 106.7995,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 186.7077,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "P6A-A02: recruitment free-text contact details reach the provider",
      "ms": 56.8538,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9732.4841,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 128.1294,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 232.9951,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 102.6909,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 301.0581,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "P6A-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 67.1557,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"direct\":403,\"import\":200,\"created\":1}",
    "{\"direct\":404,\"import\":200,\"balance\":17}",
    "{\"direct\":403,\"import\":200,\"created\":1}",
    "Cleanup verified: hr_setup_import_test_b148526d61785433 is absent from sys.databases.",
    "{\"foreignDepartmentId\":3,\"foreignTeamId\":1,\"foreignManagerId\":3}",
    "Cleanup verified: hr_public_api_test_e7552b61fd517e64 is absent from sys.databases.",
    "{\"checkedPublicAddress\":true,\"secondResolution\":true,\"localReceiverRequests\":1,\"outcome\":\"SENT\"}",
    "Cleanup verified: hr_webhooks_test_83c3b9547889de16 is absent from sys.databases.",
    "{\"previewEmployee\":3,\"executedEmployee\":4,\"oldPersonalReasonVisible\":true,\"status\":200}",
    "Cleanup verified: hr_aiaction_test_bab56a58d161a7f3 is absent from sys.databases.",
    "{\"providerReceivedContact\":true,\"providerReceivedIban\":true}",
    "Cleanup verified: hr_aiassistx_test_d731b2b851a449ca is absent from sys.databases.",
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2,\"providerDepartmentId\":1}",
    "Cleanup verified: hr_aiassist_test_77e9f9d592bf35a6 is absent from sys.databases.",
    "tests 38",
    "suites 0",
    "pass 38",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 44665.0822"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_setup_import_test_b148526d61785433\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_setup_import_test_b148526d61785433\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_api_test_e7552b61fd517e64\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_api_test_e7552b61fd517e64\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_webhooks_test_83c3b9547889de16\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_webhooks_test_83c3b9547889de16\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_bab56a58d161a7f3\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_bab56a58d161a7f3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_d731b2b851a449ca\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_d731b2b851a449ca\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_77e9f9d592bf35a6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_77e9f9d592bf35a6\"}\n"
  ]
}

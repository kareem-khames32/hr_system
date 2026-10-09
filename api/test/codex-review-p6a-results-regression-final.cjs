module.exports = {
  "selected": [
    "setup-import",
    "user-language",
    "public-api",
    "webhooks",
    "sso-oidc",
    "cost-center-report",
    "ai-assistant",
    "ai-action-assistant",
    "ai-reports",
    "ai-assist",
    "notifications-migration"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 48,
      "failed": 0,
      "passed": 48,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 48,
      "suites": 0
    },
    "duration_ms": 85385.584
  },
  "results": [
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-01: الصلاحية والملف — بصلاحية الإعدادات ولحساب بكل الفروع؛ القالب بعناوينه؛ وملف بعناوين غلط أو فاضي مرفوض قبل أي حاجة",
      "ms": 9137.6165,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-02: الهيكل — المعاينة مابتكتبش وبتقول الجديد والموجود والأخطاء بالصف؛ ملف فيه خطأ مابيتطبقش منه حاجة؛ والتطبيق بخدمة الفروع والأقسام، وإعادة الرفع بتتخطّى الموجود",
      "ms": 219.1471,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-03: الموظفين — نفس قواعد إنشاء الموظف في المعاينة (الإلزام والشكل والفرع والقسم والتكرار)، والتطبيق بخدمة إنشاء الموظف (الكود بيتولّد)، والموجود برقم بصمته بيتخطّى",
      "ms": 591.8885,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-04: (ج) الأرصدة الافتتاحية — بصلاحية الأرصدة فوق صلاحية الإعدادات؛ المعاينة مابتكتبش؛ والتطبيق بخدمة تعديل الرصيد (سبب وسجل) لحد ما المتبقي يساوي الملف؛ واللي رصيده زي الملف بيتخطّى",
      "ms": 408.9898,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-05: (ج) السلف القائمة — بصلاحيتَي النيابة والاستثنائية؛ كل صف طلب سلفة بالنيابة بحكم النيابة القايم (من غير سلطة الموارد البشرية بيستنى سلسلته ومفيش سلفة، وبسلطتها بيتعتمد باسم اللي رفع)؛ والطلب القايم بيتخطّى",
      "ms": 362.5213,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-language.integration.cjs",
      "name": "UL-01: قبل ترحيل 182 — الحساب عربي، الخادم بيقول إن اللغة مش بتتغيّر، والتغيير مرفوض برسالة؛ ومن غير دخول مفيش رد",
      "ms": 8693.3275,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-language.integration.cjs",
      "name": "UL-02: الترحيل 182 — بيضيف العمود بشكله، آمن للتكرار، وبيرفض عمود موجود بشكل غلط",
      "ms": 88.1212,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-language.integration.cjs",
      "name": "UL-03: بعد الترحيل — صاحب الحساب بيغيّر لغته هو بس: القيمة بتتحفظ وبترجع، حساب تاني زي ما هو، والتوكن وإصداره ماتغيّروش؛ وقيمة غلط مرفوضة",
      "ms": 62.6322,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-01: الموديول مقفول افتراضيًا = مفيش مسار (إدارة ولا عام)؛ وقبل ترحيل 183 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9354.5052,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-02: إدارة المفاتيح — بصلاحيتها ولحساب بكل الفروع؛ القيم بتتفحص؛ المفتاح بيظهر مرة في رد الإنشاء وبيتخزن بصمة؛ والإلغاء مرة واحدة",
      "ms": 138.2395,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-03: الـAPI العام — مفتاح صالح بس (ناقص وغلط وملغي نفس الرد)، والنطاق المطلوب، وفروع المفتاح جوه القراءة بفرع الموظف الحالي، ومن غير بيانات حساسة، وللقراءة بس",
      "ms": 169.7372,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-04: حد الطلبات لكل مفتاح — بعد الحد 429، ومفتاح تاني لسه شغال؛ وقفل الموديول بيقفل الـAPI العام",
      "ms": 680.4911,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-05: (ب) الحضور والإجازات وملخص المسير — نطاق القراءة لكل مسار، فروع المفتاح بفرع الموظف الحالي، المعتمد بس، إجمالي من غير مبلغ لموظف، وموديول البيانات المقفول بيقفل مساره",
      "ms": 326.28,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9421.6904,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-02: الإدارة — بصلاحيتها ولحساب بكل الفروع؛ العنوان لازم https عام (العنوان الداخلي والمحلي مرفوض من غير «محلي مسموح»)؛ السر بيظهر مرة ومختوم في القاعدة؛ والإيقاف والتشغيل",
      "ms": 179.3957,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-03: الإرسال — تعديل موظف من مساره بيطلع رسالة موقّعة بمراجع بس؛ نطاق فروع النقطة بفرع الموظف الحالي وقت التوزيع ووقت الإرسال؛ ومفيش تكرار",
      "ms": 393.9919,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-04: الفشل وإعادة المحاولة والتحويل — رد غير 2xx بيرجّع المهمة للطابور والنقطة بتسجّل الفشل؛ بعد النجاح العدّاد بيتصفّر؛ والتحويل مابيتتبعش",
      "ms": 175.4931,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-05: المسير والنقطة الواقفة والموديول — اعتماد مسير بيوصل للنقطة اللي فيه موظف من فروعها بس؛ النقطة الواقفة والموديول المقفول مفيش إرسال",
      "ms": 446.1267,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-01: من غير إعداد المسار مقفول وشاشة الدخول زي ما هي؛ وبالإعداد الزرار بيظهر باسمه، والبداية بترجّع عنوان المزوّد ومعاملة في cookie على مسارها",
      "ms": 9864.1979,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-02: الدخول — هوية المزوّد بتتطابق بالموظف بنفس منطق حساب الشركة: أول دخول بيعمل حساب واحد مربوط، والتاني بيلاقيه بالمعرّف الثابت حتى لو البريد اتغيّر عند المزوّد",
      "ms": 320.4509,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-03: الرفض — من غير معاملة أو بـstate غلط أو بمعاملة متصفح تاني؛ ونطاق مش مسموح، وهوية غريبة، وموظف منتهي، وهوية تانية لحساب مربوط: مفيش جلسة ومفيش حساب",
      "ms": 119.7401,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-04: الـID token — مزوّد تاني، تطبيق تاني، nonce غلط، منتهي، أو موقّع بمفتاح مش من مفاتيح المزوّد: رسالة واحدة ومفيش جلسة",
      "ms": 198.049,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-05: الخطوة التانية بتاعة النظام بتفضل شغالة بعد الدخول المؤسسي — دور إلزامي له رمز البريد: مفيش جلسة من الـSSO لوحده",
      "ms": 49.9675,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
      "ms": 10089.6255,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 23.025,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
      "ms": 64.9572,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "B6.5 — القيد المحاسبي: نفس أرقام التقرير، مدين = دائن لكل مركز، المعتمد والمصروف بس، مسير واحد بالطلب، ونطاق الفرع وصلاحية الرواتب",
      "ms": 125.8511,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 10376.856,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 123.8524,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 229.7965,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 88.4435,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 260.6491,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 12110.0395,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 342.6145,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 949.2516,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 126.8697,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 249.5193,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 365.2261,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-01: «عدد الغياب في فرع جدة الشهر ده» — نفس رقم تقرير المؤشرات بالحرف (النسبة وعدد أيام الغياب)، والنموذج مابيبعتش غير مفتاح مؤشر واسم فرع",
      "ms": 10238.5299,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-02: الحدود — من غير صلاحية التقارير الأداة مش موجودة؛ فرع برّه النطاق واسم مش موجود ومؤشر مش في القاموس وشهر غلط ومؤشر صلاحيته ناقصة = «مش متاح»؛ والاسم الغامض بيرجع باختياراته",
      "ms": 198.8401,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-03: خادم MCP فوق الـAPI العام — بمفتاح تكامل بيقرا اللي نطاقاته وفروعه تسمح بيه بس، والرد = رد المسار نفسه؛ ومفيش أداة كتابة",
      "ms": 105.682,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 10601.355,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 286.1643,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 93.7552,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 158.7808,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 9957.5804,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-2: من غير الجداول الإشعارات المخزّنة والبريد واقفين من غير أخطاء؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر",
      "ms": 4671.4458,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-3: آمن للتكرار",
      "ms": 965.9631,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_setup_import_test_810d5e1850f55058 is absent from sys.databases.",
    "Cleanup verified: hr_user_language_test_68e5e53e6c09a18f is absent from sys.databases.",
    "Cleanup verified: hr_public_api_test_02d7824620760be6 is absent from sys.databases.",
    "Cleanup verified: hr_webhooks_test_f063fdb79517ac4b is absent from sys.databases.",
    "Cleanup verified: hr_sso_oidc_test_c201feca8bc7b9aa is absent from sys.databases.",
    "Cleanup verified: hr_cost_center_test_3707a2c92fef24ae is absent from sys.databases.",
    "Cleanup verified: hr_aiassist_test_5faa98aea6f59ca0 is absent from sys.databases.",
    "Cleanup verified: hr_aiaction_test_c127d66c7e6456ba is absent from sys.databases.",
    "Cleanup verified: hr_aireports_test_211dcdf5b07c136f is absent from sys.databases.",
    "Cleanup verified: hr_aiassistx_test_c758a86e7a771459 is absent from sys.databases.",
    "Cleanup verified: hr_notify_migration_test_1e5a3c579d29da75 is absent from sys.databases.",
    "tests 48",
    "suites 0",
    "pass 48",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 85385.584"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_setup_import_test_810d5e1850f55058\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_setup_import_test_810d5e1850f55058\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_language_test_68e5e53e6c09a18f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_language_test_68e5e53e6c09a18f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_api_test_02d7824620760be6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_api_test_02d7824620760be6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_webhooks_test_f063fdb79517ac4b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_webhooks_test_f063fdb79517ac4b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_sso_oidc_test_c201feca8bc7b9aa\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_sso_oidc_test_c201feca8bc7b9aa\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_cost_center_test_3707a2c92fef24ae\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_cost_center_test_3707a2c92fef24ae\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_5faa98aea6f59ca0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_5faa98aea6f59ca0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_c127d66c7e6456ba\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_c127d66c7e6456ba\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aireports_test_211dcdf5b07c136f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aireports_test_211dcdf5b07c136f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_c758a86e7a771459\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_c758a86e7a771459\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_migration_test_1e5a3c579d29da75\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_migration_test_1e5a3c579d29da75\"}\n"
  ]
}

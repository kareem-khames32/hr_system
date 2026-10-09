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
    "success": false,
    "counts": {
      "tests": 48,
      "failed": 1,
      "passed": 47,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 48,
      "suites": 0
    },
    "duration_ms": 92075.9565
  },
  "results": [
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-01: الصلاحية والملف — بصلاحية الإعدادات ولحساب بكل الفروع؛ القالب بعناوينه؛ وملف بعناوين غلط أو فاضي مرفوض قبل أي حاجة",
      "ms": 10224.139,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-02: الهيكل — المعاينة مابتكتبش وبتقول الجديد والموجود والأخطاء بالصف؛ ملف فيه خطأ مابيتطبقش منه حاجة؛ والتطبيق بخدمة الفروع والأقسام، وإعادة الرفع بتتخطّى الموجود",
      "ms": 286.4138,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-03: الموظفين — نفس قواعد إنشاء الموظف في المعاينة (الإلزام والشكل والفرع والقسم والتكرار)، والتطبيق بخدمة إنشاء الموظف (الكود بيتولّد)، والموجود برقم بصمته بيتخطّى",
      "ms": 675.5441,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-04: (ج) الأرصدة الافتتاحية — بصلاحية الأرصدة فوق صلاحية الإعدادات؛ المعاينة مابتكتبش؛ والتطبيق بخدمة تعديل الرصيد (سبب وسجل) لحد ما المتبقي يساوي الملف؛ واللي رصيده زي الملف بيتخطّى",
      "ms": 543.3255,
      "pass": true,
      "skip": false
    },
    {
      "file": "setup-import.integration.cjs",
      "name": "SI-05: (ج) السلف القائمة — بصلاحيتَي النيابة والاستثنائية؛ كل صف طلب سلفة بالنيابة بحكم النيابة القايم (من غير سلطة الموارد البشرية بيستنى سلسلته ومفيش سلفة، وبسلطتها بيتعتمد باسم اللي رفع)؛ والطلب القايم بيتخطّى",
      "ms": 423.8709,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-language.integration.cjs",
      "name": "UL-01: قبل ترحيل 182 — الحساب عربي، الخادم بيقول إن اللغة مش بتتغيّر، والتغيير مرفوض برسالة؛ ومن غير دخول مفيش رد",
      "ms": 9781.3055,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-language.integration.cjs",
      "name": "UL-02: الترحيل 182 — بيضيف العمود بشكله، آمن للتكرار، وبيرفض عمود موجود بشكل غلط",
      "ms": 133.2326,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-language.integration.cjs",
      "name": "UL-03: بعد الترحيل — صاحب الحساب بيغيّر لغته هو بس: القيمة بتتحفظ وبترجع، حساب تاني زي ما هو، والتوكن وإصداره ماتغيّروش؛ وقيمة غلط مرفوضة",
      "ms": 84.5857,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-01: الموديول مقفول افتراضيًا = مفيش مسار (إدارة ولا عام)؛ وقبل ترحيل 183 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 10043.4006,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-02: إدارة المفاتيح — بصلاحيتها ولحساب بكل الفروع؛ القيم بتتفحص؛ المفتاح بيظهر مرة في رد الإنشاء وبيتخزن بصمة؛ والإلغاء مرة واحدة",
      "ms": 145.3209,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-03: الـAPI العام — مفتاح صالح بس (ناقص وغلط وملغي نفس الرد)، والنطاق المطلوب، وفروع المفتاح جوه القراءة بفرع الموظف الحالي، ومن غير بيانات حساسة، وللقراءة بس",
      "ms": 196.7314,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-04: حد الطلبات لكل مفتاح — بعد الحد 429، ومفتاح تاني لسه شغال؛ وقفل الموديول بيقفل الـAPI العام",
      "ms": 820.1116,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-api.integration.cjs",
      "name": "PA-05: (ب) الحضور والإجازات وملخص المسير — نطاق القراءة لكل مسار، فروع المفتاح بفرع الموظف الحالي، المعتمد بس، إجمالي من غير مبلغ لموظف، وموديول البيانات المقفول بيقفل مساره",
      "ms": 404.4052,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9648.4409,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-02: الإدارة — بصلاحيتها ولحساب بكل الفروع؛ العنوان لازم https عام (العنوان الداخلي والمحلي مرفوض من غير «محلي مسموح»)؛ السر بيظهر مرة ومختوم في القاعدة؛ والإيقاف والتشغيل",
      "ms": 130.6003,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-03: الإرسال — تعديل موظف من مساره بيطلع رسالة موقّعة بمراجع بس؛ نطاق فروع النقطة بفرع الموظف الحالي وقت التوزيع ووقت الإرسال؛ ومفيش تكرار",
      "ms": 352.4003,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-04: الفشل وإعادة المحاولة والتحويل — رد غير 2xx بيرجّع المهمة للطابور والنقطة بتسجّل الفشل؛ بعد النجاح العدّاد بيتصفّر؛ والتحويل مابيتتبعش",
      "ms": 164.5727,
      "pass": true,
      "skip": false
    },
    {
      "file": "webhooks.integration.cjs",
      "name": "WH-05: المسير والنقطة الواقفة والموديول — اعتماد مسير بيوصل للنقطة اللي فيه موظف من فروعها بس؛ النقطة الواقفة والموديول المقفول مفيش إرسال",
      "ms": 446.8153,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-01: من غير إعداد المسار مقفول وشاشة الدخول زي ما هي؛ وبالإعداد الزرار بيظهر باسمه، والبداية بترجّع عنوان المزوّد ومعاملة في cookie على مسارها",
      "ms": 9173.2234,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-02: الدخول — هوية المزوّد بتتطابق بالموظف بنفس منطق حساب الشركة: أول دخول بيعمل حساب واحد مربوط، والتاني بيلاقيه بالمعرّف الثابت حتى لو البريد اتغيّر عند المزوّد",
      "ms": 207.5122,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n    undefined,\n    true,\n+   false,\n-   true,\n    'sso:47aea5bea5f6b28fe60533d2675cc1c3a277a6fc2e3ab0988c1ac05a',\n    'employee',\n    '[]',\n    false\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n    undefined,\n    true,\n+   false,\n-   true,\n    'sso:47aea5bea5f6b28fe60533d2675cc1c3a277a6fc2e3ab0988c1ac05a',\n    'employee',\n    '[]',\n    false\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n    undefined,\n    true,\n+   false,\n-   true,\n    'sso:47aea5bea5f6b28fe60533d2675cc1c3a277a6fc2e3ab0988c1ac05a',\n    'employee',\n    '[]',\n    false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\sso-oidc.integration.cjs:156:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-03: الرفض — من غير معاملة أو بـstate غلط أو بمعاملة متصفح تاني؛ ونطاق مش مسموح، وهوية غريبة، وموظف منتهي، وهوية تانية لحساب مربوط: مفيش جلسة ومفيش حساب",
      "ms": 86.9516,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-04: الـID token — مزوّد تاني، تطبيق تاني، nonce غلط، منتهي، أو موقّع بمفتاح مش من مفاتيح المزوّد: رسالة واحدة ومفيش جلسة",
      "ms": 207.4053,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-05: الخطوة التانية بتاعة النظام بتفضل شغالة بعد الدخول المؤسسي — دور إلزامي له رمز البريد: مفيش جلسة من الـSSO لوحده",
      "ms": 39.7207,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: معتمد/مصروف بس، لقطة المسير، المعكوس مستبعد، حصة صاحب العمل",
      "ms": 9322.8392,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "تقرير مراكز التكلفة: حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع",
      "ms": 30.3265,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "ملف الشركة: الآيبان والبريد بصيغة صحيحة، وحساب الفرع ما يعدّلش",
      "ms": 86.8357,
      "pass": true,
      "skip": false
    },
    {
      "file": "cost-center-report.integration.cjs",
      "name": "B6.5 — القيد المحاسبي: نفس أرقام التقرير، مدين = دائن لكل مركز، المعتمد والمصروف بس، مسير واحد بالطلب، ونطاق الفرع وصلاحية الرواتب",
      "ms": 120.4657,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 11230.1295,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 216.7627,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 446.0885,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 156.0327,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assistant.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 516.7903,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 15201.5431,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 433.229,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 1049.9421,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 163.8542,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 335.2258,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-action-assistant.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 457.0144,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-01: «عدد الغياب في فرع جدة الشهر ده» — نفس رقم تقرير المؤشرات بالحرف (النسبة وعدد أيام الغياب)، والنموذج مابيبعتش غير مفتاح مؤشر واسم فرع",
      "ms": 10788.6728,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-02: الحدود — من غير صلاحية التقارير الأداة مش موجودة؛ فرع برّه النطاق واسم مش موجود ومؤشر مش في القاموس وشهر غلط ومؤشر صلاحيته ناقصة = «مش متاح»؛ والاسم الغامض بيرجع باختياراته",
      "ms": 205.987,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-reports.integration.cjs",
      "name": "AR-03: خادم MCP فوق الـAPI العام — بمفتاح تكامل بيقرا اللي نطاقاته وفروعه تسمح بيه بس، والرد = رد المسار نفسه؛ ومفيش أداة كتابة",
      "ms": 132.6591,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 10704.9195,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 286.8441,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 94.7096,
      "pass": true,
      "skip": false
    },
    {
      "file": "ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 139.7848,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10150.0977,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-2: من غير الجداول الإشعارات المخزّنة والبريد واقفين من غير أخطاء؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر",
      "ms": 5491.8169,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-3: آمن للتكرار",
      "ms": 1019.7314,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-02: الدخول — هوية المزوّد بتتطابق بالموظف بنفس منطق حساب الشركة: أول دخول بيعمل حساب واحد مربوط، والتاني بيلاقيه بالمعرّف الثابت حتى لو البريد اتغيّر عند المزوّد",
      "ms": 207.5122,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n    undefined,\n    true,\n+   false,\n-   true,\n    'sso:47aea5bea5f6b28fe60533d2675cc1c3a277a6fc2e3ab0988c1ac05a',\n    'employee',\n    '[]',\n    false\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n    undefined,\n    true,\n+   false,\n-   true,\n    'sso:47aea5bea5f6b28fe60533d2675cc1c3a277a6fc2e3ab0988c1ac05a',\n    'employee',\n    '[]',\n    false\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n    undefined,\n    true,\n+   false,\n-   true,\n    'sso:47aea5bea5f6b28fe60533d2675cc1c3a277a6fc2e3ab0988c1ac05a',\n    'employee',\n    '[]',\n    false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\sso-oidc.integration.cjs:156:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_setup_import_test_c4f69f33128b7f99 is absent from sys.databases.",
    "Cleanup verified: hr_user_language_test_e8122f43568cb63d is absent from sys.databases.",
    "Cleanup verified: hr_public_api_test_a5cd9d2165b21785 is absent from sys.databases.",
    "Cleanup verified: hr_webhooks_test_203b773e101bd1ab is absent from sys.databases.",
    "Cleanup verified: hr_sso_oidc_test_c038b2e4b62490c9 is absent from sys.databases.",
    "Cleanup verified: hr_cost_center_test_a84eec65e7e59793 is absent from sys.databases.",
    "Cleanup verified: hr_aiassist_test_be5527e59d15306e is absent from sys.databases.",
    "Cleanup verified: hr_aiaction_test_bbabbabd5e49bbd8 is absent from sys.databases.",
    "Cleanup verified: hr_aireports_test_8b17cb519468641c is absent from sys.databases.",
    "Cleanup verified: hr_aiassistx_test_caa4859df1fb9ca4 is absent from sys.databases.",
    "Cleanup verified: hr_notify_migration_test_fc3baefa204eb34a is absent from sys.databases.",
    "tests 48",
    "suites 0",
    "pass 47",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 92075.9565"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_setup_import_test_c4f69f33128b7f99\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_setup_import_test_c4f69f33128b7f99\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_language_test_e8122f43568cb63d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_language_test_e8122f43568cb63d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_api_test_a5cd9d2165b21785\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_api_test_a5cd9d2165b21785\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_webhooks_test_203b773e101bd1ab\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_webhooks_test_203b773e101bd1ab\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_sso_oidc_test_c038b2e4b62490c9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_sso_oidc_test_c038b2e4b62490c9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_cost_center_test_a84eec65e7e59793\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_cost_center_test_a84eec65e7e59793\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_be5527e59d15306e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_be5527e59d15306e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_bbabbabd5e49bbd8\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_bbabbabd5e49bbd8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aireports_test_8b17cb519468641c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aireports_test_8b17cb519468641c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_caa4859df1fb9ca4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_caa4859df1fb9ca4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_migration_test_fc3baefa204eb34a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_migration_test_fc3baefa204eb34a\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p6b-setup",
    "codex-review-p6b-public",
    "codex-review-p6b-ai-read",
    "codex-review-p6b-ai",
    "codex-review-p6b-ai-assist",
    "codex-review-p6b-webhooks"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 43,
      "failed": 0,
      "passed": 43,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 43,
      "suites": 0
    },
    "duration_ms": 52155.0371
  },
  "results": [
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-01: الصلاحية والملف — بصلاحية الإعدادات ولحساب بكل الفروع؛ القالب بعناوينه؛ وملف بعناوين غلط أو فاضي مرفوض قبل أي حاجة",
      "ms": 9129.8661,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-02: الهيكل — المعاينة مابتكتبش وبتقول الجديد والموجود والأخطاء بالصف؛ ملف فيه خطأ مابيتطبقش منه حاجة؛ والتطبيق بخدمة الفروع والأقسام، وإعادة الرفع بتتخطّى الموجود",
      "ms": 239.6773,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-03: الموظفين — نفس قواعد إنشاء الموظف في المعاينة (الإلزام والشكل والفرع والقسم والتكرار)، والتطبيق بخدمة إنشاء الموظف (الكود بيتولّد)، والموجود برقم بصمته بيتخطّى",
      "ms": 508.2827,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-04: (ج) الأرصدة الافتتاحية — بصلاحية الأرصدة فوق صلاحية الإعدادات؛ المعاينة مابتكتبش؛ والتطبيق بخدمة تعديل الرصيد (سبب وسجل) لحد ما المتبقي يساوي الملف؛ واللي رصيده زي الملف بيتخطّى",
      "ms": 373.1815,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-05: (ج) السلف القائمة — بصلاحيتَي النيابة والاستثنائية؛ كل صف طلب سلفة بالنيابة بحكم النيابة القايم (من غير سلطة الموارد البشرية بيستنى سلسلته ومفيش سلفة، وبسلطتها بيتعتمد باسم اللي رفع)؛ والطلب القايم بيتخطّى",
      "ms": 333.6601,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "P6B-I01: settings-only employee import is refused like the original route",
      "ms": 119.5035,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "P6B-I03: balance import respects the leave module audience",
      "ms": 71.6771,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "P6B-I04: settings-only structure import is refused",
      "ms": 17.6237,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "P6B-I05: each kind rejects a settings-only account before template or file processing",
      "ms": 34.4412,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-01: الموديول مقفول افتراضيًا = مفيش مسار (إدارة ولا عام)؛ وقبل ترحيل 183 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9257.5769,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-02: إدارة المفاتيح — بصلاحيتها ولحساب بكل الفروع؛ القيم بتتفحص؛ المفتاح بيظهر مرة في رد الإنشاء وبيتخزن بصمة؛ والإلغاء مرة واحدة",
      "ms": 157.8917,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-03: الـAPI العام — مفتاح صالح بس (ناقص وغلط وملغي نفس الرد)، والنطاق المطلوب، وفروع المفتاح جوه القراءة بفرع الموظف الحالي، ومن غير بيانات حساسة، وللقراءة بس",
      "ms": 204.722,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-04: حد الطلبات لكل مفتاح — بعد الحد 429، ومفتاح تاني لسه شغال؛ وقفل الموديول بيقفل الـAPI العام",
      "ms": 740.2291,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-05: (ب) الحضور والإجازات وملخص المسير — نطاق القراءة لكل مسار، فروع المفتاح بفرع الموظف الحالي، المعتمد بس، إجمالي من غير مبلغ لموظف، وموديول البيانات المقفول بيقفل مساره",
      "ms": 328.8195,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "P6B-P01: public employee exposes ids of units and manager currently outside key branches",
      "ms": 113.8786,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "P6B-P02: single/list, parent unit, moved team and unrestricted keys agree",
      "ms": 114.7542,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9342.2789,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 122.8901,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 225.8123,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 87.3065,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 250.8824,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "P6B-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 63.0228,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 10893.4225,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 418.5601,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 990.6264,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 140.7974,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 225.7134,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 324.732,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "P6B-A01: fresh identity cannot list, confirm or dismiss an old personal proposal",
      "ms": 150.0207,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "P6B-A04: account is rebound after authorization and before the proposal claim",
      "ms": 120.4565,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 8940.4082,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 326.6584,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 97.8847,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 140.994,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A02: original ASCII phone and IBAN are removed from provider input",
      "ms": 25.9122,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A05: alternate real-world free-text contact representations still reach provider",
      "ms": 67.6832,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A06: employee-less proposal cannot be decided after account gains an employee link",
      "ms": 82.9809,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 10037.4681,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-02: الإدارة — بصلاحيتها ولحساب بكل الفروع؛ العنوان لازم https عام (العنوان الداخلي والمحلي مرفوض من غير «محلي مسموح»)؛ السر بيظهر مرة ومختوم في القاعدة؛ والإيقاف والتشغيل",
      "ms": 196.9558,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-03: الإرسال — تعديل موظف من مساره بيطلع رسالة موقّعة بمراجع بس؛ نطاق فروع النقطة بفرع الموظف الحالي وقت التوزيع ووقت الإرسال؛ ومفيش تكرار",
      "ms": 439.5345,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-04: الفشل وإعادة المحاولة والتحويل — رد غير 2xx بيرجّع المهمة للطابور والنقطة بتسجّل الفشل؛ بعد النجاح العدّاد بيتصفّر؛ والتحويل مابيتتبعش",
      "ms": 198.967,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "WH-05: المسير والنقطة الواقفة والموديول — اعتماد مسير بيوصل للنقطة اللي فيه موظف من فروعها بس؛ النقطة الواقفة والموديول المقفول مفيش إرسال",
      "ms": 490.7833,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-webhooks.integration.cjs",
      "name": "P6B-W01: checked DNS result is passed to transport once; mixed/private results rejected",
      "ms": 95.6207,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"direct\":403,\"import\":403}",
    "{\"direct\":404,\"import\":400,\"noAdjustment\":true}",
    "{\"direct\":403,\"import\":403}",
    "Cleanup verified: hr_setup_import_test_7aaed1199a47ba1b is absent from sys.databases.",
    "{\"foreignDepartmentId\":null,\"foreignTeamId\":null,\"foreignManagerId\":null}",
    "{\"scopedReferences\":[5,null,null],\"allBranchesPreserved\":true}",
    "Cleanup verified: hr_public_api_test_55d77eee7df46c36 is absent from sys.databases.",
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2}",
    "Cleanup verified: hr_aiassist_test_357cae953579ff71 is absent from sys.databases.",
    "{\"closed\":\"fresh-rebinding\",\"write\":false}",
    "{\"race\":\"before-claim\",\"status\":200,\"currentEmployee\":4,\"requestEmployee\":3,\"action\":\"EXECUTED\"}",
    "Cleanup verified: hr_aiaction_test_2a542cb9833ae5a5 is absent from sys.databases.",
    "{\"asciiPhoneRedacted\":true,\"ibanRedacted\":true}",
    "{\"representation\":\"Persian numerals\",\"providerReceivedContact\":true}",
    "{\"representation\":\"local phone\",\"providerReceivedContact\":true}",
    "{\"representation\":\"separated phone\",\"providerReceivedContact\":true}",
    "Cleanup verified: hr_aiassistx_test_e80c7d9bcd8a4a63 is absent from sys.databases.",
    "{\"dnsCalls\":5,\"pinnedSends\":[{\"host\":\"p6b-pinned.invalid\",\"pin\":{\"address\":\"93.184.216.34\",\"family\":4}},{\"host\":\"p6b-pinned.invalid\",\"pin\":{\"address\":\"2606:4700:4700::1111\",\"family\":6}}],\"mixedAndPrivateBlocked\":true,\"externalConnections\":0}",
    "Cleanup verified: hr_webhooks_test_1f01295ed84a8a81 is absent from sys.databases.",
    "tests 43",
    "suites 0",
    "pass 43",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 52155.0371"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_setup_import_test_7aaed1199a47ba1b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_setup_import_test_7aaed1199a47ba1b\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_api_test_55d77eee7df46c36\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_api_test_55d77eee7df46c36\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_357cae953579ff71\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_357cae953579ff71\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_2a542cb9833ae5a5\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_2a542cb9833ae5a5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_e80c7d9bcd8a4a63\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_e80c7d9bcd8a4a63\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_webhooks_test_1f01295ed84a8a81\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_webhooks_test_1f01295ed84a8a81\"}\n"
  ]
}

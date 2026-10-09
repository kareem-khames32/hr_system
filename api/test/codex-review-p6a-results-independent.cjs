module.exports = {
  "selected": [
    "codex-review-p6a-setup",
    "codex-review-p6a-ai",
    "codex-review-p6a-ai-assist",
    "codex-review-p6a-public",
    "sso-oidc"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 29,
      "failed": 2,
      "passed": 27,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 29,
      "suites": 0
    },
    "duration_ms": 40095.4419
  },
  "results": [
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-01: الصلاحية والملف — بصلاحية الإعدادات ولحساب بكل الفروع؛ القالب بعناوينه؛ وملف بعناوين غلط أو فاضي مرفوض قبل أي حاجة",
      "ms": 9487.7903,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-02: الهيكل — المعاينة مابتكتبش وبتقول الجديد والموجود والأخطاء بالصف؛ ملف فيه خطأ مابيتطبقش منه حاجة؛ والتطبيق بخدمة الفروع والأقسام، وإعادة الرفع بتتخطّى الموجود",
      "ms": 204.1929,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-03: الموظفين — نفس قواعد إنشاء الموظف في المعاينة (الإلزام والشكل والفرع والقسم والتكرار)، والتطبيق بخدمة إنشاء الموظف (الكود بيتولّد)، والموجود برقم بصمته بيتخطّى",
      "ms": 570.6624,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-04: (ج) الأرصدة الافتتاحية — بصلاحية الأرصدة فوق صلاحية الإعدادات؛ المعاينة مابتكتبش؛ والتطبيق بخدمة تعديل الرصيد (سبب وسجل) لحد ما المتبقي يساوي الملف؛ واللي رصيده زي الملف بيتخطّى",
      "ms": 430.5495,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "SI-05: (ج) السلف القائمة — بصلاحيتَي النيابة والاستثنائية؛ كل صف طلب سلفة بالنيابة بحكم النيابة القايم (من غير سلطة الموارد البشرية بيستنى سلسلته ومفيش سلفة، وبسلطتها بيتعتمد باسم اللي رفع)؛ والطلب القايم بيتخطّى",
      "ms": 318.3313,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "P6A-I01: settings-only account can create an employee despite original route refusing it",
      "ms": 22.3201,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6a-setup.integration.cjs:215:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 11319.9187,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 345.2638,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 988.0779,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 115.7423,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 243.7807,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 408.2991,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai.integration.cjs",
      "name": "P6A-A01: self-leave proposal follows the account to a different employee at confirmation",
      "ms": 263.2275,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 10221.2794,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 264.3058,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 127.7325,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 123.3937,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-assist.integration.cjs",
      "name": "P6A-A02: recruitment free-text contact details reach the provider",
      "ms": 51.9626,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-01: الموديول مقفول افتراضيًا = مفيش مسار (إدارة ولا عام)؛ وقبل ترحيل 183 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 10060.7339,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-02: إدارة المفاتيح — بصلاحيتها ولحساب بكل الفروع؛ القيم بتتفحص؛ المفتاح بيظهر مرة في رد الإنشاء وبيتخزن بصمة؛ والإلغاء مرة واحدة",
      "ms": 167.2057,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-03: الـAPI العام — مفتاح صالح بس (ناقص وغلط وملغي نفس الرد)، والنطاق المطلوب، وفروع المفتاح جوه القراءة بفرع الموظف الحالي، ومن غير بيانات حساسة، وللقراءة بس",
      "ms": 188.5069,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-04: حد الطلبات لكل مفتاح — بعد الحد 429، ومفتاح تاني لسه شغال؛ وقفل الموديول بيقفل الـAPI العام",
      "ms": 744.4068,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "PA-05: (ب) الحضور والإجازات وملخص المسير — نطاق القراءة لكل مسار، فروع المفتاح بفرع الموظف الحالي، المعتمد بس، إجمالي من غير مبلغ لموظف، وموديول البيانات المقفول بيقفل مساره",
      "ms": 383.7511,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "P6A-P01: public employee exposes ids of units and manager currently outside key branches",
      "ms": 83.2416,
      "pass": false,
      "error": "{\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n",
      "cause": "{\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6a-public.integration.cjs:36:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6a-public.integration.cjs:244:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-01: من غير إعداد المسار مقفول وشاشة الدخول زي ما هي؛ وبالإعداد الزرار بيظهر باسمه، والبداية بترجّع عنوان المزوّد ومعاملة في cookie على مسارها",
      "ms": 8768.4558,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-02: الدخول — هوية المزوّد بتتطابق بالموظف بنفس منطق حساب الشركة: أول دخول بيعمل حساب واحد مربوط، والتاني بيلاقيه بالمعرّف الثابت حتى لو البريد اتغيّر عند المزوّد",
      "ms": 314.2472,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-03: الرفض — من غير معاملة أو بـstate غلط أو بمعاملة متصفح تاني؛ ونطاق مش مسموح، وهوية غريبة، وموظف منتهي، وهوية تانية لحساب مربوط: مفيش جلسة ومفيش حساب",
      "ms": 91.9572,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-04: الـID token — مزوّد تاني، تطبيق تاني، nonce غلط، منتهي، أو موقّع بمفتاح مش من مفاتيح المزوّد: رسالة واحدة ومفيش جلسة",
      "ms": 187.7882,
      "pass": true,
      "skip": false
    },
    {
      "file": "sso-oidc.integration.cjs",
      "name": "SS-05: الخطوة التانية بتاعة النظام بتفضل شغالة بعد الدخول المؤسسي — دور إلزامي له رمز البريد: مفيش جلسة من الـSSO لوحده",
      "ms": 47.7155,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p6a-setup.integration.cjs",
      "name": "P6A-I01: settings-only account can create an employee despite original route refusing it",
      "ms": 22.3201,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "cause": "Expected values to be strictly equal:\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6a-setup.integration.cjs:215:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p6a-public.integration.cjs",
      "name": "P6A-P01: public employee exposes ids of units and manager currently outside key branches",
      "ms": 83.2416,
      "pass": false,
      "error": "{\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n",
      "cause": "{\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Cannot PATCH /api/org/departments/3\",\"error\":\"Not Found\",\"statusCode\":404}\n\n404 !== 200\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6a-public.integration.cjs:36:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6a-public.integration.cjs:244:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_setup_import_test_6818b3f4ae1de85d is absent from sys.databases.",
    "{\"previewEmployee\":3,\"executedEmployee\":4,\"status\":200}",
    "Cleanup verified: hr_aiaction_test_3a77d9ac14b3fac5 is absent from sys.databases.",
    "{\"providerReceivedContact\":true,\"providerReceivedIban\":true}",
    "Cleanup verified: hr_aiassistx_test_c3b4c609207f3e57 is absent from sys.databases.",
    "Cleanup verified: hr_public_api_test_9b925012c4dde18a is absent from sys.databases.",
    "Cleanup verified: hr_sso_oidc_test_ad1946aaad70222c is absent from sys.databases.",
    "tests 29",
    "suites 0",
    "pass 27",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 40095.4419"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_setup_import_test_6818b3f4ae1de85d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_setup_import_test_6818b3f4ae1de85d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_3a77d9ac14b3fac5\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_3a77d9ac14b3fac5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_c3b4c609207f3e57\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_c3b4c609207f3e57\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_api_test_9b925012c4dde18a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_api_test_9b925012c4dde18a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_sso_oidc_test_ad1946aaad70222c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_sso_oidc_test_ad1946aaad70222c\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p6c-ai",
    "codex-review-p6c-ai-assist",
    "codex-review-p6c-ai-read",
    "codex-review-p6c-webhooks"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 30,
      "failed": 0,
      "passed": 30,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 30,
      "suites": 0
    },
    "duration_ms": 41749.6665
  },
  "results": [
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 11516.0566,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 305.8209,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 728.7945,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 96.5953,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 192.529,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 274.0878,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A01: fresh identity cannot list, confirm or dismiss an old personal proposal",
      "ms": 133.6826,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A04: account is rebound after authorization and before the proposal claim",
      "ms": 49.981,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 9881.7867,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 276.8885,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 100.3065,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 151.9007,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A02: original ASCII phone and IBAN are removed from provider input",
      "ms": 20.465,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A05: prior alternative contact representations are now removed",
      "ms": 57.6726,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A06: employee-less proposal cannot be decided after account gains an employee link",
      "ms": 74.8994,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A07: assist outcome rejects a stale identity after rebinding before its conditional update",
      "ms": 67.5075,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A08: a free-text contact is exempted as an amount and spaced pairs bypass the digit pattern",
      "ms": 40.8097,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 11341.7531,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 134.2146,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 278.9417,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 102.5519,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 322.8358,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-read.integration.cjs",
      "name": "P6C-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 80.8495,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-webhooks.integration.cjs",
      "name": "WH-01: الموديول مقفول = مفيش مسار ومفيش إرسال؛ قبل ترحيل 184 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 10671.6661,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-webhooks.integration.cjs",
      "name": "WH-02: الإدارة — بصلاحيتها ولحساب بكل الفروع؛ العنوان لازم https عام (العنوان الداخلي والمحلي مرفوض من غير «محلي مسموح»)؛ السر بيظهر مرة ومختوم في القاعدة؛ والإيقاف والتشغيل",
      "ms": 150.9392,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-webhooks.integration.cjs",
      "name": "WH-03: الإرسال — تعديل موظف من مساره بيطلع رسالة موقّعة بمراجع بس؛ نطاق فروع النقطة بفرع الموظف الحالي وقت التوزيع ووقت الإرسال؛ ومفيش تكرار",
      "ms": 387.5727,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-webhooks.integration.cjs",
      "name": "WH-04: الفشل وإعادة المحاولة والتحويل — رد غير 2xx بيرجّع المهمة للطابور والنقطة بتسجّل الفشل؛ بعد النجاح العدّاد بيتصفّر؛ والتحويل مابيتتبعش",
      "ms": 186.2669,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-webhooks.integration.cjs",
      "name": "WH-05: المسير والنقطة الواقفة والموديول — اعتماد مسير بيوصل للنقطة اللي فيه موظف من فروعها بس؛ النقطة الواقفة والموديول المقفول مفيش إرسال",
      "ms": 434.4588,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-webhooks.integration.cjs",
      "name": "P6C-W01: checked DNS result is passed to transport once; mixed/private results rejected",
      "ms": 110.7836,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-webhooks.integration.cjs",
      "name": "P6C-W04: interrupted response completes and the actual queue worker runs its next unrelated job",
      "ms": 127.1184,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"closed\":\"fresh-rebinding\",\"write\":false}",
    "{\"race\":\"before-claim\",\"status\":409,\"currentEmployee\":4,\"requestEmployee\":null,\"action\":\"OK\"}",
    "Cleanup verified: hr_aiaction_test_93bd403173e238bb is absent from sys.databases.",
    "{\"asciiPhoneRedacted\":true,\"ibanRedacted\":true}",
    "{\"representation\":\"Persian numerals\",\"providerReceivedContact\":false}",
    "{\"representation\":\"local phone\",\"providerReceivedContact\":false}",
    "{\"representation\":\"separated phone\",\"providerReceivedContact\":false}",
    "{\"race\":\"assist-outcome\",\"status\":409,\"proposalEmployee\":3,\"currentEmployee\":4,\"decision\":\"OK\"}",
    "{\"case\":\"amount-shaped phone in free-text notes\",\"providerReceivedContact\":true,\"notes\":\"05012345.67\"}",
    "{\"case\":\"four spaces between digit pairs\",\"providerReceivedContact\":true,\"notes\":\"Contact telephone: 05    01    23    45    67\"}",
    "Cleanup verified: hr_aiassistx_test_63b1b067d70f9903 is absent from sys.databases.",
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2}",
    "Cleanup verified: hr_aiassist_test_fc690d09a758f426 is absent from sys.databases.",
    "{\"dnsCalls\":5,\"pinnedSends\":[{\"host\":\"p6c-pinned.invalid\",\"pin\":{\"address\":\"93.184.216.34\",\"family\":4}},{\"host\":\"p6c-pinned.invalid\",\"pin\":{\"address\":\"2606:4700:4700::1111\",\"family\":6}}],\"mixedAndPrivateBlocked\":true,\"externalConnections\":0}",
    "{\"responseAborted\":true,\"elapsedMs\":56,\"timeoutMs\":10000,\"workerStillRunning\":false,\"nextJobRan\":1,\"jobs\":[{\"jobType\":\"webhooks.deliver\",\"status\":\"DONE\",\"attempts\":1},{\"jobType\":\"p6c.probe\",\"status\":\"DONE\",\"attempts\":1}]}",
    "Cleanup verified: hr_webhooks_test_6ab18454c5c6b8ac is absent from sys.databases.",
    "tests 30",
    "suites 0",
    "pass 30",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 41749.6665"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_93bd403173e238bb\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_93bd403173e238bb\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_63b1b067d70f9903\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_63b1b067d70f9903\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_fc690d09a758f426\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_fc690d09a758f426\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_webhooks_test_6ab18454c5c6b8ac\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_webhooks_test_6ab18454c5c6b8ac\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p6d-ai",
    "codex-review-p6d-ai-assist",
    "codex-review-p6d-ai-read"
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
    "duration_ms": 51467.4102
  },
  "results": [
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 21137.4604,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 913.0537,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 2710.0371,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 148.8865,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 525.2627,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 827.5857,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A01: fresh identity cannot list, confirm or dismiss an old personal proposal",
      "ms": 329.1656,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A04: account is rebound after authorization and before the proposal claim",
      "ms": 160.9654,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A09: disabling the account before claim prevents execution",
      "ms": 200.9966,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A10: removing employee link before claim is refused with no write",
      "ms": 172.3195,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A11: current identity check remains correct while claim waits for the action row",
      "ms": 495.4304,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A13: disabled HR account cannot claim an instantly approved bonus",
      "ms": 150.5389,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A14: loss of HR authority before claim prevents bonus creation",
      "ms": 257.8092,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A15: rebinding after successful claim retains the accepted identity boundary",
      "ms": 241.9421,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 16777.453,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 684.903,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 267.6087,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 286.0003,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A02: original ASCII phone and IBAN are removed from provider input",
      "ms": 59.037,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A05: prior alternative contact representations are now removed",
      "ms": 210.3497,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A06: employee-less proposal cannot be decided after account gains an employee link",
      "ms": 168.2954,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A07: assist outcome rejects a stale identity after rebinding before its conditional update",
      "ms": 125.6789,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A08: a free-text contact is exempted as an amount and spaced pairs bypass the digit pattern",
      "ms": 65.8657,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A12: user-authored goal unit is incorrectly trusted as fixed system text",
      "ms": 201.4408,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 15912.136,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 330.5163,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 682.9907,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 275.5957,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 761.2105,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "P6D-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 196.5401,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"closed\":\"fresh-rebinding\",\"write\":false}",
    "{\"race\":\"before-claim\",\"status\":409,\"currentEmployee\":4,\"requestEmployee\":null,\"action\":\"OK\"}",
    "{\"race\":\"disabled-before-claim\",\"status\":409,\"isActive\":false,\"action\":\"OK\"}",
    "{\"race\":\"unlink-before-claim\",\"status\":409,\"claimed\":null}",
    "{\"race\":\"sql-row-wait\",\"changeCommittedBeforeUnlock\":true,\"decision\":409,\"action\":\"OK\"}",
    "{\"race\":\"disabled-before-bonus-claim\",\"http\":409,\"accountActive\":false,\"bonuses\":0,\"bonusStatus\":null}",
    "{\"race\":\"role-revoked-before-claim\",\"http\":409,\"currentRole\":\"employee\",\"bonusStatus\":null,\"sessionVersion\":2,\"currentVersion\":3}",
    "{\"control\":\"identity-change-after-claim\",\"status\":200,\"acceptedEmployee\":3,\"requestEmployee\":3}",
    "Cleanup verified: hr_aiaction_test_324dc93567cc84cc is absent from sys.databases.",
    "{\"asciiPhoneRedacted\":true,\"ibanRedacted\":true}",
    "{\"representation\":\"Persian numerals\",\"providerReceivedContact\":false}",
    "{\"representation\":\"local phone\",\"providerReceivedContact\":false}",
    "{\"representation\":\"separated phone\",\"providerReceivedContact\":false}",
    "{\"race\":\"assist-outcome\",\"status\":409,\"proposalEmployee\":3,\"currentEmployee\":4,\"decision\":\"OK\"}",
    "{\"case\":\"amount-shaped phone in free-text notes\",\"providerReceivedContact\":false,\"notes\":\"[محجوب]\"}",
    "{\"case\":\"four spaces between digit pairs\",\"providerReceivedContact\":false,\"notes\":\"Contact telephone: [محجوب]\"}",
    "{\"source\":\"POST /performance/goals\",\"userField\":\"unit\",\"providerReceivedContact\":true}",
    "Cleanup verified: hr_aiassistx_test_c0aaf38ad46e2f61 is absent from sys.databases.",
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2}",
    "Cleanup verified: hr_aiassist_test_b8527dfb6ecb47b2 is absent from sys.databases.",
    "tests 30",
    "suites 0",
    "pass 30",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 51467.4102"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_324dc93567cc84cc\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_324dc93567cc84cc\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_c0aaf38ad46e2f61\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_c0aaf38ad46e2f61\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_b8527dfb6ecb47b2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_b8527dfb6ecb47b2\"}\n"
  ]
}

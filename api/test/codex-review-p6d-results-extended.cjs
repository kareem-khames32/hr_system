module.exports = {
  "selected": [
    "codex-review-p6d-ai",
    "codex-review-p6d-ai-assist",
    "codex-review-p6d-ai-read"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 34,
      "failed": 0,
      "passed": 34,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 34,
      "suites": 0
    },
    "duration_ms": 49720.9683
  },
  "results": [
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 20663.3005,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 657.7354,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 1765.8857,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 298.6755,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 489.3542,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 738.9327,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A01: fresh identity cannot list, confirm or dismiss an old personal proposal",
      "ms": 365.2582,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A04: account is rebound after authorization and before the proposal claim",
      "ms": 166.9679,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A09: disabling the account before claim prevents execution",
      "ms": 249.7614,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A10: removing employee link before claim is refused with no write",
      "ms": 263.7817,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A11: current identity check remains correct while claim waits for the action row",
      "ms": 527.9483,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A13: disabled HR account cannot claim an instantly approved bonus",
      "ms": 221.1784,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A14: loss of HR authority before claim prevents bonus creation",
      "ms": 186.0298,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A15: rebinding after successful claim retains the accepted identity boundary",
      "ms": 185.5351,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A16: role package and individual override changes invalidate a pending claim through actual writers",
      "ms": 337.7427,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai.integration.cjs",
      "name": "P6D-A17: dismiss refuses disabled and deleted actors and accepts an unchanged actor without an employee",
      "ms": 325.4678,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 15424.1069,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 684.1499,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 261.8672,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 312.4082,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A02: original ASCII phone and IBAN are removed from provider input",
      "ms": 58.5123,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A05: prior alternative contact representations are now removed",
      "ms": 159.7856,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A06: employee-less proposal cannot be decided after account gains an employee link",
      "ms": 200.0393,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A07: assist outcome rejects a stale identity after rebinding before its conditional update",
      "ms": 177.9476,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A08: a free-text contact is exempted as an amount and spaced pairs bypass the digit pattern",
      "ms": 118.0611,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A12: user-authored goal unit is incorrectly trusted as fixed system text",
      "ms": 206.7689,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A18: outcome rejects disabled, version-changed and deleted actors before its update",
      "ms": 498.8417,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 14896.5008,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 266.5509,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 603.8084,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 228.1111,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 776.6634,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "P6D-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 173.8744,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "P6D-R01: real attendance and nonempty payslip values survive the new projection without leaking free-text contacts",
      "ms": 603.0109,
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
    "{\"writer\":\"role-package\",\"http\":409,\"versionAdvanced\":true,\"claimed\":false}",
    "{\"writer\":\"individual-override\",\"http\":409,\"versionAdvanced\":true,\"claimed\":false}",
    "{\"dismissActor\":\"disabled\",\"http\":409}",
    "{\"dismissActor\":\"deleted\",\"http\":409}",
    "{\"dismissActor\":\"unchanged\",\"http\":200}",
    "Cleanup verified: hr_aiaction_test_cc6116edc62c6158 is absent from sys.databases.",
    "{\"asciiPhoneRedacted\":true,\"ibanRedacted\":true}",
    "{\"representation\":\"Persian numerals\",\"providerReceivedContact\":false}",
    "{\"representation\":\"local phone\",\"providerReceivedContact\":false}",
    "{\"representation\":\"separated phone\",\"providerReceivedContact\":false}",
    "{\"race\":\"assist-outcome\",\"status\":409,\"proposalEmployee\":3,\"currentEmployee\":4,\"decision\":\"OK\"}",
    "{\"case\":\"amount-shaped phone in free-text notes\",\"providerReceivedContact\":false,\"notes\":\"[محجوب]\"}",
    "{\"case\":\"four spaces between digit pairs\",\"providerReceivedContact\":false,\"notes\":\"Contact telephone: [محجوب]\"}",
    "{\"source\":\"POST /performance/goals\",\"userField\":\"unit\",\"providerReceivedContact\":false}",
    "{\"outcomeActor\":\"disabled\",\"http\":409,\"changed\":false}",
    "{\"outcomeActor\":\"version\",\"http\":409,\"changed\":false}",
    "{\"outcomeActor\":\"deleted\",\"http\":409,\"changed\":false}",
    "Cleanup verified: hr_aiassistx_test_39403ec562c55aa5 is absent from sys.databases.",
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2}",
    "{\"attendanceTimesIntact\":true,\"payslipMoneyIntact\":true,\"rawShiftContact\":false}",
    "Cleanup verified: hr_aiassist_test_2314975c7d101a22 is absent from sys.databases.",
    "tests 34",
    "suites 0",
    "pass 34",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 49720.9683"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_cc6116edc62c6158\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_cc6116edc62c6158\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_39403ec562c55aa5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_39403ec562c55aa5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_2314975c7d101a22\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_2314975c7d101a22\"}\n"
  ]
}

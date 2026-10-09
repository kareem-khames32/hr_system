module.exports = {
  "selected": [
    "codex-review-p6c-ai",
    "codex-review-p6c-ai-assist"
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
    "duration_ms": 23703.2215
  },
  "results": [
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 10928.4012,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 338.2773,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 748.3765,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 112.3729,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 176.371,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 288.2968,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A01: fresh identity cannot list, confirm or dismiss an old personal proposal",
      "ms": 115.289,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A04: account is rebound after authorization and before the proposal claim",
      "ms": 49.2152,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A09: disabling the account before claim still permits execution",
      "ms": 99.0715,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A10: removing employee link before claim is refused with no write",
      "ms": 67.9093,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A11: current identity check remains correct while claim waits for the action row",
      "ms": 393.3007,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A13: disabled HR account can still claim and instantly approve a bonus",
      "ms": 116.8031,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 9356.2909,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 292.0648,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 89.9548,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 113.4675,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A02: original ASCII phone and IBAN are removed from provider input",
      "ms": 18.9267,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A05: prior alternative contact representations are now removed",
      "ms": 51.2645,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A06: employee-less proposal cannot be decided after account gains an employee link",
      "ms": 68.2068,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A07: assist outcome rejects a stale identity after rebinding before its conditional update",
      "ms": 61.832,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A08: a free-text contact is exempted as an amount and spaced pairs bypass the digit pattern",
      "ms": 35.5182,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai-assist.integration.cjs",
      "name": "P6C-A12: user-authored goal unit is incorrectly trusted as fixed system text",
      "ms": 71.4685,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"closed\":\"fresh-rebinding\",\"write\":false}",
    "{\"race\":\"before-claim\",\"status\":409,\"currentEmployee\":4,\"requestEmployee\":null,\"action\":\"OK\"}",
    "{\"race\":\"disabled-before-claim\",\"status\":200,\"isActive\":false,\"action\":\"EXECUTED\"}",
    "{\"race\":\"unlink-before-claim\",\"status\":409,\"claimed\":null}",
    "{\"race\":\"sql-row-wait\",\"changeCommittedBeforeUnlock\":true,\"decision\":409,\"action\":\"OK\"}",
    "{\"race\":\"disabled-before-bonus-claim\",\"http\":200,\"accountActive\":false,\"bonuses\":1,\"bonusStatus\":\"APPROVED\"}",
    "Cleanup verified: hr_aiaction_test_9e803d0ca19df078 is absent from sys.databases.",
    "{\"asciiPhoneRedacted\":true,\"ibanRedacted\":true}",
    "{\"representation\":\"Persian numerals\",\"providerReceivedContact\":false}",
    "{\"representation\":\"local phone\",\"providerReceivedContact\":false}",
    "{\"representation\":\"separated phone\",\"providerReceivedContact\":false}",
    "{\"race\":\"assist-outcome\",\"status\":409,\"proposalEmployee\":3,\"currentEmployee\":4,\"decision\":\"OK\"}",
    "{\"case\":\"amount-shaped phone in free-text notes\",\"providerReceivedContact\":true,\"notes\":\"05012345.67\"}",
    "{\"case\":\"four spaces between digit pairs\",\"providerReceivedContact\":true,\"notes\":\"Contact telephone: 05    01    23    45    67\"}",
    "{\"source\":\"POST /performance/goals\",\"userField\":\"unit\",\"providerReceivedContact\":true}",
    "Cleanup verified: hr_aiassistx_test_d77f8cecd66038cc is absent from sys.databases.",
    "tests 22",
    "suites 0",
    "pass 22",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23703.2215"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_9e803d0ca19df078\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_9e803d0ca19df078\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_d77f8cecd66038cc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_d77f8cecd66038cc\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p6d-ai-assist",
    "codex-review-p6d-ai-read"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 19,
      "failed": 0,
      "passed": 19,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 19,
      "suites": 0
    },
    "duration_ms": 27261.2421
  },
  "results": [
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 14760.0012,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 640.6306,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 224.9397,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 184.8212,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A02: original ASCII phone and IBAN are removed from provider input",
      "ms": 44.6142,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A05: prior alternative contact representations are now removed",
      "ms": 121.9698,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A06: employee-less proposal cannot be decided after account gains an employee link",
      "ms": 148.0658,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A07: assist outcome rejects a stale identity after rebinding before its conditional update",
      "ms": 121.079,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A08: a free-text contact is exempted as an amount and spaced pairs bypass the digit pattern",
      "ms": 85.3131,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A12: user-authored goal unit is incorrectly trusted as fixed system text",
      "ms": 117.9315,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-assist.integration.cjs",
      "name": "P6D-A18: outcome rejects disabled, version-changed and deleted actors before its update",
      "ms": 314.1378,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 14389.5158,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 294.7711,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 606.4703,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 243.504,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 521.2915,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "P6D-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 142.9883,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "P6D-R01: real attendance and nonempty payslip values survive the new projection without leaking free-text contacts",
      "ms": 398.0573,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6d-ai-read.integration.cjs",
      "name": "P6D-R02: policy effective date is omitted because the projection uses an absent property",
      "ms": 53.5255,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
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
    "Cleanup verified: hr_aiassistx_test_6cba7b5d69d1c6b4 is absent from sys.databases.",
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2}",
    "{\"attendanceTimesIntact\":true,\"payslipMoneyIntact\":true,\"rawShiftContact\":false}",
    "{\"note\":\"policy date field mismatch\",\"libraryDatePresent\":true,\"providerDate\":null}",
    "Cleanup verified: hr_aiassist_test_40c06c8aa8188205 is absent from sys.databases.",
    "tests 19",
    "suites 0",
    "pass 19",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 27261.2421"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_6cba7b5d69d1c6b4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_6cba7b5d69d1c6b4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_40c06c8aa8188205\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_40c06c8aa8188205\"}\n"
  ]
}

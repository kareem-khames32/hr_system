module.exports = {
  "selected": [
    "codex-review-p6e-ai-read"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 9,
      "failed": 0,
      "passed": 9,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 12214.7399
  },
  "results": [
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 8522.2052,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 105.2885,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 224.3509,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 75.8424,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 236.893,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "P6E-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 60.2876,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "P6E-R01: real attendance and nonempty payslip values survive the new projection without leaking free-text contacts",
      "ms": 197.9278,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "P6E-R02: policy effective date matches its actual library source",
      "ms": 22.5444,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6e-ai-read.integration.cjs",
      "name": "P6E-T01: absence materialization waits for the calendar day instead of treating a future gap as absent",
      "ms": 115.1279,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2}",
    "{\"attendanceTimesIntact\":true,\"payslipMoneyIntact\":true,\"rawShiftContact\":false}",
    "{\"closure\":\"policy date field corrected\",\"libraryDatePresent\":true,\"providerDate\":\"2026-10-09\"}",
    "{\"futureGapRows\":0,\"elapsedDayStatus\":\"absent\"}",
    "Cleanup verified: hr_aiassist_test_0387d700550e9f83 is absent from sys.databases.",
    "tests 9",
    "suites 0",
    "pass 9",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12214.7399"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_0387d700550e9f83\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_0387d700550e9f83\"}\n"
  ]
}

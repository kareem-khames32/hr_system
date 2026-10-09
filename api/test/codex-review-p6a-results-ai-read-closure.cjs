module.exports = {
  "selected": [
    "codex-review-p6a-ai-read"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 12500.4941
  },
  "results": [
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9026.0507,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 111.6654,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 227.2494,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 83.3909,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 292.1218,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6a-ai-read.integration.cjs",
      "name": "P6A-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 63.6347,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2,\"providerDepartmentId\":1}",
    "Cleanup verified: hr_aiassist_test_d6731f28c79e46a6 is absent from sys.databases.",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 12500.4941"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_d6731f28c79e46a6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_d6731f28c79e46a6\"}\n"
  ]
}

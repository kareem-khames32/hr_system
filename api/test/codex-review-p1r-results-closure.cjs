module.exports = {
  "selected": [
    "codex-review-p1r-boundaries",
    "one-person-controls",
    "login-security"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 18,
      "failed": 0,
      "passed": 18,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 18,
      "suites": 0
    },
    "duration_ms": 191174.2298
  },
  "results": [
    {
      "file": "codex-review-p1r-boundaries.integration.cjs",
      "name": "P1 branch reader changes tab must not disclose a foreign prior payroll period or amount",
      "ms": 21254.0859,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p1r-boundaries.integration.cjs",
      "name": "P1 login log accepts ISO from/to date filters and retains branch isolation",
      "ms": 133.3242,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-0: الإعدادات الأربعة مبذورة مقفولة ومسموح بيها في الإعدادات (true/false بس)",
      "ms": 22683.6565,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-1: سجل تغييرات الصرف — الملف وExcel والطلب والإنشاء بصف لكل حقل اتغيّر بمصدره ومين، والآيبان متخفي، ومن غير صف لو ماتغيرش",
      "ms": 1860.3018,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2: «اتغيّر إيه من آخر مسير» — الراتب قبل وبعد، وتغيير الراتب والآيبان بمين وإمتى، والجديد، والخارج، وبنطاق الفرع",
      "ms": 15160.8595,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2b (CRP1-B01): موظف اتنقل من فرع تاني — قارئ الفرع مايشوفش شهر مسيره هناك ولا راتبه ولا شهر السلسلة، وحساب الشركة بيشوف",
      "ms": 5326.4365,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2c (CRP1-B01): مسير أحدث في فرع تاني وأقدم في فرع القارئ — المقارنة بالأقدم المرئي، والموظف نفسه بيشوف مسيره هناك",
      "ms": 10303.2869,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-2d (CRP1-B01): نفس اسم السلسلة في فرعين — قارئ الفرع بياخد آخر مسير من فرعه وخارجينه، ومايشوفش شهر مسير الفرع التاني",
      "ms": 13250.9823,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-3: «اللي غيّر مايعتمدش لوحده» — مقفول زي النهارده؛ مفتوح رفض برسالة، وحد تاني بيعتمد، ومدير النظام بسبب بيعدّي ويتسجل",
      "ms": 27628.7362,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-4: نفس الضابط في سلسلة الاعتماد — معتمد تاني قبله بيعدّي ويتسجل؛ سلسلة بخطوة واحدة رفض، ومدير النظام بسبب بيعدّي",
      "ms": 11848.9099,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-5: المسار الأمني للحساب البنكي — مقفول زي النهارده؛ مفتوح التعديل وExcel مرفوضين للآيبان والبنك، والطلب نيابةً في سلسلته، ونفس الشخص مايعتمدش الخطوتين",
      "ms": 1078.199,
      "pass": true,
      "skip": false
    },
    {
      "file": "one-person-controls.integration.cjs",
      "name": "OP-6: فحوص النقل من التعديل وExcel — مقفول زي النهارده؛ مفتوح العهدة المفتوحة أو المدير في فرع تاني بيمنع النقل من غير أي تغيير",
      "ms": 1151.7923,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: 10 محاولات غلط بتقفل الحساب، وحتى الصح بيرجع «مقفول»، والمدير بيفكه، والتأخير بيزيد من المحاولة التالتة",
      "ms": 28362.215,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: الدخول الصح بيصفّر العداد، والقفل بيخلص لوحده بعد المدة، والحساب المعطّل والبريد الغلط نفس الرد",
      "ms": 1639.9363,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سجل الدخول بكل محاولة ونتيجتها والـIP والجهاز، وحساب الفرع بيشوف حسابات فرعه بس",
      "ms": 317.3969,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سياسة كلمة السر (NIST) في التغيير والإنشاء والتعديل والكلمة المؤقتة، والموجودة مابتتأثرش",
      "ms": 2605.9957,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: التحقق بخطوتين إلزامي لدور بعينه والتحقق العام مقفول — صاحب الدور بس بياخد رمز البريد",
      "ms": 1083.9624,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: رؤوس حماية المتصفح في ردود الـAPI، ومن غير X-Powered-By",
      "ms": 3.2739,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P1-new-changes-tab\",\"foreignRunStatus\":403,\"currentRunStatus\":200,\"branch\":{\"runId\":2,\"period\":\"2026-11\",\"scoped\":true,\"previousSeriesPeriod\":null,\"rows\":[{\"employeeId\":1,\"employeeCode\":\"R25-1\",\"fullName\":\"موظف اختبار مستقل 1\",\"isNew\":true,\"previousPeriod\":null,\"salary\":null,\"payMethod\":null,\"changes\":[]}],\"leavers\":[],\"counts\":{\"changed\":0,\"new\":1,\"leavers\":0}},\"companyRow\":{\"employeeId\":1,\"employeeCode\":\"R25-1\",\"fullName\":\"موظف اختبار مستقل 1\",\"isNew\":false,\"previousPeriod\":\"2026-07\",\"salary\":{\"previous\":6000,\"current\":9000},\"payMethod\":null,\"changes\":[{\"kind\":\"SALARY\",\"field\":null,\"label\":\"الراتب\",\"oldValue\":null,\"newValue\":null,\"changedByUserId\":1,\"changedAt\":\"2026-10-05T00:49:27.298Z\",\"source\":null,\"reason\":\"مراجعة مستقلة لتاريخ المسير وعزل الفروع\",\"changedByName\":\"Review Admin\"}]},\"storedUnchanged\":true}",
    "{\"case\":\"P1-login-date-filter\",\"plainStatus\":200,\"filteredStatus\":200,\"filtered\":{\"available\":true,\"rows\":[{\"id\":1,\"at\":\"2026-10-03T08:00:00.000Z\",\"userId\":3,\"displayName\":\"p1-reader\",\"identifier\":\"p1-reader@r25.invalid\",\"method\":\"PASSWORD\",\"outcome\":\"SUCCESS\",\"ip\":null,\"userAgent\":null,\"actorUserId\":null,\"actorName\":null}]}}",
    "Cleanup verified: hr_one_person_test_bca62bedc151f5e4 is absent from sys.databases.",
    "Cleanup verified: hr_login_security_test_53662aa771e154a0 is absent from sys.databases.",
    "tests 18",
    "suites 0",
    "pass 18",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 191174.2298"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_boundary_test_507df09a81744a92\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_boundary_test_507df09a81744a92\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_boundary_test_507df09a81744a92\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_one_person_test_bca62bedc151f5e4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_one_person_test_bca62bedc151f5e4\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_login_security_test_53662aa771e154a0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_login_security_test_53662aa771e154a0\"}\n"
  ]
}

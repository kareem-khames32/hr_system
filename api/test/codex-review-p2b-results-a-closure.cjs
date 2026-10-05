module.exports = {
  "selected": [
    "codex-review-p2b-closure",
    "codex-review-p2b-leavers",
    "codex-review-p2b-one-person-a",
    "audit-log",
    "file-upload-type"
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
    "duration_ms": 53536.4443
  },
  "results": [
    {
      "file": "codex-review-p2b-closure.integration.cjs",
      "name": "P2A audit and queue reject unauthenticated or out of scope viewers; allowed reads retain audit values",
      "ms": 5173.8039,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-closure.integration.cjs",
      "name": "P2A audit failure must not leave a permission grant committed behind HTTP 500",
      "ms": 78.3277,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-closure.integration.cjs",
      "name": "P2A content allowlist rejects a generic ZIP whose COMMENT names word/document.xml",
      "ms": 90.6456,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-closure.integration.cjs",
      "name": "P2A concurrent repeated outbox keys and two workers produce one event and one job effect",
      "ms": 96.1305,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-closure.integration.cjs",
      "name": "P2A a failed file hash update leaves neither a database row nor a new disk file",
      "ms": 63.3918,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-leavers.integration.cjs",
      "name": "P1R hidden payroll additions do not change a visible older comparison until the scan boundary",
      "ms": 6846.1953,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-leavers.integration.cjs",
      "name": "P1R a fiftieth foreign header must not remove a visible previous series and leaver",
      "ms": 146.4315,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-0: الإعدادات الأربعة مبذورة مقفولة ومسموح بيها في الإعدادات (true/false بس)",
      "ms": 7553.83,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-1: سجل تغييرات الصرف — الملف وExcel والطلب والإنشاء بصف لكل حقل اتغيّر بمصدره ومين، والآيبان متخفي، ومن غير صف لو ماتغيرش",
      "ms": 724.4642,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-2: «اتغيّر إيه من آخر مسير» — الراتب قبل وبعد، وتغيير الراتب والآيبان بمين وإمتى، والجديد، والخارج، وبنطاق الفرع",
      "ms": 6071.0795,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-2b (CRP1-B01): موظف اتنقل من فرع تاني — قارئ الفرع مايشوفش شهر مسيره هناك ولا راتبه ولا شهر السلسلة، وحساب الشركة بيشوف",
      "ms": 2061.373,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-2c (CRP1-B01): مسير أحدث في فرع تاني وأقدم في فرع القارئ — المقارنة بالأقدم المرئي، والموظف نفسه بيشوف مسيره هناك",
      "ms": 4471.5451,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-2d (CRP1-B01): نفس اسم السلسلة في فرعين — قارئ الفرع بياخد آخر مسير من فرعه وخارجينه، ومايشوفش شهر مسير الفرع التاني",
      "ms": 4895.5397,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-2e (CRP1R-N01): مسيرات مخفية كتير بنفس اسم السلسلة ماتزاحمش المسير المرئي — 60 مسير أحدث في فرع تاني والخارج لسه ظاهر",
      "ms": 1558.0813,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-3: «اللي غيّر مايعتمدش لوحده» — مقفول زي النهارده؛ مفتوح رفض برسالة، وحد تاني بيعتمد، ومدير النظام بسبب بيعدّي ويتسجل",
      "ms": 8714.7952,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-4: نفس الضابط في سلسلة الاعتماد — معتمد تاني قبله بيعدّي ويتسجل؛ سلسلة بخطوة واحدة رفض، ومدير النظام بسبب بيعدّي",
      "ms": 3833.2236,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-5: المسار الأمني للحساب البنكي — مقفول زي النهارده؛ مفتوح التعديل وExcel مرفوضين للآيبان والبنك، والطلب نيابةً في سلسلته، ونفس الشخص مايعتمدش الخطوتين",
      "ms": 436.4915,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2b-one-person-a.integration.cjs",
      "name": "OP-6: فحوص النقل من التعديل وExcel — مقفول زي النهارده؛ مفتوح العهدة المفتوحة أو المدير في فرع تاني بيمنع النقل من غير أي تغيير",
      "ms": 412.0989,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 7024.0231,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 204.4839,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 32.3149,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 172.0511,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "ms": 243.1252,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص",
      "ms": 6828.5303,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 57.9894,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض",
      "ms": 65.1967,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال",
      "ms": 77.8847,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس",
      "ms": 105.158,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين",
      "ms": 62.0913,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-07 (CRP2A-B02): النوع من بنية الحاوية — ZIP بتعليق «word/document.xml» مش Word، وExcel قديم متسمي .doc مش Word، ومفيش حاجة اتكتبت",
      "ms": 124.2999,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"permission-audit-atomicity\",\"httpStatus\":500,\"grants\":[],\"effectivePayrollView\":false,\"auditRows\":0}",
    "{\"case\":\"zip-comment-file-type\",\"status\":400,\"storedRows\":0,\"containsOfficePart\":false,\"shaMatches\":null}",
    "{\"case\":\"49-hidden-headers\",\"responseIdentical\":true,\"previousPeriod\":\"2019-01\",\"leavers\":1}",
    "{\"case\":\"50-hidden-headers\",\"before\":{\"runId\":2,\"period\":\"2026-11\",\"scoped\":true,\"previousSeriesPeriod\":\"2019-01\",\"rows\":[],\"leavers\":[{\"employeeId\":2,\"employeeCode\":\"R25-2\",\"fullName\":\"موظف اختبار مستقل 2\"}],\"counts\":{\"changed\":0,\"new\":0,\"leavers\":1}},\"after\":{\"runId\":2,\"period\":\"2026-11\",\"scoped\":true,\"previousSeriesPeriod\":\"2019-01\",\"rows\":[],\"leavers\":[{\"employeeId\":2,\"employeeCode\":\"R25-2\",\"fullName\":\"موظف اختبار مستقل 2\"}],\"counts\":{\"changed\":0,\"new\":0,\"leavers\":1}},\"foreignUnreadable\":true,\"fixture\":\"seeded valid historical run and membership rows; no payroll calculation in this case\"}",
    "Cleanup verified: hr_one_person_test_dc4543bb09bc4b80 is absent from sys.databases.",
    "Cleanup verified: hr_audit_log_test_410fc9c7d30f94b7 is absent from sys.databases.",
    "Cleanup verified: hr_file_upload_test_d18ee54653231c98 is absent from sys.databases.",
    "tests 30",
    "suites 0",
    "pass 30",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 53536.4443"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"658e15f\",\"sourceFiles\":432}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2a_independent_test_caa22677938f1225\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2a_independent_test_caa22677938f1225\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2a_independent_test_caa22677938f1225\"}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"658e15f\",\"sourceFiles\":432}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1r_invariance_test_63e5e6c27b622868\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1r_invariance_test_63e5e6c27b622868\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1r_invariance_test_63e5e6c27b622868\"}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"658e15f\",\"sourceFiles\":432}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_one_person_test_dc4543bb09bc4b80\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_one_person_test_dc4543bb09bc4b80\"}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"658e15f\",\"sourceFiles\":432}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_test_410fc9c7d30f94b7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_test_410fc9c7d30f94b7\"}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"658e15f\",\"sourceFiles\":432}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_upload_test_d18ee54653231c98\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_upload_test_d18ee54653231c98\"}\n"
  ]
}

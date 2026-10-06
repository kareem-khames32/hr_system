module.exports = {
  "selected": [
    "user-temporary-password",
    "file-upload-type",
    "modules-enforcement",
    "login-security"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 33,
      "failed": 0,
      "passed": 33,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 33,
      "suites": 0
    },
    "duration_ms": 59300.8985
  },
  "results": [
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "the importer's unusable hash never logs in (no guess works, generic 401)",
      "ms": 10392.2868,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "users list flags migrated accounts without a password, never leaks hashes, respects branch scope",
      "ms": 54.8893,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "bulk temporary password: permission, branch scope, takeover and self guards are all-or-nothing",
      "ms": 103.6505,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "bulk set → forced change on login → new password unlocks the system",
      "ms": 832.9764,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "single reset is temporary by default, can be made permanent, and the flag needs a password",
      "ms": 589.9167,
      "pass": true,
      "skip": false
    },
    {
      "file": "user-temporary-password.integration.cjs",
      "name": "migration 056 is additive, idempotent, SQL Server 2019-safe and matches the TypeORM schema",
      "ms": 1080.4613,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-01: PDF متسمي .jpg (والمتصفح قال صورة) = 400 برسالة واضحة، ومفيش صف ولا ملف على القرص",
      "ms": 6359.4572,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-02: صورة PNG حقيقية بتتقبل بنوعها الحقيقي وبصمتها، والملف على القرص هو المحتوى",
      "ms": 54.3132,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-03: Word وExcel حقيقيين بيتقبلوا بنوعهم، وWord متسمي .xlsx مرفوض",
      "ms": 65.2088,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-04: نوع مقفول من الإعداد = 400 باسمه، والمسموح شغال",
      "ms": 82.6681,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-05: أكبر من الحد في الإعداد = 400 ومفيش حاجة اتكتبت، والحد من 1 لـ50 بس",
      "ms": 100.848,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-06: صورة الموظف وشعار الشركة لازم صورة حقيقية — PDF حقيقي أو PDF متسمي صورة مرفوضين",
      "ms": 63.2308,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-07 (CRP2A-B02): النوع من بنية الحاوية — ZIP بتعليق «word/document.xml» مش Word، وExcel قديم متسمي .doc مش Word، ومفيش حاجة اتكتبت",
      "ms": 142.6497,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-08 (CRP2B-A-B01): الرفع الفعلي — نوع ماكرو بتصريح Word جوه تعليق XML مش Word، ومجلد OLE اسمه WordDocument مش Word، والسليم لسه بيتقبل",
      "ms": 238.5986,
      "pass": true,
      "skip": false
    },
    {
      "file": "file-upload-type.integration.cjs",
      "name": "FU-09 (CRP2C-A-B01): الرفع الفعلي — تيار Word من غير بايتات تتقري، أو قطاع بيشاور على نفسه، أو محتواه مش Word = مرفوض؛ وملف تعريف مش XML سليم مرفوض",
      "ms": 208.9147,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 6826.859,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 126.4699,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 266.5874,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 377.9376,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 130.3534,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 293.1249,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 190.1463,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 487.2763,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1360.9263,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 287.3621,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 499.4933,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 127.5733,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: 10 محاولات غلط بتقفل الحساب، وحتى الصح بيرجع «مقفول»، والمدير بيفكه، والتأخير بيزيد من المحاولة التالتة",
      "ms": 9213.4814,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: الدخول الصح بيصفّر العداد، والقفل بيخلص لوحده بعد المدة، والحساب المعطّل والبريد الغلط نفس الرد",
      "ms": 581.8135,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سجل الدخول بكل محاولة ونتيجتها والـIP والجهاز، وحساب الفرع بيشوف حسابات فرعه بس",
      "ms": 116.5336,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: سياسة كلمة السر (NIST) في التغيير والإنشاء والتعديل والكلمة المؤقتة، والموجودة مابتتأثرش",
      "ms": 772.7818,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: التحقق بخطوتين إلزامي لدور بعينه والتحقق العام مقفول — صاحب الدور بس بياخد رمز البريد",
      "ms": 298.694,
      "pass": true,
      "skip": false
    },
    {
      "file": "login-security.integration.cjs",
      "name": "B1.3: رؤوس حماية المتصفح في ردود الـAPI، ومن غير X-Powered-By",
      "ms": 0.9074,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_user_temp_pw_test_a3edea9737065185 removed.",
    "Cleanup verified: hr_file_upload_test_2bb03d6b823e9a8f is absent from sys.databases.",
    "Cleanup verified: hr_modules_test_2a4b39ea41b74267 is absent from sys.databases.",
    "Cleanup verified: hr_login_security_test_d5b2560e3eee0d30 is absent from sys.databases.",
    "tests 33",
    "suites 0",
    "pass 33",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 59300.8985"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_user_temp_pw_test_a3edea9737065185\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_user_temp_pw_test_a3edea9737065185\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_upload_test_2bb03d6b823e9a8f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_upload_test_2bb03d6b823e9a8f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_2a4b39ea41b74267\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_2a4b39ea41b74267\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_login_security_test_d5b2560e3eee0d30\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_login_security_test_d5b2560e3eee0d30\"}\n"
  ]
}

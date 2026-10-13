module.exports = {
  "selected": [
    "codex-review-p8a-payroll",
    "codex-review-p8a-evaluator",
    "domain-login-two-factor",
    "task-scope"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 47,
      "failed": 2,
      "passed": 45,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 47,
      "suites": 0
    },
    "duration_ms": 93627.5929
  },
  "results": [
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F00: off payroll calculation, policy fingerprint and slip match approved baseline",
      "ms": 20891.654,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F01: late pending correction versus final payroll approval",
      "ms": 1006.961,
      "pass": false,
      "error": "{\"message\":\"حقول غير معرّفة لنوع «تصحيح/طلب بصمة»: date، punchType، time — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"حقول غير معرّفة لنوع «تصحيح/طلب بصمة»: date، punchType، time — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"حقول غير معرّفة لنوع «تصحيح/طلب بصمة»: date، punchType، time — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at Object.t.expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\helpers\\disposable-app.cjs:43:51)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8a-payroll.integration.cjs:106:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p8a-evaluator.integration.cjs",
      "name": "P8A-R01: employee transferred after scope judgment before evaluator write",
      "ms": 18891.0917,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n1 !== 2\n",
      "cause": "Expected values to be strictly equal:\n\n1 !== 2\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== 2\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8a-evaluator.integration.cjs:73:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "A1 — المفتاح مبذور مقفول، ومسار البريد+كلمة المرور بيرجّع جلسة كاملة بلا أي رمز",
      "ms": 18568.3676,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "A2 — والتحقق مقفول: مسار حساب الشركة كمان بيرجّع جلسة كاملة على طول (وبيعمل الحساب ويربطه)",
      "ms": 257.1164,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "A3 — بيانات غلط في المسارين مرفوضة برسالة عربية بلا أي تفصيل عن مصدر الفشل",
      "ms": 224.6139,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "B1 — التحقق مفتوح: مسار البريد+كلمة المرور بيرجّع حالة معلَّقة بلا توكن، والرمز على البريد",
      "ms": 201.009,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "B2 — الرمز الصح بيفتح الجلسة، والحمولة فيها كل ما كانت فيه (نفس مطالبات النهاردة)",
      "ms": 350.188,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "B3 — ومسار حساب الشركة كمان: مفيش جلسة قبل الرمز، والرمز على بريد AD مش على نسختنا",
      "ms": 245.6438,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C1 — رمز غلط: رفض برسالة عربية بعدد المحاولات الباقية، ومفيش جلسة، والعدّاد بيزيد",
      "ms": 431.0432,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C2 — حد المحاولات: 5 غلط بيقفلوا الطلب، والرمز الصح بعدها مايفتحش جلسة",
      "ms": 713.4548,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C3 — الرمز مرة واحدة: إعادة استخدام نفس الرمز مرفوضة برسالة «استُخدم قبل كده»",
      "ms": 352.1425,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C4 — الرمز المنتهي مرفوض (حتى لو صح) ومفيش جلسة",
      "ms": 229.825,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C5 — توكن معلَّق مش معروف مرفوض، والرمز بشكل غلط مرفوض من التحقق قبل أي قراءة",
      "ms": 23.204,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C6 — إعادة الإرسال: مرفوضة قبل المهلة، ومسموحة بعدها برمز جديد يُبطل القديم، وبحد أعلى",
      "ms": 560.754,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C7 — المحاولات الغلط مابتتصفّرش بإعادة الإرسال (وإلا الحد بيتخطى)",
      "ms": 594.4132,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C8 — دخول جديد بيقفل الحالة المعلَّقة القديمة لنفس الحساب (الرمز مربوط بمحاولة واحدة)",
      "ms": 542.826,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D1 — خادم البريد واقع: الدخول مرفوض 503 برسالة عربية بالسبب، ومفيش جلسة ولا حالة معلَّقة",
      "ms": 107.6407,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D2 — خادم البريد رفض العنوان: نفس الرفض، والرسالة مش «بيانات غلط» (السبب الحقيقي ظاهر)",
      "ms": 78.0783,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D3 — البريد مش مضبوط أصلًا والتحقق مفتوح: رفض برسالة بتقول اضبط SMTP أو اقفل التحقق",
      "ms": 82.1733,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D4 — فشل إعادة الإرسال: رفض 503، والرمز القديم يفضل صالح، والمهلة بتتحسب برضه",
      "ms": 397.6234,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "E1 — خادم الدليل مش راد: رفض 503 برسالة عربية بتقول جرّب البريد وكلمة المرور، ومفيش جلسة",
      "ms": 18.6344,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "E2 — حساب متوقف في المجال: رفض 401 برسالة «متوقف»، ومفيش حساب بيتعمل عندنا",
      "ms": 35.2035,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "E3 — كلمة مرور فاضية في مسار حساب الشركة مرفوضة من التحقق (الربط المجهول مايوصلش للدليل)",
      "ms": 1.9002,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "F1 — حساب مجال بلا موظف مطابق: رفض برسالة عربية واضحة، ومفيش حساب ولا موظف بيتعمل",
      "ms": 30.4835,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "F2 — موظف أرشيف: رفض برسالة «أرشيف أو خدمته منتهية» ومفيش حساب بيتعمل",
      "ms": 18.1118,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "G1 — المطابقة بخاصية employeeID لما البريد في AD مش بريد الموظف عندنا",
      "ms": 197.9436,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "G2 — حساب قائم لنفس الموظف يُربط ولا يتعمل حساب تاني، والكلمة القديمة تفضل شغّالة",
      "ms": 208.3909,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "G3 — الدخول التاني بحساب المجال بيستخدم نفس الحساب (الربط بالـobjectGUID مش بالبريد)",
      "ms": 134.0667,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H1 — «لازم يغيّر كلمة المرور المؤقتة» بتعدّي التحقق بخطوتين سليمة",
      "ms": 395.718,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H2 — الحساب اتعطّل بين إرسال الرمز والتحقق منه: مفيش جلسة",
      "ms": 374.2118,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H3 — tokenVersion لسه بيبطّل التوكن الصادر من التحقق بخطوتين",
      "ms": 672.2984,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H4 — حساب معطّل مايوصلش لخطوة الرمز أصلًا (ومفيش بريد بيتبعت له)",
      "ms": 103.5025,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H5 — تغيير كلمة المرور من داخل الجلسة مش محتاج رمز تاني (الجلسة متحقَّقة أصلًا)",
      "ms": 950.4113,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "I1 — فتح التحقق من الإعدادات مرفوض وخادم البريد مش مضبوط، ومقبول لما يتضبط",
      "ms": 232.7099,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "I2 — حالة الأمان للشاشة: بتقول مفتوح/مقفول ومضبوط/مش مضبوط بلا أي سر، ومحجوبة عن غير المخوَّل",
      "ms": 280.7789,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "I3 — الفحص الذاتي: بيرجّع رد خادم البريد بالحرف عند النجاح وسببه عند الفشل، ومفيش حالة معلَّقة",
      "ms": 138.331,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "K1 — مفتاح الطوارئ: node scripts/two-factor-off.cjs بيقفل التحقق فعلًا وبلا إعادة تشغيل",
      "ms": 1725.7977,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "K2 — سكربت فحص البريد بيقرأ نفس إعداد الخادم ويقول بالاسم إيه الناقص",
      "ms": 2226.7314,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "J1 — ترحيل 066 إضافي وآمن للتكرار وبأسماء TypeORM، وفرق المخطط صفر بعده",
      "ms": 2124.3938,
      "pass": true,
      "skip": false
    },
    {
      "file": "task-scope.integration.cjs",
      "name": "TS-01: التكليف الفردي — للي تحتي في الهيكل بس: قائد الفريق لفريقه، ومدير القسم لقسمه كله، واللي مالوش حد مهمته الشخصية بس",
      "ms": 20897.9412,
      "pass": true,
      "skip": false
    },
    {
      "file": "task-scope.integration.cjs",
      "name": "TS-02: المهمة الجماعية للمدير — شجرته بس في المنتقي والمعاينة والحفظ، وأي اختيار برّاها بنفس الرفض، واللي مالوش حد مرفوض",
      "ms": 1854.8294,
      "pass": true,
      "skip": false
    },
    {
      "file": "task-scope.integration.cjs",
      "name": "TS-03: تقييم المهمة — اللي المهمة عليه مابيقيّمهاش حتى لو حسابه هو اللي كلّف بيها وبيديرها",
      "ms": 367.3997,
      "pass": true,
      "skip": false
    },
    {
      "file": "task-scope.integration.cjs",
      "name": "TS-04: المقيِّم = الرئيس المباشر في الهيكل، و«تقييم فريقي» للي تحته حد بس وفيها اللي بيقيّمهم بس",
      "ms": 575.7412,
      "pass": true,
      "skip": false
    },
    {
      "file": "task-scope.integration.cjs",
      "name": "TS-05: التقييم الذاتي مقفول (الافتراضي) — لا مطلوب ولا بيتسلّم، والدورة بتكمل بتقييم المدير بس؛ ومحدش بيقيّم نفسه",
      "ms": 562.5255,
      "pass": true,
      "skip": false
    },
    {
      "file": "task-scope.integration.cjs",
      "name": "TS-06: التقييم الذاتي مفتوح = سلوك النهارده بالحرف؛ وقفله تاني بيخبّي اللي لسه ماتسلّمش ومابيمسحش اللي اتسلّم",
      "ms": 628.2885,
      "pass": true,
      "skip": false
    },
    {
      "file": "task-scope.integration.cjs",
      "name": "TS-07: 360 — دعوة للموظف على نفسه مابتتعرضش ومابيتردّش عليها",
      "ms": 166.9096,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F01: late pending correction versus final payroll approval",
      "ms": 1006.961,
      "pass": false,
      "error": "{\"message\":\"حقول غير معرّفة لنوع «تصحيح/طلب بصمة»: date، punchType، time — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"حقول غير معرّفة لنوع «تصحيح/طلب بصمة»: date، punchType، time — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"حقول غير معرّفة لنوع «تصحيح/طلب بصمة»: date، punchType، time — أزِلها أو عرّفها في «أنواع الطلبات»\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at Object.t.expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\helpers\\disposable-app.cjs:43:51)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8a-payroll.integration.cjs:106:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p8a-evaluator.integration.cjs",
      "name": "P8A-R01: employee transferred after scope judgment before evaluator write",
      "ms": 18891.0917,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n1 !== 2\n",
      "cause": "Expected values to be strictly equal:\n\n1 !== 2\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== 2\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p8a-evaluator.integration.cjs:73:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_549fae5c8af41fe6 is absent from sys.databases.",
    "Cleanup verified: hr_review_evaluator_test_655334e0d5225c76 is absent from sys.databases.",
    "Cleanup verified: hr_domain_2fa_test_43ffe31eb7a4b30d is absent from sys.databases.",
    "Cleanup verified: hr_task_scope_test_2d64d368133d9b25 is absent from sys.databases.",
    "tests 47",
    "suites 0",
    "pass 45",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 93627.5929"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_549fae5c8af41fe6\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F00\",\"baseline\":\"cfd56bd4\",\"items\":2,\"snapshotAndHashEqual\":true,\"breakdownAndSlipEqual\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_549fae5c8af41fe6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_review_evaluator_test_655334e0d5225c76\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R01-transfer\",\"status\":400,\"error\":{\"code\":\"CALENDAR_CHANGE_REQUIRED\",\"message\":\"تعديل التقويم يحتاج تاريخ السريان والسبب ونسخة المصدر المقروءة\"}}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-R01\",\"status\":500,\"branch\":1,\"hrBranch\":1,\"manager\":1,\"chosen\":3}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_review_evaluator_test_655334e0d5225c76\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_domain_2fa_test_43ffe31eb7a4b30d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_domain_2fa_test_43ffe31eb7a4b30d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_task_scope_test_2d64d368133d9b25\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_task_scope_test_2d64d368133d9b25\"}\n"
  ]
}

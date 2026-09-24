module.exports = {
  "selected": [
    "codex-review-round2-edge",
    "codex-review-round2-migration067",
    "codex-review-round2-adapted-domain",
    "codex-review-round2-adapted-request-race",
    "codex-review-round2-adapted-attendance-race",
    "leave-attachment-with-request",
    "leave-sick-pay-attachment",
    "holiday-work",
    "assets-branch",
    "employee-suspension",
    "leave-contract",
    "report-day-range",
    "payroll-night-shift",
    "payroll-flex",
    "fulltest-leaves-payroll",
    "payroll-approval-chain-disbursement",
    "codex-review-round2-large-run-failure"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 172,
      "failed": 8,
      "passed": 162,
      "cancelled": 0,
      "skipped": 2,
      "todo": 0,
      "topLevel": 172,
      "suites": 0
    },
    "duration_ms": 1436472.7605
  },
  "results": [
    {
      "file": "codex-review-round2-edge.integration.cjs",
      "name": "CR2-E1 mark then unmark then RUN_LEVEL pays current split and freezes it across five outputs",
      "ms": 25827.7835,
      "pass": true
    },
    {
      "file": "codex-review-round2-edge.integration.cjs",
      "name": "CR2-E2 PER_EMPLOYEE leaves unpaid item live, then a late payment freezes its actual split once",
      "ms": 30145.0411,
      "pass": false,
      "error": "POST /payroll/disbursement/runs/2/mark: 409 {\"code\":\"PAYRUN-DISBURSE-CLOSED\",\"employeeId\":3,\"message\":\"«Synthetic edge employee» اتعلّم «تم الصرف» والصرف اتقفل؛ علامته مابتتغيرش\"}",
      "cause": "POST /payroll/disbursement/runs/2/mark: 409 {\"code\":\"PAYRUN-DISBURSE-CLOSED\",\"employeeId\":3,\"message\":\"«Synthetic edge employee» اتعلّم «تم الصرف» والصرف اتقفل؛ علامته مابتتغيرش\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/disbursement/runs/2/mark: 409 {\"code\":\"PAYRUN-DISBURSE-CLOSED\",\"employeeId\":3,\"message\":\"«Synthetic edge employee» اتعلّم «تم الصرف» والصرف اتقفل؛ علامته مابتتغيرش\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round2-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round2-edge.integration.cjs:57:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round2-edge.integration.cjs",
      "name": "CR2-E3 fault after first paid split write rolls back every split and run transition",
      "ms": 29317.9894,
      "pass": true
    },
    {
      "file": "codex-review-round2-migration067.integration.cjs",
      "name": "CR2-M067 additive nullable columns, no backfill, repeatable, zero TypeORM schema delta",
      "ms": 8356.3346,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "A1 — المفتاح مبذور مقفول، ومسار البريد+كلمة المرور بيرجّع جلسة كاملة بلا أي رمز",
      "ms": 10232.0221,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "A2 — والتحقق مقفول: مسار حساب الشركة كمان بيرجّع جلسة كاملة على طول (وبيعمل الحساب ويربطه)",
      "ms": 259.3905,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "A3 — بيانات غلط في المسارين مرفوضة برسالة عربية بلا أي تفصيل عن مصدر الفشل",
      "ms": 145.2434,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "B1 — التحقق مفتوح: مسار البريد+كلمة المرور بيرجّع حالة معلَّقة بلا توكن، والرمز على البريد",
      "ms": 191.8192,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "B2 — الرمز الصح بيفتح الجلسة، والحمولة فيها كل ما كانت فيه (نفس مطالبات النهاردة)",
      "ms": 290.9478,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "B3 — ومسار حساب الشركة كمان: مفيش جلسة قبل الرمز، والرمز على بريد AD مش على نسختنا",
      "ms": 260.5774,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C1 — رمز غلط: رفض برسالة عربية بعدد المحاولات الباقية، ومفيش جلسة، والعدّاد بيزيد",
      "ms": 407.4396,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C2 — حد المحاولات: 5 غلط بيقفلوا الطلب، والرمز الصح بعدها مايفتحش جلسة",
      "ms": 617.6353,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C3 — الرمز مرة واحدة: إعادة استخدام نفس الرمز مرفوضة برسالة «استُخدم قبل كده»",
      "ms": 372.686,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C4 — الرمز المنتهي مرفوض (حتى لو صح) ومفيش جلسة",
      "ms": 204.6563,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C5 — توكن معلَّق مش معروف مرفوض، والرمز بشكل غلط مرفوض من التحقق قبل أي قراءة",
      "ms": 8.4069,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C6 — إعادة الإرسال: مرفوضة قبل المهلة، ومسموحة بعدها برمز جديد يُبطل القديم، وبحد أعلى",
      "ms": 624.2497,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C7 — المحاولات الغلط مابتتصفّرش بإعادة الإرسال (وإلا الحد بيتخطى)",
      "ms": 547.2651,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C8 — دخول جديد بيقفل الحالة المعلَّقة القديمة لنفس الحساب (الرمز مربوط بمحاولة واحدة)",
      "ms": 605.9648,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D1 — خادم البريد واقع: الدخول مرفوض 503 برسالة عربية بالسبب، ومفيش جلسة ولا حالة معلَّقة",
      "ms": 218.1282,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D2 — خادم البريد رفض العنوان: نفس الرفض، والرسالة مش «بيانات غلط» (السبب الحقيقي ظاهر)",
      "ms": 76.109,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D3 — البريد مش مضبوط أصلًا والتحقق مفتوح: رفض برسالة بتقول اضبط SMTP أو اقفل التحقق",
      "ms": 82.6901,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D4 — فشل إعادة الإرسال: رفض 503، والرمز القديم يفضل صالح، والمهلة بتتحسب برضه",
      "ms": 374.3577,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "E1 — خادم الدليل مش راد: رفض 503 برسالة عربية بتقول جرّب البريد وكلمة المرور، ومفيش جلسة",
      "ms": 1.5612,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "E2 — حساب متوقف في المجال: رفض 401 برسالة «متوقف»، ومفيش حساب بيتعمل عندنا",
      "ms": 18.684,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "E3 — كلمة مرور فاضية في مسار حساب الشركة مرفوضة من التحقق (الربط المجهول مايوصلش للدليل)",
      "ms": 1.4774,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "F1 — حساب مجال بلا موظف مطابق: رفض برسالة عربية واضحة، ومفيش حساب ولا موظف بيتعمل",
      "ms": 114.5767,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "F2 — موظف أرشيف: رفض برسالة «أرشيف أو خدمته منتهية» ومفيش حساب بيتعمل",
      "ms": 63.0116,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "G1 — المطابقة بخاصية employeeID لما البريد في AD مش بريد الموظف عندنا",
      "ms": 188.559,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "G2 — حساب قائم لنفس الموظف يُربط ولا يتعمل حساب تاني، والكلمة القديمة تفضل شغّالة",
      "ms": 202.3541,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "G3 — الدخول التاني بحساب المجال بيستخدم نفس الحساب (الربط بالـobjectGUID مش بالبريد)",
      "ms": 160.8286,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H1 — «لازم يغيّر كلمة المرور المؤقتة» بتعدّي التحقق بخطوتين سليمة",
      "ms": 396.5004,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H2 — الحساب اتعطّل بين إرسال الرمز والتحقق منه: مفيش جلسة",
      "ms": 391.0333,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H3 — tokenVersion لسه بيبطّل التوكن الصادر من التحقق بخطوتين",
      "ms": 625.2806,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H4 — حساب معطّل مايوصلش لخطوة الرمز أصلًا (ومفيش بريد بيتبعت له)",
      "ms": 95.865,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H5 — تغيير كلمة المرور من داخل الجلسة مش محتاج رمز تاني (الجلسة متحقَّقة أصلًا)",
      "ms": 867.8156,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "I1 — فتح التحقق من الإعدادات مرفوض وخادم البريد مش مضبوط، ومقبول لما يتضبط",
      "ms": 215.1427,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "I2 — حالة الأمان للشاشة: بتقول مفتوح/مقفول ومضبوط/مش مضبوط بلا أي سر، ومحجوبة عن غير المخوَّل",
      "ms": 209.044,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "I3 — الفحص الذاتي: بيرجّع رد خادم البريد بالحرف عند النجاح وسببه عند الفشل، ومفيش حالة معلَّقة",
      "ms": 120.2288,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "K1 — مفتاح الطوارئ: node scripts/two-factor-off.cjs بيقفل التحقق فعلًا وبلا إعادة تشغيل",
      "ms": 0.1482,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "K2 — سكربت فحص البريد بيقرأ نفس إعداد الخادم ويقول بالاسم إيه الناقص",
      "ms": 0.049,
      "pass": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "J1 — ترحيل 066 إضافي وآمن للتكرار وبأسماء TypeORM، وفرق المخطط صفر بعده",
      "ms": 1687.1159,
      "pass": true
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 9993.5268,
      "pass": true
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 122.5684,
      "pass": true
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 248.6814,
      "pass": true
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 126.9948,
      "pass": true
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 221.5322,
      "pass": true
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 100.7402,
      "pass": true
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 94.372,
      "pass": true
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 95.9614,
      "pass": true
    },
    {
      "file": "attendance-payroll-race.integration.cjs",
      "name": "approval holding employee-finance wins before a waiting recompute; attendance snapshot and approved OT stay immutable",
      "ms": 14975.3543,
      "pass": true
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل",
      "ms": 14753.3145,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:185:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع",
      "ms": 494.7658,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:225:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف",
      "ms": 1607.7263,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:239:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط",
      "ms": 877.7772,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:258:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب",
      "ms": 3649.7917,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:289:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll",
      "ms": 10047.0528,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-sick-pay-attachment.integration.cjs:41:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-sick-pay-attachment.integration.cjs:165:19)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: days 31-40 of the year at 75% deduct 750 as their own line; an isUnpaid sick day is not charged twice",
      "ms": 14267.059,
      "pass": true
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: crossing day 90 splits into 75% and 0% lines; fully paid sick days add nothing",
      "ms": 26430.5011,
      "pass": true
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 11368.2202,
      "pass": true
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 82729.8856,
      "pass": true
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 15488.1906,
      "pass": true
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 1046.2568,
      "pass": true
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 16206.8927,
      "pass": true
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 16396.1949,
      "pass": true
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 63492.3532,
      "pass": true
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "M1 — ترحيل 065: إضافي، بيعبّي فرع الأصل المُسنَد من حامله الحالي بس، آمن للتكرار، وفرق المخطط مع الكيان صفر",
      "ms": 12124.4896,
      "pass": true
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "A1 — الأصل الجديد بيتختم بفرع اللي أضافه، وحساب الفرع يشوف ويعدّل أصول فرعه بس، وأصل الفرع التاني = نفس رد الغايب",
      "ms": 580.2873,
      "pass": true
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "A2 — تحديد فرع الأصل: فردي ودفعة، لحساب نطاقه كل الفروع بس، وأصل في عهدة مايتنقلش لفرع غير فرع صاحبها",
      "ms": 648.2824,
      "pass": true
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C1 — دورة العهدة كاملة جوه الفرع: تسليم → استلام → اعتماد المدير → نقل → تسليم → إرجاع، والأصل فاضل في فرعه",
      "ms": 1434.4034,
      "pass": true
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C2 — العهدة بين فرعين مرفوضة، وعهدة الفرع التاني = نفس رد الإسناد الغايب في كل إجراء",
      "ms": 2007.5697,
      "pass": true
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C3 — نقل عهدة بين فرعين: من حساب نطاقه كل الفروع بس (مش بالدور)، والأصل بيتنقل لفرع المستلم لحظة اعتماد مديره",
      "ms": 1263.1953,
      "pass": true
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C4 — الأصل القديم اللي بلا فرع: عهدته القائمة بتكمّل في فرع موظفها، وبيتختم بفرع حامله عند التنشيط وعند الإرجاع",
      "ms": 533.4909,
      "pass": true
    },
    {
      "file": "assets-branch.integration.cjs",
      "name": "C5 — طلب العهدة (خدمة ذاتية): أصل فرع تاني أو أصل بلا فرع = نفس رد الأصل الغايب برقمه، وأصل الفرع يتقدّم عادي",
      "ms": 6103.0853,
      "pass": true
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية بطول الجنسية وفريدة، ورقم البصمة فريد",
      "ms": 11556.5612,
      "pass": true
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو تغيير الجنسية المخالف أو «موقوف» بلا تواريخ مرفوض",
      "ms": 833.3938,
      "pass": true
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 1818.618,
      "pass": true
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 2082.8089,
      "pass": true
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 12364.9674,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 11693.2215,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 2501.5811,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 159.1737,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 915.3057,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 1028.8757,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 645.4399,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 1320.4596,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 525.3477,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 the HR override pushes other people work only: no one approves his own request, and money keeps its cycle",
      "ms": 455.3923,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 1242.2061,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 937.2686,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 150.4503,
      "pass": true
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 432.8065,
      "pass": true
    },
    {
      "file": "report-day-range.integration.cjs",
      "name": "/attendance/payroll-month gives the payroll month (23 → 22) from the company setting",
      "ms": 13130.3474,
      "pass": true
    },
    {
      "file": "report-day-range.integration.cjs",
      "name": "attendance report: from/to counts exactly the chosen days; ?month= still works; bad ranges are 400",
      "ms": 304.6873,
      "pass": true
    },
    {
      "file": "report-day-range.integration.cjs",
      "name": "employee sheet, overtime log and manual punches accept the payroll month by day",
      "ms": 37168.0149,
      "pass": true
    },
    {
      "file": "payroll-night-shift.integration.cjs",
      "name": "ليلة 12 (20:00 ← 01:00): الساعات والتأخير والنقص ليوم 12، وبصمة 00:50 لا تدخل يوم 13",
      "ms": 39746.3924,
      "pass": true
    },
    {
      "file": "payroll-night-shift.integration.cjs",
      "name": "غياب ليلة 12 يُسجل ليوم 12 وحده، وليلة 13 المكتملة لا ترث منه شيئًا",
      "ms": 8875.9054,
      "pass": true
    },
    {
      "file": "payroll-night-shift.integration.cjs",
      "name": "ليلة آخر يوم في فترة الرواتب (22 أغسطس) تبقى في مسير أغسطس، ومسير سبتمبر (23/8–22/9) يبدأ بليلة 23 نظيفة",
      "ms": 10536.4414,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-03: 09:00, 09:30 and inclusive 10:00 with nine hours earn no lateness, no shortfall and no compensation overtime",
      "ms": 74812.8549,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05: arrival 10:01 remains 61 minutes late after either nine complete hours or staying until 20:00",
      "ms": 41315.5781,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05 AC1: 10:00:59 exceeds the window before minute rounding and stores 60 late minutes",
      "ms": 20356.3674,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04: in-window departures distinguish a 75-minute shortfall from a 30-minute shortfall without lateness",
      "ms": 41069.1095,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01: employee ENABLED, DISABLED and INHERIT resolve after that day's shift instead of overriding its duration",
      "ms": 84576.4353,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01 extension: WorkSchedule without a Shift applies its own flexible window and employee override",
      "ms": 57815.2099,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: moving official start to 08:00 shifts the 60-minute window to 08:00–09:00 only from its effective date",
      "ms": 44356.4404,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: reducing the window from 60 to 30 minutes keeps a previous day unchanged after HTTP recomputation",
      "ms": 44916.7324,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-02: invalid duration and negative input reject HTTP writes without a new source version",
      "ms": 1209.7545,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01/09: branch-scoped users cannot edit global source definitions or another employee's override",
      "ms": 1416.7437,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.2: free and paid permissions retain raw lateness while excusing their interval exactly once",
      "ms": 40783.4228,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.1: overnight punch-out belongs to the shift start date and never yields negative work duration",
      "ms": 22149.5865,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08: attendance exemption takes precedence over a late/incomplete flexible shift without deleting punches",
      "ms": 19482.8481,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-06: early work is excluded by default and counted only with the explicit company setting",
      "ms": 41083.5613,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.3: morning half-leave moves the full 60-minute window to 13:30–14:30; explicit proration reduces it to 30",
      "ms": 41438.0614,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04: independent shortfall tolerance forgives ten minutes but charges all forty minutes when above fifteen",
      "ms": 45869.5863,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04 financial: 75 minutes inside the window are recovered at .625 each with no lateness at all",
      "ms": 22304.9866,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: the whole 130-minute shortfall is charged beside the 70 late minutes — no overlap subtraction",
      "ms": 22368.4573,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-07 financial: free and paid permission coverage is counted once and raw lateness cannot erase a real later shortfall",
      "ms": 45912.0762,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: forgiven lateness no longer shrinks the shortfall — the unworked 90 minutes are charged in full",
      "ms": 22850.1078,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.4: missing checkout keeps known lateness, leaves shortfall unknown and blocks payroll approval atomically",
      "ms": 23196.5833,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: approved payroll protects its original attendance and source versions against retroactive edits or recomputation",
      "ms": 23818.7785,
      "pass": false,
      "error": "{\"message\":\"التصفية المعتمدة #9 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "cause": "{\"message\":\"التصفية المعتمدة #9 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"التصفية المعتمدة #9 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-flex.integration.cjs:534:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: no daily cap — lateness and shortfall are each charged in full, and only net protection stops the day going negative",
      "ms": 22583.5529,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05 financial: approved overtime remains a separate source and cannot cancel after-window lateness",
      "ms": 34028.9601,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX policy validation: invalid settings are rejected over HTTP and a corrupted SQL policy cannot replace an existing payroll",
      "ms": 24000.4492,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX regression: final aggregate truncates an exact half-cent to two decimals despite binary floating-point noise",
      "ms": 22218.2488,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX / OT-08 regression: fixed-shift attendance materialization preserves a legacy approved overtime source",
      "ms": 21642.8431,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX regression: a backdated default work schedule cannot overlap a future default or alter its saved history",
      "ms": 9149.0162,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09 regression: changing general grace preserves historical source versions and applies only to a new effective version",
      "ms": 92617.6885,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: a future shift rejects earlier daily and name assignments and bulk validates each date",
      "ms": 2336.814,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: a week straddling shift creation rejects by id or name and rolls back an earlier valid batch entry",
      "ms": 1011.2501,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: future deactivation permits earlier new assignments and preserves already saved daily and weekly schedules",
      "ms": 63197.8946,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 23313.7443,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 3687.4265,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 1156.0941,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 4139.021,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 2586.4869,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 2332.5718,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 6124.326,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 1051.4498,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 737.8539,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 143.237,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 3077.5382,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 861.3631,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 830.8087,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 490.9003,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 2138.1196,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 327.3512,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 37.7454,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 903.5291,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 851.0331,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 5176.5649,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 7807.5081,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 19156.9198,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 2379.2365,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 9803.5642,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 5544.2926,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 4380.2003,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 4122.9145,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 5662.7661,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 2116.5536,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 5320.2708,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 396.6388,
      "pass": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.3254,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 26132.3257,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 443.807,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 70004.5539,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 62873.4921,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 15128.0972,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 15151.3627,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 2930.6032,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 5410.3487,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 1948.5221,
      "pass": true
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 769.2734,
      "pass": true
    },
    {
      "file": "codex-review-round2-large-run-failure.integration.cjs",
      "name": "CR2 500 employee endpoint fails at member batch and rolls back entire calculation",
      "ms": 649219.5687,
      "pass": true
    }
  ],
  "failures": [
    {
      "file": "codex-review-round2-edge.integration.cjs",
      "name": "CR2-E2 PER_EMPLOYEE leaves unpaid item live, then a late payment freezes its actual split once",
      "ms": 30145.0411,
      "pass": false,
      "error": "POST /payroll/disbursement/runs/2/mark: 409 {\"code\":\"PAYRUN-DISBURSE-CLOSED\",\"employeeId\":3,\"message\":\"«Synthetic edge employee» اتعلّم «تم الصرف» والصرف اتقفل؛ علامته مابتتغيرش\"}",
      "cause": "POST /payroll/disbursement/runs/2/mark: 409 {\"code\":\"PAYRUN-DISBURSE-CLOSED\",\"employeeId\":3,\"message\":\"«Synthetic edge employee» اتعلّم «تم الصرف» والصرف اتقفل؛ علامته مابتتغيرش\"}",
      "stack": "AssertionError [ERR_ASSERTION]: POST /payroll/disbursement/runs/2/mark: 409 {\"code\":\"PAYRUN-DISBURSE-CLOSED\",\"employeeId\":3,\"message\":\"«Synthetic edge employee» اتعلّم «تم الصرف» والصرف اتقفل؛ علامته مابتتغيرش\"}\n    at Object.ok (D:\\projects\\hr_system\\api\\test\\codex-review-round2-fixture.cjs:48:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.test.timeout (D:\\projects\\hr_system\\api\\test\\codex-review-round2-edge.integration.cjs:57:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل",
      "ms": 14753.3145,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:185:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع",
      "ms": 494.7658,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:225:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف",
      "ms": 1607.7263,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:239:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط",
      "ms": 877.7772,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:258:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب",
      "ms": 3649.7917,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:51:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-attachment-with-request.integration.cjs:289:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll",
      "ms": 10047.0528,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at uploadPdf (D:\\projects\\hr_system\\api\\test\\leave-sick-pay-attachment.integration.cjs:41:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\leave-sick-pay-attachment.integration.cjs:165:19)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: approved payroll protects its original attendance and source versions against retroactive edits or recomputation",
      "ms": 23818.7785,
      "pass": false,
      "error": "{\"message\":\"التصفية المعتمدة #9 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "cause": "{\"message\":\"التصفية المعتمدة #9 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"التصفية المعتمدة #9 ما فيهاش بند «راتب آخر شهر» (اتعمدت قبل حساب مسير الشهر) — راتب الشهر (300.00) مستبعد من المستحق للصرف وهيضيع؛ أعد فتح التصفية وولّد بنودها من المسير قبل الاعتماد أو الصرف\",\"error\":\"Conflict\",\"statusCode\":409}\n\n409 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-flex.integration.cjs:534:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"scenario\":\"RUN_LEVEL stale UNPAID\",\"frozen\":[600,400],\"fiveOutputsAgree\":true,\"repeatPay\":400}",
    "{\"scenario\":\"atomic paid snapshot\",\"injectedStatus\":500,\"partialWritesPersisted\":0,\"retrySucceeded\":true}",
    "{\"migration\":\"067\",\"repetitions\":2,\"newNullableColumns\":3,\"backfilled\":0,\"existingRowChanged\":false,\"payrollItemSchemaDelta\":0}",
    "Cleanup verified: hr_domain_2fa_test_ebe76f66901c9db4 is absent from sys.databases.",
    "Cleanup verified: hr_attendance_race_test_95347ef36cd93dcd removed.",
    "Cleanup verified: hr_leave_attach_test_9dba05810ac600b6 is absent from sys.databases.",
    "Manual: day rate 300; 10 days × 300 × 25% = 750 (sick) + 2 unpaid days × 300 = 600; net 9000 − 1350 = 7650.",
    "Manual: 2 × 300 × 25% = 150 + 2 × 300 × 100% = 600 → 750; five fully paid days → 0.",
    "Cleanup verified: hr_leave_sick_pay_test_0aa00277027861fa is absent from sys.databases.",
    "Cleanup verified: hr_holiday_work_test_94a7a8b2b8883c7e is absent from sys.databases.",
    "Cleanup verified: hr_assets_branch_test_b2b3a49ad076e289 is absent from sys.databases.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_92f17cca6592298b is absent from sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_day_range_test_697a8efe38efbb85",
    "يدويًا: 9000/30 = 300 لليوم، 300/8/60 = 0.625 للدقيقة؛ تأخير 10 = 6.25، ونقص 20 كاملًا بلا طرح التأخير (أ4) = 20 × 0.625 = 12.50 — كلها في مسير أغسطس.",
    "تحقق حذف قاعدة الاختبار: hr_night_shift_test_c7cd61ae90149c9b",
    "الراتب على 30 يوم: يوم مغطى = 9000 ÷ 30 = 300؛ والنقص 75 × 0.625 = 46.875 ← 46.87 بالقص؛ الصافي 253.13.",
    "أ4: كل خصم يُحتسب كما جاء — تأخير 70×.625=43.75 ونقص 130×.625=81.25؛ الصافي 300−125=175 (الراتب على 30 يوم).",
    "أ4: الإذن الحر ⇒ 300−18.75−56.25=225؛ والمدفوع يضيف 60×.625=37.50 فالصافي 187.50 (الراتب على 30 يوم). الإذن المدفوع لا يُحتسب مرتين.",
    "Manual: monthly1000.08 /30 /8 /60 ×100min = 6.945 → 6.94 بالقص؛ ويوم مغطى واحد يستحق 1000.08 ÷ 30 = 33.336 ← 33.33 (الراتب على 30 يوم)؛ الصافي 26.39.",
    "Legacy approval remains2h: 2 ×(9000/30/8) ×1.5 =112.50; payroll cannot change an existing approval to1h by rereading attendance.",
    "Cleanup verified: hr_payroll_flex_test_e63594a85fa039a5 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_fulltest_payroll_test_184d23943eb5c234 is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_8f7c07a487dc836c is absent from sys.databases.",
    "{\"endpointStatus\":500,\"failedSql\":{\"number\":8003,\"code\":\"EREQUEST\",\"parameters\":3000,\"memberInsert\":true},\"state\":{\"status\":\"DRAFT\",\"items\":0,\"members\":0,\"accrual\":0},\"lockToResponseMs\":639328.6965}",
    "tests 172",
    "suites 0",
    "pass 162",
    "fail 8",
    "cancelled 0",
    "skipped 2",
    "todo 0",
    "duration_ms 1436472.7605"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_edges_test_a2d1a870943cf73c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_migration067_test_fe56e0ff3b24b852\"}\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "  [L10] أثر بذرة الرصيد: entitled المحفوظ=21 — المعروض annualEntitlement=21 accruedToDate=14 remaining=14 (العرض يقرأ استحقاق نوع الإجازة، فالعمود المحفوظ غير مستعمل اليوم)\n",
    "  [P2] وضع المحرك=SHADOW المصروف=LEGACY تكافؤ: {\"employees\":1,\"matched\":0,\"different\":0,\"unavailable\":1,\"error\":0,\"differences\":6} — 6 فرقًا بين محرك السياسة والحساب القديم؛ لكل فرق سبب مسجل، والتحويل إلى POLICY يحتاج سببًا مكتوبًا لكل فرق\n  [P2] حالة الصف=UNAVAILABLE ظل الحضور=PARTIAL\n        فرق LATENESS (خصم التأخير): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n",
    "        فرق SHORTFALL (خصم نقص الساعات): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق ABSENCE (خصم الغياب): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق OTHER_DEDUCTIONS (خصومات الدفتر): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق LOANS (أقساط السلف): قديم=0.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n        فرق NET (الصافي): قديم=7800.00 سياسة=null سبب=ATTENDANCE_SHADOW_PARTIAL\n",
    "سيناريوهات: 31 — تحققات فاشلة: 0\n",
    "{\"cleanupVerified\":\"hr_codex_largerun_test_e117201485522b1d\"}\n"
  ]
}

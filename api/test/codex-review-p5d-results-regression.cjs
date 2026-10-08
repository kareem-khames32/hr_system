module.exports = {
  "selected": [
    "expense-reports",
    "fulltest-leaves-payroll",
    "holiday-work",
    "leave-attachment-with-request",
    "leave-contract",
    "leave-entitlement-tiers",
    "leave-sick-pay-attachment",
    "leave-year-end",
    "codex-review-p5d-decision-race",
    "request-execution",
    "swap-consents"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 141,
      "failed": 1,
      "passed": 140,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 141,
      "suites": 0
    },
    "duration_ms": 106907.8152
  },
  "results": [
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 12958.9157,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
      "ms": 221.3314,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»",
      "ms": 472.9335,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل",
      "ms": 588.1797,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب",
      "ms": 431.6982,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش",
      "ms": 414.6822,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل",
      "ms": 399.6377,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد",
      "ms": 683.2957,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد",
      "ms": 915.3043,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند",
      "ms": 199.1099,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة",
      "ms": 731.8846,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع",
      "ms": 836.9957,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-13 (Codex P5A-B01): سلسلة فاضية بـ«تنفيذ فوري» مش مراجعة للمبلغ — تقرير المصروفات وسلفة المأمورية مابيتنفذوش من غير اعتماد بشري، والتقديم كله بيرجع",
      "ms": 278.2257,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-14 (Codex P5B-B01): اعتماد جولة قبل الإرجاع مايصرفش مبلغ اتغيّر — إعادة تقديم على سلسلة «تنفيذ فوري» مرفوضة كلها، وبالسلسلة الحقيقية القيد بالمبلغ الجديد بعد اعتماد جديد",
      "ms": 333.9601,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 13281.1473,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 812.3641,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 184.8864,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 619.9609,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 367.9781,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 282.7576,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 883.6161,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 375.6086,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 137.419,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 38.117,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 523.49,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 215.0767,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 197.6303,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 119.9701,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 277.0991,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 124.6786,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 16.489,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 136.6718,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 165.9354,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 1207.0816,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 2016.1032,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 1734.1379,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 594.368,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 1727.5034,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 1085.1405,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 1195.3217,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 1040.3578,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 976.9082,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 290.3947,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 768.5792,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 106.7222,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.8692,
      "pass": false,
      "error": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "cause": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: 2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\fulltest-leaves-payroll.integration.cjs:1363:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 10308.8518,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 4696.0903,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 1100.279,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 177.684,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 1169.7731,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1225.6767,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 3055.6239,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR29-B01: أمر دوام العطلة لموظفين بالاسم بيتحفظ تحت قفلهم المالي — موظف اتنقل لفرع تاني قبل القفل بيرفض الأمر كله، وكمان تعديل أمر قائم ليه",
      "ms": 169.0669,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR30-B01: تعديل أو إلغاء أمر عطلة، وتعديل أو حذف فترة إضافي، بصلاحية الفرع القديم وقت ما السجل نفسه بيتنقل لفرع تاني — مابيتحفظوش",
      "ms": 426.2432,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR31-B01: تعديل أمر عطلة اتحفظ والأمر اتنقل لفرع تاني واتسمّى بعدها على طول — الرد مابيكشفش الاسم الجديد",
      "ms": 118.8718,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل",
      "ms": 11614.5712,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع",
      "ms": 364.2013,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف",
      "ms": 554.6484,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط",
      "ms": 467.2449,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب",
      "ms": 633.8555,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 9630.7822,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 647.0844,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 67.0886,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 166.0421,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 269.0021,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 102.3271,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 182.9256,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 195.88,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 209.3038,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 40.0421,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 441.9772,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 163.5578,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 249.8022,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 26.646,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 86.4601,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-01: قبل ترحيل 136 الكود شغال من غير العمودين، والحفظ بقيمة ليهم بيترفض؛ والترحيل بيضيفهم بشكل الكيان وبيتكرر بأمان",
      "ms": 11956.4799,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-02: من غير شرائح الرصيد زي الأول؛ بشرائح الحزمة كل موظف بياخد شريحة دولة فرعه وخدمته وسنّه — مصر والسعودية — وتفضيتها بترجّع أيام النوع",
      "ms": 683.7777,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-03: أقصى مرات طول الخدمة — الإجازات المعتمدة والطلبات اللي في المسار بتتعدّ، والتالتة بتترفض؛ ومن غير حد مفيش رفض",
      "ms": 516.0007,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-04: أنواع إجازات حزمة الدولة لفرع — غير مفعّلة وبأرقام الحزمة، لمصر والسعودية، ومابتتكررش، وبنطاق الحساب",
      "ms": 223.844,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-05 (P4A-B03): صف السنة الناقص والمُرحّل منه بشريحة دولة فرع الموظف **بعد** قفل صفه — نقل الفرع اللي اتثبّت قبل القفل هو اللي بيتحسب",
      "ms": 412.0778,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll",
      "ms": 10273.3308,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: days 31-40 of the year at 75% deduct 750 as their own line; an isUnpaid sick day is not charged twice",
      "ms": 1117.8812,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: crossing day 90 splits into 75% and 0% lines; fully paid sick days add nothing",
      "ms": 1478.764,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 9735.354,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 99.4357,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 190.1587,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 332.395,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 88.998,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 9068.238,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 89.6526,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 69.6046,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 86.8115,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 65.9755,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 63.0573,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 53.502,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5d-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 54.4653,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 8765.9223,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 158.9944,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 212.2668,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 115.83,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 1031.9587,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 205.1425,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 112.0542,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 311.0673,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 232.9991,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 216.5967,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.5116,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 190.8167,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 80.5859,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 166.2605,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 136.1353,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 68.2194,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 205.5907,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 48.0797,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 221.616,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 105.9958,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 142.2025,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1519.0622,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 245.1296,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 250.9589,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 594.3135,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 80.1118,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 126.7854,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 94.6458,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 207.6545,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 367.1877,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 373.2659,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 69.176,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 69.461,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 223.411,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 119.5391,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 239.8456,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 131.6274,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 292.6854,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 117.4717,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 174.6554,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-01: الميزة مقفولة افتراضيًا = التبديل زي الأول بالحرف (اعتماد المدير كفاية ومن غير صف موافقة)؛ وقبل ترحيل 166 الشاشة بتقول ناقص؛ والترحيل بشكل الكيان وبيتكرر",
      "ms": 10303.1771,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-02: الميزة مفتوحة — التقديم بيسجّل موافقة «مستني» للطرف التاني، والتنفيذ بيقف لحد ما يوافق؛ والرفض بيوقّفه؛ والقرار لصاحبه بس ومرة واحدة",
      "ms": 673.7521,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-03: الطرف التاني اتغيّر عند إعادة التقديم = الموافقة للطرف الجديد؛ وطلب اترفض مايتسجّلش عليه قرار؛ وموافقة لطرف قديم ماتنفّذش تبديل مع غيره",
      "ms": 878.948,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-04 (Codex P5A-B07): حالة الميزة جوه معاملة تقديم التبديل بتتقري بمدير المعاملة — قارئ المخزن مابيتناداش، والذاكرة المؤقتة مش شرط، والميزة مقفولة أو مفتوحة",
      "ms": 322.8193,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.8692,
      "pass": false,
      "error": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "cause": "2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n",
      "stack": "AssertionError [ERR_ASSERTION]: 2 تحقق فاشل — التفاصيل فوق\n\n2 !== 0\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\fulltest-leaves-payroll.integration.cjs:1363:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_expense_reports_test_ce0ae338fe557b31 is absent from sys.databases.",
    "Cleanup verified: hr_fulltest_payroll_test_83ca8fb873b5d34c is absent from sys.databases.",
    "Cleanup verified: hr_holiday_work_test_61cb018b56f94a04 is absent from sys.databases.",
    "المرفق المطلوب مع الطلب: رفض بلا ملف، قبول معه، ونفس الحقل في الطلب وسجل الإجازة.",
    "مسار «بعد الرجوع» كما هو: تذكير يوم الموعد، رفع بنفس الحقل، وتحويل بدون راتب بعد انقضاء المهلة.",
    "Cleanup verified: hr_leave_attach_test_73c8bd75e77ef802 is absent from sys.databases.",
    "Cleanup verified: hr_leave_tiers_test_5e695c7870732057 is absent from sys.databases.",
    "Manual: 9000 − 3 × 300 (MISSED sick days now unpaid) = 8100; no tier deduction on top.",
    "Manual: day rate 300; 10 days × 300 × 25% = 750 (sick) + 2 unpaid days × 300 = 600; net 9000 − 1350 = 7650.",
    "Manual: 2 × 300 × 25% = 150 + 2 × 300 × 100% = 600 → 750; five fully paid days → 0.",
    "Cleanup verified: hr_leave_sick_pay_test_94f669526d5abc8f is absent from sys.databases.",
    "Cleanup: hr_leave_year_end_test_b436b48b300eb21f dropped.",
    "Cleanup verified: hr_swap_consents_test_d10bf8a8c6894538 is absent from sys.databases.",
    "tests 141",
    "suites 0",
    "pass 140",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 106907.8152"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_ce0ae338fe557b31\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_ce0ae338fe557b31\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_fulltest_payroll_test_83ca8fb873b5d34c\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "  [L10] أثر بذرة الرصيد: entitled المحفوظ=21 — المعروض annualEntitlement=21 accruedToDate=15.75 remaining=15.75 (العرض يقرأ استحقاق نوع الإجازة، فالعمود المحفوظ غير مستعمل اليوم)\n",
    "  [P2] وضع المحرك=LEGACY المصروف=LEGACY تكافؤ: {\"employees\":0,\"matched\":0,\"different\":0,\"unavailable\":0,\"error\":0,\"differences\":0} — وضع LEGACY: لم يُحسب محرك السياسة بجانب المسير\n",
    "\n================ الملاحظات ================\n",
    "1. [P4 الإضافي وبدل العطلة] ساعات الإضافي ومبلغه مسجلان\n   hours=0 amount=0 overtime=[]\n2. [P4 الإضافي وبدل العطلة] سطر الإضافي في القسيمة\n   [{\"key\":\"BASIC\",\"name\":\"الأساسي\",\"amount\":6000},{\"key\":\"SALARY:HOUSING\",\"name\":\"بدل السكن\",\"amount\":1200},{\"key\":\"SALARY:TRANSPORT\",\"name\":\"بدل الانتقال\",\"amount\":600},{\"key\":\"HOLIDAY_WORK\",\"name\":\"بدل دوام أيام العطلات\",\"amount\":195}]\n===========================================\n\nسيناريوهات: 31 — تحققات فاشلة: 2\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_fulltest_payroll_test_83ca8fb873b5d34c\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_work_test_61cb018b56f94a04\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_work_test_61cb018b56f94a04\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_attach_test_73c8bd75e77ef802\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_attach_test_73c8bd75e77ef802\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_d7e5589b999d218f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_d7e5589b999d218f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_5e695c7870732057\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_5e695c7870732057\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_sick_pay_test_94f669526d5abc8f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_sick_pay_test_94f669526d5abc8f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_year_end_test_b436b48b300eb21f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_year_end_test_b436b48b300eb21f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_decision_race_test_df9b394e897220e0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_decision_race_test_df9b394e897220e0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_0ee179da0db82964\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_0ee179da0db82964\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_d10bf8a8c6894538\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_d10bf8a8c6894538\"}\n"
  ]
}

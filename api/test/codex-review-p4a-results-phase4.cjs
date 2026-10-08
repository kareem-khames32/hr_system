module.exports = {
  "selected": [
    "payroll-statutory",
    "statutory-pack",
    "eg-salary-tax",
    "suspension-paid",
    "penalty-fine-cap",
    "leave-entitlement-tiers",
    "employee-privacy",
    "data-protection",
    "legal-entities",
    "legal-entities-migration",
    "salary-items",
    "statutory-migration",
    "eos-country",
    "overtime-legal-minimum",
    "resignation-legal-terms",
    "saudization-report",
    "banks",
    "hijri-display"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 59,
      "failed": 6,
      "passed": 53,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 59,
      "suites": 0
    },
    "duration_ms": 122984.7965
  },
  "results": [
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-01: الإعدادين مقفولين (الافتراضي) — البند زي ما هو بالحرف: مفيش خصم قانوني ولا سطر ولا لقطة",
      "ms": 9172.2539,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-02: الإعدادين مفتوحين — ضريبة 1,482.50 وصندوق الشهداء 7.50 من الصافي وبلقطتهم، وسطرين في القسيمة وجدول المسير، والسعودي زي ما هو، والاعتماد، والمعاينة بتعرض المحفوظ",
      "ms": 1982.5415,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-03: التراكمي — الشهر التاني بياخد اللي اتسجّل في الأول، والزيادة بتتسوّى، وإعادة الحساب بنفس الأرقام، وصندوق الشهداء لوحده قبل فترة بداية الضريبة",
      "ms": 1591.6897,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-04: قارئ الرصيد التراكمي — من فترة البداية وفي نفس السنة، والمسير نفسه برّه، ونفس الفترة «متعدّة»، والمعكوس صرفه والملغى برّه",
      "ms": 59.7035,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-05: التقارير بتتصالح بالخصم القانوني — كشف الرواتب والخصومات ومراكز التكلفة والفروق وملخص الفترات؛ وفترة من غيره مخرجاتها زي ما هي",
      "ms": 195.0447,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-06: سلفة وضريبة في نفس البند — القسط بيتحسب زي الأول والضريبة بعده، والاعتماد بيتحقق من الصافي بالخصم القانوني وبيرفض اللقطة التالفة",
      "ms": 1081.8572,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-07: التأمين الصحي الشامل — ورا إعداده ولفروعه المختارة: حصة الموظف ومعاليه المؤمَّن عليهم من أجر التأمين، سطر في القسيمة، ومن غير تأمينات أو فرع مش مختار مفيش",
      "ms": 1765.3204,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-08: تقرير صندوق التدريب — سنوي بتكلفة المنشأة، ينطبق من حد العدد، لحساب بكل الفروع بس، وقراءة بس",
      "ms": 277.8179,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-pack.integration.cjs",
      "name": "SK-01: الإقلاع بيحمّل صفوف بطاقات C «محتاج تحقق» مرة واحدة، والعرض بصلاحية الإعدادات بكل المفاتيح والساري النهارده ومين بيقراها",
      "ms": 7413.5411,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-pack.integration.cjs",
      "name": "SK-02: التعديل لمدير النظام بس — صف بتاريخ جديد بخانات المفتاح، وتعديل بالمبعوت بس، و«اتأكد» والمصدر، وسطر تدقيق، والقراءة بالتاريخ الفعّال",
      "ms": 333.2952,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-pack.integration.cjs",
      "name": "SK-03: تفعيل الحسابات القانونية — لمدير النظام بس، ومرفوض وصفوفه «محتاج تحقق»، وفترة البداية، وشاشة الإعدادات العامة مابتكتبش مفاتيحه، والصف اللي بيتحسب بيه بيفضل «اتأكد»",
      "ms": 509.2014,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-pack.integration.cjs",
      "name": "SK-04: تفعيل التأمين الصحي الشامل — بفروعه المختارة من فروع مصر، والصف «اتأكد»، ومفتاح الفروع برّه الإعدادات العامة",
      "ms": 408.6978,
      "pass": true,
      "skip": false
    },
    {
      "file": "eg-salary-tax.integration.cjs",
      "name": "EG-01: مسير حقيقي — راتب 15,000 مؤمَّن عليه ← 1,482.50، والفرع السعودي برّه، والمتعيّن في نص الشهر بأيامه، وبند «مش خاضع» بيخرج من الوعاء — من غير أي كتابة",
      "ms": 9092.6144,
      "pass": true,
      "skip": false
    },
    {
      "file": "eg-salary-tax.integration.cjs",
      "name": "EG-02: الصلاحية ونطاق المسير، وموظف فرعه الحالي برّه النطاق، وشرائح مش متسجّلة للفترة",
      "ms": 91.0918,
      "pass": true,
      "skip": false
    },
    {
      "file": "suspension-paid.integration.cjs",
      "name": "PS-01: قبل ترحيل 137 الإيقاف العادي شغال وبيتخصم، و«بأجر» مش متاح وبيترفض؛ والترحيل بيضيف العمود بشكل الكيان وبيتكرر بأمان",
      "ms": 7629.9555,
      "pass": false,
      "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "cause": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس — git بيخزّن الملف LF\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\suspension-paid.integration.cjs:112:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "suspension-paid.integration.cjs",
      "name": "PS-02: الإعداد مقفول (الافتراضي) — «بأجر» مش معروض وبيترفض، وكل إيقاف بيتخصم يوم بيوم زي الأول في فرع مصري وسعودي",
      "ms": 1580.7463,
      "pass": true,
      "skip": false
    },
    {
      "file": "suspension-paid.integration.cjs",
      "name": "PS-03: الإعداد مفتوح — إيقاف «بأجر» أيامه موقوفة ومش مخصومة في المسير والتراكم اليومي، والإيقاف العادي جنبه بيتخصم — مصر والسعودية",
      "ms": 2248.8108,
      "pass": true,
      "skip": false
    },
    {
      "file": "suspension-paid.integration.cjs",
      "name": "PS-04: حد مدة الإيقاف بأجر من حزمة دولة الفرع لما صفه «اتأكد» — مصر 60 يوم والسعودية من غير حد؛ و«محتاج تحقق» مايقيّدش",
      "ms": 360.7987,
      "pass": true,
      "skip": false
    },
    {
      "file": "penalty-fine-cap.integration.cjs",
      "name": "FC-01: الإعداد مقفول (الافتراضي) — اللائحة زي ما هي في فرع سعودي ومصري، والتفعيل مرفوض و«محتاج تحقق» ومن الإعدادات العامة",
      "ms": 8589.7812,
      "pass": true,
      "skip": false
    },
    {
      "file": "penalty-fine-cap.integration.cjs",
      "name": "FC-02: الإعداد مفتوح — السعودية: جزاء أكبر من الحد مرفوض، وغرامات شهر الخصم بتتجمّع لحد الحد، وشهر تاني مسموح، والملغى برّه العدّ؛ ومصر من غير حد",
      "ms": 1110.0263,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-01: قبل ترحيل 136 الكود شغال من غير العمودين، والحفظ بقيمة ليهم بيترفض؛ والترحيل بيضيفهم بشكل الكيان وبيتكرر بأمان",
      "ms": 9608.2938,
      "pass": false,
      "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "cause": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس — git بيخزّن الملف LF\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\leave-entitlement-tiers.integration.cjs:110:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-02: من غير شرائح الرصيد زي الأول؛ بشرائح الحزمة كل موظف بياخد شريحة دولة فرعه وخدمته وسنّه — مصر والسعودية — وتفضيتها بترجّع أيام النوع",
      "ms": 197.4358,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    null,\n    {\n+     egMid: 21,\n+     egNew: 21,\n+     egOld: 21,\n+     egSenior: 21,\n+     none: 21,\n-     egMid: 25,\n-     egNew: 25,\n-     egOld: 25,\n-     egSenior: 25,\n-     none: 25,\n      notEntitled: 0,\n+     saMid: 21,\n+     saSenior: 21\n-     saMid: 25,\n-     saSenior: 25\n    }\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    null,\n    {\n+     egMid: 21,\n+     egNew: 21,\n+     egOld: 21,\n+     egSenior: 21,\n+     none: 21,\n-     egMid: 25,\n-     egNew: 25,\n-     egOld: 25,\n-     egSenior: 25,\n-     none: 25,\n      notEntitled: 0,\n+     saMid: 21,\n+     saSenior: 21\n-     saMid: 25,\n-     saSenior: 25\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    null,\n    {\n+     egMid: 21,\n+     egNew: 21,\n+     egOld: 21,\n+     egSenior: 21,\n+     none: 21,\n-     egMid: 25,\n-     egNew: 25,\n-     egOld: 25,\n-     egSenior: 25,\n-     none: 25,\n      notEntitled: 0,\n+     saMid: 21,\n+     saSenior: 21\n-     saMid: 25,\n-     saSenior: 25\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\leave-entitlement-tiers.integration.cjs:146:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-03: أقصى مرات طول الخدمة — الإجازات المعتمدة والطلبات اللي في المسار بتتعدّ، والتالتة بتترفض؛ ومن غير حد مفيش رفض",
      "ms": 457.2207,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-04: أنواع إجازات حزمة الدولة لفرع — غير مفعّلة وبأرقام الحزمة، لمصر والسعودية، ومابتتكررش، وبنطاق الحساب",
      "ms": 195.7797,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-01: الإعداد مقفول (الافتراضي) — الهوية كاملة لكل من يشوف الموظف، والآيبان مشيول عن غير المصرّح له بالمالية، ومفيش خانات مخفية",
      "ms": 9486.1962,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-02: الإعداد مفتوح — الهوية والجواز بآخر 4 خانات لغير صاحب الملف واللي بيعدّل، والآيبان مخفي لغير المصرّح له بالمالية — في الملف والقايمة وملف Excel",
      "ms": 578.4272,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-03: تصدير بيانات الموظف — ملف الموظف وكل سجلاته، بصلاحية «تعديل الموظفين» وبنطاق الفروع، وبسطر تدقيق، ومن غير بيانات دخول",
      "ms": 357.7402,
      "pass": true,
      "skip": false
    },
    {
      "file": "data-protection.integration.cjs",
      "name": "DP-01: قبل ترحيل 139 الشاشة بتقول إن السجل ناقص ومدد الاحتفاظ شغالة؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان",
      "ms": 7650.3818,
      "pass": false,
      "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "cause": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس — git بيخزّن الملف LF\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\data-protection.integration.cjs:89:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "data-protection.integration.cjs",
      "name": "DP-02: حادثة تسريب — موعد الإخطار = الاكتشاف + 72 ساعة، والعدّاد والتأخير، وخطوتي «اتبلّغت» و«اتقفلت» تحت القفل وبسطر تدقيق، ولحساب بكل الفروع",
      "ms": 253.8477,
      "pass": true,
      "skip": false
    },
    {
      "file": "data-protection.integration.cjs",
      "name": "DP-03: مدد الاحتفاظ — فاضية افتراضيًا (مفيش مهام)، وبالمدة بيتعدّ اللي عدّاها وبتتعمل مهمة مراجعة لكل فرع مرة واحدة، ومن غير أي مسح",
      "ms": 351.8783,
      "pass": true,
      "skip": false
    },
    {
      "file": "legal-entities.integration.cjs",
      "name": "LE-01: الإدارة — لحساب الشركة كلها بس، والقيم، والعملة عملة الدولة، والربط بكيان دولة الفرع، والإيقاف لكيان من غير فروع",
      "ms": 8296.0952,
      "pass": true,
      "skip": false
    },
    {
      "file": "legal-entities.integration.cjs",
      "name": "LE-02: العملة — فرع له دولة عملته زي ما هي، فرع من غير دولة بياخد عملة كيانه، وتغيير دولة الفرع بيفك كيانه القديم",
      "ms": 272.7735,
      "pass": true,
      "skip": false
    },
    {
      "file": "legal-entities.integration.cjs",
      "name": "LE-03: المسير — جديد بيجمع كيانين مرفوض، مسير لكل كيان بيتعمل، والمجمّع القايم ونسخته مابيتمنعوش وعليهم تحذير",
      "ms": 797.7397,
      "pass": true,
      "skip": false
    },
    {
      "file": "legal-entities.integration.cjs",
      "name": "LE-04: مهمة الغياب — تشغيلة واحدة بتوقيت الخادم من غير مناطق، وكيان له منطقة «أمس» بتاعه بتوقيته وبحالته وفروعه برّه العامة",
      "ms": 500.5163,
      "pass": true,
      "skip": false
    },
    {
      "file": "legal-entities-migration.integration.cjs",
      "name": "LEM-1: الملفين LF من غير BOM ومن غير عبارة ممنوعة، وأكواد THROW بتاعتهم فريدة بين كل الملفات",
      "ms": 9235.9833,
      "pass": true,
      "skip": false
    },
    {
      "file": "legal-entities-migration.integration.cjs",
      "name": "LEM-2: على قاعدة synchronize الملفين بيعدّوا من غير تغيير شكل — شكل الكيان = شكل الترحيل",
      "ms": 438.1029,
      "pass": true,
      "skip": false
    },
    {
      "file": "legal-entities-migration.integration.cjs",
      "name": "LEM-3: من غير الجدول والعمود الترحيلين بيعملوهم، والتعبئة كيان لكل دولة من بيانات الشركة وكل فرع بكيان دولته، والتكرار آمن",
      "ms": 605.1685,
      "pass": true,
      "skip": false
    },
    {
      "file": "legal-entities-migration.integration.cjs",
      "name": "LEM-4: شركة فروعها في دولة واحدة — كيانها بياخد السجل والرقم الضريبي كمان، والآيبان بدولته",
      "ms": 234.8242,
      "pass": true,
      "skip": false
    },
    {
      "file": "salary-items.integration.cjs",
      "name": "SI-01: الإقلاع بيضيف بذرة البنود مرة واحدة بترتيب القسيمة الحالي، والعرض بصلاحية الإعدادات",
      "ms": 9025.3679,
      "pass": true,
      "skip": false
    },
    {
      "file": "salary-items.integration.cjs",
      "name": "SI-02: مسير حقيقي — القسيمة وجدول المسير بترتيب الجدول، وتعديل الترتيب بيرتّب من غير ما يغيّر مبلغ، والتعديل لحساب الشركة بسطر تدقيق",
      "ms": 810.0117,
      "pass": true,
      "skip": false
    },
    {
      "file": "salary-items.integration.cjs",
      "name": "SI-03: ترحيل 135 — فحص نصي، وشكل الكيان = شكل الترحيل، ومن غير الجدول الكود شغال بالترتيب الثابت، والترحيل بيعمله والبذرة بعده، والتكرار آمن",
      "ms": 997.3043,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-migration.integration.cjs",
      "name": "SM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10393.6556,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-migration.integration.cjs",
      "name": "SM-2: المخطط القديم بموظفين قائمين — الكود شغال قبل الترحيل، والمُرحّل بيضيف العمود والجدولين من غير ما يغيّر صف، والفرق صفر",
      "ms": 4483.4393,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-migration.integration.cjs",
      "name": "SM-3: آمن للتكرار",
      "ms": 917.4244,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-country.integration.cjs",
      "name": "ES-01: الافتراضي «مطبّقة» للدولتين — التصفية والمعاينة زي ما كانوا بالحرف في فرع مصري وسعودي ومن غير دولة",
      "ms": 9489.9419,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-country.integration.cjs",
      "name": "ES-02: قفل مصر — موظف الفرع المصري من غير بند مكافأة والمعاينة بتقول ليه، والسعودي ومن غير دولة زي ما هم، والاعتماد بنفس الحكم، والقيم والصلاحية",
      "ms": 1140.0611,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-legal-minimum.integration.cjs",
      "name": "OL-01: الإعداد مقفول (الافتراضي) — معامل الشركة بالحرف في الدولتين، ومن غير لقطة حد قانوني",
      "ms": 8588.2335,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-legal-minimum.integration.cjs",
      "name": "OL-02: مفتوح — الأعلى من معامل الشركة والحد القانوني لدولة الفرع، بلقطة الحد اللي اتطبق؛ واللي معامل الشركة أعلى فيه زي ما هو بنفس البصمة",
      "ms": 1183.6945,
      "pass": true,
      "skip": false
    },
    {
      "file": "resignation-legal-terms.integration.cjs",
      "name": "RT-01: الحساب مقفول (الافتراضي) — تفاصيل طلب الاستقالة من غير بطاقة المدد في الدولتين؛ والتفعيل مرفوض وصفوفه «محتاج تحقق»",
      "ms": 9902.5845,
      "pass": true,
      "skip": false
    },
    {
      "file": "resignation-legal-terms.integration.cjs",
      "name": "RT-02: الحساب مفتوح — المدد بدولة فرع الموظف: مصر 3 شهور و10 أيام، السعودية 30 و30؛ عرض بس من غير اعتماد ولا رفض تلقائي",
      "ms": 551.5591,
      "pass": true,
      "skip": false
    },
    {
      "file": "resignation-legal-terms.integration.cjs",
      "name": "RT-03: تنبيه الحد الأدنى للأجور — موظفين فروع مصر اللي إجماليهم تحت الحد، بنطاق الحساب وبصلاحية الرواتب، وقراءة بس",
      "ms": 163.2594,
      "pass": true,
      "skip": false
    },
    {
      "file": "saudization-report.integration.cjs",
      "name": "SZ-01: نسبة السعودة لكل كيان قانوني سعودي — النشطين بس، وفروع مصر برّه، وفروع من غير كيان في مجموعة؛ ولحساب بكل الفروع بصلاحية الرواتب",
      "ms": 8043.3627,
      "pass": true,
      "skip": false
    },
    {
      "file": "saudization-report.integration.cjs",
      "name": "SZ-02: «رخصة عمل» و«توثيق العقد في قوى» في كتالوج المستندات بعد الإقلاع، وبيتسجّلوا على الموظف برقمهم وتاريخ انتهائهم",
      "ms": 32.104,
      "pass": true,
      "skip": false
    },
    {
      "file": "banks.integration.cjs",
      "name": "BK-01: قبل ترحيل 138 الشاشة بتقول إن الجدول ناقص وكشف البنك شغال من غير تنبيه؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان",
      "ms": 7900.804,
      "pass": false,
      "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "cause": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس — git بيخزّن الملف LF\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\banks.integration.cjs:104:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "banks.integration.cjs",
      "name": "BK-02: جدول البنوك — الإضافة والتعديل لحساب بكل الفروع بصلاحية الإعدادات، والدولة والكود فريدين وثابتين، ومفيش مسح",
      "ms": 171.4808,
      "pass": true,
      "skip": false
    },
    {
      "file": "banks.integration.cjs",
      "name": "BK-03: كشف البنك وشاشة الصرف — آيبان سليم كوده مش في الجدول متعلّم (السعودي والمصري)، من غير تغيير مبلغ، والتعطيل بيرجّع الدولة من غير تنبيه",
      "ms": 4.6458,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\banks.integration.cjs:31:43)\n    at sheetOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\banks.integration.cjs:46:48)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\banks.integration.cjs:152:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hijri-display.integration.cjs",
      "name": "HJ-01: الافتراضي — مقفول لكل الكيانات: كل الحسابات ميلادي بس، والإعداد مش مكتوب، والكيانات بتقول إنه مقفول",
      "ms": 7298.989,
      "pass": true,
      "skip": false
    },
    {
      "file": "hijri-display.integration.cjs",
      "name": "HJ-02: التفعيل لكيان — لحساب بكل الفروع بصلاحية الإعدادات، وبالقيم الصح، ومن مسار الكيانات بس، وبسطر تدقيق",
      "ms": 54.8839,
      "pass": true,
      "skip": false
    },
    {
      "file": "hijri-display.integration.cjs",
      "name": "HJ-03: كل حساب بفروعه — فرع في كيان مفعّل بيشوف الهجري، وفرع كيان تاني أو من غير كيان ميلادي بس، وحساب بكل الفروع لو أي كيان مفعّل",
      "ms": 170.4741,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "suspension-paid.integration.cjs",
      "name": "PS-01: قبل ترحيل 137 الإيقاف العادي شغال وبيتخصم، و«بأجر» مش متاح وبيترفض؛ والترحيل بيضيف العمود بشكل الكيان وبيتكرر بأمان",
      "ms": 7629.9555,
      "pass": false,
      "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "cause": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس — git بيخزّن الملف LF\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\suspension-paid.integration.cjs:112:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-01: قبل ترحيل 136 الكود شغال من غير العمودين، والحفظ بقيمة ليهم بيترفض؛ والترحيل بيضيفهم بشكل الكيان وبيتكرر بأمان",
      "ms": 9608.2938,
      "pass": false,
      "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "cause": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس — git بيخزّن الملف LF\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\leave-entitlement-tiers.integration.cjs:110:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-02: من غير شرائح الرصيد زي الأول؛ بشرائح الحزمة كل موظف بياخد شريحة دولة فرعه وخدمته وسنّه — مصر والسعودية — وتفضيتها بترجّع أيام النوع",
      "ms": 197.4358,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    null,\n    {\n+     egMid: 21,\n+     egNew: 21,\n+     egOld: 21,\n+     egSenior: 21,\n+     none: 21,\n-     egMid: 25,\n-     egNew: 25,\n-     egOld: 25,\n-     egSenior: 25,\n-     none: 25,\n      notEntitled: 0,\n+     saMid: 21,\n+     saSenior: 21\n-     saMid: 25,\n-     saSenior: 25\n    }\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    null,\n    {\n+     egMid: 21,\n+     egNew: 21,\n+     egOld: 21,\n+     egSenior: 21,\n+     none: 21,\n-     egMid: 25,\n-     egNew: 25,\n-     egOld: 25,\n-     egSenior: 25,\n-     none: 25,\n      notEntitled: 0,\n+     saMid: 21,\n+     saSenior: 21\n-     saMid: 25,\n-     saSenior: 25\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    null,\n    {\n+     egMid: 21,\n+     egNew: 21,\n+     egOld: 21,\n+     egSenior: 21,\n+     none: 21,\n-     egMid: 25,\n-     egNew: 25,\n-     egOld: 25,\n-     egSenior: 25,\n-     none: 25,\n      notEntitled: 0,\n+     saMid: 21,\n+     saSenior: 21\n-     saMid: 25,\n-     saSenior: 25\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\leave-entitlement-tiers.integration.cjs:146:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "data-protection.integration.cjs",
      "name": "DP-01: قبل ترحيل 139 الشاشة بتقول إن السجل ناقص ومدد الاحتفاظ شغالة؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان",
      "ms": 7650.3818,
      "pass": false,
      "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "cause": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس — git بيخزّن الملف LF\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\data-protection.integration.cjs:89:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "banks.integration.cjs",
      "name": "BK-01: قبل ترحيل 138 الشاشة بتقول إن الجدول ناقص وكشف البنك شغال من غير تنبيه؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان",
      "ms": 7900.804,
      "pass": false,
      "error": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "cause": "LF بس — git بيخزّن الملف LF\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: LF بس — git بيخزّن الملف LF\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\banks.integration.cjs:104:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "banks.integration.cjs",
      "name": "BK-03: كشف البنك وشاشة الصرف — آيبان سليم كوده مش في الجدول متعلّم (السعودي والمصري)، من غير تغيير مبلغ، والتعطيل بيرجّع الدولة من غير تنبيه",
      "ms": 4.6458,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 200\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\banks.integration.cjs:31:43)\n    at sheetOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\banks.integration.cjs:46:48)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\banks.integration.cjs:152:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_payroll_statutory_test_745a2dc9fb8dc422 is absent from sys.databases.",
    "Cleanup verified: hr_eg_salary_tax_test_42f289d709144162 is absent from sys.databases.",
    "Cleanup verified: hr_suspension_paid_test_554dea4de7d7081d is absent from sys.databases.",
    "Cleanup verified: hr_penalty_fine_cap_test_46ea1af9a5dc4ea2 is absent from sys.databases.",
    "Cleanup verified: hr_leave_tiers_test_24baeb0352b71e8d is absent from sys.databases.",
    "Cleanup verified: hr_employee_privacy_test_c67cd27f0b4bca89 is absent from sys.databases.",
    "Cleanup verified: hr_data_protection_test_f0a5c1aa464d09b9 is absent from sys.databases.",
    "Cleanup verified: hr_legal_entities_migration_test_cf2b5dc45b14e5a5 is absent from sys.databases.",
    "Cleanup verified: hr_salary_items_test_bc91d935c0707524 is absent from sys.databases.",
    "Cleanup verified: hr_statutory_migration_test_a163b966519f7a0d is absent from sys.databases.",
    "Cleanup verified: hr_eos_country_test_9a4592dc5e1045b8 is absent from sys.databases.",
    "Cleanup verified: hr_overtime_legal_test_fc5f37cd0efd12c9 is absent from sys.databases.",
    "Cleanup verified: hr_resignation_terms_test_583b9542ab5a1ad7 is absent from sys.databases.",
    "Cleanup verified: hr_saudization_test_cdd8f391279bf4d7 is absent from sys.databases.",
    "Cleanup verified: hr_banks_test_7f416469776ff819 is absent from sys.databases.",
    "Cleanup verified: hr_hijri_display_test_de0b3004452050b3 is absent from sys.databases.",
    "tests 59",
    "suites 0",
    "pass 53",
    "fail 6",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 122984.7965"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_745a2dc9fb8dc422\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_745a2dc9fb8dc422\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_statutory_pack_test_12763f3ffaa2a562\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_statutory_pack_test_12763f3ffaa2a562\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_eg_salary_tax_test_42f289d709144162\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_eg_salary_tax_test_42f289d709144162\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_suspension_paid_test_554dea4de7d7081d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_suspension_paid_test_554dea4de7d7081d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalty_fine_cap_test_46ea1af9a5dc4ea2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalty_fine_cap_test_46ea1af9a5dc4ea2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_24baeb0352b71e8d\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_24baeb0352b71e8d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_c67cd27f0b4bca89\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_c67cd27f0b4bca89\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_data_protection_test_f0a5c1aa464d09b9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_data_protection_test_f0a5c1aa464d09b9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_legal_entities_test_125f6cf7a0d5eee6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_legal_entities_test_125f6cf7a0d5eee6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_legal_entities_migration_test_cf2b5dc45b14e5a5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_legal_entities_migration_test_cf2b5dc45b14e5a5\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_salary_items_test_bc91d935c0707524\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_salary_items_test_bc91d935c0707524\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_statutory_migration_test_a163b966519f7a0d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_statutory_migration_test_a163b966519f7a0d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_eos_country_test_9a4592dc5e1045b8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_eos_country_test_9a4592dc5e1045b8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_overtime_legal_test_fc5f37cd0efd12c9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_overtime_legal_test_fc5f37cd0efd12c9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_resignation_terms_test_583b9542ab5a1ad7\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_resignation_terms_test_583b9542ab5a1ad7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_saudization_test_cdd8f391279bf4d7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_saudization_test_cdd8f391279bf4d7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_banks_test_7f416469776ff819\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_banks_test_7f416469776ff819\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_hijri_display_test_de0b3004452050b3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_hijri_display_test_de0b3004452050b3\"}\n"
  ]
}

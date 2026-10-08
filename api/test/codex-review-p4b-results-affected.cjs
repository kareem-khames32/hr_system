module.exports = {
  "selected": [
    "payroll-statutory",
    "statutory-pack",
    "overtime-legal-minimum",
    "penalty-fine-cap",
    "resignation-legal-terms",
    "leave-entitlement-tiers",
    "employee-privacy",
    "employee-export",
    "payroll-corrections",
    "payroll-approval-chain-disbursement",
    "payroll-reports",
    "leave-year-end",
    "leave-contract",
    "employment-periods"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 100,
      "failed": 0,
      "passed": 100,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 100,
      "suites": 0
    },
    "duration_ms": 159867.6128
  },
  "results": [
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-01: الإعدادين مقفولين (الافتراضي) — البند زي ما هو بالحرف: مفيش خصم قانوني ولا سطر ولا لقطة",
      "ms": 9614.282,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-02: الإعدادين مفتوحين — ضريبة 1,482.50 وصندوق الشهداء 7.50 من الصافي وبلقطتهم، وسطرين في القسيمة وجدول المسير، والسعودي زي ما هو، والاعتماد، والمعاينة بتعرض المحفوظ",
      "ms": 2441.4039,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-03: التراكمي — الشهر التاني بياخد اللي اتسجّل في الأول، والزيادة بتتسوّى، وإعادة الحساب بنفس الأرقام، وصندوق الشهداء لوحده قبل فترة بداية الضريبة",
      "ms": 1924.2435,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-04: قارئ الرصيد التراكمي — من فترة البداية وفي نفس السنة، والمسير نفسه برّه، ونفس الفترة «متعدّة»، والمعكوس صرفه والملغى برّه",
      "ms": 81.9706,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-05: التقارير بتتصالح بالخصم القانوني — كشف الرواتب والخصومات ومراكز التكلفة والفروق وملخص الفترات؛ وفترة من غيره مخرجاتها زي ما هي",
      "ms": 201.4624,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-06: سلفة وضريبة في نفس البند — القسط بيتحسب زي الأول والضريبة بعده، والاعتماد بيتحقق من الصافي بالخصم القانوني وبيرفض اللقطة التالفة",
      "ms": 1256.6725,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-07: التأمين الصحي الشامل — ورا إعداده ولفروعه المختارة: حصة الموظف ومعاليه المؤمَّن عليهم من أجر التأمين، سطر في القسيمة، ومن غير تأمينات أو فرع مش مختار مفيش",
      "ms": 2177.1162,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-08: تقرير صندوق التدريب — سنوي بتكلفة المنشأة، ينطبق من حد العدد، لحساب بكل الفروع بس، وقراءة بس",
      "ms": 330.6574,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-09 (P4A-B01): صف «محتاج تحقق» في آخر يوم المسير مابيتحسبش بيه — حتى والحساب مفعّل وصف أحدث «اتأكد»",
      "ms": 968.0633,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-statutory.integration.cjs",
      "name": "PS-10 (P4A-B02): الضريبة التراكمية بمصادر مثبتة — الاعتماد بيرفض لو مصدرها لسه محسوب أو اتلغى، وإعادة فتح مصدر مسير معتمد مرفوضة",
      "ms": 3002.6421,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-pack.integration.cjs",
      "name": "SK-01: الإقلاع بيحمّل صفوف بطاقات C «محتاج تحقق» مرة واحدة، والعرض بصلاحية الإعدادات بكل المفاتيح والساري النهارده ومين بيقراها",
      "ms": 7765.9619,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-pack.integration.cjs",
      "name": "SK-02: التعديل لمدير النظام بس — صف بتاريخ جديد بخانات المفتاح، وتعديل بالمبعوت بس، و«اتأكد» والمصدر، وسطر تدقيق، والقراءة بالتاريخ الفعّال",
      "ms": 404.496,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-pack.integration.cjs",
      "name": "SK-03: تفعيل الحسابات القانونية — لمدير النظام بس، ومرفوض وصفوفه «محتاج تحقق»، وفترة البداية، وشاشة الإعدادات العامة مابتكتبش مفاتيحه، والصف اللي بيتحسب بيه بيفضل «اتأكد»",
      "ms": 548.5161,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-pack.integration.cjs",
      "name": "SK-04: تفعيل التأمين الصحي الشامل — بفروعه المختارة من فروع مصر، والصف «اتأكد»، ومفتاح الفروع برّه الإعدادات العامة",
      "ms": 441.2561,
      "pass": true,
      "skip": false
    },
    {
      "file": "statutory-pack.integration.cjs",
      "name": "SK-05 (P4A-B01): التفعيل مرفوض وصف قديم «محتاج تحقق» — حتى لو الصف الساري النهارده «اتأكد»؛ والحاسبة مابتقراش الصف القديم",
      "ms": 246.3622,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-legal-minimum.integration.cjs",
      "name": "OL-01: الإعداد مقفول (الافتراضي) — معامل الشركة بالحرف في الدولتين، ومن غير لقطة حد قانوني",
      "ms": 9459.8379,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-legal-minimum.integration.cjs",
      "name": "OL-02: مفتوح — الأعلى من معامل الشركة والحد القانوني لدولة الفرع، بلقطة الحد اللي اتطبق؛ واللي معامل الشركة أعلى فيه زي ما هو بنفس البصمة",
      "ms": 1136.7205,
      "pass": true,
      "skip": false
    },
    {
      "file": "penalty-fine-cap.integration.cjs",
      "name": "FC-01: الإعداد مقفول (الافتراضي) — اللائحة زي ما هي في فرع سعودي ومصري، والتفعيل مرفوض و«محتاج تحقق» ومن الإعدادات العامة",
      "ms": 9150.5315,
      "pass": true,
      "skip": false
    },
    {
      "file": "penalty-fine-cap.integration.cjs",
      "name": "FC-02: الإعداد مفتوح — السعودية: جزاء أكبر من الحد مرفوض، وغرامات شهر الخصم بتتجمّع لحد الحد، وشهر تاني مسموح، والملغى برّه العدّ؛ ومصر من غير حد",
      "ms": 1082.2538,
      "pass": true,
      "skip": false
    },
    {
      "file": "resignation-legal-terms.integration.cjs",
      "name": "RT-01: الحساب مقفول (الافتراضي) — تفاصيل طلب الاستقالة من غير بطاقة المدد في الدولتين؛ والتفعيل مرفوض وصفوفه «محتاج تحقق»",
      "ms": 10084.9946,
      "pass": true,
      "skip": false
    },
    {
      "file": "resignation-legal-terms.integration.cjs",
      "name": "RT-02: الحساب مفتوح — المدد بدولة فرع الموظف: مصر 3 شهور و10 أيام، السعودية 30 و30؛ عرض بس من غير اعتماد ولا رفض تلقائي",
      "ms": 606.8712,
      "pass": true,
      "skip": false
    },
    {
      "file": "resignation-legal-terms.integration.cjs",
      "name": "RT-03: تنبيه الحد الأدنى للأجور — موظفين فروع مصر اللي إجماليهم تحت الحد، بنطاق الحساب وبصلاحية الرواتب، وقراءة بس",
      "ms": 147.8712,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-01: قبل ترحيل 136 الكود شغال من غير العمودين، والحفظ بقيمة ليهم بيترفض؛ والترحيل بيضيفهم بشكل الكيان وبيتكرر بأمان",
      "ms": 10393.3734,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-02: من غير شرائح الرصيد زي الأول؛ بشرائح الحزمة كل موظف بياخد شريحة دولة فرعه وخدمته وسنّه — مصر والسعودية — وتفضيتها بترجّع أيام النوع",
      "ms": 677.7231,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-03: أقصى مرات طول الخدمة — الإجازات المعتمدة والطلبات اللي في المسار بتتعدّ، والتالتة بتترفض؛ ومن غير حد مفيش رفض",
      "ms": 435.3042,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-04: أنواع إجازات حزمة الدولة لفرع — غير مفعّلة وبأرقام الحزمة، لمصر والسعودية، ومابتتكررش، وبنطاق الحساب",
      "ms": 189.6053,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-05 (P4A-B03): صف السنة الناقص والمُرحّل منه بشريحة دولة فرع الموظف **بعد** قفل صفه — نقل الفرع اللي اتثبّت قبل القفل هو اللي بيتحسب",
      "ms": 389.3348,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-01: الإعداد مقفول (الافتراضي) — الهوية كاملة لكل من يشوف الموظف، والآيبان مشيول عن غير المصرّح له بالمالية، ومفيش خانات مخفية",
      "ms": 10204.7162,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-02: الإعداد مفتوح — الهوية والجواز بآخر 4 خانات لغير صاحب الملف واللي بيعدّل، والآيبان مخفي لغير المصرّح له بالمالية — في الملف والقايمة وملف Excel",
      "ms": 501.7052,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-03: تصدير بيانات الموظف — ملف الموظف وكل سجلاته، بصلاحية «تعديل الموظفين» وبنطاق الفروع، وبسطر تدقيق، ومن غير بيانات دخول",
      "ms": 348.5138,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-04 (P4A-B04): طلب بتعريف سري (نوعه العام مش سري) وأي سجل اتعمل منه برّه التصدير",
      "ms": 404.9192,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-privacy.integration.cjs",
      "name": "EP-05 (P4A-B05): التصدير ماسك صف الموظف من حكم النطاق لآخر قراءة — نقل الفرع بيستنى، والتصدير اللي بعده «غير موجود»",
      "ms": 526.6177,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-01: كود البصمة تاني عمود، والأكواد والجوال والهوية نص بأصفارهم، والتواريخ زي ما هي، والأسماء بدل الأرقام",
      "ms": 8122.8192,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-02: من غير payroll.view ولا employees.edit مفيش أي عمود مالي — مش فاضي، مش موجود أصلًا",
      "ms": 29.6717,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-03: نطاق الفرع: موظف فرع تاني مابيطلعش حتى لو رقمه اتبعت، والترتيب زي الشاشة",
      "ms": 112.9093,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-04: من غير employees.view مرفوض، وقائمة فاضية أو أرقام غلط مرفوضة برسالة",
      "ms": 22.2217,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-export.integration.cjs",
      "name": "EX-05: التصدير GET (قراءة بس) ومتعرّف قبل «:id» — مش بيتقري كأنه رقم موظف",
      "ms": 0.414,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 13583.2072,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 2390.9482,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 3898.3468,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
      "ms": 3362.5333,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
      "ms": 3557.3511,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01 / CR26: إعفاء منقول لتكميلي فيه موظف اتنقل لفرع تاني — مكان النسخة من عضوية التكميلي نفسه، فقارئ ومانح الفرع القديم مايشوفوهاش ولا يلغوها، وسجلات الإعفاء والمسير مابتسمّيهاش",
      "ms": 4304.0998,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR35-B01 / CR35-N01: موانع عكس الصرف بقاعدة رؤية المسير — قسط ترحيل حجزه مسير فرع تاني بعد نقل الموظف بيتقال من غير رقمه ولا حالته لقارئ الفرع في المعاينة والإنشاء واعتماد مسير العكس، والشركة بتشوفه؛ ومسير العكس بيتبع مسيره الأصلي",
      "ms": 1978.9939,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR37-B02: تقرير الإضافي وتقرير «بلا مسير» — مسير صرف إضافي موظف اتنقل لفرع تاني ومرجع تأجيله وآخر مسير ليه من غير رقمهم ولا اسمهم ولا حالتهم ولا فترتهم لقارئ الفرع الجديد، والشركة بتشوفهم",
      "ms": 1078.4862,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR38-B01/B02: موظف اتنقل — قايمة مسيرات «بلا مسير» لقارئ الفرع الجديد زي ما هي (مسيره القديم مايظهرش)، واسم قيده من غير فترة المسير القديم، والشركة بتشوف الكل",
      "ms": 1086.264,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR40-B01/B02: موظف اتعكس صرفه واتنقل — بنود مسيره الجديد في كل شاشة (القسيمة، جدول المسير، سطور الشهر، مراجعة الاعتماد، شاشة المسير، السجل المالي) من غير فترة مسيره القديم لقارئ الفرع الجديد، وبصمة المفتاح مابتتفكّش، والشركة وصاحب القسيمة بيشوفوا النص كامل",
      "ms": 2226.0021,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR41: كل موظف بفترات مسيراته هو — مسير مختلط اتعكس لموظفين، واحد منهم اتنقل: نص زميله المرئي بيفضل كامل لقارئ الفرع، ورقم موظف في رابط القسيمة مابيغيرش ردها",
      "ms": 2791.8867,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 9867.577,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 184.8525,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 3674.066,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 3866.4741,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 856.9033,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 828.8096,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 644.213,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 562.5017,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 455.5985,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 133.8541,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "runs report lists runs without a branch, keeps cancelled runs out of totals, and scopes branch users by member snapshot",
      "ms": 13076.5566,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "detailed payroll reports require payroll.view on top of reports.view",
      "ms": 56.9635,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "unassigned report lists every on-job employee outside a run with a reason, and changes nothing",
      "ms": 478.0708,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "overtime report shows amounts with their source; rejected rows are zero and outside the total",
      "ms": 150.1603,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "loans report reconciles paid + remaining = principal, shows installment n of m, aging and after-service balances",
      "ms": 99.0221,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "variance report explains each employee difference by component and isolates unexplained residuals",
      "ms": 63.5206,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "month totals are one number in the payroll month report, the variance report and the financial payroll register",
      "ms": 1354.6491,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "a suspended employee is derived from the suspension periods: real reason, real count, and the checkbox filters",
      "ms": 322.8357,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-reports.integration.cjs",
      "name": "accepted filters are applied: teamId on the financial reports and branchId on the attendance report",
      "ms": 147.5505,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 9068.8662,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 102.2663,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 168.8584,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 277.1809,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 88.1511,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 7998.4888,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 584.0444,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 67.4685,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 155.5627,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 259.9945,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 113.603,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 188.6047,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 198.8806,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 241.3901,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 47.2031,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 458.1932,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 170.0736,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 191.5459,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 25.1191,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 78.6768,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-01: الإرجاع القديم — موظف ملفه مُصفّى بيرجع بسبب مكتوب بس والسبب في سجله، ومن غير تصفية زي ما هو",
      "ms": 8398.6259,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-02: إعادة تعيين بعد سنة — الفترة القديمة اتسجّلت، والمكافأة والرصيد ومعاينة التصفية زي موظف جديد بنفس التاريخ، والمسير والحضور من تاريخ المباشرة",
      "ms": 520.0437,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-03: الرفض — مش منتهي، من غير ملف مقفول، ملف مفتوح أو مجهول، أكتر من نهاية، تاريخ أو سبب غلط، بدري أو بعيد، ومن غير الصلاحية أو برّه النطاق",
      "ms": 719.44,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-04: المسير — المباشرة بعد شهر الرواتب اللي فيه آخر يوم عمل، ومسير الشهر ده معتمد والموظف فيه، ومسير قديم لسه مااتعتمدش بيمنع",
      "ms": 813.7454,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-05: رصيد الإجازات بعد إعادة التعيين — إجازة قديمة بتتلغى مابترجعش على الرصيد الجديد، والترحيل والإقفال والتجديد مابيشوفوش صفوف الفترة المقفولة",
      "ms": 1227.1762,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-06: إعادة تعيين تانية بتقفل الفترة التانية بمفتاحها، وطلبين في نفس اللحظة واحد بس بينجح",
      "ms": 1885.2138,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-07: إجازة معتمدة بعد آخر يوم عمل بتمنع إعادة التعيين لحد ما تتلغى، وتاريخ جوه فترة مقفولة مالوش خصم، والخصم والإرجاع مابيستنوش صف موظف ممسوك",
      "ms": 417.6283,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-08: الترحيل السنوي والتجديد اليومي بيحكموا ويكتبوا وصف الموظف ممسوك — مُرحّل الفترة القديمة مايوصلش لرصيد الجديدة",
      "ms": 5108.5478,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-09: حساب المسير بيحكم على موظفيه ببيانات اتقرت بعد قفل المالية — إعادة تعيين اتثبّتت قبل القفل مابتتحسبش بحكم قديم",
      "ms": 364.6545,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-10: مرجع مسير مخفي عن القارئ مابيظهرش في قراءة الفترات ولا في رفض إعادة التعيين — لا شهره ولا نهايته",
      "ms": 257.6074,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-11: أثر تعديل الملف على الرصيد جوه معاملة التعديل وتحت صف الموظف — رصيد افتتاحي من الخدمة القديمة مابيوصلش للفترة الجديدة",
      "ms": 5142.985,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-12: فحص الرصيد مابيكتبش صف، وصفوف السنة الناقصة تحت صف الموظف — صف بمفتاح ذكرى تعيين قديمة مابيتكتبش بعد إعادة التعيين",
      "ms": 2266.0678,
      "pass": true,
      "skip": false
    },
    {
      "file": "employment-periods.integration.cjs",
      "name": "EP-13: معالج طلب بيحفظ كيان الموظف كله بيقراه وصفه مقفول — اعتماد طلب قديم عبر إعادة التعيين مابيرجّعش تاريخ التعيين القديم",
      "ms": 1686.5957,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_payroll_statutory_test_bfa6b183bf968759 is absent from sys.databases.",
    "Cleanup verified: hr_overtime_legal_test_fdb021cc7eeda9e8 is absent from sys.databases.",
    "Cleanup verified: hr_penalty_fine_cap_test_2a2c230c3d15cc57 is absent from sys.databases.",
    "Cleanup verified: hr_resignation_terms_test_d9f33ac5b66da56f is absent from sys.databases.",
    "Cleanup verified: hr_leave_tiers_test_6e01d2efea9bdc29 is absent from sys.databases.",
    "Cleanup verified: hr_employee_privacy_test_dff4e5d3e3b1e769 is absent from sys.databases.",
    "Cleanup verified: hr_employee_export_test_a235292662437a35 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_corrections_test_12e743c70e9bb6e4 is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_57f7a5ace24a45e1 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_reports_test_991c70d5ab4363e2 is absent from sys.databases.",
    "Cleanup: hr_leave_year_end_test_00ca93323fe125cf dropped.",
    "Cleanup verified: hr_employment_periods_test_db73c0e579a81a67 is absent from sys.databases.",
    "tests 100",
    "suites 0",
    "pass 100",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 159867.6128"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_statutory_test_bfa6b183bf968759\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_statutory_test_bfa6b183bf968759\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_statutory_pack_test_f9cda1959a99cab0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_statutory_pack_test_f9cda1959a99cab0\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_overtime_legal_test_fdb021cc7eeda9e8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_overtime_legal_test_fdb021cc7eeda9e8\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_penalty_fine_cap_test_2a2c230c3d15cc57\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_penalty_fine_cap_test_2a2c230c3d15cc57\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_resignation_terms_test_d9f33ac5b66da56f\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_resignation_terms_test_d9f33ac5b66da56f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_6e01d2efea9bdc29\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_6e01d2efea9bdc29\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_privacy_test_dff4e5d3e3b1e769\"}\n",
    "✓ أنواع الطلبات: 73 جديد + 70 سلسلة مخصّصة (الإجمالي 73)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_privacy_test_dff4e5d3e3b1e769\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_export_test_a235292662437a35\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_export_test_a235292662437a35\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_corrections_test_12e743c70e9bb6e4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_corrections_test_12e743c70e9bb6e4\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_57f7a5ace24a45e1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_57f7a5ace24a45e1\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_reports_test_991c70d5ab4363e2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_reports_test_991c70d5ab4363e2\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_year_end_test_00ca93323fe125cf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_year_end_test_00ca93323fe125cf\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_d24d6e04479fd240\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_d24d6e04479fd240\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employment_periods_test_db73c0e579a81a67\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employment_periods_test_db73c0e579a81a67\"}\n"
  ]
}

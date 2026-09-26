module.exports = {
  "selected": [
    "codex-review-round4-adapted-request-race",
    "codex-review-round4-adapted-domain",
    "codex-review-round4-adapted-loans",
    "roles-scope-presets",
    "security-role-grants",
    "payroll-compensation",
    "payroll-corrections",
    "payroll-policy-settings",
    "payroll-policy-definitions",
    "payroll-run-salary-period",
    "employee-suspension",
    "codex-review-round2-all-leave-types",
    "payroll-night-shift",
    "payroll-overtime-request",
    "payroll-allowances",
    "payroll-deduction-waivers",
    "payroll-attendance-exemption",
    "payroll-run-membership-moves"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 246,
      "failed": 0,
      "passed": 212,
      "cancelled": 0,
      "skipped": 34,
      "todo": 0,
      "topLevel": 246,
      "suites": 0
    },
    "duration_ms": 286422.1443
  },
  "results": [
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 4899.2945,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 76.232,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 55.249,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 59.0023,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 56.2062,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 82.8674,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 35.8886,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 35.1433,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "A1 — المفتاح مبذور مقفول، ومسار البريد+كلمة المرور بيرجّع جلسة كاملة بلا أي رمز",
      "ms": 4977.5619,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "A2 — والتحقق مقفول: مسار حساب الشركة كمان بيرجّع جلسة كاملة على طول (وبيعمل الحساب ويربطه)",
      "ms": 93.8362,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "A3 — بيانات غلط في المسارين مرفوضة برسالة عربية بلا أي تفصيل عن مصدر الفشل",
      "ms": 103.8633,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "B1 — التحقق مفتوح: مسار البريد+كلمة المرور بيرجّع حالة معلَّقة بلا توكن، والرمز على البريد",
      "ms": 139.7618,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "B2 — الرمز الصح بيفتح الجلسة، والحمولة فيها كل ما كانت فيه (نفس مطالبات النهاردة)",
      "ms": 194.7913,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "B3 — ومسار حساب الشركة كمان: مفيش جلسة قبل الرمز، والرمز على بريد AD مش على نسختنا",
      "ms": 131.546,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C1 — رمز غلط: رفض برسالة عربية بعدد المحاولات الباقية، ومفيش جلسة، والعدّاد بيزيد",
      "ms": 240.1408,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C2 — حد المحاولات: 5 غلط بيقفلوا الطلب، والرمز الصح بعدها مايفتحش جلسة",
      "ms": 395.1744,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C3 — الرمز مرة واحدة: إعادة استخدام نفس الرمز مرفوضة برسالة «استُخدم قبل كده»",
      "ms": 182.7113,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C4 — الرمز المنتهي مرفوض (حتى لو صح) ومفيش جلسة",
      "ms": 108.6079,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C5 — توكن معلَّق مش معروف مرفوض، والرمز بشكل غلط مرفوض من التحقق قبل أي قراءة",
      "ms": 3.022,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C6 — إعادة الإرسال: مرفوضة قبل المهلة، ومسموحة بعدها برمز جديد يُبطل القديم، وبحد أعلى",
      "ms": 345.5581,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C7 — المحاولات الغلط مابتتصفّرش بإعادة الإرسال (وإلا الحد بيتخطى)",
      "ms": 332.2368,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "C8 — دخول جديد بيقفل الحالة المعلَّقة القديمة لنفس الحساب (الرمز مربوط بمحاولة واحدة)",
      "ms": 289.8734,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D1 — خادم البريد واقع: الدخول مرفوض 503 برسالة عربية بالسبب، ومفيش جلسة ولا حالة معلَّقة",
      "ms": 64.4313,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D2 — خادم البريد رفض العنوان: نفس الرفض، والرسالة مش «بيانات غلط» (السبب الحقيقي ظاهر)",
      "ms": 50.6403,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D3 — البريد مش مضبوط أصلًا والتحقق مفتوح: رفض برسالة بتقول اضبط SMTP أو اقفل التحقق",
      "ms": 51.6264,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "D4 — فشل إعادة الإرسال: رفض 503، والرمز القديم يفضل صالح، والمهلة بتتحسب برضه",
      "ms": 223.5588,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "E1 — خادم الدليل مش راد: رفض 503 برسالة عربية بتقول جرّب البريد وكلمة المرور، ومفيش جلسة",
      "ms": 0.8212,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "E2 — حساب متوقف في المجال: رفض 401 برسالة «متوقف»، ومفيش حساب بيتعمل عندنا",
      "ms": 9.2335,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "E3 — كلمة مرور فاضية في مسار حساب الشركة مرفوضة من التحقق (الربط المجهول مايوصلش للدليل)",
      "ms": 0.8243,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "F1 — حساب مجال بلا موظف مطابق: رفض برسالة عربية واضحة، ومفيش حساب ولا موظف بيتعمل",
      "ms": 14.662,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "F2 — موظف أرشيف: رفض برسالة «أرشيف أو خدمته منتهية» ومفيش حساب بيتعمل",
      "ms": 7.3239,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "G1 — المطابقة بخاصية employeeID لما البريد في AD مش بريد الموظف عندنا",
      "ms": 75.2817,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "G2 — حساب قائم لنفس الموظف يُربط ولا يتعمل حساب تاني، والكلمة القديمة تفضل شغّالة",
      "ms": 77.2031,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "G3 — الدخول التاني بحساب المجال بيستخدم نفس الحساب (الربط بالـobjectGUID مش بالبريد)",
      "ms": 27.9411,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H1 — «لازم يغيّر كلمة المرور المؤقتة» بتعدّي التحقق بخطوتين سليمة",
      "ms": 241.0562,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H2 — الحساب اتعطّل بين إرسال الرمز والتحقق منه: مفيش جلسة",
      "ms": 220.8333,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H3 — tokenVersion لسه بيبطّل التوكن الصادر من التحقق بخطوتين",
      "ms": 343.31,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H4 — حساب معطّل مايوصلش لخطوة الرمز أصلًا (ومفيش بريد بيتبعت له)",
      "ms": 58.5991,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "H5 — تغيير كلمة المرور من داخل الجلسة مش محتاج رمز تاني (الجلسة متحقَّقة أصلًا)",
      "ms": 534.2309,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "I1 — فتح التحقق من الإعدادات مرفوض وخادم البريد مش مضبوط، ومقبول لما يتضبط",
      "ms": 110.4287,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "I2 — حالة الأمان للشاشة: بتقول مفتوح/مقفول ومضبوط/مش مضبوط بلا أي سر، ومحجوبة عن غير المخوَّل",
      "ms": 120.8352,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "I3 — الفحص الذاتي: بيرجّع رد خادم البريد بالحرف عند النجاح وسببه عند الفشل، ومفيش حالة معلَّقة",
      "ms": 65.1428,
      "pass": true,
      "skip": false
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "K1 — مفتاح الطوارئ: node scripts/two-factor-off.cjs بيقفل التحقق فعلًا وبلا إعادة تشغيل",
      "ms": 0.0833,
      "pass": true,
      "skip": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "K2 — سكربت فحص البريد بيقرأ نفس إعداد الخادم ويقول بالاسم إيه الناقص",
      "ms": 0.0441,
      "pass": true,
      "skip": true
    },
    {
      "file": "domain-login-two-factor.integration.cjs",
      "name": "J1 — ترحيل 066 إضافي وآمن للتكرار وبأسماء TypeORM، وفرق المخطط صفر بعده",
      "ms": 1106.998,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 5360.1532,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 313.7147,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 94.9989,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 193.8028,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 52.1799,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 61.2665,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 250.2739,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "migration 064 through the real migrator: adds the column, inserts missing roles, trims only rows that still equal the shipped preset, kills only changed sessions, and re-runs change nothing",
      "ms": 8849.249,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "migration 064 on a production-shaped database: SQL Server 2019 compatibility level and a database collation that differs from tempdb",
      "ms": 507.1135,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "customised rows: the screen shows exactly what differs from the approved bundle, the row keeps its old power until fixed, and resetting it to the shipped preset lets the migration trim it",
      "ms": 224.2193,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول الأصول: registers assets, hands custody over, receives it back and transfers it — and gets 403 on money, employee files, attendance, requests and settings",
      "ms": 288.086,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "approve.custody finally has a carrier: the asset officer decides the «أمين العهدة» step end to end; the HR officer and the read-only role cannot decide anything",
      "ms": 265.3637,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول موارد بشرية: reads every HR module of his branch and cannot edit, cancel, approve or do anything an HR manager does",
      "ms": 316.6528,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول صرف الرواتب: sees payroll runs and carries the disbursement permission — cannot calculate, approve, pay, reopen, cancel or touch any other module",
      "ms": 147.4567,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "trimmed presets behave: payroll_manager calculates but never approves or pays; read_only reads and never writes or opens the bank sheet; data_entry edits and never archives",
      "ms": 122.2192,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "«نطاقه: كل الفروع»: entity → JWT → guard. On = every branch and company-wide writes WITH the permission, refused WITHOUT it; off = own branch; the token dies on every change",
      "ms": 226.5621,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "only the super admin grants it: an HR manager cannot switch it on or off, cannot create an account with it, and cannot manage an account that has it",
      "ms": 141.8098,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "fail-closed stays: a legacy account with no branch still sees nothing and writes nothing company-wide, whatever permissions it carries",
      "ms": 101.7687,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "permissions screen API: the whole registry with module, description and carriers; orphans flagged; copy a role; effective = role ∪ grants − revokes",
      "ms": 181.1057,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-role-grants.integration.cjs",
      "name": "SEC2 migrations: least-privilege grants, append-only, sessions of changed roles only; replay and re-run change nothing",
      "ms": 8068.6636,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-role-grants.integration.cjs",
      "name": "SEC2 HTTP: hr_manager reopens and cancels with a reason; payroll officer and branch manager cannot; executive exemption approval and re-granting stay with super_admin",
      "ms": 340.7124,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: all six independent components appear once in the full salary, SQL snapshot and HTTP payslip",
      "ms": 5418.1044,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ F1: HTTP employee creation accepts phone and work nature without manufacturing otherAllowance",
      "ms": 683.1165,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ F2/F3: HTTP phone-only updates and zeroing both split allowances preserve independent OTHER",
      "ms": 2001.3103,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: OTHER equal to PHONE plus WORK_NATURE is still independent money and is not deduplicated",
      "ms": 1035.9396,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ / PR-06: swapping PHONE and OTHER with the same gross is captured as a changed employee in recalculation audit",
      "ms": 1009.2966,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ / PR-10: joining July 1 prorates all six components by 22/30 while monthly day/hour rates stay whole",
      "ms": 500.7758,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: partial salary still uses all six full-month components for one absence, 48 late minutes and one overtime hour",
      "ms": 582.6569,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ / PR-10: eighteen days in a 31-day cycle use /30; complete 31- and 28-day cycles earn every full component",
      "ms": 1251.517,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥ / PR-10: six half-cent components reconcile to gross without a duplicate or lost rounding adjustment",
      "ms": 253.0258,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: approved member snapshot and employee payslip keep original component values after later salary edits",
      "ms": 1383.0878,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: null PHONE/WORK_NATURE plus genuine OTHER remain six explicit lines without guessing or rewriting legacy values",
      "ms": 461.4663,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: HTTP settlement preview and saved EOS agree with the payroll gross for all six independent components",
      "ms": 599.3028,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-compensation.integration.cjs",
      "name": "SPEC⑥: invalid negative PHONE or WORK_NATURE is rejected over HTTP without changing stored compensation or payroll",
      "ms": 569.6822,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 11827.4559,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 2854.645,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 4214.7034,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: bootstrap inserts thirteen new defaults while preserving a value present before startup",
      "ms": 4837.3568,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: config PATCH accepts every new enum, precise numeric limit, nullable sentinel and boolean",
      "ms": 496.6004,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: config PATCH rejects invalid enums, fractions, precision loss, null misuse and nonliteral booleans atomically",
      "ms": 252.6274,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: all eighteen defaults are captured once and future config changes cannot rewrite or reinterpret a version",
      "ms": 342.1275,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: explicit full settings retain cycle, percentages, currency and all rounding precision through full reads and audit",
      "ms": 128.2396,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: partial patches merge against persisted settings and preserve all omitted fields including nullable floors",
      "ms": 104.1557,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: contradictory period and cycle states reject atomically while coherent transitions persist",
      "ms": 220.5385,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: invalid numbers, forbidden formulas, null cores and forged settings reject without truncation or mutation",
      "ms": 278.4636,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: legacy all-null metadata, dates and clone stay missing even when live defaults become corrupt",
      "ms": 187.9468,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: missing and partially corrupt historical settings require explicit full initialization without erasing source values",
      "ms": 349.0982,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: INVALID partial historical settings remain exact through metadata, date and clone with corrupt live defaults",
      "ms": 180.0206,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: ACTIVE, frozen and ARCHIVED copy on write preserves every original field and copies all eighteen settings",
      "ms": 233.2058,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: explicit initialization of a frozen legacy version creates a complete draft and preserves the missing original",
      "ms": 127.6559,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: branch and wildcard access cannot modify global or foreign version settings",
      "ms": 138.719,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: concurrent partial settings revisions commit one coherent snapshot and one audit event",
      "ms": 102.4788,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-settings.integration.cjs",
      "name": "PL-01 settings: audit insert failure atomically rolls back settings creation, update, initialization and copy on write",
      "ms": 177.036,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: empty historical definition remains MISSING without fabricated catalog, engine or system component",
      "ms": 5108.4359,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: full definition saves all eight sources, parameters and tiers atomically and freezes catalog markers",
      "ms": 271.8613,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: SQL decimal storage and HTTP round trips preserve monetary cents and six-place values beyond Number precision",
      "ms": 237.0322,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: replacing a complete draft persists only the new full collection and preserves financial sources",
      "ms": 369.4621,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: branch/global ownership and genuine JWT permissions separate read validation from definition writes",
      "ms": 419.9559,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: forged fields, partial collection, irrelevant source fields and invalid exact decimals reject before any replacement",
      "ms": 583.7158,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03 and LT-04: gaps, overlap, missing open end and disabling a required tier reject the whole snapshot",
      "ms": 398.0596,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: concurrent full replacements serialize by version revision and emit only the winning definition event",
      "ms": 394.0146,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "LT-04: a decreasing bracket requires current hashed acknowledgements and records the accepted warning with the reason",
      "ms": 298.8096,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: explicit full settings and full definition initialize a missing legacy draft in one atomic revision",
      "ms": 240.7529,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "LT-04: settings may remove a prior warning, but reintroducing it requires candidate preview and atomic acknowledged save",
      "ms": 419.503,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: ACTIVE, frozen and ARCHIVED saves copy all children and remap relationships without rewriting source rows",
      "ms": 1178.6502,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: full clone and settings copy on write preserve all definition fields, catalog markers and exact decimal strings",
      "ms": 542.923,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: settings changes revalidate stored formula rounding atomically while metadata edits retain definition children",
      "ms": 362.0029,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: audit event failure rolls back deletion and reinsertion and every new child of copy on write",
      "ms": 952.6548,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: full-settings and SRS requirements reject save or preview without inventing historical settings or catalog stamps",
      "ms": 343.9878,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03: archived identity remains readable and previewable but cannot accept a replacement definition",
      "ms": 291.4065,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-policy-definitions.integration.cjs",
      "name": "PL-03 and PL-06: dependencies from base, condition, tier input and parameters protect the final full collection; auto-order saves only a valid proposal",
      "ms": 648.7594,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13: 9,000 ثم 10,000 من سبتمبر — أغسطس بعد الزيادة 9,000، وسبتمبر 10,000 ويبقى 10,000 بعد زيادة أكتوبر ثم يُعتمد",
      "ms": 7099.0452,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13: الاعتماد يقارن راتب شهر المسير نفسه — زيادة شهر لاحق أو تصحيح شهر آخر لا يوقفه، وتغيير عملة أو مبلغ الشهر نفسه يوقفه",
      "ms": 2026.2274,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13: إنشاء الموظف يوثّق أجر التعيين «يسري من راتب شهر» فيدخل أول مسير بلا توثيق منفصل؛ الحدود والعملة تُفحص قبل الحفظ",
      "ms": 978.4746,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13 / LOT-15: يوم إضافي في أغسطس يُعتمد بعد زيادة سبتمبر يُسعّر على 9,000، ويوم 23 أغسطس يتبع راتب سبتمبر",
      "ms": 106.6631,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 13: بلا دليل لشهر المسير يُستبعد الموظف بسبب ظاهر ولا يُوقف المسير؛ الوضع الانتقالي يوسم راتب الملف «غير موثق»",
      "ms": 3191.8167,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 14: دورة 31 — اعتماد فبراير لا يمنع مارس (لا PAYRUN-DUP-002)، وتغيير الدورة يُظهر الفجوة على المسير",
      "ms": 2865.693,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "قاعدة المالك: ملتحق في اليوم العاشر من الدورة — التغطية من تاريخ التعيين، لا غياب ولا خصم قبله، والتناسب 22/30 (الشهر 30 يومًا)",
      "ms": 1126.8583,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-salary-period.integration.cjs",
      "name": "الخطوة 9 (مسار R2): راتب صفري — من السجل الشهري أو من الملف في الوضع الانتقالي — يُستبعد NO_SALARY_DEFINED ولا يدخل بصافي صفر",
      "ms": 893.9451,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية بطول الجنسية وفريدة، ورقم البصمة فريد",
      "ms": 5416.3231,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو تغيير الجنسية المخالف أو «موقوف» بلا تواريخ مرفوض",
      "ms": 91.7495,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 324.6906,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 303.4882,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 917.7263,
      "pass": true,
      "skip": false
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية",
      "ms": 8402.7364,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين",
      "ms": 0.1035,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام",
      "ms": 0.056,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر",
      "ms": 0.044,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L5 — إجازة مرضية بأجر متدرج (شرائح النوع)",
      "ms": 0.0541,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة",
      "ms": 0.033,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع",
      "ms": 0.0409,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع",
      "ms": 0.0366,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر",
      "ms": 0.0651,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة",
      "ms": 0.055,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها",
      "ms": 0.0322,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها",
      "ms": 0.0295,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق",
      "ms": 0.0245,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة",
      "ms": 0.0221,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف",
      "ms": 0.0256,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا",
      "ms": 0.0265,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "R6 — أنواع المال القديمة مقفولة ببابها الصحيح",
      "ms": 0.0231,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة",
      "ms": 0.0372,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر",
      "ms": 0.0274,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد",
      "ms": 0.023,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف",
      "ms": 0.0208,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما",
      "ms": 0.0218,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)",
      "ms": 0.021,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة",
      "ms": 0.0213,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف",
      "ms": 0.0208,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين",
      "ms": 0.0214,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»",
      "ms": 0.0192,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة",
      "ms": 0.0199,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي",
      "ms": 0.0222,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ",
      "ms": 0.0204,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط",
      "ms": 0.0201,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "ZZ — ملخص الملاحظات",
      "ms": 0.0209,
      "pass": true,
      "skip": true
    },
    {
      "file": "fulltest-leaves-payroll.integration.cjs",
      "name": "CR2 all eleven leave codes through named two-step chain and paid payroll",
      "ms": 5630.6876,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-night-shift.integration.cjs",
      "name": "ليلة 12 (20:00 ← 01:00): الساعات والتأخير والنقص ليوم 12، وبصمة 00:50 لا تدخل يوم 13",
      "ms": 6982.3629,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-night-shift.integration.cjs",
      "name": "غياب ليلة 12 يُسجل ليوم 12 وحده، وليلة 13 المكتملة لا ترث منه شيئًا",
      "ms": 886.5572,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-night-shift.integration.cjs",
      "name": "ليلة آخر يوم في فترة الرواتب (22 أغسطس) تبقى في مسير أغسطس، ومسير سبتمبر (23/8–22/9) يبدأ بليلة 23 نظيفة",
      "ms": 1317.377,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
      "ms": 5158.1027,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
      "ms": 726.2459,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
      "ms": 888.2047,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
      "ms": 597.0833,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
      "ms": 514.4482,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
      "ms": 1131.4387,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
      "ms": 545.7252,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
      "ms": 627.7382,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
      "ms": 331.4565,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
      "ms": 445.5913,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
      "ms": 478.6062,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
      "ms": 598.6161,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
      "ms": 512.9544,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
      "ms": 392.0684,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
      "ms": 978.8885,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
      "ms": 1226.3999,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
      "ms": 710.0473,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
      "ms": 440.6951,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
      "ms": 611.3694,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
      "ms": 479.7948,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
      "ms": 457.6437,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
      "ms": 778.4769,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
      "ms": 1212.2029,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
      "ms": 941.1936,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
      "ms": 388.1026,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
      "ms": 656.8972,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
      "ms": 777.0172,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
      "ms": 772.1504,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
      "ms": 359.6631,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
      "ms": 749.5185,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
      "ms": 1652.2503,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
      "ms": 1466.5036,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 2068.7088,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
      "ms": 1157.1649,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
      "ms": 3574.6993,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
      "ms": 1561.8087,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
      "ms": 518.7536,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1384.1368,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
      "ms": 1949.0671,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
      "ms": 326.3187,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
      "ms": 558.5279,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
      "ms": 782.889,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
      "ms": 352.2226,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
      "ms": 675.6527,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
      "ms": 1169.5113,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
      "ms": 2700.7854,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
      "ms": 916.7383,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
      "ms": 599.3333,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
      "ms": 2188.723,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
      "ms": 922.8792,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
      "ms": 3319.5121,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
      "ms": 1797.9517,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
      "ms": 341.1622,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
      "ms": 1742.4897,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
      "ms": 21.9942,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
      "ms": 2086.8549,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
      "ms": 1959.2871,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز",
      "ms": 4874.1892,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع",
      "ms": 2140.9816,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز",
      "ms": 891.2354,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "بدل على الشركة كلها: حساب الفرع يشوف عدد سطور فرعه بس (مش عدد الشركة)، ومفيش «اتلغى منه» من سطور فروع تانية",
      "ms": 117.8126,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-deduction-waivers.integration.cjs",
      "name": "شيل خصم على فريق: يتطبق عند الحساب على الفريق بس، والتبويبات بتعرضه، والإلغاء + إعادة الحساب يرجّعه، وعزل الفرع",
      "ms": 6630.7424,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-deduction-waivers.integration.cjs",
      "name": "شيل أقساط السلف لموظف: القسط ما يتخصمش ويفضل مستحق، والمسير يتعتمد بخطة الأقساط المشالة",
      "ms": 872.5209,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-10: full-month exemption defeats stale absence/95-minute lateness and new absence generation but retains a 500 quality debit",
      "ms": 5696.315,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-12: four approved unpaid days still deduct 2000 from an exempt employee",
      "ms": 701.1229,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-10: a 2000 loan installment and 400 documented quality debit remain payable and consumed normally",
      "ms": 927.9058,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: June 16–30 exempts 15 days; only June 8 absence and June 3 forty-minute lateness are deducted",
      "ms": 657.55,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: exemption boundaries are inclusive for a single day and for a last working day at period end",
      "ms": 1237.3942,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: terminating a window from June 16 restores attendance deductions on June 16 itself",
      "ms": 594.7912,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-09: a pending exemption has no financial effect before approval",
      "ms": 593.01,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: a new exempt hire receives 13/30 of 19000 in a 31-day cycle (the month is 30 days)",
      "ms": 422.4059,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11: default-ineligible overtime is excluded from source claims and is neither deleted nor consumed at payroll payment",
      "ms": 849.7009,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11: individual eligibility pays only a genuine approved PRE_REQUESTED entry, never biometric or missing/rejected requests",
      "ms": 826.1934,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-12: an explicit unpaid-leave override preserves four approved leave days without deducting them",
      "ms": 602.9874,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 / EX-12: null overrides inherit company defaults while explicit false/true override them",
      "ms": 1201.2504,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-14: dashboard stats, weekly trend and departments exclude a stale absent exemption from attendance ratios without rewriting it",
      "ms": 235.617,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 request: direct OVERTIME submission by an ineligible exempt employee is rejected without a request or overtime orphan",
      "ms": 93.0503,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 request: approved explicit overtime executes without punches and a changed eligibility decision blocks final approval atomically",
      "ms": 543.3174,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-membership-moves.integration.cjs",
      "name": "(أ) «أضفهم لمسير…» من تبويب بلا مسير: عضوية دائمة، التبويب يفضى، ومسير الشهر الجديد بينسخها",
      "ms": 6563.5707,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-membership-moves.integration.cjs",
      "name": "(ب) «نقل لمسير آخر» من شهر مختار ورايح: الشهر المعتمد قبله وبعده ما يتغيرش",
      "ms": 535.1847,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-membership-moves.integration.cjs",
      "name": "(ج) «شيل خصم» لموظف واحد من مسار شاشة المسير: البند يختفي والصافي يزيد بمقداره",
      "ms": 499.7598,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_domain_2fa_test_add8458e7b110a0f is absent from sys.databases.",
    "collation db=Arabic_100_CS_AS tempdb=SQL_Latin1_General_CP1_CI_AS compatibility=150",
    "Cleanup verified: hr_roles_collation_test_36e4944dc67322da removed.",
    "مسارات /payroll/disbursement موجودة — اتفحص حارس payroll.disburse عليها",
    "Cleanup verified: hr_roles_scope_test_49b46b5e2f71e944 removed.",
    "Cleanup verified: hr_sec2_roles_test_9f87910c284fa742 removed.",
    "Manual: 6000 + 1500 + 500 + 300 + 200 + 100 = 8600; the five allowances total 2600.",
    "Manual: 8600 × 22 / 30 = 6306.666… cut to 6306.66 (money is truncated to 2 decimals); daily basis remains 8600 / 30 = 286.666… and hourly basis 35.833….",
    "Manual (truncated to 2 decimals): 6306.66 − 286.66 − 28.66 + 53.75 = 6045.09. Rates use 8600, not the partial gross.",
    "Manual: 8600 × 18/30 = 5160, even in a 31-day cycle; a complete 31-day or 28-day cycle pays 8600.",
    "Manual EOS agreement: 2024-07-23 → 2026-07-22 = 2 years; 2 × 0.5 × full gross 8600 = 8600; the last-month salary line = run item net 8600.",
    "Cleanup verified: hr_payroll_comp_test_04a919d3bb778453 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_payroll_corrections_test_d5aa1d695cd313df is absent from sys.databases.",
    "Cleanup verified: hr_payroll_policy_settings_test_a22dd070d10d37c4 is absent from sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_payroll_policy_definitions_test_436c4e336dbdce1d is absent from sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "أغسطس 9,000 قبل وبعد الزيادة؛ سبتمبر 10,000 قبل وبعد زيادة أكتوبر ثم اعتُمد",
    "EGP لمارس → 409؛ 10,500 لمارس → 409؛ مراجعة 4 (زيادة أبريل + تصحيح فبراير) ومارس 10,000 → 201 بلا إعادة حساب",
    "إنشاء بتعيين 2026-09-23: مراجعة شهرية 1 من 2026-10 ومشمول في المسير بـ6,000+1,000؛ القديم افتراضيًا من 2026-10؛ الرفض يرجّع الملف",
    "فبراير 31/1→28/2 معتمد، مارس 1/3→30/3 محسوب ومعتمد بلا تعارض، وفجوة 31 مارس ظاهرة على مسير أبريل",
    "ملتحق 1 أغسطس (اليوم العاشر): 9000×22/30=6600 على أساس 30 يومًا، غياب 11 أغسطس فقط، لا صفوف قبل التعيين حتى مع بداية فعلية بعد تاريخ الالتحاق",
    "راتب شهري 0.00 وملف بمكونات صفرية/فارغة: مستبعدان NO_SALARY_DEFINED في الوضعين، والموثق وحده في البنود",
    "Cleanup verified: hr_run_salary_period_test_aea369b14a823c80 removed.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_a6bcae6eb708c143 is absent from sys.databases.",
    "{\"leaveCodes\":[{\"code\":\"ANNUAL\",\"net\":7800},{\"code\":\"SICK\",\"net\":7800},{\"code\":\"CASUAL\",\"net\":7800},{\"code\":\"UNPAID\",\"net\":7540},{\"code\":\"MATERNITY\",\"net\":7800},{\"code\":\"PATERNITY\",\"net\":7800},{\"code\":\"HAJJ\",\"net\":7800},{\"code\":\"MARRIAGE\",\"net\":7800},{\"code\":\"BEREAVEMENT\",\"net\":7800},{\"code\":\"EXAM\",\"net\":7800},{\"code\":\"COMPENSATORY\",\"net\":7800}],\"daysEach\":1,\"chainSteps\":2,\"expectedTotal\":85540,\"actualTotal\":85540,\"finalStatus\":\"PAID\"}",
    "Cleanup verified: hr_fulltest_payroll_test_a9ec1f6c4f6a284d is absent from sys.databases.",
    "يدويًا: 9000/30 = 300 لليوم، 300/8/60 = 0.625 للدقيقة؛ تأخير 10 = 6.25، ونقص 20 كاملًا بلا طرح التأخير (أ4) = 20 × 0.625 = 12.50 — كلها في مسير أغسطس.",
    "تحقق حذف قاعدة الاختبار: hr_night_shift_test_368729e85213453f",
    "Manual: (19:20−07:52)=688 − 540 = 148; floor(148/15)×15=135min=2.25h; 9000/30/8×1.5×2.25=126.56.",
    "Manual: 07:00–17:00 = 600 − 540 = 60 ≥ 30 ⇒ 60min=1h; 37.50×1.5×1 = 56.25.",
    "Manual: request180min, evidence135min ⇒ approved135min=2.25h; frozen37.50×1.50×2.25=126.56.",
    "Manual: evidence 135 of the 180 requested minutes ⇒ 2.25h × 37.50 × 1.5 = 126.56, approved by HR at submission.",
    "Cleanup verified: hr_payroll_ot_test_90b0f7da7001cf90 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_payroll_allowances_test_1e613a3b868e4794 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_waivers_test_8b4d09ef9a36f3d5 is absent from sys.databases.",
    "Manual: 12000 + 3000 − 500 quality = 14500; three stale absences and 95 late minutes generate no attendance deduction.",
    "Cleanup verified: hr_payroll_exempt_test_a017517c08c7954f is absent from sys.databases.",
    "Cleanup verified: temporary uploads directory removed.",
    "Cleanup verified: hr_payroll_membership_moves_test_9f90bb685141b5da is absent from sys.databases.",
    "tests 246",
    "suites 0",
    "pass 212",
    "fail 0",
    "cancelled 0",
    "skipped 34",
    "todo 0",
    "duration_ms 286422.1443"
  ],
  "stdout": [
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "# Policy SQL barrier 2 operations: [{\"session_id\":65,\"blocking_session_id\":63,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":66,\"blocking_session_id\":65,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "# Policy SQL barrier 2 operations: [{\"session_id\":65,\"blocking_session_id\":63,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":66,\"blocking_session_id\":65,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "# SQL barrier 2 operations: [{\"session_id\":58,\"blocking_session_id\":65,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":66,\"blocking_session_id\":58,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "# SQL barrier 3 operations: [{\"session_id\":58,\"blocking_session_id\":66,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":63,\"blocking_session_id\":58,\"wait_type\":\"LCK_M_X\",\"depth\":2},{\"session_id\":65,\"blocking_session_id\":58,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n"
  ]
}

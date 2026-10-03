module.exports = {
  "selected": [
    "payroll-corrections",
    "payroll-bonuses",
    "payroll-typed-deductions",
    "loan-completion",
    "payroll-financial-exemptions",
    "payroll-allowances",
    "payroll-approval-chain-disbursement",
    "payroll-overtime-request",
    "payroll-overtime-wage-month",
    "overtime-auto-approve-period",
    "overtime-immediate-dispatch",
    "schedule-range-overtime-periods",
    "payroll-overview-filters",
    "roles-scope-presets",
    "security-permission-gaps"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 177,
      "failed": 1,
      "passed": 176,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 177,
      "suites": 0
    },
    "duration_ms": 337722.1354
  },
  "results": [
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف",
      "ms": 12133.9058,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا",
      "ms": 3241.1574,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف",
      "ms": 4374.8906,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "فصل الفروع في التصحيح: تكميلي لموظفي فرع واحد مربوط بمسير فيه فرعين — قارئ رواتب الفرع بياخد تسوية موظفي فرعه بس، ومسير حاجب برّه نطاقه مايتسمّاش",
      "ms": 5403.9271,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01: روابط التصحيح بنطاق القارئ — تكميلي اتحسب لموظف اتنقل لفرع تاني مايظهرش لقارئ الفرع الأول في «المسيرات المربوطة» ولا في قسيمته القديمة، والتكميلي المختلط رأسه بس",
      "ms": 5188.082,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR25-B01 / CR26: إعفاء منقول لتكميلي فيه موظف اتنقل لفرع تاني — مكان النسخة من عضوية التكميلي نفسه، فقارئ ومانح الفرع القديم مايشوفوهاش ولا يلغوها، وسجلات الإعفاء والمسير مابتسمّيهاش",
      "ms": 5323.8347,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-corrections.integration.cjs",
      "name": "CR35-B01 / CR35-N01: موانع عكس الصرف بقاعدة رؤية المسير — قسط ترحيل حجزه مسير فرع تاني بعد نقل الموظف بيتقال من غير رقمه ولا حالته لقارئ الفرع في المعاينة والإنشاء واعتماد مسير العكس، والشركة بتشوفه؛ ومسير العكس بيتبع مسيره الأصلي",
      "ms": 2609.6122,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 6501.8148,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2473.4427,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 342.0834,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 191.7611,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 68.3371,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1259.5507,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 402.5318,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 192.6977,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 396.9427,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1120.5626,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
      "ms": 402.8178,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
      "ms": 1897.7878,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
      "ms": 907.5812,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
      "ms": 1846.2292,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 6528.3503,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2225.2079,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 305.0957,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 158.2615,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 313.1756,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 63.8674,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1599.6112,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 143.1333,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 229.8835,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 358.3252,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 422.5834,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 2084.0818,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 32.6159,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 219.6611,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 236.9995,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 5541.156,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 390.3819,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 115.7277,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 236.3232,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 75.7806,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 51.7216,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 368.946,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
      "ms": 547.2314,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR34-B01: دفتر السلفة لقارئ رواتب الفرع — رقم مسير اتعمل للموظف في فرع تاني (قبل نقله) مابيظهرش ولا «#رقمه» في نص الحدث؛ مسير فرعه وحساب الشركة والموظف نفسه بيشوفوه",
      "ms": 145.8861,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف",
      "ms": 7455.4786,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء",
      "ms": 2574.4801,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "Owner 26-Sep: HR authority is final in exemptions — the grantor-% cap warns instead of routing, HR exempts a deduction it created, and decides a legacy pending grant of its own",
      "ms": 515.6582,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "B0.1s: مرشحين الإعفاء على قد أساس صاحب الطلب — مدير القسم مابياخدش الأقساط ولا الخصومات المصنفة، ومدير الجهة المالكة قيود نوع جهته بس، وقفل منح المدير الهيكلي بيشيل صفته",
      "ms": 740.2095,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR23-B01: ملكية نوع الخصم ماتعدّيش فصل الفروع — موظف فرع تاني مابيظهرش لمدير الجهة المالكة في مرشحين الإعفاء ولا بتفاصيله",
      "ms": 685.2794,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-financial-exemptions.integration.cjs",
      "name": "CR24-B01: إدارة قسم في فرع تاني ماتفتحش مسير الفرع ده في شاشة الإعفاءات — لا اسمه ولا رقمه ولا شهره ولا حالته",
      "ms": 1076.1516,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "أنواع البدلات: الشركة لحساب الشركة، وحساب الفرع يضيف لفرعه ويشوف الشركة + فرعه بس، وبدل العطلات محجوز",
      "ms": 5168.8169,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "صرف بدل على فريق: يدخل المسير المحسوب إضافة باسم البدل والصافي والقسيمة، والإلغاء + إعادة الحساب يشيله، وعزل الفرع",
      "ms": 2498.2986,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "المسير المعتمد ما بيتغيرش: الإلغاء بعد الاعتماد مرفوض، وإلغاء الدفعة بيسيب المحجوز",
      "ms": 1114.2787,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "بدل على الشركة كلها: حساب الفرع يشوف عدد سطور فرعه بس (مش عدد الشركة)، ومفيش «اتلغى منه» من سطور فروع تانية",
      "ms": 121.284,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "CR32-B01: مسير فرع تاني للموظف بعد نقله مايظهرش لحساب الفرع في ردود البدل وقايمته، ومسير فرعه بيظهر",
      "ms": 757.7018,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-allowances.integration.cjs",
      "name": "CR33-B01: رفض إلغاء سطر بدل في مسير فرع تاني معتمد أو مصروف من غير رقم المسير لحساب الفرع، وبالرقم للشركة",
      "ms": 741.0207,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 6554.5976,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 198.8702,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 3721.7697,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 4487.3727,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 809.6389,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 911.991,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 509.7209,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 595.7483,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 427.4548,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 116.3489,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
      "ms": 5346.8963,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
      "ms": 798.7434,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
      "ms": 887.7288,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
      "ms": 806.0125,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
      "ms": 583.2755,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
      "ms": 1053.6012,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
      "ms": 524.8869,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
      "ms": 571.4644,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
      "ms": 335.0319,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
      "ms": 406.4428,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
      "ms": 419.6531,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
      "ms": 625.175,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
      "ms": 502.365,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
      "ms": 405.4647,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
      "ms": 861.4921,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
      "ms": 1387.0456,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
      "ms": 976.004,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
      "ms": 582.9341,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
      "ms": 606.6775,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
      "ms": 524.0732,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
      "ms": 464.6661,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
      "ms": 745.3362,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
      "ms": 1332.4603,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
      "ms": 957.133,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
      "ms": 425.0879,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
      "ms": 636.2914,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
      "ms": 916.3856,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
      "ms": 767.3947,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
      "ms": 409.1861,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
      "ms": 840.4272,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
      "ms": 1856.5846,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
      "ms": 1397.0614,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 2383.71,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
      "ms": 1381.6585,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
      "ms": 2776.7077,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
      "ms": 1954.5605,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
      "ms": 682.6549,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1806.5628,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
      "ms": 2480.7616,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
      "ms": 323.9263,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
      "ms": 515.1646,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
      "ms": 750.7055,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
      "ms": 341.244,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
      "ms": 507.2351,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
      "ms": 1210.0219,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
      "ms": 2496.5843,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
      "ms": 1074.8748,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
      "ms": 532.9862,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
      "ms": 2530.8629,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
      "ms": 1149.4393,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
      "ms": 4687.2259,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
      "ms": 2394.4633,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
      "ms": 916.3755,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
      "ms": 6938.0075,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
      "ms": 105.9722,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
      "ms": 8664.8218,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
      "ms": 6890.6574,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-wage-month.integration.cjs",
      "name": "الخطوة 13 / LOT-15 عبر مسار الطلب: الإضافي المعتمد بعد زيادة الشهر التالي يُسعَّر على راتب شهر يوم العمل، لا على الزيادة ولا راتب الملف",
      "ms": 12919.5723,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-wage-month.integration.cjs",
      "name": "الخطوة 13 عبر مسار الطلب: بلا راتب موثق لشهر يوم العمل تُظهر شاشة الطلب السبب مسبقًا، ويُرفض الاعتماد النهائي ويبقى الطلب معلقًا حتى التوثيق",
      "ms": 701.693,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 6920.5525,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 653.7166,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1644.0526,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 881.3307,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 898.2954,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 1466.521,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 519.377,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 470.7187,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 873.2584,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 400.4124,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.4798,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 1.5844,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1112.1148,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-auto-approve-period.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 4176.3999,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: HTTP checkout already has one manager approval request before cron and remains idempotent",
      "ms": 5481.4366,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: closed windows incomplete punches and below-threshold days produce no automatic request",
      "ms": 590.0439,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: a computed day inside an outer transaction routes only after its SQL commit releases the employee lock",
      "ms": 372.9314,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: rolling back the outer computation leaves no request source claim or punch",
      "ms": 308.4811,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: committing an inner savepoint waits for the outer commit and does not dispatch twice",
      "ms": 324.3592,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: nested rollback discards only its refreshed existing source and preserves outer committed dispatch",
      "ms": 486.3681,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: missing manager does not fail a committed punch and cron recovers the same source after configuration is repaired",
      "ms": 484.0603,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: an approved punch correction creates its manager overtime request after correction and attendance commit",
      "ms": 450.5336,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: a top-level routing failure cannot reject the committed attendance and cron recovers its DETECTED record",
      "ms": 326.7841,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "إسناد شهر كامل لموظفي الفرع: الأسابيع الكاملة وردية أسبوع، والأطراف أيام خاصة، وموظف الفرع التاني يتخطى",
      "ms": 6486.2729,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "إعادة الإسناد: الأيام الخاصة جوه المدة تتشال افتراضيًا وتفضل مع keepDayOverrides",
      "ms": 157.2574,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "أيام معينة بس (السبت): أيام خاصة على السبوت، ومفيش وردية أسبوع، وباقي الأيام زي ما هي",
      "ms": 409.0626,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "التحقق: تواريخ غلط وأيام غلط وقائمة فاضية ونطاق الفرع ووردية فرع تاني",
      "ms": 109.8022,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "أيام الحضور اللي فاتت تتحسب تاني بالوردية الجديدة",
      "ms": 491.1553,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "فترات الإضافي: المقفولة توقف الحساب والمفتوحة تسمح بيه، والنطاق محمي",
      "ms": 980.2329,
      "pass": true,
      "skip": false
    },
    {
      "file": "schedule-range-overtime-periods.integration.cjs",
      "name": "إسناد لمدة بالفرق: أعضاء الفريق الشغالين بس، وحساب الفرع مايوصلش لفريق فرع تاني",
      "ms": 232.3223,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(أ) فلاتر «بلا مسير»: الاسم والكود والفرع والقسم والفريق والمسمى والحالة وتاريخ التعيين — كلها مع بعض والعدد بيعكسها",
      "ms": 6691.7095,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ب) الجدول الموحد: كل موظفي الشهر بعمود «المسير»، والمنظور بيفرز المدرجين من بلا مسير، وفلتر المسير للمدرجين",
      "ms": 1515.0911,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(ج) «نقل لمسير…» لاختيار مختلط في نداء واحد: نقل وإضافة ومتخطى بسببه لكل موظف",
      "ms": 1046.2995,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(د) حساب الفرع: الفلاتر والنقل بنطاق فرعه بس، والموظف بره الفرع يتخطى بسببه",
      "ms": 365.6273,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.integration.cjs",
      "name": "(هـ) فصل الفروع في شاشات الشهر: مسير كل أعضائه في فرع تاني مايتعرضش لحساب فرع، ومسير شهر لاحق بنفس الاسم برّه نطاقه مايتعدّلش، ورد إلغاء قيد على قد صلاحية القراءة",
      "ms": 1171.9851,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "migration 064 through the real migrator: adds the column, inserts missing roles, trims only rows that still equal the shipped preset, kills only changed sessions, and re-runs change nothing",
      "ms": 12390.1357,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "migration 064 on a production-shaped database: SQL Server 2019 compatibility level and a database collation that differs from tempdb",
      "ms": 590.2634,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "customised rows: the screen shows exactly what differs from the approved bundle, the row keeps its old power until fixed, and resetting it to the shipped preset lets the migration trim it",
      "ms": 251.4483,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول الأصول: registers assets, hands custody over, receives it back and transfers it — and gets 403 on money, employee files, attendance, requests and settings",
      "ms": 356.4002,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "approve.custody finally has a carrier: the asset officer decides the «أمين العهدة» step end to end; the HR officer and the read-only role cannot decide anything",
      "ms": 331.5688,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول موارد بشرية: reads every HR module of his branch and cannot edit, cancel, approve or do anything an HR manager does",
      "ms": 443.8415,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "مسؤول صرف الرواتب: sees payroll runs and carries the disbursement permission — cannot calculate, approve, pay, reopen, cancel or touch any other module",
      "ms": 150.1651,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "trimmed presets behave: payroll_manager calculates but never approves or pays; read_only reads and never writes or opens the bank sheet; data_entry edits and never archives",
      "ms": 167.1968,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "«نطاقه: كل الفروع»: entity → JWT → guard. On = every branch and company-wide writes WITH the permission, refused WITHOUT it; off = own branch; the token dies on every change",
      "ms": 298.7383,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "only the super admin grants it: an HR manager cannot switch it on or off, cannot create an account with it, and cannot manage an account that has it",
      "ms": 190.7298,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "fail-closed stays: a legacy account with no branch still sees nothing and writes nothing company-wide, whatever permissions it carries",
      "ms": 160.6902,
      "pass": true,
      "skip": false
    },
    {
      "file": "roles-scope-presets.integration.cjs",
      "name": "permissions screen API: the whole registry with module, description and carriers; orphans flagged; copy a role; effective = role ∪ grants − revokes",
      "ms": 208.3773,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-05: sensitive payroll/attendance grants are super-admin-only for accounts, overrides and roles",
      "ms": 6421.4351,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-06: salary change and its context need payroll.approve on top of employees.edit",
      "ms": 191.5579,
      "pass": true,
      "skip": false
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 132.1547,
      "pass": false,
      "error": "documents.manage + payroll.view /letters/1/download\n\n404 !== 200\n",
      "cause": "documents.manage + payroll.view /letters/1/download\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: documents.manage + payroll.view /letters/1/download\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\security-permission-gaps.integration.cjs:170:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-04: /obligations read, create and cancel enforce the employee branch scope",
      "ms": 142.3189,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "security-permission-gaps.integration.cjs",
      "name": "SEC-07: salary letters need the finance read check on /letters download and /files",
      "ms": 132.1547,
      "pass": false,
      "error": "documents.manage + payroll.view /letters/1/download\n\n404 !== 200\n",
      "cause": "documents.manage + payroll.view /letters/1/download\n\n404 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: documents.manage + payroll.view /letters/1/download\n\n404 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\b01s-fix\\api\\test\\security-permission-gaps.integration.cjs:170:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_payroll_corrections_test_775ad2950fbabe67 is absent from sys.databases.",
    "Cleanup verified: hr_payroll_bonuses_test_5f294e585f46cf0d is absent from sys.databases.",
    "Cleanup verified: hr_payroll_typed_deductions_test_7e753c949b179afa is absent from sys.databases.",
    "Cleanup verified: hr_payroll_allowances_test_d922afc2d6bf3a78 is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_6051b4fe9be03280 is absent from sys.databases.",
    "Manual: (19:20−07:52)=688 − 540 = 148; floor(148/15)×15=135min=2.25h; 9000/30/8×1.5×2.25=126.56.",
    "Manual: 07:00–17:00 = 600 − 540 = 60 ≥ 30 ⇒ 60min=1h; 37.50×1.5×1 = 56.25.",
    "Manual: request180min, evidence135min ⇒ approved135min=2.25h; frozen37.50×1.50×2.25=126.56.",
    "Manual: evidence 135 of the 180 requested minutes ⇒ 2.25h × 37.50 × 1.5 = 126.56, approved by HR at submission.",
    "Cleanup verified: hr_payroll_ot_test_dfb135bf71ac7393 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "يوم 2026-09-30 (راتب شهر 2026-10) اعتُمد عبر /requests/:id/act على 9,000: 2 س × 1.5 × 37.5 = 112.50",
    "409 OT_SALARY_MONTH_EVIDENCE_REQUIRED والطلب باقٍ في الخطوة 3؛ بعد توثيق الشهر اكتمل الاعتماد نفسه بلا إعادة تقديم",
    "Cleanup verified: hr_ot_wage_month_test_33d1dc73c1fe8101 removed.",
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "Cleanup verified: hr_ot_auto_approve_test_ca6df0b9fc8ddd1f is absent from sys.databases.",
    "Cleanup verified: hr_ot_dispatch_test_3cab45f9ff78ecff removed.",
    "Cleanup verified: temporary uploads removed.",
    "Cleanup verified: hr_schedule_range_test_65b97cf772e94d51 removed.",
    "Cleanup verified: hr_payroll_overview_filters_test_d7092ce0130ba81e is absent from sys.databases.",
    "collation db=Arabic_100_CS_AS tempdb=SQL_Latin1_General_CP1_CI_AS compatibility=150",
    "Cleanup verified: hr_roles_collation_test_b2f8b3b82ecdad1e removed.",
    "مسارات /payroll/disbursement موجودة — اتفحص حارس payroll.disburse عليها",
    "Cleanup verified: hr_roles_scope_test_750693bd2118c7f0 removed.",
    "Cleanup verified: hr_sec1_perm_test_973c6fad1f3fdf2a removed.",
    "tests 177",
    "suites 0",
    "pass 176",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 337722.1354"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_corrections_test_775ad2950fbabe67\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_corrections_test_775ad2950fbabe67\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_bonuses_test_5f294e585f46cf0d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_bonuses_test_5f294e585f46cf0d\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_typed_deductions_test_7e753c949b179afa\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_typed_deductions_test_7e753c949b179afa\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_completion_test_88ab2e0e6dcb34cc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_completion_test_88ab2e0e6dcb34cc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_exemptions_test_59123a36691f5d35\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_exemptions_test_59123a36691f5d35\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_allowances_test_d922afc2d6bf3a78\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_allowances_test_d922afc2d6bf3a78\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_6051b4fe9be03280\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_6051b4fe9be03280\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_ot_test_dfb135bf71ac7393\"}\n",
    "# SQL barrier 2 operations: [{\"session_id\":53,\"blocking_session_id\":68,\"wait_type\":\"LCK_M_X\",\"depth\":2},{\"session_id\":68,\"blocking_session_id\":67,\"wait_type\":\"LCK_M_X\",\"depth\":1}]\n",
    "# SQL barrier 3 operations: [{\"session_id\":65,\"blocking_session_id\":67,\"wait_type\":\"LCK_M_X\",\"depth\":2},{\"session_id\":67,\"blocking_session_id\":53,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":68,\"blocking_session_id\":67,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_ot_test_dfb135bf71ac7393\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_wage_month_test_33d1dc73c1fe8101\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_wage_month_test_33d1dc73c1fe8101\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_ca6df0b9fc8ddd1f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_ca6df0b9fc8ddd1f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_dispatch_test_3cab45f9ff78ecff\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_dispatch_test_3cab45f9ff78ecff\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_schedule_range_test_65b97cf772e94d51\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_schedule_range_test_65b97cf772e94d51\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_overview_filters_test_d7092ce0130ba81e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_overview_filters_test_d7092ce0130ba81e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_roles_scope_test_750693bd2118c7f0\"}\n",
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_roles_collation_test_b2f8b3b82ecdad1e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_roles_collation_test_b2f8b3b82ecdad1e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_roles_scope_test_750693bd2118c7f0\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_sec1_perm_test_973c6fad1f3fdf2a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_sec1_perm_test_973c6fad1f3fdf2a\"}\n"
  ]
}

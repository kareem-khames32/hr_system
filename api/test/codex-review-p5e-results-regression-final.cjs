module.exports = {
  "selected": [
    "expense-reports",
    "request-execution",
    "codex-review-p5e-decision-race",
    "request-category-chains",
    "manager-of-direct-manager",
    "administration-level",
    "approval-chain-holders",
    "approval-chain-branch-copy",
    "approval-delegations",
    "approval-delegations-migration",
    "payroll-approval-chain-disbursement",
    "holiday-work",
    "leave-contract",
    "leave-attachment-with-request",
    "leave-entitlement-tiers",
    "leave-sick-pay-attachment",
    "leave-year-end",
    "swap-consents"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 178,
      "failed": 0,
      "passed": 178,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 178,
      "suites": 0
    },
    "duration_ms": 152828.8834
  },
  "results": [
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 11373.64,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
      "ms": 219.0504,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»",
      "ms": 415.7022,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل",
      "ms": 531.0016,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب",
      "ms": 374.6617,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش",
      "ms": 344.5053,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل",
      "ms": 376.7292,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد",
      "ms": 677.6737,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد",
      "ms": 761.7139,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند",
      "ms": 169.8991,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة",
      "ms": 738.6298,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع",
      "ms": 737.4188,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-13 (Codex P5A-B01): سلسلة فاضية بـ«تنفيذ فوري» مش مراجعة للمبلغ — تقرير المصروفات وسلفة المأمورية مابيتنفذوش من غير اعتماد بشري، والتقديم كله بيرجع",
      "ms": 271.4729,
      "pass": true,
      "skip": false
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-14 (Codex P5B-B01): اعتماد جولة قبل الإرجاع مايصرفش مبلغ اتغيّر — إعادة تقديم على سلسلة «تنفيذ فوري» مرفوضة كلها، وبالسلسلة الحقيقية القيد بالمبلغ الجديد بعد اعتماد جديد",
      "ms": 283.9566,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 8680.8149,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 153.8367,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 226.5667,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 112.2121,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 995.7321,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 154.1529,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 92.2585,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 229.8258,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 203.0868,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 197.7715,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.4964,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 155.6299,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 59.0313,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 152.5205,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 118.3695,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 43.6556,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 193.575,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 51.1242,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 213.1889,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 95.8297,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 122.9106,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1407.3742,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 220.953,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 222.4108,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 518.2286,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 70.6904,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 122.1907,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 76.7316,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 192.6719,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 302.9033,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 314.9748,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 66.6685,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 66.5869,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 187.224,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 95.5776,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 168.7481,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 86.4767,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 172.1103,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 92.5332,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 138.4094,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 8668.3726,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 82.4333,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 76.0664,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 72.7106,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 70.0895,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 68.0695,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 41.9305,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 48.8729,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-01: من غير أي ربط — كل فئة من غير سلسلة، وكل نوع على سلسلته، والباب المالي «ثابت» بسببه",
      "ms": 8890.5892,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-02: ربط الإجازات بسلسلة موجودة ينقل المختارين بس — والتالت بيفضل على سلسلته",
      "ms": 51.457,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-03: الحضور على نفس سلسلة الإجازات — «مشتركة مع» في الخريطة",
      "ms": 31.4068,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ",
      "ms": 384.2146,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين",
      "ms": 365.498,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة",
      "ms": 108.6109,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)",
      "ms": 95.8235,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك",
      "ms": 150.6714,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-09: الرفض — سلسلة فرع أو معطّلة أو فاضية، نوع من فئة تانية، الباب المالي، الإضافي على سلسلة بلا معتمدين، وطلب ناقص",
      "ms": 183.5645,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه",
      "ms": 161.4728,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس",
      "ms": 20.9697,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-12: ربط الفئة مايتكتبش من إعدادات النظام العامة، وسلسلة الفئة ماتتنقلش لفرع حتى لو مفيش نوع عليها",
      "ms": 90.586,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس",
      "ms": 9266.9454,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة",
      "ms": 100.1476,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش",
      "ms": 144.5341,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو",
      "ms": 49.422,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه",
      "ms": 53.126,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف",
      "ms": 29.2148,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06b: دايرة أطول في المديرين المسجّلين (3 و4 أشخاص) — «مدير المدير» مرؤوس لمقدّم الطلب، فالتقديم بيقف (CR10-N01)",
      "ms": 159.3599,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06c: لفّة التدرّج الطبيعية (مدير فرع جوه قسم مديره تحته) مابتتحسبش دايرة — الخطوة بتروح لمدير الفرع",
      "ms": 106.5797,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه",
      "ms": 76.1899,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-08: «مدير المدير المباشر» مش مقبول كجهة تصعيد (إنشاء السلسلة وتعديل الخطوة)",
      "ms": 22.5217,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-09: الشاشة — الاختيار ظاهر بعد «المدير المباشر» ومش في قايمة التصعيد، وتسميته في الصناديق",
      "ms": 14.831,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-01: إدارة وأقسامها وقسم فرعي؛ الإدارة التنفيذية بتتعمل «إدارة» لوحدها؛ وإدارة فرع تحت الإدارة التنفيذية من فرع تاني",
      "ms": 9262.9452,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-02: قواعد الأب — إدارة تحت قسم أو إدارة عادية، قسم تحت إدارة فرع تاني، تحويل لإدارة وأبوه مايصلحش، ونوع غلط: كله مرفوض ومفيش حاجة بتتكتب",
      "ms": 95.3618,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-03: المسموح — تحويل قسم رئيسي أو تحت الإدارة التنفيذية لإدارة والعكس، وإدارة لقسم وأقسامها فرعية، والهيكل القائم بيتعدّل من غير إجبار",
      "ms": 153.6077,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-04: الإدارة التنفيذية «إدارة» دايمًا ومالهاش أب، وشيل تعليمها (صريح أو ضمني) مرفوض طول ما تحتها إدارات",
      "ms": 80.7677,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-05: «مدير الإدارة» — موظف قسم تحت إدارة بيروح لمديرها، وهو بس اللي بيعتمد",
      "ms": 234.1698,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-06: قسم فرعي على مستويين تحت الإدارة — نفس مدير الإدارة",
      "ms": 39.5817,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-07: مدير الإدارة هو مقدّم الطلب — الخطوة بتطلع للإدارة التنفيذية برابطها لفرع تاني، والرئيس بيعتمد من حساب «كل الفروع»",
      "ms": 125.5178,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-08: الإيقاف برسالة بتسمّي الوحدة — مفيش قسم، مفيش إدارة، الإدارة مالهاش مدير، المدير الوحيد هو مقدّم الطلب",
      "ms": 204.7235,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-09: السرّي مابيتخطّاش «مدير الإدارة» (زي «مدير القسم»)، والدور مش مقبول كجهة تصعيد",
      "ms": 121.5672,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-10: فلتر المسير وجمهور العطلات على إدارة بيشملوا أقسامها — في فرعها بس",
      "ms": 754.7426,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-11: «الإدارة» في بطاقة صاحب الطلب — الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، ومحجوبة مع orgHidden",
      "ms": 199.3492,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-12: حساب الفرع — إدارة في فرعه وقسم تحتها، والربط تحت الإدارة التنفيذية برّه نطاقه 403، والقائمة ماتكشفش اسمها",
      "ms": 71.878,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-13: تعليم قسم «إدارة تنفيذية» بيخلّيه «إدارة» تلقائي، والتنفيذية القديمة إدارة عادية تتحول قسم وأقسامها فرعية",
      "ms": 67.9736,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-01: الثغرات بالصلاحيات النهائية — حزمة الدور والمنح والعمود القديم بيحملوا، والمسحوبة والحساب الموقوف ومدير النظام لأ، والفرع المقفول مالوش تحذير",
      "ms": 8744.7134,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-02: قارئ الرياض بيشوف فرعه بس — ولا اسم فرع جدة في الرد",
      "ms": 42.5414,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-03: حامل جديد بيقفل الثغرة فورًا، ونسخة فرع مفعّلة بتشيل فرعها من العامة وبتتفحص لوحدها، والتحذير مابيمنعش الحفظ",
      "ms": 174.5722,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-04 (D12): كشف «المدير المسجل غير قائد الفريق» — بنطاق الحساب، والقائد نفسه والمدير الفاضي والموقوف مش في الكشف، ومفيش أي تعديل",
      "ms": 174.8652,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-01: من غير نسخ — الفرعين على السلسلة العامة",
      "ms": 8940.4989,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-02: نسخة للمعادي بنفس الكود: طلب المعادي لمعتمدها، والنصر فاضل على العامة، ونسخة تانية لنفس الفرع مرفوضة",
      "ms": 136.0478,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-03: تعطيل نسخة المعادي يرجّع طلبات المعادي للعامة، وتفعيلها يرجّعها لنسختها",
      "ms": 107.2726,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-04: حساب فرع النصر يعمل نسخة لفرعه بس — مش للمعادي، ونسخة النصر بتاخد طلبات النصر",
      "ms": 108.2401,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-05: الشاشة: «نسخة خاصة بفرع» شغالة بنفس الكود مقفول، والفروع اللي مالهاش نسخة بس",
      "ms": 1.6316,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-01: الإنشاء — الموظف لنفسه، ولغيره بصلاحية وفي نطاقه؛ وحدود الفترة والفئات والبديل؛ والقايمة",
      "ms": 9775.2327,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين",
      "ms": 750.8403,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس",
      "ms": 491.2049,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل",
      "ms": 217.1034,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض",
      "ms": 314.6694,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل",
      "ms": 2244.3367,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
      "ms": 1990.2901,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس",
      "ms": 1179.8904,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال",
      "ms": 3914.7566,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى",
      "ms": 1375.4737,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-11: تفويضين متداخلين لنفس المفوِّض في نفس اللحظة — واحد بس",
      "ms": 107.4063,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 9861.5964,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-2: من غير الجدول والعمود التفويض مرفوض برسالة والصندوق والقرار والبريد والتصعيد زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده القرار بيتكتب «بالنيابة عن»",
      "ms": 5555.396,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 895.075,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 10821.522,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 218.8926,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 4312.0138,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 3625.1605,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 868.3075,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 888.3561,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 709.3942,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 751.7559,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 543.2329,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 173.8447,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 10191.768,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 4279.6607,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 973.4218,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 173.6638,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 967.8209,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1124.2838,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 2814.1786,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR29-B01: أمر دوام العطلة لموظفين بالاسم بيتحفظ تحت قفلهم المالي — موظف اتنقل لفرع تاني قبل القفل بيرفض الأمر كله، وكمان تعديل أمر قائم ليه",
      "ms": 168.5136,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR30-B01: تعديل أو إلغاء أمر عطلة، وتعديل أو حذف فترة إضافي، بصلاحية الفرع القديم وقت ما السجل نفسه بيتنقل لفرع تاني — مابيتحفظوش",
      "ms": 361.5887,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR31-B01: تعديل أمر عطلة اتحفظ والأمر اتنقل لفرع تاني واتسمّى بعدها على طول — الرد مابيكشفش الاسم الجديد",
      "ms": 166.3532,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 9056.7124,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 515.7627,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 55.8035,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 149.7119,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 236.7841,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 106.5927,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 163.7891,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 196.4945,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 196.9234,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 30.4248,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 397.6782,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 201.3723,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 222.0949,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 29.6893,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 85.6058,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل",
      "ms": 11042.6315,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع",
      "ms": 299.0582,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف",
      "ms": 490.8417,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط",
      "ms": 410.9222,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب",
      "ms": 586.4144,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-01: قبل ترحيل 136 الكود شغال من غير العمودين، والحفظ بقيمة ليهم بيترفض؛ والترحيل بيضيفهم بشكل الكيان وبيتكرر بأمان",
      "ms": 11476.548,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-02: من غير شرائح الرصيد زي الأول؛ بشرائح الحزمة كل موظف بياخد شريحة دولة فرعه وخدمته وسنّه — مصر والسعودية — وتفضيتها بترجّع أيام النوع",
      "ms": 693.6683,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-03: أقصى مرات طول الخدمة — الإجازات المعتمدة والطلبات اللي في المسار بتتعدّ، والتالتة بتترفض؛ ومن غير حد مفيش رفض",
      "ms": 419.2043,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-04: أنواع إجازات حزمة الدولة لفرع — غير مفعّلة وبأرقام الحزمة، لمصر والسعودية، ومابتتكررش، وبنطاق الحساب",
      "ms": 246.7835,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-05 (P4A-B03): صف السنة الناقص والمُرحّل منه بشريحة دولة فرع الموظف **بعد** قفل صفه — نقل الفرع اللي اتثبّت قبل القفل هو اللي بيتحسب",
      "ms": 473.1396,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll",
      "ms": 10268.819,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: days 31-40 of the year at 75% deduct 750 as their own line; an isUnpaid sick day is not charged twice",
      "ms": 926.1533,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: crossing day 90 splits into 75% and 0% lines; fully paid sick days add nothing",
      "ms": 1629.6827,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 10394.4609,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 96.6702,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 179.6795,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 298.773,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 92.1983,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-01: الميزة مقفولة افتراضيًا = التبديل زي الأول بالحرف (اعتماد المدير كفاية ومن غير صف موافقة)؛ وقبل ترحيل 166 الشاشة بتقول ناقص؛ والترحيل بشكل الكيان وبيتكرر",
      "ms": 11032.8836,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-02: الميزة مفتوحة — التقديم بيسجّل موافقة «مستني» للطرف التاني، والتنفيذ بيقف لحد ما يوافق؛ والرفض بيوقّفه؛ والقرار لصاحبه بس ومرة واحدة",
      "ms": 687.9045,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-03: الطرف التاني اتغيّر عند إعادة التقديم = الموافقة للطرف الجديد؛ وطلب اترفض مايتسجّلش عليه قرار؛ وموافقة لطرف قديم ماتنفّذش تبديل مع غيره",
      "ms": 872.7384,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-04 (Codex P5A-B07): حالة الميزة جوه معاملة تقديم التبديل بتتقري بمدير المعاملة — قارئ المخزن مابيتناداش، والذاكرة المؤقتة مش شرط، والميزة مقفولة أو مفتوحة",
      "ms": 366.4501,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_expense_reports_test_09fcb3708f55f5e7 is absent from sys.databases.",
    "Cleanup verified: hr_category_chains_test_377c8e69c56b2eab is absent from sys.databases.",
    "Cleanup verified: hr_skip_level_test_af16eef6ff7e10c4 is absent from sys.databases.",
    "Cleanup verified: hr_administration_level_test_93898245e73109b1 is absent from sys.databases.",
    "Cleanup verified: hr_chain_holders_test_646cfa02d59eeb2a is absent from sys.databases.",
    "Cleanup verified: hr_chain_branch_copy_test_049630b9acc1fa36 is absent from sys.databases.",
    "Cleanup verified: hr_delegation_test_0ec5ddb214a8af23 is absent from sys.databases.",
    "Cleanup verified: hr_delegation_migration_test_f194a9af63d5313e is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_b186435232d12460 is absent from sys.databases.",
    "Cleanup verified: hr_holiday_work_test_1756d27ad7de89cd is absent from sys.databases.",
    "المرفق المطلوب مع الطلب: رفض بلا ملف، قبول معه، ونفس الحقل في الطلب وسجل الإجازة.",
    "مسار «بعد الرجوع» كما هو: تذكير يوم الموعد، رفع بنفس الحقل، وتحويل بدون راتب بعد انقضاء المهلة.",
    "Cleanup verified: hr_leave_attach_test_4a9dd91f2e2cfe7c is absent from sys.databases.",
    "Cleanup verified: hr_leave_tiers_test_af94cb489c02371f is absent from sys.databases.",
    "Manual: 9000 − 3 × 300 (MISSED sick days now unpaid) = 8100; no tier deduction on top.",
    "Manual: day rate 300; 10 days × 300 × 25% = 750 (sick) + 2 unpaid days × 300 = 600; net 9000 − 1350 = 7650.",
    "Manual: 2 × 300 × 25% = 150 + 2 × 300 × 100% = 600 → 750; five fully paid days → 0.",
    "Cleanup verified: hr_leave_sick_pay_test_7374c6867c3fce51 is absent from sys.databases.",
    "Cleanup: hr_leave_year_end_test_03a3860c518e9867 dropped.",
    "Cleanup verified: hr_swap_consents_test_e537812ee73bf76e is absent from sys.databases.",
    "tests 178",
    "suites 0",
    "pass 178",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 152828.8834"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_09fcb3708f55f5e7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_09fcb3708f55f5e7\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":64,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_0cb26aa0ef7cad8e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_0cb26aa0ef7cad8e\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":62,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_decision_race_test_c3b12877e1defe4a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_decision_race_test_c3b12877e1defe4a\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":12,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_category_chains_test_377c8e69c56b2eab\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_category_chains_test_377c8e69c56b2eab\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":14,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_skip_level_test_af16eef6ff7e10c4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_skip_level_test_af16eef6ff7e10c4\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":21,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_administration_level_test_93898245e73109b1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_administration_level_test_93898245e73109b1\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":16,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_holders_test_646cfa02d59eeb2a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_holders_test_646cfa02d59eeb2a\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":0,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_branch_copy_test_049630b9acc1fa36\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_branch_copy_test_049630b9acc1fa36\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":8,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_delegation_test_0ec5ddb214a8af23\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_delegation_test_0ec5ddb214a8af23\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":148,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_delegation_migration_test_f194a9af63d5313e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_delegation_migration_test_f194a9af63d5313e\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":7,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_b186435232d12460\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_b186435232d12460\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":0,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_work_test_1756d27ad7de89cd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_work_test_1756d27ad7de89cd\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":13,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_59d8a7228397e6b9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_59d8a7228397e6b9\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":34,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_attach_test_4a9dd91f2e2cfe7c\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_attach_test_4a9dd91f2e2cfe7c\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":24,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_af94cb489c02371f\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_af94cb489c02371f\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":6,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_sick_pay_test_7374c6867c3fce51\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_sick_pay_test_7374c6867c3fce51\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":0,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_year_end_test_03a3860c518e9867\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_year_end_test_03a3860c518e9867\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":0,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_e537812ee73bf76e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_e537812ee73bf76e\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":35,\"probes\":0,\"unexpected\":[]}}\n"
  ]
}

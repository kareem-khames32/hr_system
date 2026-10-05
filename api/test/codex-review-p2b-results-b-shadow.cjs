module.exports = {
  "selected": [
    "codex-review-p2b-screen-units",
    "attendance-live-absences",
    "payroll-daily-accrual",
    "payroll-live-attendance",
    "payroll-flex",
    "attendance-calendar-history",
    "attendance-calendar-transfer",
    "payroll-attendance-exemption",
    "permission-window",
    "employee-suspension"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 101,
      "failed": 0,
      "passed": 101,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 101,
      "suites": 0
    },
    "duration_ms": 149476.1318
  },
  "results": [
    {
      "file": "payroll-run-screen-view.test.cjs",
      "name": "SV-01: عرض الشاشة بمفاتيح الشاشة ومجاميع خصم الحضور بس",
      "ms": 1.2148,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-screen-view.test.cjs",
      "name": "SV-01b: عضو الشاشة — لقطته زي ما هي من غير مكونات الراتب، ومصدر الراتب بنوعه وشهره وسريانه بس",
      "ms": 1.6258,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-screen-view.test.cjs",
      "name": "SV-02: بند الحدث من غير التفصيل وببصمته",
      "ms": 0.3055,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-screen-view.test.cjs",
      "name": "SV-03: شاشة المسير بتطلب العرض الخفيف، وبتقرا من التفصيل مفاتيحه بس",
      "ms": 7.9907,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-live-absences.integration.cjs",
      "name": "LA-01: الغياب اللحظي بالدفعة = المسار القديم بالحرف، بكل مصادر الوردية وبنطاق الفرع",
      "ms": 12414.982,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-live-absences.integration.cjs",
      "name": "LA-02: وردية لسه مابدأتش، وراحة الفرع، وإجازة يوم كامل، وحاضر، ومستثنى — مابيظهروش",
      "ms": 483.9046,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-live-absences.integration.cjs",
      "name": "LA-03: السجل اليومي للنهارده بيرجّع صفوف الغياب اللحظي نفسها بعلامة live",
      "ms": 792.2294,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-01: المسير المحسوب من الأيام المتراكمة يطابق المحسوب من الصفر بندًا ببند",
      "ms": 19433.7135,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-02: تغيير بأثر رجعي يعلّم يومه «متسخ» فقط، والنتيجة تفضل مطابقة لإعادة الحساب الكاملة",
      "ms": 2657.5383,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-03: بصمة المدخلات تمسك التغيير حتى لو محدش علّم اليوم متسخ",
      "ms": 1401.8112,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-04: الجار الليلي آمن لإعادة التشغيل ولا يلمس مسيرًا معتمدًا",
      "ms": 1633.2504,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-06: مفتاح الإيقاف يرجّع الحساب لمساره القديم بنفس الأرقام بالحرف",
      "ms": 4285.2557,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-05: شاشة المسير تعرض «آخر يوم محسوب» وزرار «حدّث الحساب» يشتغل",
      "ms": 1205.4418,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: اليوم الفعلي المحسوب والبصمتان ينتجان ثواني دقيقة وتقويمًا مؤرخًا دون كتابة",
      "ms": 10823.5486,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: 10:00:59 بعد المرونة يحفظ3659 ثانية من بداية الدوام",
      "ms": 306.2489,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: غياب محفوظ صريح يثبت بينما عدم وجود صف لا ينشئ غيابًا",
      "ms": 407.8833,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: فجوة التنظيم المؤرخ تمنع تحويل الحضور الصحيح إلى مصدر مالي",
      "ms": 201.2062,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: تعديل الأعمدة أو استقبال دليل أحدث يمنع الاعتماد على الحساب القديم",
      "ms": 598.5534,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "SQL: الإجازة غير المدفوعة والتصحيح غير المثبت يظهران دون صفوف أو خصومات مصطنعة",
      "ms": 420.6984,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "HTTP: المصدر موثق جزئيًا ويظل تنفيذ المسير مغلقًا ولا يتغير عند القراءة",
      "ms": 463.8852,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-live-attendance.integration.cjs",
      "name": "HTTP: صلاحية حساب الرواتب ونطاق الموظف مستقلان عن السياسة العامة",
      "ms": 542.2476,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-03: 09:00, 09:30 and inclusive 10:00 with nine hours earn no lateness, no shortfall and no compensation overtime",
      "ms": 15006.3834,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05: arrival 10:01 remains 61 minutes late after either nine complete hours or staying until 20:00",
      "ms": 4579.5372,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05 AC1: 10:00:59 exceeds the window before minute rounding and stores 60 late minutes",
      "ms": 2151.6446,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04: in-window departures distinguish a 75-minute shortfall from a 30-minute shortfall without lateness",
      "ms": 3860.8266,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01: employee ENABLED, DISABLED and INHERIT resolve after that day's shift instead of overriding its duration",
      "ms": 8739.1622,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01 extension: WorkSchedule without a Shift applies its own flexible window and employee override",
      "ms": 4250.8023,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: moving official start to 08:00 shifts the 60-minute window to 08:00–09:00 only from its effective date",
      "ms": 3744.7445,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: reducing the window from 60 to 30 minutes keeps a previous day unchanged after HTTP recomputation",
      "ms": 3572.7465,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-02: invalid duration and negative input reject HTTP writes without a new source version",
      "ms": 413.7639,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01/09: branch-scoped users cannot edit global source definitions or another employee's override",
      "ms": 272.7525,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.2: free and paid permissions retain raw lateness while excusing their interval exactly once",
      "ms": 3777.7703,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.1: overnight punch-out belongs to the shift start date and never yields negative work duration",
      "ms": 2078.5152,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08: attendance exemption takes precedence over a late/incomplete flexible shift without deleting punches",
      "ms": 1841.3673,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-06: early work is excluded by default and counted only with the explicit company setting",
      "ms": 3946.1178,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.3: morning half-leave moves the full 60-minute window to 13:30–14:30; explicit proration reduces it to 30",
      "ms": 5355.1251,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04: independent shortfall tolerance forgives ten minutes but charges all forty minutes when above fifteen",
      "ms": 4814.2761,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04 financial: 75 minutes inside the window are recovered at .625 each with no lateness at all",
      "ms": 2596.2307,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: the whole 130-minute shortfall is charged beside the 70 late minutes — no overlap subtraction",
      "ms": 2455.0546,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-07 financial: free and paid permission coverage is counted once and raw lateness cannot erase a real later shortfall",
      "ms": 4760.0469,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: forgiven lateness no longer shrinks the shortfall — the unworked 90 minutes are charged in full",
      "ms": 2566.2346,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.4: missing checkout keeps known lateness, leaves shortfall unknown and blocks payroll approval atomically",
      "ms": 2320.7643,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: approved payroll protects its original attendance and source versions against retroactive edits or recomputation",
      "ms": 2582.033,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: no daily cap — lateness and shortfall are each charged in full, and only net protection stops the day going negative",
      "ms": 2069.4006,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05 financial: approved overtime remains a separate source and cannot cancel after-window lateness",
      "ms": 2659.3978,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX policy validation: invalid settings are rejected over HTTP and a corrupted SQL policy cannot replace an existing payroll",
      "ms": 2082.4653,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX regression: final aggregate truncates an exact half-cent to two decimals despite binary floating-point noise",
      "ms": 2163.731,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX / OT-08 regression: fixed-shift attendance materialization preserves a legacy approved overtime source",
      "ms": 2222.0332,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX regression: a backdated default work schedule cannot overlap a future default or alter its saved history",
      "ms": 774.4614,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09 regression: changing general grace preserves historical source versions and applies only to a new effective version",
      "ms": 5964.0036,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: a future shift rejects earlier daily and name assignments and bulk validates each date",
      "ms": 367.9207,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: a week straddling shift creation rejects by id or name and rolls back an earlier valid batch entry",
      "ms": 584.9307,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: future deactivation permits earlier new assignments and preserves already saved daily and weekly schedules",
      "ms": 4874.5205,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "calendar metadata enforces source identity, read permission and branch scope; global contents contain no branch rules",
      "ms": 9146.4052,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "explicit first confirmation proves only its dated interval and never infers history from joinDate",
      "ms": 339.0444,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "calendar changes require date, reason and current CAS, even for create/delete/toggle",
      "ms": 124.3817,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "holiday create and dated removal retain the old holiday period and public holiday wins over work exception",
      "ms": 681.0406,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "future global weekends change only future day kinds and rejects back-insertion into its complete snapshot timeline",
      "ms": 247.5638,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "two concurrent calendar writes allow one committed scope version without lost update",
      "ms": 83.1489,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "branch users cannot change global calendars or foreign branch calendars; branch-only rule does not leak",
      "ms": 126.0009,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "dated employee branch changes preserve past organization and require source CAS; future profile move is rejected",
      "ms": 399.7291,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "noncalendar profile and branch edits preserve money and do not create calendar revisions",
      "ms": 202.9033,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "current source drift and tampered immutable history fail closed and never manufacture a new baseline",
      "ms": 92.1953,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "failed calendar append rolls back source mutation atomically",
      "ms": 87.6496,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "new branch has an observed creation-date calendar and never backfills its historical configuration",
      "ms": 65.8827,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "approved and paid payroll memberships block calendar rewrites with no payroll or source mutation",
      "ms": 532.2076,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "a settled service also blocks retrospective calendar changes before its final working day",
      "ms": 164.9771,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "employee creation records only the observed creation date when no explicit calendar date was supplied",
      "ms": 243.3382,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "an explicit creation calendar date records both branch and schedule without deriving either from joinDate",
      "ms": 186.1175,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-history.integration.cjs",
      "name": "candidate hiring supplies the real actor to employee calendar creation and enforces target branch scope",
      "ms": 223.0092,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a transfer the administrator files on behalf is approved at once and stores the dated branch and its actual approver while past computeDay retains the historical branch",
      "ms": 10006.4106,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a future transfer approved at once changes no employee or org version before its date and concurrent scheduler runs apply it once with the instant approver",
      "ms": 389.7272,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "owner-configured automatic transfer records an explicit automatic decision used by scheduled org history",
      "ms": 325.3556,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "a financially closed day rolls back transfer, employee, account and approval together — at instant approval and at a pending decision alike",
      "ms": 776.9449,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-calendar-transfer.integration.cjs",
      "name": "cross-branch creator and approver cannot bypass scope to move the employee or append org history",
      "ms": 191.6762,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-10: full-month exemption defeats stale absence/95-minute lateness and new absence generation but retains a 500 quality debit",
      "ms": 10176.804,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-12: four approved unpaid days still deduct 2000 from an exempt employee",
      "ms": 788.6009,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-10: a 2000 loan installment and 400 documented quality debit remain payable and consumed normally",
      "ms": 1213.0097,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: June 16–30 exempts 15 days; only June 8 absence and June 3 forty-minute lateness are deducted",
      "ms": 808.2592,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: exemption boundaries are inclusive for a single day and for a last working day at period end",
      "ms": 1466.4693,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: terminating a window from June 16 restores attendance deductions on June 16 itself",
      "ms": 750.9875,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-09: a pending exemption has no financial effect before approval",
      "ms": 735.0076,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: a new exempt hire receives 13/30 of 19000 in a 31-day cycle (the month is 30 days)",
      "ms": 412.8451,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11: default-ineligible overtime is excluded from source claims and is neither deleted nor consumed at payroll payment",
      "ms": 1108.9964,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11: individual eligibility pays only a genuine approved PRE_REQUESTED entry, never biometric or missing/rejected requests",
      "ms": 1051.7061,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-12: an explicit unpaid-leave override preserves four approved leave days without deducting them",
      "ms": 679.6473,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 / EX-12: null overrides inherit company defaults while explicit false/true override them",
      "ms": 1425.1066,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-14: dashboard stats, weekly trend and departments exclude a stale absent exemption from attendance ratios without rewriting it",
      "ms": 508.3953,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 request: direct OVERTIME submission by an ineligible exempt employee is rejected without a request or overtime orphan",
      "ms": 148.3271,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 request: approved explicit overtime executes without punches and a changed eligibility decision blocks final approval atomically",
      "ms": 759.4785,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن صباحي ساعة (09:00–10:00) ووصول 10:30: الإذن بيغطي الساعة والـ30 دقيقة الباقية تأخير عادي",
      "ms": 10291.0464,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن صباحي ساعتين (09:00–11:00) ووصول 11:00: مفيش تأخير",
      "ms": 264.2901,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن مسائي ساعة (17:00–18:00) وخروج 17:00: مفيش انصراف بدري",
      "ms": 234.878,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن مسائي ساعة (17:00–18:00) وخروج 16:30: انصراف بدري 30 دقيقة للجزء اللي برا الإذن",
      "ms": 290.987,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "رصيد ساعتين في الشهر: ساعة + ساعة أو ساعتين مرة واحدة، والزيادة والحد للمرة الواحدة بيترفضوا",
      "ms": 375.6939,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "وقت الإذن لازم يكون صالح: من غير نهاية أو نفس الوقت بيترفض، والنوع بخصم مالوش رصيد دقايق عند التقديم",
      "ms": 162.5291,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية أو الجواز بأي صيغة وفريدة، ورقم البصمة فريد",
      "ms": 10112.0149,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو «موقوف» بلا تواريخ مرفوض، وتغيير الجنسية مابيعيدش فحص الهوية",
      "ms": 132.3954,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 417.8913,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 500.83,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 883.6125,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"rows\":6,\"minutesNow\":374,\"sources\":[\"default\",\"employee\",\"override\",\"week\"]}",
    "Cleanup verified: hr_live_absences_test_293d9f084ce057b5 is absent from sys.databases.",
    "نفس totalNet ونفس كل بند وتفصيله في المسارين",
    "Cleanup verified: hr_payroll_accrual_test_7763445bc61471f7 no longer exists in sys.databases.",
    "تحقق حذف قاعدة الاختبار: hr_attendance_proof_test_3712eb83b541ba8b",
    "الراتب على 30 يوم: يوم مغطى = 9000 ÷ 30 = 300؛ والنقص 75 × 0.625 = 46.875 ← 46.87 بالقص؛ الصافي 253.13.",
    "أ4: كل خصم يُحتسب كما جاء — تأخير 70×.625=43.75 ونقص 130×.625=81.25؛ الصافي 300−125=175 (الراتب على 30 يوم).",
    "أ4: الإذن الحر ⇒ 300−18.75−56.25=225؛ والمدفوع يضيف 60×.625=37.50 فالصافي 187.50 (الراتب على 30 يوم). الإذن المدفوع لا يُحتسب مرتين.",
    "Manual: monthly1000.08 /30 /8 /60 ×100min = 6.945 → 6.94 بالقص؛ ويوم مغطى واحد يستحق 1000.08 ÷ 30 = 33.336 ← 33.33 (الراتب على 30 يوم)؛ الصافي 26.39.",
    "Legacy approval remains2h: 2 ×(9000/30/8) ×1.5 =112.50; payroll cannot change an existing approval to1h by rereading attendance.",
    "Cleanup verified: hr_payroll_flex_test_e5149518b3fbc8af no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_calendar_history_test_131902cf551ca6ab removed.",
    "Cleanup verified: temporary uploads removed.",
    "تم التحقق من حذف قاعدة الاختبار: hr_calendar_transfer_test_da62ddf6409b5df3",
    "تم التحقق من حذف مرفقات الاختبار المؤقتة.",
    "Manual: 12000 + 3000 − 500 quality = 14500; three stale absences and 95 late minutes generate no attendance deduction.",
    "Cleanup verified: hr_payroll_exempt_test_d8a84a431269dd0d is absent from sys.databases.",
    "Cleanup verified: temporary uploads directory removed.",
    "Cleanup verified: hr_permission_window_test_8ff7560ff1b31e50 removed.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_2cfe544f73a59780 is absent from sys.databases.",
    "tests 101",
    "suites 0",
    "pass 101",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 149476.1318"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":0,\"compared\":0,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_live_absences_test_293d9f084ce057b5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_live_absences_test_293d9f084ce057b5\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":5,\"compared\":0,\"mismatches\":0,\"live\":5,\"liveRows\":29}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_accrual_test_7763445bc61471f7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_accrual_test_7763445bc61471f7\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":0,\"compared\":0,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_attendance_proof_test_3712eb83b541ba8b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_attendance_proof_test_3712eb83b541ba8b\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":0,\"compared\":0,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_flex_test_e5149518b3fbc8af\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_flex_test_e5149518b3fbc8af\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":2,\"compared\":1,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_calendar_history_test_131902cf551ca6ab\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_calendar_history_test_131902cf551ca6ab\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":0,\"compared\":0,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_calendar_transfer_test_da62ddf6409b5df3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_calendar_transfer_test_da62ddf6409b5df3\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":0,\"compared\":0,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_exempt_test_d8a84a431269dd0d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_exempt_test_d8a84a431269dd0d\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":3,\"compared\":0,\"mismatches\":0,\"live\":2,\"liveRows\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_permission_window_test_8ff7560ff1b31e50\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_permission_window_test_8ff7560ff1b31e50\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":0,\"compared\":0,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_employee_suspension_test_2cfe544f73a59780\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_employee_suspension_test_2cfe544f73a59780\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":0,\"compared\":0,\"mismatches\":0}\n"
  ]
}

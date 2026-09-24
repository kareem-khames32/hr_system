module.exports = {
  "selected": [
    "payroll-daily-accrual",
    "payroll-night-shift",
    "payroll-flex",
    "permission-window",
    "payroll-lateness-permission-line",
    "payroll-attendance-exemption",
    "payroll-overtime-request",
    "payroll-overtime-wage-month",
    "employee-suspension",
    "holiday-work",
    "attendance-payroll-race",
    "overtime-immediate-dispatch"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 144,
      "failed": 6,
      "passed": 138,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 144,
      "suites": 0
    },
    "duration_ms": 174853.7423
  },
  "results": [
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-01: المسير المحسوب من الأيام المتراكمة يطابق المحسوب من الصفر بندًا ببند",
      "ms": 21053.2066,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-02: تغيير بأثر رجعي يعلّم يومه «متسخ» فقط، والنتيجة تفضل مطابقة لإعادة الحساب الكاملة",
      "ms": 5369.5118,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-03: بصمة المدخلات تمسك التغيير حتى لو محدش علّم اليوم متسخ",
      "ms": 2842.3001,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-04: الجار الليلي آمن لإعادة التشغيل ولا يلمس مسيرًا معتمدًا",
      "ms": 3759.0436,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-06: مفتاح الإيقاف يرجّع الحساب لمساره القديم بنفس الأرقام بالحرف",
      "ms": 5873.521,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at calculate (D:\\projects\\hr_system\\api\\test\\payroll-daily-accrual.integration.cjs:76:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-daily-accrual.integration.cjs:280:19)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-05: شاشة المسير تعرض «آخر يوم محسوب» وزرار «حدّث الحساب» يشتغل",
      "ms": 3652.5671,
      "pass": false,
      "error": "آخر يوم محسوب = آخر يوم في الفترة\n+ actual - expected\n\n+ null\n- '2026-07-22'\n",
      "cause": "آخر يوم محسوب = آخر يوم في الفترة\n+ actual - expected\n\n+ null\n- '2026-07-22'\n",
      "stack": "AssertionError [ERR_ASSERTION]: آخر يوم محسوب = آخر يوم في الفترة\n+ actual - expected\n\n+ null\n- '2026-07-22'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-daily-accrual.integration.cjs:299:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-night-shift.integration.cjs",
      "name": "ليلة 12 (20:00 ← 01:00): الساعات والتأخير والنقص ليوم 12، وبصمة 00:50 لا تدخل يوم 13",
      "ms": 7165.2106,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-night-shift.integration.cjs",
      "name": "غياب ليلة 12 يُسجل ليوم 12 وحده، وليلة 13 المكتملة لا ترث منه شيئًا",
      "ms": 934.7624,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-night-shift.integration.cjs",
      "name": "ليلة آخر يوم في فترة الرواتب (22 أغسطس) تبقى في مسير أغسطس، ومسير سبتمبر (23/8–22/9) يبدأ بليلة 23 نظيفة",
      "ms": 1681.4063,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-03: 09:00, 09:30 and inclusive 10:00 with nine hours earn no lateness, no shortfall and no compensation overtime",
      "ms": 8843.0668,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05: arrival 10:01 remains 61 minutes late after either nine complete hours or staying until 20:00",
      "ms": 2609.058,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05 AC1: 10:00:59 exceeds the window before minute rounding and stores 60 late minutes",
      "ms": 1268.7376,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04: in-window departures distinguish a 75-minute shortfall from a 30-minute shortfall without lateness",
      "ms": 2586.0064,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01: employee ENABLED, DISABLED and INHERIT resolve after that day's shift instead of overriding its duration",
      "ms": 6060.0397,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01 extension: WorkSchedule without a Shift applies its own flexible window and employee override",
      "ms": 3429.2544,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: moving official start to 08:00 shifts the 60-minute window to 08:00–09:00 only from its effective date",
      "ms": 2713.7315,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: reducing the window from 60 to 30 minutes keeps a previous day unchanged after HTTP recomputation",
      "ms": 2559.9317,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-02: invalid duration and negative input reject HTTP writes without a new source version",
      "ms": 343.585,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01/09: branch-scoped users cannot edit global source definitions or another employee's override",
      "ms": 293.1812,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.2: free and paid permissions retain raw lateness while excusing their interval exactly once",
      "ms": 2990.5674,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.1: overnight punch-out belongs to the shift start date and never yields negative work duration",
      "ms": 1667.9072,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08: attendance exemption takes precedence over a late/incomplete flexible shift without deleting punches",
      "ms": 1685.361,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-06: early work is excluded by default and counted only with the explicit company setting",
      "ms": 2984.1333,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.3: morning half-leave moves the full 60-minute window to 13:30–14:30; explicit proration reduces it to 30",
      "ms": 3048.9216,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04: independent shortfall tolerance forgives ten minutes but charges all forty minutes when above fifteen",
      "ms": 4248.6832,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04 financial: 75 minutes inside the window are recovered at .625 each with no lateness at all",
      "ms": 1795.9715,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: the whole 130-minute shortfall is charged beside the 70 late minutes — no overlap subtraction",
      "ms": 1829.1949,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-07 financial: free and paid permission coverage is counted once and raw lateness cannot erase a real later shortfall",
      "ms": 3601.0102,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: forgiven lateness no longer shrinks the shortfall — the unworked 90 minutes are charged in full",
      "ms": 1736.0911,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.4: missing checkout keeps known lateness, leaves shortfall unknown and blocks payroll approval atomically",
      "ms": 1884.6956,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: approved payroll protects its original attendance and source versions against retroactive edits or recomputation",
      "ms": 2426.2174,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: no daily cap — lateness and shortfall are each charged in full, and only net protection stops the day going negative",
      "ms": 1786.024,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05 financial: approved overtime remains a separate source and cannot cancel after-window lateness",
      "ms": 2157.3553,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX policy validation: invalid settings are rejected over HTTP and a corrupted SQL policy cannot replace an existing payroll",
      "ms": 2214.4821,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX regression: final aggregate truncates an exact half-cent to two decimals despite binary floating-point noise",
      "ms": 1839.9363,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX / OT-08 regression: fixed-shift attendance materialization preserves a legacy approved overtime source",
      "ms": 1698.9375,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX regression: a backdated default work schedule cannot overlap a future default or alter its saved history",
      "ms": 640.885,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09 regression: changing general grace preserves historical source versions and applies only to a new effective version",
      "ms": 4692.9456,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: a future shift rejects earlier daily and name assignments and bulk validates each date",
      "ms": 253.55,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: a week straddling shift creation rejects by id or name and rolls back an earlier valid batch entry",
      "ms": 180.7762,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: future deactivation permits earlier new assignments and preserves already saved daily and weekly schedules",
      "ms": 4175.0274,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن صباحي ساعة (09:00–10:00) ووصول 10:30: الإذن بيغطي الساعة والـ30 دقيقة الباقية تأخير عادي",
      "ms": 5326.4061,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن صباحي ساعتين (09:00–11:00) ووصول 11:00: مفيش تأخير",
      "ms": 163.7886,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن مسائي ساعة (17:00–18:00) وخروج 17:00: مفيش انصراف بدري",
      "ms": 162.6351,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "إذن مسائي ساعة (17:00–18:00) وخروج 16:30: انصراف بدري 30 دقيقة للجزء اللي برا الإذن",
      "ms": 145.7105,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "رصيد ساعتين في الشهر: ساعة + ساعة أو ساعتين مرة واحدة، والزيادة والحد للمرة الواحدة بيترفضوا",
      "ms": 267.7253,
      "pass": true,
      "skip": false
    },
    {
      "file": "permission-window.integration.cjs",
      "name": "وقت الإذن لازم يكون صالح: من غير نهاية أو نفس الوقت بيترفض، والنوع بخصم مالوش رصيد دقايق عند التقديم",
      "ms": 112.6997,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-lateness-permission-line.integration.cjs",
      "name": "تأخير + إذن بخصم في شهر واحد: سطران في القسيمة مجموعهما = رقم «التأخير» القديم، والصافي وإجمالي الخصم كما هما",
      "ms": 5344.3026,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-lateness-permission-line.integration.cjs",
      "name": "مسير بلا إذن بخصم: سطر «التأخير» وحده — لا عمود ولا سطر «إذن بخصم» بصفر",
      "ms": 256.5111,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-lateness-permission-line.integration.cjs",
      "name": "إلغاء خصم «تأخير يوم» للإذن: العمود ينزل للتأخير وحده — النسبة ما تتلخبطش والإذن ما يظهرش بمبلغ مش مخصوم",
      "ms": 482.6455,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-lateness-permission-line.integration.cjs",
      "name": "بند مسير قديم محفوظ بلا تقسيم: القسيمة تعرض «التأخير» سطرًا واحدًا بالرقم القديم كما كانت",
      "ms": 304.445,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-10: full-month exemption defeats stale absence/95-minute lateness and new absence generation but retains a 500 quality debit",
      "ms": 6899.3289,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-12: four approved unpaid days still deduct 2000 from an exempt employee",
      "ms": 1759.0806,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-10: a 2000 loan installment and 400 documented quality debit remain payable and consumed normally",
      "ms": 2197.7273,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: June 16–30 exempts 15 days; only June 8 absence and June 3 forty-minute lateness are deducted",
      "ms": 1378.1758,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: exemption boundaries are inclusive for a single day and for a last working day at period end",
      "ms": 2256.5863,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: terminating a window from June 16 restores attendance deductions on June 16 itself",
      "ms": 1369.2466,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-09: a pending exemption has no financial effect before approval",
      "ms": 1196.7164,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: a new exempt hire receives 13/30 of 19000 in a 31-day cycle (the month is 30 days)",
      "ms": 928.2155,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11: default-ineligible overtime is excluded from source claims and is neither deleted nor consumed at payroll payment",
      "ms": 1954.0674,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11: individual eligibility pays only a genuine approved PRE_REQUESTED entry, never biometric or missing/rejected requests",
      "ms": 1854.242,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-12: an explicit unpaid-leave override preserves four approved leave days without deducting them",
      "ms": 1587.3632,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 / EX-12: null overrides inherit company defaults while explicit false/true override them",
      "ms": 2951.8362,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-14: dashboard stats, weekly trend and departments exclude a stale absent exemption from attendance ratios without rewriting it",
      "ms": 276.4813,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 request: direct OVERTIME submission by an ineligible exempt employee is rejected without a request or overtime orphan",
      "ms": 100.6269,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 request: approved explicit overtime executes without punches and a changed eligibility decision blocks final approval atomically",
      "ms": 531.6881,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
      "ms": 5691.3713,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
      "ms": 908.5829,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
      "ms": 959.8798,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
      "ms": 658.0225,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
      "ms": 487.9555,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
      "ms": 1130.2794,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
      "ms": 576.7328,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
      "ms": 686.7411,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
      "ms": 410.9304,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
      "ms": 485.5345,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
      "ms": 510.3042,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
      "ms": 719.1124,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
      "ms": 575.3158,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
      "ms": 439.2698,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
      "ms": 790.118,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
      "ms": 1220.7027,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
      "ms": 778.7905,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
      "ms": 511.6873,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
      "ms": 655.8112,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
      "ms": 473.5822,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
      "ms": 406.9383,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
      "ms": 842.6975,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
      "ms": 729.777,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
      "ms": 929.1102,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
      "ms": 891.3756,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
      "ms": 392.1571,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
      "ms": 846.4733,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
      "ms": 4093.3346,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
      "ms": 2675.4127,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 1794.6327,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at payroll (D:\\projects\\hr_system\\api\\test\\payroll-overtime-request.integration.cjs:146:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-overtime-request.integration.cjs:924:59)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
      "ms": 1695.4834,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
      "ms": 5522.3766,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
      "ms": 2440.7218,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
      "ms": 524.8334,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1569.1273,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at payroll (D:\\projects\\hr_system\\api\\test\\payroll-overtime-request.integration.cjs:146:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-overtime-request.integration.cjs:1050:59)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
      "ms": 2605.4608,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
      "ms": 379.0744,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
      "ms": 508.3528,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
      "ms": 842.4607,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
      "ms": 377.0081,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
      "ms": 520.905,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
      "ms": 2257.7994,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
      "ms": 4934.8383,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
      "ms": 1186.1708,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
      "ms": 696.6609,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
      "ms": 3382.8113,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
      "ms": 2103.5725,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
      "ms": 5079.6915,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
      "ms": 3156.563,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
      "ms": 344.6816,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
      "ms": 2485.2356,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
      "ms": 26.3818,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
      "ms": 3018.6731,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
      "ms": 3101.0421,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-wage-month.integration.cjs",
      "name": "الخطوة 13 / LOT-15 عبر مسار الطلب: الإضافي المعتمد بعد زيادة الشهر التالي يُسعَّر على راتب شهر يوم العمل، لا على الزيادة ولا راتب الملف",
      "ms": 5937.7542,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-wage-month.integration.cjs",
      "name": "الخطوة 13 عبر مسار الطلب: بلا راتب موثق لشهر يوم العمل تُظهر شاشة الطلب السبب مسبقًا، ويُرفض الاعتماد النهائي ويبقى الطلب معلقًا حتى التوثيق",
      "ms": 568.1975,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "إضافة موظف: الحقول الإجبارية برسائل واضحة، الهوية بطول الجنسية وفريدة، ورقم البصمة فريد",
      "ms": 5019.0433,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "تعديل ملف قديم ناقص: باقي الحقول تتحفظ، والمسح أو تغيير الجنسية المخالف أو «موقوف» بلا تواريخ مرفوض",
      "ms": 99.831,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "الإيقاف عن العمل: «موقوف» من التواريخ في القائمة والملف، السجل، التداخل، الغياب القديم يُشال، والإنهاء المبكر والإلغاء",
      "ms": 291.7527,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "مراجعة 16 سبتمبر: إيقاف منتهي يتلغى، والتداخل مع إجازة معتمدة أو مسير معتمد مرفوض على SQL حقيقية",
      "ms": 325.5313,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-suspension.integration.cjs",
      "name": "المسير: أيام الإيقاف تُخصم يومًا بيوم بسطر «أيام إيقاف عن العمل» بلا ازدواج مع إجازة بدون راتب",
      "ms": 1774.5529,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 5890.4181,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 10057.5186,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 1876.3095,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:43:10)\n    at calculate (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:58:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:268:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 160.7009,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 1892.3218,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:43:10)\n    at calculate (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:58:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:311:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1951.2624,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 6749.6415,
      "pass": true,
      "skip": false
    },
    {
      "file": "attendance-payroll-race.integration.cjs",
      "name": "approval holding employee-finance wins before a waiting recompute; attendance snapshot and approved OT stay immutable",
      "ms": 6067.4896,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: HTTP checkout already has one manager approval request before cron and remains idempotent",
      "ms": 5497.3065,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: closed windows incomplete punches and below-threshold days produce no automatic request",
      "ms": 629.4243,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: a computed day inside an outer transaction routes only after its SQL commit releases the employee lock",
      "ms": 298.5509,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: rolling back the outer computation leaves no request source claim or punch",
      "ms": 205.5409,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: committing an inner savepoint waits for the outer commit and does not dispatch twice",
      "ms": 300.6667,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: nested rollback discards only its refreshed existing source and preserves outer committed dispatch",
      "ms": 542.5456,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: missing manager does not fail a committed punch and cron recovers the same source after configuration is repaired",
      "ms": 365.0577,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: an approved punch correction creates its manager overtime request after correction and attendance commit",
      "ms": 388.9211,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: a top-level routing failure cannot reject the committed attendance and cron recovers its DETECTED record",
      "ms": 316.3583,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-06: مفتاح الإيقاف يرجّع الحساب لمساره القديم بنفس الأرقام بالحرف",
      "ms": 5873.521,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at calculate (D:\\projects\\hr_system\\api\\test\\payroll-daily-accrual.integration.cjs:76:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-daily-accrual.integration.cjs:280:19)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-daily-accrual.integration.cjs",
      "name": "ACR-05: شاشة المسير تعرض «آخر يوم محسوب» وزرار «حدّث الحساب» يشتغل",
      "ms": 3652.5671,
      "pass": false,
      "error": "آخر يوم محسوب = آخر يوم في الفترة\n+ actual - expected\n\n+ null\n- '2026-07-22'\n",
      "cause": "آخر يوم محسوب = آخر يوم في الفترة\n+ actual - expected\n\n+ null\n- '2026-07-22'\n",
      "stack": "AssertionError [ERR_ASSERTION]: آخر يوم محسوب = آخر يوم في الفترة\n+ actual - expected\n\n+ null\n- '2026-07-22'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-daily-accrual.integration.cjs:299:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 1794.6327,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at payroll (D:\\projects\\hr_system\\api\\test\\payroll-overtime-request.integration.cjs:146:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-overtime-request.integration.cjs:924:59)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1569.1273,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at payroll (D:\\projects\\hr_system\\api\\test\\payroll-overtime-request.integration.cjs:146:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-overtime-request.integration.cjs:1050:59)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 1876.3095,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:43:10)\n    at calculate (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:58:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:268:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 1892.3218,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:43:10)\n    at calculate (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:58:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\holiday-work.integration.cjs:311:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "نفس totalNet ونفس كل بند وتفصيله في المسارين",
    "Cleanup verified: hr_payroll_accrual_test_a4479b359eda3aa7 no longer exists in sys.databases.",
    "يدويًا: 9000/30 = 300 لليوم، 300/8/60 = 0.625 للدقيقة؛ تأخير 10 = 6.25، ونقص 20 كاملًا بلا طرح التأخير (أ4) = 20 × 0.625 = 12.50 — كلها في مسير أغسطس.",
    "تحقق حذف قاعدة الاختبار: hr_night_shift_test_cf7cc712007a6d54",
    "الراتب على 30 يوم: يوم مغطى = 9000 ÷ 30 = 300؛ والنقص 75 × 0.625 = 46.875 ← 46.87 بالقص؛ الصافي 253.13.",
    "أ4: كل خصم يُحتسب كما جاء — تأخير 70×.625=43.75 ونقص 130×.625=81.25؛ الصافي 300−125=175 (الراتب على 30 يوم).",
    "أ4: الإذن الحر ⇒ 300−18.75−56.25=225؛ والمدفوع يضيف 60×.625=37.50 فالصافي 187.50 (الراتب على 30 يوم). الإذن المدفوع لا يُحتسب مرتين.",
    "Manual: monthly1000.08 /30 /8 /60 ×100min = 6.945 → 6.94 بالقص؛ ويوم مغطى واحد يستحق 1000.08 ÷ 30 = 33.336 ← 33.33 (الراتب على 30 يوم)؛ الصافي 26.39.",
    "Legacy approval remains2h: 2 ×(9000/30/8) ×1.5 =112.50; payroll cannot change an existing approval to1h by rereading attendance.",
    "Cleanup verified: hr_payroll_flex_test_187436fd98fe88a3 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_permission_window_test_27fb7ba50fb548c2 removed.",
    "قبل: سطر واحد «التأخير» 390.00 و«دقائق التأخير» 390. بعد: «التأخير» 270.00 (270 دقيقة) + «إذن بخصم» 120.00 (120 دقيقة)؛ الصافي 14010 في الحالتين.",
    "Cleanup verified: hr_payroll_permission_line_test_bec110895fd29386 is absent from sys.databases.",
    "Manual: 12000 + 3000 − 500 quality = 14500; three stale absences and 95 late minutes generate no attendance deduction.",
    "Cleanup verified: hr_payroll_exempt_test_07da4b6744883c8d is absent from sys.databases.",
    "Cleanup verified: temporary uploads directory removed.",
    "Manual: (19:20−07:52)=688 − 540 = 148; floor(148/15)×15=135min=2.25h; 9000/30/8×1.5×2.25=126.56.",
    "Manual: 07:00–17:00 = 600 − 540 = 60 ≥ 30 ⇒ 60min=1h; 37.50×1.5×1 = 56.25.",
    "Manual: request180min, evidence135min ⇒ approved135min=2.25h; frozen37.50×1.50×2.25=126.56.",
    "Cleanup verified: hr_payroll_ot_test_71f54d9c5b1db661 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "يوم 2026-09-16 (راتب شهر 2026-09) اعتُمد عبر /requests/:id/act على 9,000: 2 س × 1.5 × 37.5 = 112.50",
    "409 OT_SALARY_MONTH_EVIDENCE_REQUIRED والطلب باقٍ في الخطوة 3؛ بعد توثيق الشهر اكتمل الاعتماد نفسه بلا إعادة تقديم",
    "Cleanup verified: hr_ot_wage_month_test_977411825663a078 removed.",
    "Manual: day rate 9000/30 = 300; suspension 5 days minus 09/07 (already unpaid leave) = 4 × 300 = 1200; leave 2 × 300 = 600; net 9000 − 1800 = 7200.",
    "Cleanup verified: hr_employee_suspension_test_246d57fce3f0a87c is absent from sys.databases.",
    "Cleanup verified: hr_holiday_work_test_bb8707f2eb21d36f is absent from sys.databases.",
    "Cleanup verified: hr_attendance_race_test_041e8bab6975a21c removed.",
    "Cleanup verified: hr_ot_dispatch_test_02980364554c03bb removed.",
    "Cleanup verified: temporary uploads removed.",
    "tests 144",
    "suites 0",
    "pass 138",
    "fail 6",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 174853.7423"
  ],
  "stdout": [
    "CR3_SHADOW_MISMATCH {\"employeeId\":7,\"from\":\"2026-06-23\",\"to\":\"2026-07-22\",\"reason\":\"persisted values including claims/events\\n+ actual - expected\\n... Skipped lines\\n\\n  {\\n    accruals: [\\n      '{\\\"id\\\":641,\\\"runId\\\":null,\\\"employeeId\\\":7,\\\"period\\\":\\\"2026-07\\\",\\\"date\\\":\\\"2026-06-22T21:00:00.000Z\\\",\\\"attendanceStatus\\\":\\\"present\\\",\\\"workMinutes\\\":485,\\\"lateMinutes\\\":0,\\\"deductibleMinutes\\\":0,\\\"shortfallMinutes\\\":0,\\\"earlyLeaveMinutes\\\":0,\\\"overtimeMinutes\\\":0,\\\"overtimeAmount\\\":0,\\\"isAbsent\\\":false,\\\"isLeave\\\":false,\\\"isUnpaidLeave\\\":false,\\\"isSickLeave\\\":false,\\\"isSuspended\\\":false,\\\"isHolidayWork\\\":false,\\\"isExempt\\\":false,\\\"isWorkday\\\":true,\\\"earningsAmount\\\":370,\\\"latenessAmount\\\":0,\\\"shortfallAmount\\\":0,\\\"absenceAmount\\\":0,\\\"leaveAmount\\\":0,\\\"suspensionAmount\\\":0,\\\"components\\\":\\\"{\\\\\\\\\\\"v\\\\\\\\\\\":1,\\\\\\\\\\\"note\\\\\\\\\\\":\\\\\\\\\\\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\\\\\\\\\\\",\\\\\\\\\\\"attendanceDayId\\\\\\\\\\\":\\\\\\\\\\\"days:existing:391\\\\\\\\\\\",\\\\\\\\\\\"de\"}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":31,\"compared\":30,\"rows\":1480,\"mismatches\":1,\"equalErrors\":0}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":2,\"compared\":2,\"rows\":7,\"mismatches\":0,\"equalErrors\":0}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":15,\"compared\":15,\"rows\":347,\"mismatches\":0,\"equalErrors\":0}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":0,\"compared\":0,\"rows\":0,\"mismatches\":0,\"equalErrors\":0}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":5,\"compared\":5,\"rows\":13,\"mismatches\":0,\"equalErrors\":0}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":14,\"compared\":14,\"rows\":821,\"mismatches\":0,\"equalErrors\":0}\n",
    "# SQL barrier 2 operations: [{\"session_id\":80,\"blocking_session_id\":54,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":81,\"blocking_session_id\":80,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "# SQL barrier 3 operations: [{\"session_id\":54,\"blocking_session_id\":80,\"wait_type\":\"LCK_M_X\",\"depth\":2},{\"session_id\":80,\"blocking_session_id\":81,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":82,\"blocking_session_id\":80,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "CR3_SHADOW_MISMATCH {\"employeeId\":160,\"from\":\"2026-09-01\",\"to\":\"2026-09-30\",\"reason\":\"persisted values including claims/events\\n+ actual - expected\\n... Skipped lines\\n\\n  {\\n    accruals: [\\n      '{\\\"id\\\":\\\"<new identity>\\\",\\\"runId\\\":null,\\\"employeeId\\\":160,\\\"period\\\":\\\"2026-09\\\",\\\"date\\\":\\\"2026-08-31T21:00:00.000Z\\\",\\\"attendanceStatus\\\":\\\"absent\\\",\\\"workMinutes\\\":0,\\\"lateMinutes\\\":0,\\\"deductibleMinutes\\\":0,\\\"shortfallMinutes\\\":0,\\\"earlyLeaveMinutes\\\":0,\\\"overtimeMinutes\\\":0,\\\"overtimeAmount\\\":0,\\\"isAbsent\\\":true,\\\"isLeave\\\":false,\\\"isUnpaidLeave\\\":false,\\\"isSickLeave\\\":false,\\\"isSuspended\\\":false,\\\"isHolidayWork\\\":false,\\\"isExempt\\\":false,\\\"isWorkday\\\":true,\\\"earningsAmount\\\":300,\\\"latenessAmount\\\":0,\\\"shortfallAmount\\\":0,\\\"absenceAmount\\\":300,\\\"leaveAmount\\\":0,\\\"suspensionAmount\\\":0,\\\"components\\\":\\\"{\\\\\\\\\\\"v\\\\\\\\\\\":1,\\\\\\\\\\\"note\\\\\\\\\\\":\\\\\\\\\\\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\\\\\\\\\\\",\\\\\\\\\\\"attendanceDayId\\\\\\\\\\\":\\\\\\\\\\\"days:160|2026\"}\n",
    "CR3_SHADOW_MISMATCH {\"employeeId\":180,\"from\":\"2026-09-01\",\"to\":\"2026-09-30\",\"reason\":\"persisted values including claims/events\\n+ actual - expected\\n... Skipped lines\\n\\n  {\\n    accruals: [\\n      '{\\\"id\\\":\\\"<new identity>\\\",\\\"runId\\\":null,\\\"employeeId\\\":180,\\\"period\\\":\\\"2026-09\\\",\\\"date\\\":\\\"2026-08-31T21:00:00.000Z\\\",\\\"attendanceStatus\\\":\\\"absent\\\",\\\"workMinutes\\\":0,\\\"lateMinutes\\\":0,\\\"deductibleMinutes\\\":0,\\\"shortfallMinutes\\\":0,\\\"earlyLeaveMinutes\\\":0,\\\"overtimeMinutes\\\":0,\\\"overtimeAmount\\\":0,\\\"isAbsent\\\":true,\\\"isLeave\\\":false,\\\"isUnpaidLeave\\\":false,\\\"isSickLeave\\\":false,\\\"isSuspended\\\":false,\\\"isHolidayWork\\\":false,\\\"isExempt\\\":false,\\\"isWorkday\\\":true,\\\"earningsAmount\\\":300,\\\"latenessAmount\\\":0,\\\"shortfallAmount\\\":0,\\\"absenceAmount\\\":300,\\\"leaveAmount\\\":0,\\\"suspensionAmount\\\":0,\\\"components\\\":\\\"{\\\\\\\\\\\"v\\\\\\\\\\\":1,\\\\\\\\\\\"note\\\\\\\\\\\":\\\\\\\\\\\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\\\\\\\\\\\",\\\\\\\\\\\"attendanceDayId\\\\\\\\\\\":\\\\\\\\\\\"days:180|2026\"}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":28,\"compared\":26,\"rows\":1640,\"mismatches\":2,\"equalErrors\":0}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":0,\"compared\":0,\"rows\":0,\"mismatches\":0,\"equalErrors\":0}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":1,\"compared\":1,\"rows\":57,\"mismatches\":0,\"equalErrors\":0}\n",
    "CR3_SHADOW_MISMATCH {\"employeeId\":5,\"from\":\"2026-07-01\",\"to\":\"2026-07-31\",\"reason\":\"persisted values including claims/events\\n+ actual - expected\\n... Skipped lines\\n\\n  {\\n    accruals: [\\n      '{\\\"id\\\":\\\"<new identity>\\\",\\\"runId\\\":null,\\\"employeeId\\\":5,\\\"period\\\":\\\"2026-07\\\",\\\"date\\\":\\\"2026-06-30T21:00:00.000Z\\\",\\\"attendanceStatus\\\":\\\"absent\\\",\\\"workMinutes\\\":0,\\\"lateMinutes\\\":0,\\\"deductibleMinutes\\\":0,\\\"shortfallMinutes\\\":0,\\\"earlyLeaveMinutes\\\":0,\\\"overtimeMinutes\\\":0,\\\"overtimeAmount\\\":0,\\\"isAbsent\\\":true,\\\"isLeave\\\":false,\\\"isUnpaidLeave\\\":false,\\\"isSickLeave\\\":false,\\\"isSuspended\\\":false,\\\"isHolidayWork\\\":false,\\\"isExempt\\\":false,\\\"isWorkday\\\":true,\\\"earningsAmount\\\":300,\\\"latenessAmount\\\":0,\\\"shortfallAmount\\\":0,\\\"absenceAmount\\\":300,\\\"leaveAmount\\\":0,\\\"suspensionAmount\\\":0,\\\"components\\\":\\\"{\\\\\\\\\\\"v\\\\\\\\\\\":1,\\\\\\\\\\\"note\\\\\\\\\\\":\\\\\\\\\\\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\\\\\\\\\\\",\\\\\\\\\\\"attendanceDayId\\\\\\\\\\\":\\\\\\\\\\\"days:5|2026-06-\"}\n",
    "CR3_SHADOW_MISMATCH {\"employeeId\":7,\"from\":\"2026-07-01\",\"to\":\"2026-07-31\",\"reason\":\"persisted values including claims/events\\n+ actual - expected\\n... Skipped lines\\n\\n  {\\n    accruals: [\\n      '{\\\"id\\\":\\\"<new identity>\\\",\\\"runId\\\":null,\\\"employeeId\\\":7,\\\"period\\\":\\\"2026-07\\\",\\\"date\\\":\\\"2026-06-30T21:00:00.000Z\\\",\\\"attendanceStatus\\\":\\\"absent\\\",\\\"workMinutes\\\":0,\\\"lateMinutes\\\":0,\\\"deductibleMinutes\\\":0,\\\"shortfallMinutes\\\":0,\\\"earlyLeaveMinutes\\\":0,\\\"overtimeMinutes\\\":0,\\\"overtimeAmount\\\":0,\\\"isAbsent\\\":true,\\\"isLeave\\\":false,\\\"isUnpaidLeave\\\":false,\\\"isSickLeave\\\":false,\\\"isSuspended\\\":false,\\\"isHolidayWork\\\":false,\\\"isExempt\\\":false,\\\"isWorkday\\\":true,\\\"earningsAmount\\\":300,\\\"latenessAmount\\\":0,\\\"shortfallAmount\\\":0,\\\"absenceAmount\\\":300,\\\"leaveAmount\\\":0,\\\"suspensionAmount\\\":0,\\\"components\\\":\\\"{\\\\\\\\\\\"v\\\\\\\\\\\":1,\\\\\\\\\\\"note\\\\\\\\\\\":\\\\\\\\\\\"مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته\\\\\\\\\\\",\\\\\\\\\\\"attendanceDayId\\\\\\\\\\\":\\\\\\\\\\\"days:7|2026-06-\"}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":16,\"compared\":14,\"rows\":1145,\"mismatches\":2,\"equalErrors\":0}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":1,\"compared\":1,\"rows\":2,\"mismatches\":0,\"equalErrors\":0}\n",
    "CR3_SHADOW_SUMMARY {\"calls\":0,\"compared\":0,\"rows\":0,\"mismatches\":0,\"equalErrors\":0}\n"
  ]
}

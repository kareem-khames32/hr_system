module.exports = {
  "selected": [
    "payroll-lateness-permission-line",
    "payroll-work-pressure-allowance",
    "payroll-overtime-request",
    "payroll-typed-deductions"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 86,
      "failed": 0,
      "passed": 86,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 86,
      "suites": 0
    },
    "duration_ms": 137687.4484
  },
  "results": [
    {
      "file": "payroll-lateness-permission-line.integration.cjs",
      "name": "تأخير + إذن بخصم في شهر واحد: سطران في القسيمة مجموعهما = رقم «التأخير» القديم، والصافي وإجمالي الخصم كما هما",
      "ms": 6485.1409,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-lateness-permission-line.integration.cjs",
      "name": "مسير بلا إذن بخصم: سطر «التأخير» وحده — لا عمود ولا سطر «إذن بخصم» بصفر",
      "ms": 257.4088,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-lateness-permission-line.integration.cjs",
      "name": "إلغاء خصم «تأخير يوم» للإذن: العمود ينزل للتأخير وحده — النسبة ما تتلخبطش والإذن ما يظهرش بمبلغ مش مخصوم",
      "ms": 472.3812,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-lateness-permission-line.integration.cjs",
      "name": "بند مسير قديم محفوظ بلا تقسيم: القسيمة تعرض «التأخير» سطرًا واحدًا بالرقم القديم كما كانت",
      "ms": 280.8875,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-M1: migration 071 through the real migrator on a database with an old employee and old monthly salary history — additive, zero schema delta, old fingerprints intact, re-runnable, and a wrong shape stops with its code",
      "ms": 11028.7294,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-A: 6000 + 1000 with an absent day, lateness, shortfall, one unpaid day, overtime, a typed day-deduction, a 7% cap and social insurance — every base is 6000 and the 1000 is paid whole",
      "ms": 868.5248,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-B: debts bigger than the salary plus a loan installment — the 1000 is still paid whole; approval, payment, the employee payslip and profile all carry it",
      "ms": 925.108,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-C: a joiner mid-period gets the allowance prorated by the same service-day rule as the salary; the control without it differs by exactly that amount",
      "ms": 349.0915,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-D: a dated change of the allowance is a dated salary change — October pays 1000 and November 1500 from the monthly salary history",
      "ms": 455.7142,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-E: end of service in the settlement preview equals a control employee without the allowance; the last-month salary line carries it through the run item",
      "ms": 469.4826,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-G: bulk update from Excel — employee code + «بدل ضغط العمل» is a dated salary change with audit, and the next run pays it",
      "ms": 409.1264,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-N: the allowance never covers a negative effect net — unpaid leave beyond the salary still blocks approval although the paid net is positive",
      "ms": 374.4541,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-P: a salary change sent without the allowance (an older client) keeps the current allowance instead of zeroing it",
      "ms": 89.986,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-work-pressure-allowance.integration.cjs",
      "name": "WP-L: an employee without the allowance (the old one from before 071) keeps the item, breakdown and snapshot exactly as before",
      "ms": 305.436,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
      "ms": 7454.1461,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
      "ms": 953.8942,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
      "ms": 1122.7575,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
      "ms": 754.4282,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
      "ms": 600.3812,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
      "ms": 1445.5522,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
      "ms": 1092.4024,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
      "ms": 1141.5261,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
      "ms": 454.9444,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
      "ms": 553.8996,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
      "ms": 500.0628,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
      "ms": 748.9539,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
      "ms": 573.1735,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
      "ms": 447.79,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
      "ms": 861.2371,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
      "ms": 1184.8754,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
      "ms": 986.2197,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
      "ms": 581.4207,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
      "ms": 802.7356,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
      "ms": 732.7592,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
      "ms": 578.0705,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
      "ms": 1001.6637,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
      "ms": 1473.3295,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
      "ms": 1213.7693,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
      "ms": 499.4935,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
      "ms": 831.6555,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
      "ms": 1126.1529,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
      "ms": 1046.9208,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
      "ms": 460.4309,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
      "ms": 1049.7225,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
      "ms": 2278.2388,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
      "ms": 1524.2672,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 2495.044,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
      "ms": 1445.9006,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
      "ms": 3534.0677,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
      "ms": 2740.4281,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
      "ms": 875.1701,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1949.7314,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
      "ms": 3038.4465,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
      "ms": 417.8627,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
      "ms": 744.2027,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
      "ms": 1049.6744,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
      "ms": 477.3654,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
      "ms": 684.2717,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
      "ms": 1465.6474,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
      "ms": 2953.433,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
      "ms": 1343.4671,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
      "ms": 609.2431,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
      "ms": 2683.9459,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
      "ms": 1137.4716,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
      "ms": 4327.5822,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
      "ms": 2783.965,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
      "ms": 498.0191,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
      "ms": 2445.7195,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
      "ms": 27.3353,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
      "ms": 2697.7274,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
      "ms": 2722.4705,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 8939.8407,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 4177.5839,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 409.3775,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 275.0474,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 461.2447,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 53.0608,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1847.4141,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 244.3266,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 376.8857,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 507.7567,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 561.8486,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 2281.1413,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 39.3758,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 329.4323,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 403.2185,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "قبل: سطر واحد «التأخير» 390.00 و«دقائق التأخير» 390. بعد: «التأخير» 270.00 (270 دقيقة) + «إذن بخصم» 120.00 (120 دقيقة)؛ الصافي 14010 في الحالتين.",
    "Cleanup verified: hr_payroll_permission_line_test_1ba24877f00b42cc is absent from sys.databases.",
    "باليد: 6000 + إضافي 75 − تأخير 20 − نقص 12.50 − غياب 200 − بلا أجر 200 − مصنف 187.50 (سقف 420 − 232.50) − تأمينات 660 = 4795 + البدل 1000 = 5795.00",
    "b1: دين 9000 → اتحصل 6000 ورحّل 3000، القسط 0، الصافي = البدل 1000. b2: دين 5800 وقسط 200 من الست، الصافي = البدل 1000.",
    "المعيَّن 10 أكتوبر: 22 يوم خدمة ÷ 30 — الراتب 4400.00 والبدل 733.33 بنفس القاعدة.",
    "مكافأة نهاية الخدمة للاتنين 63509.58؛ راتب آخر شهر 7000 مقابل 6000 (البدل بيوصل التصفية جوه صافي بند المسير بس).",
    "Cleanup verified: hr_work_pressure_test_df00c41dbc780edd removed.",
    "Manual: (19:20−07:52)=688 − 540 = 148; floor(148/15)×15=135min=2.25h; 9000/30/8×1.5×2.25=126.56.",
    "Manual: 07:00–17:00 = 600 − 540 = 60 ≥ 30 ⇒ 60min=1h; 37.50×1.5×1 = 56.25.",
    "Manual: request180min, evidence135min ⇒ approved135min=2.25h; frozen37.50×1.50×2.25=126.56.",
    "Manual: evidence 135 of the 180 requested minutes ⇒ 2.25h × 37.50 × 1.5 = 126.56, approved by HR at submission.",
    "Cleanup verified: hr_payroll_ot_test_79db7e26f70cf65b no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Cleanup verified: hr_payroll_typed_deductions_test_598bc69bc6b03a52 is absent from sys.databases.",
    "tests 86",
    "suites 0",
    "pass 86",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 137687.4484"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_permission_line_test_1ba24877f00b42cc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_permission_line_test_1ba24877f00b42cc\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_work_pressure_test_df00c41dbc780edd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_work_pressure_test_df00c41dbc780edd\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_ot_test_79db7e26f70cf65b\"}\n",
    "# SQL barrier 2 operations: [{\"session_id\":54,\"blocking_session_id\":79,\"wait_type\":\"LCK_M_X\",\"depth\":2},{\"session_id\":79,\"blocking_session_id\":58,\"wait_type\":\"LCK_M_X\",\"depth\":1}]\n",
    "# SQL barrier 3 operations: [{\"session_id\":52,\"blocking_session_id\":79,\"wait_type\":\"LCK_M_X\",\"depth\":2},{\"session_id\":58,\"blocking_session_id\":79,\"wait_type\":\"LCK_M_X\",\"depth\":2},{\"session_id\":79,\"blocking_session_id\":54,\"wait_type\":\"LCK_M_X\",\"depth\":1}]\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_ot_test_79db7e26f70cf65b\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_typed_deductions_test_598bc69bc6b03a52\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_typed_deductions_test_598bc69bc6b03a52\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-p2b-money",
    "payroll-approval-chain-disbursement",
    "payroll-overtime-request",
    "payroll-installment-ledger",
    "payroll-attendance-exemption"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 103,
      "failed": 0,
      "passed": 103,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 103,
      "suites": 0
    },
    "duration_ms": 108205.276
  },
  "results": [
    {
      "file": "codex-review-p2b-money.integration.cjs",
      "name": "P2A payroll outbox and audit failure roll back actual approval; all four money scenarios equal committed phase 1",
      "ms": 10433.7132,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 13923.8231,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 536.1985,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 6250.1574,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 6193.2062,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 1422.8107,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 1145.514,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 756.1514,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 866.4994,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 652.3258,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 155.2522,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 148 raw (worked − required) and 135 rounded minutes without writes",
      "ms": 10299.0451,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150",
      "ms": 1166.0304,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview: in an OPEN window no evidence, incomplete checkout and a future date prevent submission without request or entry orphans",
      "ms": 1211.2127,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: a request submitted before checkout is computed from punches at final approval with the worked-time rule",
      "ms": 822.7833,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT closed window: an approved request whose punches give no eligible overtime records zero and completes without payroll value",
      "ms": 659.2351,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-02 preview: a company closure governs over a branch opening and exposes its identifier",
      "ms": 1468.5455,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged",
      "ms": 809.2794,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime",
      "ms": 930.1189,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch",
      "ms": 509.3008,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes",
      "ms": 588.6874,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor",
      "ms": 695.9165,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes",
      "ms": 1038.411,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime",
      "ms": 829.1064,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission",
      "ms": 673.5053,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes",
      "ms": 1223.5342,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it",
      "ms": 1653.6994,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request",
      "ms": 1145.1535,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime",
      "ms": 731.8195,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow",
      "ms": 846.1148,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours",
      "ms": 700.4171,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision",
      "ms": 635.6909,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-10 return: in a closed period changed punches do not block (computed at approval); return and resubmit refresh the same claimed entry",
      "ms": 1072.2487,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: overtime HR files on behalf is approved at once through the three steps with the same evidence, events, frozen price and payroll line as the manual chain",
      "ms": 1664.5814,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: a closed-period day with an incomplete punch or not over yet refuses the HR instant approval as a whole; complete punches are approved at once from them",
      "ms": 1423.4423,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "Owner 26-Sep: an eligible exempt employee overtime filed by HR is approved at once for the explicit requested hours without biometric evidence",
      "ms": 631.0264,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan",
      "ms": 1069.0828,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair",
      "ms": 1224.4251,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically",
      "ms": 1256.9956,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-03 policy: early work counts as worked time whether or not the legacy early switch is enabled",
      "ms": 654.6252,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-09 limits: monthly cap is enforced independently of a disabled weekly cap",
      "ms": 1201.2209,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once",
      "ms": 2247.8295,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate",
      "ms": 1639.1568,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again",
      "ms": 3065.6864,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll",
      "ms": 2418.0837,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference",
      "ms": 3710.8674,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment",
      "ms": 2778.6018,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines",
      "ms": 853.7032,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data",
      "ms": 1712.3995,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard",
      "ms": 2821.021,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged",
      "ms": 711.4058,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval",
      "ms": 846.5086,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim",
      "ms": 1021.3791,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: returned automatic request without an original detected entry cannot create a replacement source",
      "ms": 545.834,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted",
      "ms": 743.3763,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll",
      "ms": 1509.2419,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement",
      "ms": 3385.5156,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically",
      "ms": 1282.7134,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement",
      "ms": 741.1791,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime",
      "ms": 2775.1207,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll",
      "ms": 1108.2605,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace",
      "ms": 5196.4315,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace",
      "ms": 2057.8697,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines",
      "ms": 457.3658,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment",
      "ms": 2290.1366,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: settings cannot exclude allowances from new overtime approvals",
      "ms": 28.2459,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary: new approval uses full monthly salary despite a historical basic-only setting",
      "ms": 2532.9073,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overtime-request.integration.cjs",
      "name": "OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount",
      "ms": 2544.1843,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: calculation is a draft, approval reserves, and payment posts exactly 400 with a 1266 child and net 500",
      "ms": 11369.0408,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: SKIP reserves the zero deduction action and posts a full deferred child without reducing salary",
      "ms": 1199.1933,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: full repayment creates no child, cannot be posted twice, and PAID cannot be reopened or cancelled",
      "ms": 1554.8356,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: reopening releases the claim with history and reapproval reserves a fresh allocation before one payment",
      "ms": 1522.6696,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: repeated draft calculations and cancellation never reserve or move a loan balance",
      "ms": 1280.5954,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: an amount changed after calculation rejects approval atomically without reserving stale debt",
      "ms": 1264.6519,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: a source revision changed after approval rejects payment and preserves the held allocation",
      "ms": 1313.0698,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: approval and payment use captured options when live defaults change",
      "ms": 1270.224,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: failure writing the reservation audit rolls back both installment and employee period claims",
      "ms": 1491.1859,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: failure writing payment audit rolls back parent, child, allocation and payroll status together",
      "ms": 1365.69,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: planless legacy amounts and tampered saved plans require recalculation before approval or payment",
      "ms": 2347.7432,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: manual deferral closes the parent and creates one complete future child even when salary can cover it",
      "ms": 1457.8322,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: held claims block manual deferral and early settlement including zero-deduction SKIP",
      "ms": 1419.8378,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: manual deferral rejects stale revision, changed captured amount and invalid reason without moving debt",
      "ms": 689.2407,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: early settlement consumes only the remaining child after partial payroll and retries are idempotent",
      "ms": 1416.5135,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: EOS includes a draft source, blocks on approval, then reads only the unpaid child after payroll payment",
      "ms": 2051.3345,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: an EOS snapshot becomes stale when a manual deferral replaces its source with a new child ID",
      "ms": 422.0635,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: inconsistent transferred balances fail visibly in payroll and EOS instead of losing the remainder",
      "ms": 1239.9011,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: real JWT permissions and branch scope protect run transitions and loan financial reads",
      "ms": 2609.9322,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-installment-ledger.integration.cjs",
      "name": "Installment ledger: concurrent approvals in different payroll periods cannot reserve the same overdue parent twice",
      "ms": 1778.7396,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-10: full-month exemption defeats stale absence/95-minute lateness and new absence generation but retains a 500 quality debit",
      "ms": 9705.3627,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-12: four approved unpaid days still deduct 2000 from an exempt employee",
      "ms": 672.7373,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-10: a 2000 loan installment and 400 documented quality debit remain payable and consumed normally",
      "ms": 1529.6813,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: June 16–30 exempts 15 days; only June 8 absence and June 3 forty-minute lateness are deducted",
      "ms": 732.75,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: exemption boundaries are inclusive for a single day and for a last working day at period end",
      "ms": 1482.5241,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: terminating a window from June 16 restores attendance deductions on June 16 itself",
      "ms": 639.2151,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-09: a pending exemption has no financial effect before approval",
      "ms": 624.6601,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-13: a new exempt hire receives 13/30 of 19000 in a 31-day cycle (the month is 30 days)",
      "ms": 334.9627,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11: default-ineligible overtime is excluded from source claims and is neither deleted nor consumed at payroll payment",
      "ms": 871.9028,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11: individual eligibility pays only a genuine approved PRE_REQUESTED entry, never biometric or missing/rejected requests",
      "ms": 850.7022,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-12: an explicit unpaid-leave override preserves four approved leave days without deducting them",
      "ms": 569.6861,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 / EX-12: null overrides inherit company defaults while explicit false/true override them",
      "ms": 1224.4473,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-14: dashboard stats, weekly trend and departments exclude a stale absent exemption from attendance ratios without rewriting it",
      "ms": 370.0064,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 request: direct OVERTIME submission by an ineligible exempt employee is rejected without a request or overtime orphan",
      "ms": 119.3126,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-attendance-exemption.integration.cjs",
      "name": "EX-11 request: approved explicit overtime executes without punches and a changed eligibility decision blocks final approval atomically",
      "ms": 602.3927,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P2A-money\",\"totalNet\":34236.56,\"net\":[7455.56,18163,1703,6915],\"allDecimalColumnsEqualPhase1\":true,\"controls\":[{\"failedTable\":\"outbox_events\",\"status\":500,\"allFinancialAndEventRowsUnchanged\":true},{\"failedTable\":\"audit_log\",\"status\":500,\"allFinancialAndEventRowsUnchanged\":true}]}",
    "Cleanup verified: hr_chain_disburse_test_2eda93bae89ebd7a is absent from sys.databases.",
    "Manual: (19:20−07:52)=688 − 540 = 148; floor(148/15)×15=135min=2.25h; 9000/30/8×1.5×2.25=126.56.",
    "Manual: 07:00–17:00 = 600 − 540 = 60 ≥ 30 ⇒ 60min=1h; 37.50×1.5×1 = 56.25.",
    "Manual: request180min, evidence135min ⇒ approved135min=2.25h; frozen37.50×1.50×2.25=126.56.",
    "Manual: evidence 135 of the 180 requested minutes ⇒ 2.25h × 37.50 × 1.5 = 126.56, approved by HR at submission.",
    "Cleanup verified: hr_payroll_ot_test_c331fd6c15ebbc0a no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "SQL barrier observed: [{\"session_id\":88,\"blocking_session_id\":75,\"wait_type\":\"LCK_M_X\"}]",
    "Cleanup verified: hr_payroll_installment_ledger_test_96fa85cf0c91e577 is absent from sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "Manual: 12000 + 3000 − 500 quality = 14500; three stale absences and 95 late minutes generate no attendance deduction.",
    "Cleanup verified: hr_payroll_exempt_test_790a86cc5a879674 is absent from sys.databases.",
    "Cleanup verified: temporary uploads directory removed.",
    "tests 103",
    "suites 0",
    "pass 103",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 108205.276"
  ],
  "stdout": [
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2a_money_test_4e82d1c1428f1193\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2a_money_test_4e82d1c1428f1193\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2a_money_test_4e82d1c1428f1193\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":3,\"compared\":0,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_2eda93bae89ebd7a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_2eda93bae89ebd7a\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":5,\"compared\":62,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_ot_test_c331fd6c15ebbc0a\"}\n",
    "# SQL barrier 2 operations: [{\"session_id\":55,\"blocking_session_id\":72,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":74,\"blocking_session_id\":55,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "# SQL barrier 3 operations: [{\"session_id\":55,\"blocking_session_id\":65,\"wait_type\":\"LCK_M_X\",\"depth\":2},{\"session_id\":65,\"blocking_session_id\":74,\"wait_type\":\"LCK_M_X\",\"depth\":1},{\"session_id\":72,\"blocking_session_id\":65,\"wait_type\":\"LCK_M_X\",\"depth\":2}]\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_ot_test_c331fd6c15ebbc0a\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":12,\"compared\":332,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_installment_ledger_test_96fa85cf0c91e577\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_installment_ledger_test_96fa85cf0c91e577\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":20,\"compared\":0,\"mismatches\":0}\n",
    "REVIEW_PROGRESS {\"inMemoryProductRef\":\"73d5643\",\"sourceFiles\":433}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_exempt_test_790a86cc5a879674\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_exempt_test_790a86cc5a879674\"}\n",
    "RANGE_SHADOW_SUMMARY {\"ranges\":3,\"compared\":0,\"mismatches\":0,\"live\":2,\"liveRows\":0}\n"
  ]
}

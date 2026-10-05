module.exports = {
  "selected": [
    "modules-enforcement",
    "profile-self-service",
    "payroll-bonuses",
    "payroll-typed-deductions",
    "loan-completion",
    "hr-final-authority",
    "request-execution",
    "hr-documents"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 109,
      "failed": 6,
      "passed": 103,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 109,
      "suites": 0
    },
    "duration_ms": 84854.8619
  },
  "results": [
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل",
      "ms": 8110.115,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها",
      "ms": 114.7546,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش",
      "ms": 257.7603,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته",
      "ms": 343.0424,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل",
      "ms": 106.8589,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي",
      "ms": 269.5979,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-07: المزايا الفرعية والباقات",
      "ms": 192.9137,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش",
      "ms": 463.3242,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني",
      "ms": 1481.3867,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول",
      "ms": 377.7149,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال",
      "ms": 598.6117,
      "pass": true,
      "skip": false
    },
    {
      "file": "modules-enforcement.integration.cjs",
      "name": "ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي",
      "ms": 171.8028,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-01: the request applies nothing until the final approval, then writes only the changed fields with one change-log row each",
      "ms": 8257.8071,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-02: invalid values are refused at submission with an Arabic message and leave no request; a request invalid at approval applies nothing",
      "ms": 723.5228,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-03: national ID and passport stay unique — checked at the final approval only (no oracle for the employee), and under two simultaneous approvals",
      "ms": 496.9508,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-03b: the final approval of an identity change waits on the same identity lock as the HR edit (hr:employees:identity)",
      "ms": 139.1624,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-04: bank, salary, org, codes, dates and the work email are refused — even when configured as a field of the type",
      "ms": 164.5263,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-05: the self photo endpoint — own employee only, image only, uploaded by the caller; the owner and in-scope HR see it",
      "ms": 394.4661,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 10340.7077,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2795.28,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 474.2907,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 253.1724,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 85.3369,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1515.9861,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 634.3037,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 268.9233,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 654.6636,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1363.5558,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR29-B01: قيد الدفتر المباشر وصرف البدل وقاعدة شيل الخصم بالاسم بتقرا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلها بيرفضها من غير أي كتابة",
      "ms": 487.8713,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR33-B01: رقم مسير فرع تاني مايظهرش لموارد الفرع في عرض المكافأة والخصم ولا في رسايل رفض الإلغاء و«الشهر مقفول»، ومسير الفرع نفسه بيظهر",
      "ms": 2560.9726,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR34-B01: أحداث الخصم (الترحيل) مابتكشفش رقم مسير فرع تاني لموارد الفرع بعد نقل الموظف، والشركة بتشوفه",
      "ms": 1171.8537,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR36-B01: «دفتر المستحقات» ورد إلغاء القيد وسجل الإضافي مابيكشفوش رقم مسير فرع تاني بعد نقل الموظف (محجوز ومصروف)، والشركة بتشوفه",
      "ms": 2312.3229,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 10448.138,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2650.9509,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 429.7038,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 201.5398,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 400.9841,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 53.1084,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1533.4593,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 208.7459,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 341.8888,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 497.5476,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 577.6662,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 1955.5463,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 46.5861,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 334.4451,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 300.6262,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 8631.6626,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 523.0578,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 149.0343,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 266.1767,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 80.5265,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 63.7676,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 387.1468,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
      "ms": 525.8413,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR34-B01: دفتر السلفة لقارئ رواتب الفرع — رقم مسير اتعمل للموظف في فرع تاني (قبل نقله) مابيظهرش ولا «#رقمه» في نص الحدث؛ مسير فرعه وحساب الشركة والموظف نفسه بيشوفوه",
      "ms": 217.8128,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: promotion, title change, contract renewal and secondment HR files on behalf are approved at once and execute exactly as after the last approver",
      "ms": 7971.7522,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: a resignation HR files on behalf is approved at once, puts the employee in notice period and opens the offboarding case",
      "ms": 183.2138,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: money requests HR files on behalf are approved at once and post their ledger entries — expense, per diem and adjustment",
      "ms": 198.3566,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: a creator without HR authority keeps the whole chain for the same types and never approves his own; HR own resignation keeps its chain too",
      "ms": 219.7329,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 7516.3747,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 152.3934,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 224.9843,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 115.0746,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 1129.7092,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 224.8632,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 129.3867,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 425.2869,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 456.4052,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 375.7185,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.8445,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 270.9646,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 89.5924,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 259.2184,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 203.9746,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 76.6423,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 301.5465,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 83.6783,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 390.124,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 159.5964,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 213.4665,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 2466.4442,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 394.63,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 305.2394,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 635.3136,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 94.2478,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 141.2716,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 116.8462,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 223.2799,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 347.6093,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 365.0515,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 74.8544,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 72.201,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 218.8825,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 88.2481,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 183.8032,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 89.9184,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 181.6773,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 92.9138,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 108.6478,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "HR template permissions and validation prevent forged variables and null patches without changing letters",
      "ms": 7369.905,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "draft edits do not change publication, and stale versions cannot overwrite a template",
      "ms": 124.8478,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "sample preview is a real PDF and neither it nor employee preview creates records",
      "ms": 3272.0829,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:122:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "employee and custom fields are required only when referenced, with branch isolation before issuance",
      "ms": 191.1179,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "issuance archives a PDF in employee documents and concurrent retries issue it only once",
      "ms": 1070.7306,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:154:40)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a saved document keeps its bytes after template and employee changes; an idempotent retry returns that issuance",
      "ms": 554.719,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:173:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "financial tokens and both PDF download paths enforce finance permission and current branch",
      "ms": 519.2074,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:192:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a general company document needs no employee and remains visible only in its branch scope",
      "ms": 561.4792,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:207:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a database failure after PDF creation leaves no files or partial records and the same key can retry",
      "ms": 979.1734,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:231:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "hr-documents.integration.cjs",
      "name": "sample preview is a real PDF and neither it nor employee preview creates records",
      "ms": 3272.0829,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:122:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "issuance archives a PDF in employee documents and concurrent retries issue it only once",
      "ms": 1070.7306,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:154:40)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a saved document keeps its bytes after template and employee changes; an idempotent retry returns that issuance",
      "ms": 554.719,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:173:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "financial tokens and both PDF download paths enforce finance permission and current branch",
      "ms": 519.2074,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:192:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a general company document needs no employee and remains visible only in its branch scope",
      "ms": 561.4792,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:207:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-documents.integration.cjs",
      "name": "a database failure after PDF creation leaves no files or partial records and the same key can retry",
      "ms": 979.1734,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\suite-b01s\\api\\test\\hr-documents.integration.cjs:231:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_modules_test_0bce3eb6b066646d is absent from sys.databases.",
    "Cleanup verified: hr_profile_test_d345f12a832dd36e is absent from sys.databases.",
    "Cleanup verified: hr_payroll_bonuses_test_0d97b7d7f880220a is absent from sys.databases.",
    "Cleanup verified: hr_payroll_typed_deductions_test_00c916bf0f8c700a is absent from sys.databases.",
    "tests 109",
    "suites 0",
    "pass 103",
    "fail 6",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 84854.8619"
  ],
  "stdout": [
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_modules_test_0bce3eb6b066646d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_modules_test_0bce3eb6b066646d\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_profile_test_d345f12a832dd36e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_profile_test_d345f12a832dd36e\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_bonuses_test_0d97b7d7f880220a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_bonuses_test_0d97b7d7f880220a\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_typed_deductions_test_00c916bf0f8c700a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_typed_deductions_test_00c916bf0f8c700a\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_completion_test_04d998184f0013cf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_completion_test_04d998184f0013cf\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_final_authority_test_8f187506d6921a5b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_final_authority_test_8f187506d6921a5b\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_f144d508e48ec63d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_f144d508e48ec63d\"}\n",
    "CRP1_TRANSPORT B2 private upload fixture permits dot directory segments; product authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_documents_test_526f907701037027\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_documents_test_526f907701037027\"}\n"
  ]
}

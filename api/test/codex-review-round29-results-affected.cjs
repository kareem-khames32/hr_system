module.exports = {
  "selected": [
    "payroll-bonuses",
    "payroll-typed-deductions",
    "loan-completion",
    "loan-installment-deferral",
    "loan-single-deduction",
    "hr-final-authority"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 59,
      "failed": 0,
      "passed": 59,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 59,
      "suites": 0
    },
    "duration_ms": 74394.8782
  },
  "results": [
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates",
      "ms": 8263.8749,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid",
      "ms": 2598.6273,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits",
      "ms": 397.5627,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too",
      "ms": 192.6589,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own",
      "ms": 63.8654,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither",
      "ms": 1493.6576,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "B0.1s: المعاينة مابترجّعش إعداد نوع المكافأة ولا نوع الخصم لحساب مالوش أساس فيه — والمدير والموارد البشرية زي ما هم",
      "ms": 469.2187,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused",
      "ms": 167.7085,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: إلغاء المكافأة والخصم وقت نقل حقيقي للموظف — النقل اتحفظ قبل قفل الإلغاء = «غير موجود» والطلب والقيد زي ما هم، والرد من معاملة الإلغاء نفسها",
      "ms": 464.9531,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-bonuses.integration.cjs",
      "name": "CR28-B01: الرفض والرد على الاعتراض والإنشاء والدفعة والعكس وقرار القسط المعلق بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبله بيرفضهم من غير أي كتابة",
      "ms": 1308.5413,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched",
      "ms": 6795.5771,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment",
      "ms": 2119.0028,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request",
      "ms": 267.5217,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step",
      "ms": 142.9812,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override",
      "ms": 315.481,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit",
      "ms": 37.7664,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval",
      "ms": 1354.1731,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope",
      "ms": 145.4022,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip",
      "ms": 229.5966,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit",
      "ms": 313.1019,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window",
      "ms": 388.2807,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero",
      "ms": 1982.2632,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list",
      "ms": 32.9657,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Owner 26-Sep: a deduction HR creates is approved at once through every captured step with its ledger installments, a bulk one too; HR decides a legacy pending one it created",
      "ms": 266.5286,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-typed-deductions.integration.cjs",
      "name": "Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects",
      "ms": 211.6356,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 5803.502,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 400.0512,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 107.327,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 213.1322,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 64.4062,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 59.5125,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 312.7914,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "CR28-B01: السداد المبكر وتحصيل وإعدام الرصيد المتبقي وتنفيذ طلب السلفة بيقروا فرع الموظف بعد قفله المالي — نقل اتحفظ قبلهم بيرفضهم من غير أي حركة",
      "ms": 452.3506,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP catalog exposes the effective LOAN branch chain seeded without changing its owner configuration",
      "ms": 5340.0567,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP create draft then submit freezes source amount and follows one actual branch approver below threshold",
      "ms": 272.5198,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP amount threshold adds Finance and cannot execute after only the manager approves",
      "ms": 177.7448,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP a one-cent difference at DEC18,2 maximum still includes the conditional financial approver",
      "ms": 181.8649,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP rejects forged client evidence and money on create without retaining a draft",
      "ms": 137.8701,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP ownership, employee-on-behalf privilege and cross-branch approval are enforced",
      "ms": 299.271,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "Owner 26-Sep: an installment deferral HR files on behalf is approved at once through the threshold chain and defers with HR as the ledger actor",
      "ms": 152.6988,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP RETURN then resubmit rebuilds source evidence and approval conditions while refusing forged evidence patches",
      "ms": 215.427,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP changing amount without revision after submission is rejected atomically at final approval",
      "ms": 162.3702,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP two independent approvals cannot defer the same installment twice",
      "ms": 221.2056,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP explicit new loans conserve cents and reject sub-unit installments and excess schedule length before approval",
      "ms": 210.6156,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP custom early-settlement handler uses real approval and closes only the requesting employee loan",
      "ms": 163.1835,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP creation cannot push total open installments beyond the allocator limit at final approval",
      "ms": 155.8202,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP deferral and custom early settlement wait for Finance before locking the Request row",
      "ms": 374.2211,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "the employee: a regular loan with more than one month is refused (direct and draft submit, nothing left behind); one month or no month at all is one deduction",
      "ms": 5764.0377,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "HR on behalf: the same rule — more than one month refused, a missing month is approved at once as one installment",
      "ms": 184.6147,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "an exceptional loan keeps its installments for loans.exceptional, and is refused without it (the employee and on-behalf without the permission)",
      "ms": 163.0641,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "the cap preview: more than one month only for loans.exceptional; one month or none works for everyone",
      "ms": 57.8317,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "a regular request submitted before the rule and still pending is approved with its stored months (existing loans untouched)",
      "ms": 86.5204,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "the loans list and the employee ledger carry the loan kind (exceptional flag and installment count)",
      "ms": 35.1059,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "resubmit: a returned regular loan resubmitted by the employee goes through and the month is re-stamped from today; the employee still cannot set or forge a month",
      "ms": 237.9951,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "resubmit: a month HR chose (loans.exceptional) survives unchanged — a regular loan filed on behalf, even when the employee resubmits, and an exceptional loan",
      "ms": 340.8839,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: promotion, title change, contract renewal and secondment HR files on behalf are approved at once and execute exactly as after the last approver",
      "ms": 6012.6994,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: a resignation HR files on behalf is approved at once, puts the employee in notice period and opens the offboarding case",
      "ms": 157.8387,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: money requests HR files on behalf are approved at once and post their ledger entries — expense, per diem and adjustment",
      "ms": 190.3287,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: a creator without HR authority keeps the whole chain for the same types and never approves his own; HR own resignation keeps its chain too",
      "ms": 212.2603,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_payroll_bonuses_test_371fbaa383e24e5f is absent from sys.databases.",
    "Cleanup verified: hr_payroll_typed_deductions_test_0dfacaac43c90c45 is absent from sys.databases.",
    "tests 59",
    "suites 0",
    "pass 59",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 74394.8782"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_bonuses_test_371fbaa383e24e5f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_bonuses_test_371fbaa383e24e5f\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_typed_deductions_test_0dfacaac43c90c45\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_typed_deductions_test_0dfacaac43c90c45\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_completion_test_47d26d4daacc9b3b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_completion_test_47d26d4daacc9b3b\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_deferral_test_72fdfdd25e5954f5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_deferral_test_72fdfdd25e5954f5\"}\n",
    "{\"database\":\"hr_loan_deferral_test_72fdfdd25e5954f5\",\"removed\":true}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_single_test_16afbe47c641dc21\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_single_test_16afbe47c641dc21\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_final_authority_test_f079cde816e6bd46\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_final_authority_test_f079cde816e6bd46\"}\n"
  ]
}

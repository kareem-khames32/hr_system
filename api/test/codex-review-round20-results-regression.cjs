module.exports = {
  "selected": [
    "loan-completion",
    "loan-installment-deferral",
    "request-execution"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 61,
      "failed": 0,
      "passed": 61,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 61,
      "suites": 0
    },
    "duration_ms": 37933.8866
  },
  "results": [
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 6830.3886,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09 + owner 26-Sep: the HR exceptional loan records reason, category and first installment month and — HR authority being final — is approved at once with the cap reviewed per step; employees cannot create it, and a creator without HR authority cannot approve his own",
      "ms": 466.8811,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: a regular loan HR files on behalf is refused above the cap at submit and, within the cap, approved at once with a WITHIN_CAP review per step",
      "ms": 190.2005,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 196.2513,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 63.3801,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "Owner 26-Sep: an early settlement HR files on behalf is approved at once and records the repayment with HR as the actor",
      "ms": 65.4368,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 257.6431,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP catalog exposes the effective LOAN branch chain seeded without changing its owner configuration",
      "ms": 6498.2987,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP create draft then submit freezes source amount and follows one actual branch approver below threshold",
      "ms": 271.1772,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP amount threshold adds Finance and cannot execute after only the manager approves",
      "ms": 161.7714,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP a one-cent difference at DEC18,2 maximum still includes the conditional financial approver",
      "ms": 174.0085,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP rejects forged client evidence and money on create without retaining a draft",
      "ms": 105.8169,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP ownership, employee-on-behalf privilege and cross-branch approval are enforced",
      "ms": 361.296,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "Owner 26-Sep: an installment deferral HR files on behalf is approved at once through the threshold chain and defers with HR as the ledger actor",
      "ms": 210.9957,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP RETURN then resubmit rebuilds source evidence and approval conditions while refusing forged evidence patches",
      "ms": 259.8473,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP changing amount without revision after submission is rejected atomically at final approval",
      "ms": 125.7134,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP two independent approvals cannot defer the same installment twice",
      "ms": 191.9411,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP explicit new loans conserve cents and reject sub-unit installments and excess schedule length before approval",
      "ms": 202.4033,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP custom early-settlement handler uses real approval and closes only the requesting employee loan",
      "ms": 170.9372,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP creation cannot push total open installments beyond the allocator limit at final approval",
      "ms": 139.6898,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP deferral and custom early settlement wait for Finance before locking the Request row",
      "ms": 339.2105,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 6059.7899,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 132.5535,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 157.4126,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 93.4767,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 810.77,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 144.2481,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 66.9049,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 276.5138,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 181.4779,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 170.8066,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.4741,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 132.5057,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 45.6159,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 121.296,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 93.6635,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 38.4883,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 143.7013,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 33.7337,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 149.0124,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 89.6253,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 87.4979,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 1233.702,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 228.416,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 234.3124,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 454.4329,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 60.523,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 129.5557,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 67.9233,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 158.2078,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 345.1818,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 356.8699,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 71.8157,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 73.6613,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 185.321,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 83.1128,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 220.1911,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 95.1,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 191.4118,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 99.0272,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 120.4129,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 61",
    "suites 0",
    "pass 61",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 37933.8866"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_completion_test_66076962119e4cb4\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_completion_test_66076962119e4cb4\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_deferral_test_b04ad0cdd2e70b8d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_deferral_test_b04ad0cdd2e70b8d\"}\n",
    "{\"database\":\"hr_loan_deferral_test_b04ad0cdd2e70b8d\",\"removed\":true}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_dec9c0bf13157fee\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_dec9c0bf13157fee\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round2-adapted-loans"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 5,
      "failed": 0,
      "passed": 5,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 16666.3227
  },
  "results": [
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 10523.8226,
      "pass": true
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09: the HR exceptional loan records reason, category and first installment month; employees cannot create it and its creator cannot approve it",
      "ms": 1455.9466,
      "pass": true
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 645.7071,
      "pass": true
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 145.7421,
      "pass": true
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 1315.0085,
      "pass": true
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 5",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 16666.3227"
  ],
  "stdout": []
}

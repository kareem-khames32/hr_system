module.exports = {
  "selected": [
    "codex-review-round2-adapted-loans"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 5,
      "failed": 3,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 5,
      "suites": 0
    },
    "duration_ms": 15598.0278
  },
  "results": [
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 10451.1242,
      "pass": true
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09: the HR exceptional loan records reason, category and first installment month; employees cannot create it and its creator cannot approve it",
      "ms": 1195.3623,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'LOAN_EXCEPTIONAL_SELF_APPROVAL'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'LOAN_EXCEPTIONAL_SELF_APPROVAL'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'LOAN_EXCEPTIONAL_SELF_APPROVAL'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:178:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 12.1087,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:30:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:194:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 69.465,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n-   undefined\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n-   undefined\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n-   undefined\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:229:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 1261.0818,
      "pass": true
    }
  ],
  "failures": [
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09: the HR exceptional loan records reason, category and first installment month; employees cannot create it and its creator cannot approve it",
      "ms": 1195.3623,
      "pass": false,
      "error": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'LOAN_EXCEPTIONAL_SELF_APPROVAL'\n",
      "cause": "Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'LOAN_EXCEPTIONAL_SELF_APPROVAL'\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n+ actual - expected\n\n+ undefined\n- 'LOAN_EXCEPTIONAL_SELF_APPROVAL'\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:178:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 12.1087,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:30:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:194:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 69.465,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n-   undefined\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n-   undefined\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    1,\n-   undefined\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:229:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "tests 5",
    "suites 0",
    "pass 2",
    "fail 3",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 15598.0278"
  ],
  "stdout": []
}

module.exports = {
  "selected": [
    "codex-review-round2-record-only",
    "loan-completion",
    "loan-installment-deferral",
    "payroll-salary-request"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 35,
      "failed": 5,
      "passed": 30,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 35,
      "suites": 0
    },
    "duration_ms": 35527.7389
  },
  "results": [
    {
      "file": "codex-review-round2-record-only.integration.cjs",
      "name": "CR2 every seeded record-only request with a chain: approval, duplicate denial, reasoned rejection, zero automatic financial effect",
      "ms": 15870.3333,
      "pass": true
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 8117.4977,
      "pass": false,
      "error": "{\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n",
      "cause": "{\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:30:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:98:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09: the HR exceptional loan records reason, category and first installment month; employees cannot create it and its creator cannot approve it",
      "ms": 1081.3263,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    true,\n    4,\n+   true\n-   false\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    true,\n    4,\n+   true\n-   false\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    true,\n    4,\n+   true\n-   false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:171:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 12.0945,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:30:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:194:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 57.4233,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ []\n- [\n-   undefined,\n-   undefined\n- ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ []\n- [\n-   undefined,\n-   undefined\n- ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ []\n- [\n-   undefined,\n-   undefined\n- ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:229:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-13: a settlement that cannot cover the loan records PENDING_RECOVERY; write-off needs its own permission and a reason",
      "ms": 1097.7109,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP catalog exposes the effective LOAN branch chain seeded without changing its owner configuration",
      "ms": 7674.2747,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP create draft then submit freezes source amount and follows one actual branch approver below threshold",
      "ms": 707.802,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP amount threshold adds Finance and cannot execute after only the manager approves",
      "ms": 604.5602,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP a one-cent difference at DEC18,2 maximum still includes the conditional financial approver",
      "ms": 593.4225,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP rejects forged client evidence and money on create without retaining a draft",
      "ms": 469.2584,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP ownership, employee-on-behalf privilege and cross-branch approval are enforced",
      "ms": 1282.9704,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP RETURN then resubmit rebuilds source evidence and approval conditions while refusing forged evidence patches",
      "ms": 847.9282,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP changing amount without revision after submission is rejected atomically at final approval",
      "ms": 488.5284,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP two independent approvals cannot defer the same installment twice",
      "ms": 878.3948,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP explicit new loans conserve cents and reject sub-unit installments and excess schedule length before approval",
      "ms": 873.4532,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP custom early-settlement handler uses real approval and closes only the requesting employee loan",
      "ms": 563.1638,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP creation cannot push total open installments beyond the allocator limit at final approval",
      "ms": 524.1844,
      "pass": true
    },
    {
      "file": "loan-installment-deferral.integration.cjs",
      "name": "HTTP deferral and custom early settlement wait for Finance before locking the Request row",
      "ms": 1379.3972,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "HTTP catalog upgrades salary fields without changing the stored request catalog",
      "ms": 7833.018,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "HTTP salary payload rejects missing or daily-dated payroll months, numeric money and forged server metadata before creating a draft",
      "ms": 212.7998,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "HTTP final approval writes one payroll-month salary revision with six exact amounts and actual HR actor",
      "ms": 538.3552,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "server-derived ten percent retains executive approval despite forged caller percentage and scope cannot bypass it",
      "ms": 382.2728,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n201 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-salary-request.integration.cjs:160:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "next-month approved request leaves salary and history unchanged until its payroll cycle starts, then runs once",
      "ms": 501.1739,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "salary source drift rolls back final approval and returning/resubmitting rebuilds the source basis",
      "ms": 421.2823,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "employee branch drift and cross-branch submission cannot change financial data",
      "ms": 334.913,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "legacy request without a payroll month cannot be approved implicitly and can be returned for explicit monthly resubmission",
      "ms": 398.1752,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "resubmission with owner-configured auto approval records the current actor rather than an older approval",
      "ms": 659.5183,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "concurrent final approval and retry leave one salary revision and one financial audit",
      "ms": 320.62,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "request execution preserves cents above safe integer range in current salary, history and audit",
      "ms": 348.9305,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "authorized rejection recovers a stale future salary request without reversing money or allowing scheduled execution",
      "ms": 912.5891,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "rejection guard refuses a scheduled-status salary request with any existing financial reference",
      "ms": 498.4141,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "rejection guard also refuses legacy APPROVED salary status when its financial change already exists",
      "ms": 472.3912,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "administrative rejection cannot use request ownership or wildcard permissions to cross the request branch",
      "ms": 556.8774,
      "pass": true
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "salary requests do not create payroll, attendance, overtime, loans or offboarding effects",
      "ms": 42.2059,
      "pass": true
    }
  ],
  "failures": [
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-01..07: a loan above the cap is refused at submit, and the cap is re-evaluated at every approval step (reduce, refuse override without permission, documented override)",
      "ms": 8117.4977,
      "pass": false,
      "error": "{\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n",
      "cause": "{\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"الإعداد ده لكل الشركة، ومش بيتعدل من حساب فرع — يعدّله حساب على مستوى الشركة\",\"error\":\"Forbidden\",\"statusCode\":403}\n\n403 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:30:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:98:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-09: the HR exceptional loan records reason, category and first installment month; employees cannot create it and its creator cannot approve it",
      "ms": 1081.3263,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    true,\n    4,\n+   true\n-   false\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    true,\n    4,\n+   true\n-   false\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    true,\n    4,\n+   true\n-   false\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:171:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-14: partial early repayment records amount and reference, keeps the ledger consistent, replays safely and refuses overpayment",
      "ms": 12.0945,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:30:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:194:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "loan-completion.integration.cjs",
      "name": "AD-15: the employee sees only his own loan ledger",
      "ms": 57.4233,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ []\n- [\n-   undefined,\n-   undefined\n- ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ []\n- [\n-   undefined,\n-   undefined\n- ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n+ []\n- [\n-   undefined,\n-   undefined\n- ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\loan-completion.integration.cjs:229:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "payroll-salary-request.integration.cjs",
      "name": "server-derived ten percent retains executive approval despite forged caller percentage and scope cannot bypass it",
      "ms": 382.2728,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n201 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n201 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n201 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\payroll-salary-request.integration.cjs:160:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"recordOnly\":[{\"code\":\"SECONDMENT\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"DEPENDENTS_UPDATE\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"DOCUMENT_RENEWAL\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"IT_EQUIPMENT\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"ACCESS_REQUEST\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"FACILITY_CARD\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"TRAINING_REQUEST\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"CERT_REIMBURSEMENT\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"CONFERENCE\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"EDUCATION_ASSISTANCE\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"GRIEVANCE\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"WHISTLEBLOWING\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"PENALTY_OBJECTION\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"APPRAISAL_OBJECTION\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"SUGGESTION\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400},{\"code\":\"HR_MEETING\",\"approved\":\"COMPLETED\",\"rejected\":\"REJECTED\",\"duplicate\":400}],\"automaticEffects\":0}",
    "تم التحقق من حذف قاعدة الاختبار: hr_payroll_salary_request_test_b033faddd0e06a07",
    "تم التحقق من حذف مجلد مرفقات الاختبار المؤقت.",
    "tests 35",
    "suites 0",
    "pass 30",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 35527.7389"
  ],
  "stdout": [
    "✓ أنواع الطلبات: 67 جديد + 64 سلسلة مخصّصة (الإجمالي 67)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "{\"cleanupVerified\":\"hr_codex_recordonly_test_7c845061a71dda9c\"}\n",
    "{\"database\":\"hr_loan_deferral_test_a134aa3564da2716\",\"removed\":true}\n"
  ]
}

module.exports = {
  "selected": [
    "expense-reports",
    "request-execution",
    "codex-review-p5e-decision-race",
    "request-category-chains",
    "manager-of-direct-manager",
    "administration-level",
    "approval-chain-holders",
    "approval-chain-branch-copy",
    "approval-delegations",
    "approval-delegations-migration",
    "payroll-approval-chain-disbursement",
    "holiday-work",
    "leave-contract",
    "leave-attachment-with-request",
    "leave-entitlement-tiers",
    "leave-sick-pay-attachment",
    "leave-year-end",
    "swap-consents"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 178,
      "failed": 80,
      "passed": 98,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 178,
      "suites": 0
    },
    "duration_ms": 216213.7434
  },
  "results": [
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 9921.4845,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'جدول سلف المأموريات ناقص — طبّق ترحيل 152 الأول'\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'جدول سلف المأموريات ناقص — طبّق ترحيل 152 الأول'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'جدول سلف المأموريات ناقص — طبّق ترحيل 152 الأول'\n  ]\n\n    at refused (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:39:57)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:130:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
      "ms": 40.1144,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:158:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»",
      "ms": 18.8291,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:178:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل",
      "ms": 7.7646,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at newReport (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:52:54)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:216:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب",
      "ms": 8.3245,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:250:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش",
      "ms": 7.7318,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at newReport (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:52:54)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:283:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل",
      "ms": 6.8788,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at newReport (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:52:54)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:311:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد",
      "ms": 21.6432,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'مبلغ السلفة موجب بخانتين عشريتين بالكتير (لحد 999999.99)'\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'مبلغ السلفة موجب بخانتين عشريتين بالكتير (لحد 999999.99)'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'مبلغ السلفة موجب بخانتين عشريتين بالكتير (لحد 999999.99)'\n  ]\n\n    at refused (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:39:57)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:348:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد",
      "ms": 5.1358,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:410:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند",
      "ms": 19.5296,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at advanceFor (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:339:16)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:460:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة",
      "ms": 29.3176,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    400,\n+   'Validation failed (numeric string is expected)'\n-   'حدود الدرجات قايمة (درجة وحد)'\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    400,\n+   'Validation failed (numeric string is expected)'\n-   'حدود الدرجات قايمة (درجة وحد)'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    400,\n+   'Validation failed (numeric string is expected)'\n-   'حدود الدرجات قايمة (درجة وحد)'\n  ]\n\n    at refused (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:39:57)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:480:5)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع",
      "ms": 7.5662,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:518:13)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-13 (Codex P5A-B01): سلسلة فاضية بـ«تنفيذ فوري» مش مراجعة للمبلغ — تقرير المصروفات وسلفة المأمورية مابيتنفذوش من غير اعتماد بشري، والتقديم كله بيرجع",
      "ms": 47.4899,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:583:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-14 (Codex P5B-B01): اعتماد جولة قبل الإرجاع مايصرفش مبلغ اتغيّر — إعادة تقديم على سلسلة «تنفيذ فوري» مرفوضة كلها، وبالسلسلة الحقيقية القيد بالمبلغ الجديد بعد اعتماد جديد",
      "ms": 16.893,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:610:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 8611.7646,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:129:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 38.438,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:148:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 61.4615,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:164:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 47.4853,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 400\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:183:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 298.57,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:213:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 80.8678,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 400\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:227:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "a failure after both shift writes rolls back overrides and audit rows together",
      "ms": 94.783,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 92.1743,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:260:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 58.3609,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:278:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 58.7344,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:297:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "new handlers reject incompatible request codes instead of silently completing",
      "ms": 0.5459,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 80.1202,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:324:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "old catalogs expose required contract fields and optional letter purpose without a database seed",
      "ms": 58.1448,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer retains the current holder until recipient acceptance and manager confirmation",
      "ms": 152.4946,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject",
      "ms": 88.9383,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "incorrect initial custody assignment can be rejected and returns the asset to inventory",
      "ms": 41.826,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 96.1236,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:401:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "forged attachment references are also rejected when saving drafts",
      "ms": 48.1687,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 82.4583,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:424:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent cancellation of the same leave restores its balance only once",
      "ms": 98.1345,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 105.9323,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:460:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 54.9398,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:472:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references",
      "ms": 267.6539,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced",
      "ms": 262.3299,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope",
      "ms": 598.5761,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests",
      "ms": 83.2389,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document",
      "ms": 142.411,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit",
      "ms": 84.5739,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 68.3976,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:690:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 311.2143,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:727:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload",
      "ms": 374.3809,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 12060.3346,
      "pass": false,
      "error": "Submission race timed out",
      "cause": "Submission race timed out",
      "stack": "Error: Submission race timed out\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:797:108)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 12171.5363,
      "pass": false,
      "error": "Submission race timed out",
      "cause": "Submission race timed out",
      "stack": "Error: Submission race timed out\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:797:108)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 team leader receives and confirms custody when the employee has no explicit manager",
      "ms": 739.9917,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID",
      "ms": 214.8343,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 120.9666,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:891:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 98.0694,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:928:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 87.0121,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:944:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 34.3512,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:961:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 12109.7714,
      "pass": false,
      "error": "Personal update race timed out",
      "cause": "Personal update race timed out",
      "stack": "Error: Personal update race timed out\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:992:108)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 36392.9715,
      "pass": false,
      "error": "Approval never reached the gated renderer",
      "cause": "Approval never reached the gated renderer",
      "stack": "Error: Approval never reached the gated renderer\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 12050.5429,
      "pass": false,
      "error": "First decision did not reach its gated read",
      "cause": "First decision did not reach its gated read",
      "stack": "Error: First decision did not reach its gated read\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 12045.4634,
      "pass": false,
      "error": "Approval never reached the gated renderer",
      "cause": "Approval never reached the gated renderer",
      "stack": "Error: Approval never reached the gated renderer\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 12019.7103,
      "pass": false,
      "error": "First decision did not reach its gated read",
      "cause": "First decision did not reach its gated read",
      "stack": "Error: First decision did not reach its gated read\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 12016.5185,
      "pass": false,
      "error": "Approval never reached the gated renderer",
      "cause": "Approval never reached the gated renderer",
      "stack": "Error: Approval never reached the gated renderer\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 12041.3119,
      "pass": false,
      "error": "Second decision neither blocked nor reached renderer",
      "cause": "Second decision neither blocked nor reached renderer",
      "stack": "Error: Second decision neither blocked nor reached renderer\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 42.4012,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:161:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 36.1462,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:161:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-01: من غير أي ربط — كل فئة من غير سلسلة، وكل نوع على سلسلته، والباب المالي «ثابت» بسببه",
      "ms": 14860.8544,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-02: ربط الإجازات بسلسلة موجودة ينقل المختارين بس — والتالت بيفضل على سلسلته",
      "ms": 44.1286,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-03: الحضور على نفس سلسلة الإجازات — «مشتركة مع» في الخريطة",
      "ms": 25.9099,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ",
      "ms": 81.8574,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:177:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين",
      "ms": 79.0719,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:196:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة",
      "ms": 40.2293,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:212:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)",
      "ms": 75.7419,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:232:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك",
      "ms": 72.385,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:242:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-09: الرفض — سلسلة فرع أو معطّلة أو فاضية، نوع من فئة تانية، الباب المالي، الإضافي على سلسلة بلا معتمدين، وطلب ناقص",
      "ms": 208.3609,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه",
      "ms": 122.0573,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:299:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس",
      "ms": 12.9081,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(typeInfo(all, 'RC_L1').usageCount >= 4)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(typeInfo(all, 'RC_L1').usageCount >= 4)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(typeInfo(all, 'RC_L1').usageCount >= 4)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:310:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-12: ربط الفئة مايتكتبش من إعدادات النظام العامة، وسلسلة الفئة ماتتنقلش لفرع حتى لو مفيش نوع عليها",
      "ms": 114.9134,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس",
      "ms": 8855.8441,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:116:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة",
      "ms": 36.903,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:129:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش",
      "ms": 23.0748,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:138:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو",
      "ms": 28.2039,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:151:23)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه",
      "ms": 20.7938,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:160:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف",
      "ms": 21.0251,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:167:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06b: دايرة أطول في المديرين المسجّلين (3 و4 أشخاص) — «مدير المدير» مرؤوس لمقدّم الطلب، فالتقديم بيقف (CR10-N01)",
      "ms": 76.415,
      "pass": false,
      "error": "C3-: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "C3-: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: C3-: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:184:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06c: لفّة التدرّج الطبيعية (مدير فرع جوه قسم مديره تحته) مابتتحسبش دايرة — الخطوة بتروح لمدير الفرع",
      "ms": 79.2549,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:203:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه",
      "ms": 23.3247,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:208:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-08: «مدير المدير المباشر» مش مقبول كجهة تصعيد (إنشاء السلسلة وتعديل الخطوة)",
      "ms": 25.8486,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-09: الشاشة — الاختيار ظاهر بعد «المدير المباشر» ومش في قايمة التصعيد، وتسميته في الصناديق",
      "ms": 16.0752,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-01: إدارة وأقسامها وقسم فرعي؛ الإدارة التنفيذية بتتعمل «إدارة» لوحدها؛ وإدارة فرع تحت الإدارة التنفيذية من فرع تاني",
      "ms": 9251.4377,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-02: قواعد الأب — إدارة تحت قسم أو إدارة عادية، قسم تحت إدارة فرع تاني، تحويل لإدارة وأبوه مايصلحش، ونوع غلط: كله مرفوض ومفيش حاجة بتتكتب",
      "ms": 88.8507,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-03: المسموح — تحويل قسم رئيسي أو تحت الإدارة التنفيذية لإدارة والعكس، وإدارة لقسم وأقسامها فرعية، والهيكل القائم بيتعدّل من غير إجبار",
      "ms": 154.2489,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-04: الإدارة التنفيذية «إدارة» دايمًا ومالهاش أب، وشيل تعليمها (صريح أو ضمني) مرفوض طول ما تحتها إدارات",
      "ms": 69.5484,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-05: «مدير الإدارة» — موظف قسم تحت إدارة بيروح لمديرها، وهو بس اللي بيعتمد",
      "ms": 38.443,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:56:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:265:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-06: قسم فرعي على مستويين تحت الإدارة — نفس مدير الإدارة",
      "ms": 21.5529,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:56:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:279:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-07: مدير الإدارة هو مقدّم الطلب — الخطوة بتطلع للإدارة التنفيذية برابطها لفرع تاني، والرئيس بيعتمد من حساب «كل الفروع»",
      "ms": 17.7179,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:56:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:284:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-08: الإيقاف برسالة بتسمّي الوحدة — مفيش قسم، مفيش إدارة، الإدارة مالهاش مدير، المدير الوحيد هو مقدّم الطلب",
      "ms": 19.303,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at refused (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:59:10)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:301:5)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-09: السرّي مابيتخطّاش «مدير الإدارة» (زي «مدير القسم»)، والدور مش مقبول كجهة تصعيد",
      "ms": 19.4037,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:56:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:319:16)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-10: فلتر المسير وجمهور العطلات على إدارة بيشملوا أقسامها — في فرعها بس",
      "ms": 748.4332,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-11: «الإدارة» في بطاقة صاحب الطلب — الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، ومحجوبة مع orgHidden",
      "ms": 0.2704,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'id')",
      "cause": "Cannot read properties of undefined (reading 'id')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'id')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:373:49)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-12: حساب الفرع — إدارة في فرعه وقسم تحتها، والربط تحت الإدارة التنفيذية برّه نطاقه 403، والقائمة ماتكشفش اسمها",
      "ms": 66.8126,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-13: تعليم قسم «إدارة تنفيذية» بيخلّيه «إدارة» تلقائي، والتنفيذية القديمة إدارة عادية تتحول قسم وأقسامها فرعية",
      "ms": 70.3496,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-01: الثغرات بالصلاحيات النهائية — حزمة الدور والمنح والعمود القديم بيحملوا، والمسحوبة والحساب الموقوف ومدير النظام لأ، والفرع المقفول مالوش تحذير",
      "ms": 8750.1822,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-02: قارئ الرياض بيشوف فرعه بس — ولا اسم فرع جدة في الرد",
      "ms": 39.2012,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-03: حامل جديد بيقفل الثغرة فورًا، ونسخة فرع مفعّلة بتشيل فرعها من العامة وبتتفحص لوحدها، والتحذير مابيمنعش الحفظ",
      "ms": 184.1703,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-holders.integration.cjs",
      "name": "CHI-04 (D12): كشف «المدير المسجل غير قائد الفريق» — بنطاق الحساب، والقائد نفسه والمدير الفاضي والموقوف مش في الكشف، ومفيش أي تعديل",
      "ms": 180.6868,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-01: من غير نسخ — الفرعين على السلسلة العامة",
      "ms": 10280.2687,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:31:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:35:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:99:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-02: نسخة للمعادي بنفس الكود: طلب المعادي لمعتمدها، والنصر فاضل على العامة، ونسخة تانية لنفس الفرع مرفوضة",
      "ms": 64.9897,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:31:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:35:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:107:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-03: تعطيل نسخة المعادي يرجّع طلبات المعادي للعامة، وتفعيلها يرجّعها لنسختها",
      "ms": 51.2794,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:31:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:35:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:117:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-04: حساب فرع النصر يعمل نسخة لفرعه بس — مش للمعادي، ونسخة النصر بتاخد طلبات النصر",
      "ms": 60.7643,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:31:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:35:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:128:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-05: الشاشة: «نسخة خاصة بفرع» شغالة بنفس الكود مقفول، والفروع اللي مالهاش نسخة بس",
      "ms": 1.9898,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-01: الإنشاء — الموظف لنفسه، ولغيره بصلاحية وفي نطاقه؛ وحدود الفترة والفئات والبديل؛ والقايمة",
      "ms": 11485.4914,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين",
      "ms": 81.023,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:363:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس",
      "ms": 40.2181,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:408:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل",
      "ms": 41.4452,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:473:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض",
      "ms": 37.2309,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:486:18)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل",
      "ms": 60.0819,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:512:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
      "ms": 134.1834,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:648:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس",
      "ms": 43.6439,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:789:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال",
      "ms": 94.2854,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:857:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى",
      "ms": 44.2,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:901:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-11: تفويضين متداخلين لنفس المفوِّض في نفس اللحظة — واحد بس",
      "ms": 111.6639,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11301.0749,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-2: من غير الجدول والعمود التفويض مرفوض برسالة والصندوق والقرار والبريد والتصعيد زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده القرار بيتكتب «بالنيابة عن»",
      "ms": 5587.5481,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 915.2256,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة",
      "ms": 12074.5859,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات",
      "ms": 220.5019,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده",
      "ms": 4916.8078,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم",
      "ms": 4094.7846,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها",
      "ms": 926.0704,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب",
      "ms": 997.9937,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم",
      "ms": 705.3309,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة",
      "ms": 823.4783,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط",
      "ms": 547.6476,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-approval-chain-disbursement.integration.cjs",
      "name": "القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف",
      "ms": 140.8424,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر",
      "ms": 10044.448,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع",
      "ms": 4613.896,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة",
      "ms": 1098.3555,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (1): طلب إضافي ليوم عطلة متغطي بأمر ساري بيترفض من التقديم",
      "ms": 171.7684,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (2): إضافي اتقدّم قبل اعتماد «دوام يوم عطلة» لنفس اليوم — اعتماده بيترفض والمسير بيحسب البدل بس",
      "ms": 988.2473,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "الإضافي والبدل ما يجتمعوش (3): إضافي اتعتمد قبل الأمر — المسير بيصرفه إضافي ويتخطى البدل لليوم، وإضافي جديد لليوم مرفوض",
      "ms": 1069.2877,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "يوم عطلة اتعتمد بعد اعتماد مسير فترته: بيدخل أول مسير مفتوح بعده مرة واحدة، والمعتمد ما بيتغيرش",
      "ms": 2684.4316,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR29-B01: أمر دوام العطلة لموظفين بالاسم بيتحفظ تحت قفلهم المالي — موظف اتنقل لفرع تاني قبل القفل بيرفض الأمر كله، وكمان تعديل أمر قائم ليه",
      "ms": 159.8967,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR30-B01: تعديل أو إلغاء أمر عطلة، وتعديل أو حذف فترة إضافي، بصلاحية الفرع القديم وقت ما السجل نفسه بيتنقل لفرع تاني — مابيتحفظوش",
      "ms": 330.7275,
      "pass": true,
      "skip": false
    },
    {
      "file": "holiday-work.integration.cjs",
      "name": "CR31-B01: تعديل أمر عطلة اتحفظ والأمر اتنقل لفرع تاني واتسمّى بعدها على طول — الرد مابيكشفش الاسم الجديد",
      "ms": 175.785,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields",
      "ms": 9036.8894,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers",
      "ms": 498.958,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience",
      "ms": 52.7906,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects",
      "ms": 136.8692,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible",
      "ms": 237.1441,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "A3 unpaid leave is counted in calendar days while paid leave keeps working days",
      "ms": 91.8349,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»",
      "ms": 163.5835,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review",
      "ms": 185.1267,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own",
      "ms": 213.2956,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself",
      "ms": 33.2422,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none",
      "ms": 437.211,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties",
      "ms": 160.3537,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over",
      "ms": 206.2693,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "B4 the audience of a request type is enforced at submission even for a catalog manager",
      "ms": 57.5258,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-contract.integration.cjs",
      "name": "NAM16 migration refuses conflicting payloads and orphan profiles without partial updates",
      "ms": 80.8353,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق مطلوب مع الطلب: التقديم بلا ملف مرفوض برسالة تسمّي المستند، ومعه مقبول ومخزّن في نفس الحقل",
      "ms": 11916.2162,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "الموارد البشرية نيابةً: نفس القاعدة — بلا ملف مرفوض، ومعه الإجازة تحمل المرجع",
      "ms": 298.472,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق اختياري مع الطلب: يُقبل بملف وبغير ملف",
      "ms": 481.6647,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "«مطلوب فوق N يوم» مع الطلب: يعضّ فوق N فقط",
      "ms": 476.6785,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-attachment-with-request.integration.cjs",
      "name": "مرفق «بعد الرجوع» كما هو: التقديم بلا ملف مقبول، ثم تذكير ورفع، وانقضاء المهلة يحوّل الأيام بدون راتب",
      "ms": 784.9495,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-01: قبل ترحيل 136 الكود شغال من غير العمودين، والحفظ بقيمة ليهم بيترفض؛ والترحيل بيضيفهم بشكل الكيان وبيتكرر بأمان",
      "ms": 11879.0685,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-02: من غير شرائح الرصيد زي الأول؛ بشرائح الحزمة كل موظف بياخد شريحة دولة فرعه وخدمته وسنّه — مصر والسعودية — وتفضيتها بترجّع أيام النوع",
      "ms": 698.8827,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-03: أقصى مرات طول الخدمة — الإجازات المعتمدة والطلبات اللي في المسار بتتعدّ، والتالتة بتترفض؛ ومن غير حد مفيش رفض",
      "ms": 464.8268,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-04: أنواع إجازات حزمة الدولة لفرع — غير مفعّلة وبأرقام الحزمة، لمصر والسعودية، ومابتتكررش، وبنطاق الحساب",
      "ms": 205.3203,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-entitlement-tiers.integration.cjs",
      "name": "LT-05 (P4A-B03): صف السنة الناقص والمُرحّل منه بشريحة دولة فرع الموظف **بعد** قفل صفه — نقل الفرع اللي اتثبّت قبل القفل هو اللي بيتحسب",
      "ms": 388.0367,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "attachment after return: PENDING on approval, uploads by the employee and HR, daily reminder, then MISSED + isUnpaid deducted once by payroll",
      "ms": 10919.5229,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: days 31-40 of the year at 75% deduct 750 as their own line; an isUnpaid sick day is not charged twice",
      "ms": 941.3564,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-sick-pay-attachment.integration.cjs",
      "name": "sick pay tiers: crossing day 90 splits into 75% and 0% lines; fully paid sick days add nothing",
      "ms": 1538.088,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "ترحيل 058: على المخطط القديم بيضيف الأعمدة والجدول بأسماء TypeORM، والاستحقاق «سنوي» يفضل أول سنة كاملة، ومايتكررش",
      "ms": 10095.68,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "المعاينة بنطاق الفرع: المستحق والمستخدم والمتبقي واللي يترحّل (سقف 5) واللي يسقط",
      "ms": 94.9942,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "تسوية مصروفة قبل الإقفال: بدل الأيام × الراتب ÷ 30 في شهر المسير كإضافة، والرصيد صفر، وإعادة الطلب مابتكررش",
      "ms": 171.8248,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "إقفال السنة لفرع: المُرحّل لحد السقف، والمسوّى مايترحّلش، والفرع التاني ماتلمسش، والتكرار آمن، والإجازة في السنة الجديدة بتتخصم صح",
      "ms": 299.4998,
      "pass": true,
      "skip": false
    },
    {
      "file": "leave-year-end.integration.cjs",
      "name": "بداية استحقاق السنوية من شاشة الأنواع: الموظف الجديد قبل يوم الاستحقاق مايقدرش ياخد سنوي",
      "ms": 87.0787,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-01: الميزة مقفولة افتراضيًا = التبديل زي الأول بالحرف (اعتماد المدير كفاية ومن غير صف موافقة)؛ وقبل ترحيل 166 الشاشة بتقول ناقص؛ والترحيل بشكل الكيان وبيتكرر",
      "ms": 10224.5718,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-02: الميزة مفتوحة — التقديم بيسجّل موافقة «مستني» للطرف التاني، والتنفيذ بيقف لحد ما يوافق؛ والرفض بيوقّفه؛ والقرار لصاحبه بس ومرة واحدة",
      "ms": 573.1253,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-03: الطرف التاني اتغيّر عند إعادة التقديم = الموافقة للطرف الجديد؛ وطلب اترفض مايتسجّلش عليه قرار؛ وموافقة لطرف قديم ماتنفّذش تبديل مع غيره",
      "ms": 868.0703,
      "pass": true,
      "skip": false
    },
    {
      "file": "swap-consents.integration.cjs",
      "name": "SW-04 (Codex P5A-B07): حالة الميزة جوه معاملة تقديم التبديل بتتقري بمدير المعاملة — قارئ المخزن مابيتناداش، والذاكرة المؤقتة مش شرط، والميزة مقفولة أو مفتوحة",
      "ms": 345.8523,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار ولا نوع طلب؛ وقبل الترحيلات الشاشة بتقول ناقص؛ والترحيلات بشكل الكيانات وبتتكرر بأمان",
      "ms": 9921.4845,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'جدول سلف المأموريات ناقص — طبّق ترحيل 152 الأول'\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'جدول سلف المأموريات ناقص — طبّق ترحيل 152 الأول'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'جدول سلف المأموريات ناقص — طبّق ترحيل 152 الأول'\n  ]\n\n    at refused (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:39:57)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:130:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-02: الفئات — تعريف للشركة كلها (الكتابة لحساب بكل الفروع)، بقيم متحكم فيها واسم مايتكررش، وبسطر تدقيق",
      "ms": 40.1144,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:158:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-03: التقرير وبنوده — للموظف لنفسه بس، البند بحكم الفئة (منع بيرفض، تحذير بيتعلّم)، والإيصال ملفه هو بنوع «طلب»",
      "ms": 18.8291,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:178:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-04: التقديم — تقرير فاضي أو بإيصال إجباري ناقص مرفوض من غير طلب؛ والخادم بيثبّت الإجمالي والبنود فوق أي قيمة من العميل، والتقرير بيتقفل",
      "ms": 7.7646,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at newReport (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:52:54)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:216:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-05: الإرجاع للاستكمال بيفتح التعديل، وإعادة التقديم بتثبّت القيم الجديدة؛ والاعتماد النهائي قيد دائن واحد في الدفتر مربوط بالطلب",
      "ms": 8.3245,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:250:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-06: الرفض بيفكّ التقرير: بيتعدّل ويتقدّم في طلب جديد، والقيد للطلب المعتمد بس؛ وطلب قديم على تقرير اتربط بغيره مايصرفش",
      "ms": 7.7318,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at newReport (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:52:54)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:283:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-07: شاشة الإدارة — التقارير المتقدّمة لموظفين نطاق الحساب بفرعهم الحالي وبعملته؛ والميزة لما تتقفل النوع بيختفي والطلب المفتوح بيكمّل",
      "ms": 6.8788,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at newReport (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:52:54)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:311:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-08: سلفة المأمورية — الاعتماد بيسجّلها مفتوحة من غير قيد؛ المالية بتسجّل الصرف لموظفين نطاقها؛ والربط بتقرير صاحبها بعد الصرف بس، سلفة واحدة لتقرير واحد",
      "ms": 21.6432,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'مبلغ السلفة موجب بخانتين عشريتين بالكتير (لحد 999999.99)'\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'مبلغ السلفة موجب بخانتين عشريتين بالكتير (لحد 999999.99)'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n+   500,\n+   'Internal server error'\n-   400,\n-   'مبلغ السلفة موجب بخانتين عشريتين بالكتير (لحد 999999.99)'\n  ]\n\n    at refused (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:39:57)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:348:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-09: التسوية في اعتماد التقرير — الصافي دائن لو المصروف أكتر، ومدين لو أقل، ومن غير قيد لو متساويين؛ والمعتمد شايف السلفة والصافي؛ وسلفة اتغيّرت بعد التقديم بتوقّف الاعتماد",
      "ms": 5.1358,
      "pass": false,
      "error": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"Validation failed (numeric string is expected)\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:410:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-10: إنهاء الخدمة — سلف مأموريات مفتوحة بتطلع بند إخلاء طرف عند المالية بعددها وإجماليها؛ ومن غير سلف مفتوحة مفيش بند",
      "ms": 19.5296,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at advanceFor (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:339:16)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:460:3)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-11: حد الفئة بالدرجة — حد درجة الموظف بيسبق حد الفئة العام في التحذير والمنع، والموظف بيشوف حد درجته، والحدود بتتكتب كلها مع الفئة",
      "ms": 29.3176,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    400,\n+   'Validation failed (numeric string is expected)'\n-   'حدود الدرجات قايمة (درجة وحد)'\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    400,\n+   'Validation failed (numeric string is expected)'\n-   'حدود الدرجات قايمة (درجة وحد)'\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    400,\n+   'Validation failed (numeric string is expected)'\n-   'حدود الدرجات قايمة (درجة وحد)'\n  ]\n\n    at refused (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:39:57)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:480:5)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-12: البدل اليومي — السعر بالوجهة والدرجة تعريف للشركة كلها؛ والبند مبلغه من الخادم (الأيام × سعر درجة الموظف) ومايتعدّلش؛ وسعر اتغيّر قبل التقديم بيمنع",
      "ms": 7.5662,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:518:13)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-13 (Codex P5A-B01): سلسلة فاضية بـ«تنفيذ فوري» مش مراجعة للمبلغ — تقرير المصروفات وسلفة المأمورية مابيتنفذوش من غير اعتماد بشري، والتقديم كله بيرجع",
      "ms": 47.4899,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:583:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "expense-reports.integration.cjs",
      "name": "EX-14 (Codex P5B-B01): اعتماد جولة قبل الإرجاع مايصرفش مبلغ اتغيّر — إعادة تقديم على سلسلة «تنفيذ فوري» مرفوضة كلها، وبالسلسلة الحقيقية القيد بالمبلغ الجديد بعد اعتماد جديد",
      "ms": 16.893,
      "pass": false,
      "error": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "cause": "{\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"message\":\"جداول تقارير المصروفات ناقصة — طبّق ترحيلات 149 لحد 154 الأول\",\"error\":\"Bad Request\",\"statusCode\":400}\n\n400 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:38:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\expense-reports.integration.cjs:610:14)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit",
      "ms": 8611.7646,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:129:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "future title changes wait for their effective date and scheduled execution is idempotent",
      "ms": 38.438,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:148:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract renewal and type change update dated contract data with audit and preserve employee tenure",
      "ms": 61.4615,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:164:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract",
      "ms": 47.4853,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 400\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:183:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets",
      "ms": 298.57,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:213:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave",
      "ms": 80.8678,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 400\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:227:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission",
      "ms": 92.1743,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:260:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "transfer changes team, department, branch, direct manager and login scope in one transaction",
      "ms": 58.3609,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:278:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "duplicate scheduled transfers and a second executed transfer on the same date are rejected",
      "ms": 58.7344,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:297:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "private attachment references cannot grant access through a request; owner and employee attachments are accepted",
      "ms": 80.1202,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:324:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "custody transfer enforces the officer branch and request owner before any write",
      "ms": 96.1236,
      "pass": false,
      "error": "Expected values to be strictly equal:\n\n500 !== 403\n",
      "cause": "Expected values to be strictly equal:\n\n500 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n500 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:401:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "an approved custody return cannot bypass a pending transfer or return somebody else's assignment",
      "ms": 82.4583,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:424:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "personal and emergency request forms expose editable fields mapped to their actual destinations",
      "ms": 105.9323,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:460:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit",
      "ms": 54.9398,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:472:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit",
      "ms": 68.3976,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:690:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit",
      "ms": 311.2143,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:727:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent DRAFT submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 12060.3346,
      "pass": false,
      "error": "Submission race timed out",
      "cause": "Submission race timed out",
      "stack": "Error: Submission race timed out\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:797:108)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "concurrent RETURNED_FOR_INFO submissions execute once and the losing payload cannot overwrite the committed request",
      "ms": 12171.5363,
      "pass": false,
      "error": "Submission race timed out",
      "cause": "Submission race timed out",
      "stack": "Error: Submission race timed out\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:797:108)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 allowed personal fields persist with exact before/after audit and clear with null",
      "ms": 120.9666,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:891:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)",
      "ms": 98.0694,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:928:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history",
      "ms": 87.0121,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:944:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 a missing employee or a failure after data/history writes rolls back the final decision",
      "ms": 34.3512,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:961:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-execution.integration.cjs",
      "name": "REQ-10 simultaneous personal requests preserve the committed before/after chain",
      "ms": 12109.7714,
      "pass": false,
      "error": "Personal update race timed out",
      "cause": "Personal update race timed out",
      "stack": "Error: Personal update race timed out\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-execution.integration.cjs:992:108)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against REJECT; COMPLETED, audit and issued PDF stay consistent",
      "ms": 36392.9715,
      "pass": false,
      "error": "Approval never reached the gated renderer",
      "cause": "Approval never reached the gated renderer",
      "stack": "Error: Approval never reached the gated renderer\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "REJECT that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 12050.5429,
      "pass": false,
      "error": "First decision did not reach its gated read",
      "cause": "First decision did not reach its gated read",
      "stack": "Error: First decision did not reach its gated read\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against RETURN; COMPLETED, audit and issued PDF stay consistent",
      "ms": 12045.4634,
      "pass": false,
      "error": "Approval never reached the gated renderer",
      "cause": "Approval never reached the gated renderer",
      "stack": "Error: Approval never reached the gated renderer\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "RETURN that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 12019.7103,
      "pass": false,
      "error": "First decision did not reach its gated read",
      "cause": "First decision did not reach its gated read",
      "stack": "Error: First decision did not reach its gated read\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "approval holding the request lock wins against CANCEL; COMPLETED, audit and issued PDF stay consistent",
      "ms": 12016.5185,
      "pass": false,
      "error": "Approval never reached the gated renderer",
      "cause": "Approval never reached the gated renderer",
      "stack": "Error: Approval never reached the gated renderer\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "CANCEL that read the request first holds its lock; a later approval cannot issue a PDF from stale state",
      "ms": 12041.3119,
      "pass": false,
      "error": "Second decision neither blocked nor reached renderer",
      "cause": "Second decision neither blocked nor reached renderer",
      "stack": "Error: Second decision neither blocked nor reached renderer\n    at Timeout.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:24:106)\n    at listOnTimeout (node:internal/timers:605:17)\n    at processTimers (node:internal/timers:541:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "REJECT requires a meaningful reason and stores the trimmed comment only",
      "ms": 42.4012,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:161:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p5e-decision-race.integration.cjs",
      "name": "RETURN requires a meaningful reason and stores the trimmed comment only",
      "ms": 36.1462,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p5e-decision-race.integration.cjs:161:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-04: نسخة المعادي من سلسلة الفئة بتسري على كل نوع ماشي عليها (والحضور المشترك كمان) — والنوع الخاص لأ",
      "ms": 81.8574,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:177:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-05: «خصّص سلسلة للطلب ده» بتنسخ الخطوات ونسخ الفروع — التوجيه مايتغيرش لحد ما تعدّلها، وتعديلها مايلمسش الباقيين",
      "ms": 79.0719,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:196:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-06: «رجّعه لسلسلة الفئة» — والسلسلة المخصّصة فاضلة في المكتبة",
      "ms": 40.2293,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:212:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-07: تغيير سلسلة الإجازات بينقل الماشيين عليها بس — الخاص فاضل، والحضور فاضل على سلسلته (نفس القديمة)",
      "ms": 75.7419,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:232:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-08: سلسلة جديدة للفئة بنسخ خطوات سلسلة (ونسخ فروعها) — والمالية ترجع «كل طلب بسلسلته» من غير ما حد يتحرك",
      "ms": 72.385,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:242:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-10: حساب الفرع — يشوف الخريطة، ومايغيّرش ربط الشركة ولا نوع لكل الشركة، ويخصّص نوع فرعه بسلسلة لفرعه",
      "ms": 122.0573,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:32:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:50:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:299:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "request-category-chains.integration.cjs",
      "name": "RC-11: الاستخدام — عدد الطلبات وآخر طلب لكل نوع، وحساب الفرع يشوف طلبات فرعه بس",
      "ms": 12.9081,
      "pass": false,
      "error": "The expression evaluated to a falsy value:\n\n  assert.ok(typeInfo(all, 'RC_L1').usageCount >= 4)\n",
      "cause": "The expression evaluated to a falsy value:\n\n  assert.ok(typeInfo(all, 'RC_L1').usageCount >= 4)\n",
      "stack": "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:\n\n  assert.ok(typeInfo(all, 'RC_L1').usageCount >= 4)\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\request-category-chains.integration.cjs:310:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس",
      "ms": 8855.8441,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:116:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة",
      "ms": 36.903,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:129:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش",
      "ms": 23.0748,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:138:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو",
      "ms": 28.2039,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:151:23)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه",
      "ms": 20.7938,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:160:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف",
      "ms": 21.0251,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:167:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06b: دايرة أطول في المديرين المسجّلين (3 و4 أشخاص) — «مدير المدير» مرؤوس لمقدّم الطلب، فالتقديم بيقف (CR10-N01)",
      "ms": 76.415,
      "pass": false,
      "error": "C3-: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "C3-: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: C3-: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:184:12)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06c: لفّة التدرّج الطبيعية (مدير فرع جوه قسم مديره تحته) مابتتحسبش دايرة — الخطوة بتروح لمدير الفرع",
      "ms": 79.2549,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:203:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه",
      "ms": 23.3247,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:33:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\manager-of-direct-manager.integration.cjs:208:17)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-05: «مدير الإدارة» — موظف قسم تحت إدارة بيروح لمديرها، وهو بس اللي بيعتمد",
      "ms": 38.443,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:56:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:265:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-06: قسم فرعي على مستويين تحت الإدارة — نفس مدير الإدارة",
      "ms": 21.5529,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:56:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:279:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-07: مدير الإدارة هو مقدّم الطلب — الخطوة بتطلع للإدارة التنفيذية برابطها لفرع تاني، والرئيس بيعتمد من حساب «كل الفروع»",
      "ms": 17.7179,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:56:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:284:21)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-08: الإيقاف برسالة بتسمّي الوحدة — مفيش قسم، مفيش إدارة، الإدارة مالهاش مدير، المدير الوحيد هو مقدّم الطلب",
      "ms": 19.303,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 400\n\n    at refused (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:59:10)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:301:5)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-09: السرّي مابيتخطّاش «مدير الإدارة» (زي «مدير القسم»)، والدور مش مقبول كجهة تصعيد",
      "ms": 19.4037,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:56:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:319:16)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "administration-level.integration.cjs",
      "name": "AL-11: «الإدارة» في بطاقة صاحب الطلب — الاسم لنطاق فرعها، والإدارة التنفيذية برّه النطاق باسمها العام، ومحجوبة مع orgHidden",
      "ms": 0.2704,
      "pass": false,
      "error": "Cannot read properties of undefined (reading 'id')",
      "cause": "Cannot read properties of undefined (reading 'id')",
      "stack": "TypeError: Cannot read properties of undefined (reading 'id')\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\administration-level.integration.cjs:373:49)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-01: من غير نسخ — الفرعين على السلسلة العامة",
      "ms": 10280.2687,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:31:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:35:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:99:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-02: نسخة للمعادي بنفس الكود: طلب المعادي لمعتمدها، والنصر فاضل على العامة، ونسخة تانية لنفس الفرع مرفوضة",
      "ms": 64.9897,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:31:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:35:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:107:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-03: تعطيل نسخة المعادي يرجّع طلبات المعادي للعامة، وتفعيلها يرجّعها لنسختها",
      "ms": 51.2794,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:31:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:35:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:117:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-04: حساب فرع النصر يعمل نسخة لفرعه بس — مش للمعادي، ونسخة النصر بتاخد طلبات النصر",
      "ms": 60.7643,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:31:49)\n    at firstApproverOf (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:35:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-chain-branch-copy.integration.cjs:128:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين",
      "ms": 81.023,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:363:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس",
      "ms": 40.2181,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:408:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل",
      "ms": 41.4452,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:473:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض",
      "ms": 37.2309,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:486:18)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل",
      "ms": 60.0819,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:512:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
      "ms": 134.1834,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:648:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس",
      "ms": 43.6439,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:789:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال",
      "ms": 94.2854,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:857:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى",
      "ms": 44.2,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expectStatus (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:55:10)\n    at submit (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:72:50)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:901:15)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_expense_reports_test_df656d9e7587ccea is absent from sys.databases.",
    "Cleanup verified: hr_category_chains_test_895a3ca96c2d642f is absent from sys.databases.",
    "Cleanup verified: hr_skip_level_test_6214230ba103da2d is absent from sys.databases.",
    "Cleanup verified: hr_administration_level_test_63a755e89214a6f4 is absent from sys.databases.",
    "Cleanup verified: hr_chain_holders_test_7235e28218d8c6e2 is absent from sys.databases.",
    "Cleanup verified: hr_chain_branch_copy_test_1e1e1595d1558e8c is absent from sys.databases.",
    "Cleanup verified: hr_delegation_test_967e892475733ec9 is absent from sys.databases.",
    "Cleanup verified: hr_delegation_migration_test_06ca935da5b8251e is absent from sys.databases.",
    "Cleanup verified: hr_chain_disburse_test_c8e2fe8e34697dc0 is absent from sys.databases.",
    "Cleanup verified: hr_holiday_work_test_01483bfa8293e2bc is absent from sys.databases.",
    "المرفق المطلوب مع الطلب: رفض بلا ملف، قبول معه، ونفس الحقل في الطلب وسجل الإجازة.",
    "مسار «بعد الرجوع» كما هو: تذكير يوم الموعد، رفع بنفس الحقل، وتحويل بدون راتب بعد انقضاء المهلة.",
    "Cleanup verified: hr_leave_attach_test_7c88927182195d66 is absent from sys.databases.",
    "Cleanup verified: hr_leave_tiers_test_3610c48d9d53abd2 is absent from sys.databases.",
    "Manual: 9000 − 3 × 300 (MISSED sick days now unpaid) = 8100; no tier deduction on top.",
    "Manual: day rate 300; 10 days × 300 × 25% = 750 (sick) + 2 unpaid days × 300 = 600; net 9000 − 1350 = 7650.",
    "Manual: 2 × 300 × 25% = 150 + 2 × 300 × 100% = 600 → 750; five fully paid days → 0.",
    "Cleanup verified: hr_leave_sick_pay_test_adcd2f970d339aa8 is absent from sys.databases.",
    "Cleanup: hr_leave_year_end_test_ddba74d57e68a8d8 dropped.",
    "Cleanup verified: hr_swap_consents_test_7cb522fc56cf5a64 is absent from sys.databases.",
    "tests 178",
    "suites 0",
    "pass 98",
    "fail 80",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 216213.7434"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_expense_reports_test_df656d9e7587ccea\"}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_expense_reports_test_df656d9e7587ccea\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":3,\"unexpected\":[{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_5527884e91b3294d\"}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1915:19\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1915:19\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_5527884e91b3294d\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":23,\"unexpected\":[{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1915:19\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1915:19\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_decision_race_test_5957b55ec7aeb174\"}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async RequestsService.service.<computed> [as scoped] (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-decision-race.integration.cjs:116:22)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async RequestsService.service.<computed> [as scoped] (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-decision-race.integration.cjs:116:22)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_decision_race_test_5957b55ec7aeb174\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":8,\"unexpected\":[{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async RequestsService.service.<computed> [as scoped] (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-decision-race.integration.cjs:116:22)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async RequestsService.service.<computed> [as scoped] (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-decision-race.integration.cjs:116:22)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.scoped (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3676:13)\",\"    at async D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:1438:19\"]}]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_category_chains_test_895a3ca96c2d642f\"}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_category_chains_test_895a3ca96c2d642f\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":6,\"unexpected\":[{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_skip_level_test_6214230ba103da2d\"}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_skip_level_test_6214230ba103da2d\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":9,\"unexpected\":[{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_administration_level_test_63a755e89214a6f4\"}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_administration_level_test_63a755e89214a6f4\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":5,\"unexpected\":[{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_holders_test_7235e28218d8c6e2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_holders_test_7235e28218d8c6e2\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_branch_copy_test_1e1e1595d1558e8c\"}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_branch_copy_test_1e1e1595d1558e8c\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":4,\"unexpected\":[{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_delegation_test_967e892475733ec9\"}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "REVIEW_MEASURE {\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_delegation_test_967e892475733ec9\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":9,\"unexpected\":[{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]},{\"message\":\"POOL_CONNECTION_INSIDE_TRANSACTION\",\"stack\":[\"    at SqlServerDriver.ds.driver.obtainMasterConnection (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\test\\\\codex-review-p5e-runtime-audit-preload.cjs:10:212)\",\"    at SqlServerQueryRunner.query (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\typeorm\\\\src\\\\driver\\\\sqlserver\\\\SqlServerQueryRunner.ts:220:31)\",\"    at processTicksAndRejections (node:internal/process/task_queues:103:5)\",\"    at async SelectQueryBuilder.loadRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3818:25)\",\"    at async SelectQueryBuilder.executeEntitiesAndRawResults (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:3564:26)\",\"    at async SelectQueryBuilder.getRawAndEntities (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1617:29)\",\"    at async SelectQueryBuilder.getOne (D:\\\\projects\\\\hr_system\\\\api\\\\node_modules\\\\src\\\\query-builder\\\\SelectQueryBuilder.ts:1644:25)\",\"    at async RequestsService.lockFinancialRequestPrelude (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3002:22)\",\"    at async RequestsService.owned (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:3243:13)\",\"    at async RequestsService.submitLocked (D:\\\\projects\\\\hr_system\\\\.claude\\\\worktrees\\\\review-p02\\\\api\\\\src\\\\requests\\\\requests.service.ts:561:17)\"]}]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_delegation_migration_test_06ca935da5b8251e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_delegation_migration_test_06ca935da5b8251e\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":7,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_disburse_test_c8e2fe8e34697dc0\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_disburse_test_c8e2fe8e34697dc0\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_holiday_work_test_01483bfa8293e2bc\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_holiday_work_test_01483bfa8293e2bc\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":13,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_recovery_test_d8f54993b10158b9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_recovery_test_d8f54993b10158b9\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":34,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_attach_test_7c88927182195d66\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_attach_test_7c88927182195d66\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":24,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_tiers_test_3610c48d9d53abd2\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_tiers_test_3610c48d9d53abd2\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":6,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_sick_pay_test_adcd2f970d339aa8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_sick_pay_test_adcd2f970d339aa8\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":0,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_leave_year_end_test_ddba74d57e68a8d8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_leave_year_end_test_ddba74d57e68a8d8\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":0,\"probes\":0,\"unexpected\":[]}}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_swap_consents_test_7cb522fc56cf5a64\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_swap_consents_test_7cb522fc56cf5a64\"}\n",
    "REVIEW_MEASURE {\"connectionAudit\":{\"transactions\":35,\"probes\":0,\"unexpected\":[]}}\n"
  ]
}

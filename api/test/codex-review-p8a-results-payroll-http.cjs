module.exports = {
  "selected": [
    "codex-review-p8a-payroll",
    "codex-review-p8a-mailbox-copy"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 11,
      "failed": 1,
      "passed": 10,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 11,
      "suites": 0
    },
    "duration_ms": 33750.1305
  },
  "results": [
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F00: off payroll calculation, policy fingerprint and slip match approved baseline",
      "ms": 20006.849,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F01: late pending correction versus final payroll approval",
      "ms": 1037.6325,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_missing_punch_test_654e443a17992596.dbo.approval_chains'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_missing_punch_test_654e443a17992596.dbo.approval_chains'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'nameAr', table 'hr_missing_punch_test_654e443a17992596.dbo.approval_chains'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    },
    {
      "file": "codex-review-p8a-mailbox-copy.integration.cjs",
      "name": "MB-01: الموديول مقفول افتراضيًا — كل مسارات البريد 404 حتى لمدير النظام، وبتتفتح لما يتفعّل",
      "ms": 16950.957,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-mailbox-copy.integration.cjs",
      "name": "MB-02: البريد مش مضبوط على الخادم — الحالة بتقول، وكل مسار 503 بكود ثابت، ومفيش طلب بيطلع",
      "ms": 36.0537,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-mailbox-copy.integration.cjs",
      "name": "MB-03: «افتح بريدك» على السلك — المقفول 428، والغلط مرفوض ومعدود (خمسة = قفل ربع ساعة)، والصح بيفتح والمفتاح في cookie بس",
      "ms": 1531.4766,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-mailbox-copy.integration.cjs",
      "name": "MB-04: المخزن عبر HTTP — مفتاح حساب أو جلسة تانية مايفتحش؛ والقفل والخروج وتغيير إصدار التوكن ونهاية التوكن ورفض خادم البريد بيمسحوه",
      "ms": 2718.6574,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-mailbox-copy.integration.cjs",
      "name": "MB-05: العزل — كل نداء بهوية صاحب الجلسة؛ ومعرّف رسالة أو مرفق حد تاني = غير موجود؛ وصندوق حد تاني بـmbx مرفوض قبل أي نداء",
      "ms": 355.2693,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-mailbox-copy.integration.cjs",
      "name": "MB-06: الصناديق المشتركة — الإدارة بالصلاحية، والفتح للمضاف عليه بس، وخادم البريد له الكلمة الأخيرة؛ وقبل الترحيل 192 وبعده",
      "ms": 5460.879,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-mailbox-copy.integration.cjs",
      "name": "MB-07: الإرسال — نموذج متعدد الأجزاء بمرفق باسم عربي، والهوية من الجلسة، والقيم الغلط مرفوضة قبل خادم البريد",
      "ms": 134.0101,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-mailbox-copy.integration.cjs",
      "name": "MB-08: «الدخول بحساب الشركة» بيمسك كلمة السر للجلسة لما الموديول مفعّل للحساب — البريد بيفتح من غير نموذج؛ والخروج بيمسح",
      "ms": 666.735,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p8a-mailbox-copy.integration.cjs",
      "name": "MB-09: ولا كلمة سر في أي رد ولا سطر سجل ولا طلب على السلك ولا عمود في القاعدة",
      "ms": 471.5515,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p8a-payroll.integration.cjs",
      "name": "P8A-F01: late pending correction versus final payroll approval",
      "ms": 1037.6325,
      "pass": false,
      "error": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_missing_punch_test_654e443a17992596.dbo.approval_chains'; column does not allow nulls. INSERT fails.",
      "cause": "Error: Cannot insert the value NULL into column 'nameAr', table 'hr_missing_punch_test_654e443a17992596.dbo.approval_chains'; column does not allow nulls. INSERT fails.",
      "stack": "QueryFailedError: Error: Cannot insert the value NULL into column 'nameAr', table 'hr_missing_punch_test_654e443a17992596.dbo.approval_chains'; column does not allow nulls. INSERT fails.\n    at D:\\projects\\hr_system\\api\\node_modules\\typeorm\\src\\driver\\sqlserver\\SqlServerQueryRunner.ts:277:30\n    at D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\base\\request.js:496:25\n    at Request.userCallback (D:\\projects\\hr_system\\api\\node_modules\\mssql\\lib\\tedious\\request.js:559:15)\n    at Request.callback (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\request.ts:379:14)\n    at Parser.onEndOfMessage (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\connection.ts:3812:22)\n    at Object.onceWrapper (node:events:622:28)\n    at Parser.emit (node:events:508:28)\n    at Parser.emit (node:domain:489:12)\n    at Readable.<anonymous> (D:\\projects\\hr_system\\api\\node_modules\\tedious\\src\\token\\token-stream-parser.ts:31:12)\n    at Readable.emit (node:events:508:28)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_missing_punch_test_654e443a17992596 is absent from sys.databases.",
    "tests 11",
    "suites 0",
    "pass 10",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 33750.1305"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_missing_punch_test_654e443a17992596\"}\n",
    "REVIEW_MEASURE {\"case\":\"P8A-F00\",\"baseline\":\"cfd56bd4\",\"items\":2,\"snapshotAndHashEqual\":true,\"breakdownAndSlipEqual\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_missing_punch_test_654e443a17992596\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_mailbox_test_15e494180c392aff\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_mailbox_test_15e494180c392aff\"}\n"
  ]
}

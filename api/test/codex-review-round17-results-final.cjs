module.exports = {
  "selected": [
    "codex-review-round17-overtime",
    "codex-review-round17-identity",
    "national-id-or-passport"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 34,
      "failed": 5,
      "passed": 29,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 34,
      "suites": 0
    },
    "duration_ms": 59540.7879
  },
  "results": [
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي",
      "ms": 9331.1364,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط",
      "ms": 855.6947,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط",
      "ms": 1937.7916,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف",
      "ms": 944.3876,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته",
      "ms": 1285.5475,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور",
      "ms": 2180.3143,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة",
      "ms": 874.6993,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل",
      "ms": 737.002,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي",
      "ms": 1184.7891,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي",
      "ms": 588.7457,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش",
      "ms": 0.9415,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات",
      "ms": 3.0269,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول",
      "ms": 1797.5376,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: exact overnight settlement boundary and fresh conflicting periods",
      "ms": 1232.8949,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: concurrent dispatch creates exactly one financial approval",
      "ms": 1097.9008,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: monthly cap rollback leaves no system decision and ordinary chain can approve later",
      "ms": 1230.0666,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: missing punch after detection blocks automatic approval",
      "ms": 726.2123,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 SQL engine and compatibility recorded without company database access",
      "ms": 14.6403,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 overtime: automatic and manual amounts survive real payroll approval and payment exactly once",
      "ms": 2692.8263,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 branch: transferred employee automatic overtime does not expose the former branch period name to new branch reader",
      "ms": 1250.8924,
      "pass": false,
      "error": "A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n",
      "cause": "A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-overtime.integration.cjs:837:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر",
      "ms": 5380.5609,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized passport",
      "ms": 5907.7368,
      "pass": false,
      "error": "Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "cause": "Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:13:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized national ID",
      "ms": 79.3923,
      "pass": false,
      "error": "Normalized identity must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "cause": "Normalized identity must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Normalized identity must belong to at most one employee after concurrent API saves\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:21:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: legacy passport accepted by old DTO remains editable when form resends it unchanged",
      "ms": 52.942,
      "pass": false,
      "error": "Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n",
      "cause": "Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: SQL and JS normalization agree across every stripped character and both Arabic digit sets",
      "ms": 23.047,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: controlled concurrent interleaving after two real preflight checks cannot persist duplicates",
      "ms": 184.2068,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     count: 2,\n-     count: 1,\n      field: 'passportNo'\n    },\n    {\n+     count: 2,\n-     count: 1,\n      field: 'nationalId'\n    }\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     count: 2,\n-     count: 1,\n      field: 'passportNo'\n    },\n    {\n+     count: 2,\n-     count: 1,\n      field: 'nationalId'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     count: 2,\n-     count: 1,\n      field: 'passportNo'\n    },\n    {\n+     count: 2,\n-     count: 1,\n      field: 'nationalId'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:61:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-01: الإنشاء بالجواز لوحده، أو بهوية بأي صيغة لوحدها (حروف وشرطة وطول أجنبي) — والمحفوظ مطبّع",
      "ms": 7696.4536,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-02: الاتنين فاضيين = 400 برسالة واحدة، والشكل الغلط 400 برسالته",
      "ms": 36.528,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-03: التكرار على القيمة المطبّعة — «a 123» و«A123» نفس الجواز (409)، والمحفوظ القديم بمسافات وأرقام عربية بيتطابق",
      "ms": 385.7642,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-04: التعديل — مسح واحد والتاني موجود مسموح، مسح الاتنين 400، ونفس الرقم بشكل تاني مش تغيير",
      "ms": 234.002,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-05: ملف قديم من غير هوية ولا جواز يفتح ويحفظ باقي حقوله، وقيمة مكررة من قبل القرار مابتمنعش الحفظ",
      "ms": 174.5888,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-06: التحديث الجماعي من ملف — الجواز عمود جديد، الهوية بأي صيغة، واحد منهم لكل صف، والتكرار (موظف تاني وجوه الملف)",
      "ms": 264.4399,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-07: إخفاء اسم صاحب الرقم المكرر لحساب فرع تاني زي ما هو — في الإضافة والتعديل والملف",
      "ms": 70.914,
      "pass": true,
      "skip": false
    },
    {
      "file": "national-id-or-passport.integration.cjs",
      "name": "ID-08: التصدير لموظف بالجواز بس — عمود الهوية فاضي وعمود الجواز بقيمته",
      "ms": 163.2295,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-round17-overtime.integration.cjs",
      "name": "CR17 branch: transferred employee automatic overtime does not expose the former branch period name to new branch reader",
      "ms": 1250.8924,
      "pass": false,
      "error": "A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n",
      "cause": "A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n",
      "stack": "AssertionError [ERR_ASSERTION]: A new-branch reader must not receive the private old-branch period name through stored submission evidence\n\ntrue !== false\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-overtime.integration.cjs:837:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized passport",
      "ms": 5907.7368,
      "pass": false,
      "error": "Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "cause": "Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Normalized passport must belong to at most one employee after concurrent API saves\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:13:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: two concurrent API updates cannot claim the same normalized national ID",
      "ms": 79.3923,
      "pass": false,
      "error": "Normalized identity must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "cause": "Normalized identity must belong to at most one employee after concurrent API saves\n\n2 !== 1\n",
      "stack": "AssertionError [ERR_ASSERTION]: Normalized identity must belong to at most one employee after concurrent API saves\n\n2 !== 1\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:21:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: legacy passport accepted by old DTO remains editable when form resends it unchanged",
      "ms": 52.942,
      "pass": false,
      "error": "Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n",
      "cause": "Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n",
      "stack": "AssertionError [ERR_ASSERTION]: Unchanged legacy passport must not block unrelated form changes\n\n400 !== 200\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:33:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-round17-identity.integration.cjs",
      "name": "CR17 identity: controlled concurrent interleaving after two real preflight checks cannot persist duplicates",
      "ms": 184.2068,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     count: 2,\n-     count: 1,\n      field: 'passportNo'\n    },\n    {\n+     count: 2,\n-     count: 1,\n      field: 'nationalId'\n    }\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     count: 2,\n-     count: 1,\n      field: 'passportNo'\n    },\n    {\n+     count: 2,\n-     count: 1,\n      field: 'nationalId'\n    }\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    {\n+     count: 2,\n-     count: 1,\n      field: 'passportNo'\n    },\n    {\n+     count: 2,\n-     count: 1,\n      field: 'nationalId'\n    }\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round17-identity.integration.cjs:61:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.",
    "{\"case\":\"night-boundary\",\"endsAt\":\"2026-09-24T13:00:00.000Z\",\"settledAt\":\"2026-09-24T14:10:00.000Z\",\"before\":false,\"at\":true}",
    "{\"case\":\"concurrent-auto-approval\",\"responses\":[{\"routed\":0,\"autoApproved\":1},{\"routed\":0,\"autoApproved\":0},{\"routed\":0,\"autoApproved\":0},{\"routed\":0,\"autoApproved\":0}],\"requests\":1,\"decisions\":1,\"amount\":140.62}",
    "{\"case\":\"monthly-fallback\",\"systemDecisions\":0,\"manualDecisions\":3,\"amount\":140.62}",
    "{\"case\":\"sql-version\",\"version\":\"16.0.4255.1\",\"compatibility\":150}",
    "{\"case\":\"auto-manual-payroll-paid\",\"approve\":201,\"pay\":201,\"repeatPay\":400,\"overtimeAmounts\":[140.62,140.62],\"overtimeTotal\":281.24}",
    "{\"case\":\"transferred-auto-period-scope\",\"transfer\":200,\"detail\":200,\"periodHiddenInList\":true,\"comment\":\"اعتماد تلقائي — فترة إضافي مفتوحة عليها «اعتماد تلقائي» في فرع يوم العمل\",\"storedEvidenceReason\":\"R17-A-PRIVATE-PERIOD\",\"leaked\":true}",
    "Cleanup verified: hr_ot_auto_approve_test_d29bfd29974b6afd is absent from sys.databases.",
    "{\"case\":\"passport-race\",\"statuses\":[200,200],\"persisted\":[{\"id\":1,\"passportNo\":\"RACEP123\"},{\"id\":2,\"passportNo\":\"RACEP123\"}]}",
    "{\"case\":\"national-id-race\",\"statuses\":[200,200],\"persisted\":[{\"id\":3,\"nationalId\":\"RACEI123\"},{\"id\":4,\"nationalId\":\"RACEI123\"}]}",
    "{\"case\":\"legacy-form\",\"sharedValidationIssues\":0,\"partialPatch\":200,\"formPatch\":400,\"message\":[\"رقم جواز السفر: حروف إنجليزية وأرقام وشرطة بس (من 3 لـ 40)\"],\"phone\":\"0550001111\"}",
    "{\"case\":\"controlled-identity-race\",\"field\":\"passportNo\",\"preflightPassed\":2,\"statuses\":[200,200],\"persisted\":2}",
    "{\"case\":\"controlled-identity-race\",\"field\":\"nationalId\",\"preflightPassed\":2,\"statuses\":[200,200],\"persisted\":2}",
    "Cleanup verified: hr_identity_test_334aff014cc321d9 is absent from sys.databases.",
    "tests 34",
    "suites 0",
    "pass 29",
    "fail 5",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 59540.7879"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_d29bfd29974b6afd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_d29bfd29974b6afd\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r17_identity_test_00bc17bc7f81b505\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r17_identity_test_00bc17bc7f81b505\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r17_identity_test_00bc17bc7f81b505\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_identity_test_334aff014cc321d9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_identity_test_334aff014cc321d9\"}\n"
  ]
}

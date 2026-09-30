module.exports = {
  "selected": [
    "loan-single-deduction",
    "hr-document-passport",
    "hiring-documents",
    "hiring-documents-migration",
    "currency-follows-branch",
    "profile-self-service",
    "payroll-membership-history"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 41,
      "failed": 4,
      "passed": 37,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 41,
      "suites": 0
    },
    "duration_ms": 81562.5589
  },
  "results": [
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "the employee: a regular loan with more than one month is refused (direct and draft submit, nothing left behind); one month or no month at all is one deduction",
      "ms": 6501.1078,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "HR on behalf: the same rule — more than one month refused, a missing month is approved at once as one installment",
      "ms": 148.2244,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "an exceptional loan keeps its installments for loans.exceptional, and is refused without it (the employee and on-behalf without the permission)",
      "ms": 124.4749,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "the cap preview: more than one month only for loans.exceptional; one month or none works for everyone",
      "ms": 55.6298,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "a regular request submitted before the rule and still pending is approved with its stored months (existing loans untouched)",
      "ms": 63.0356,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "the loans list and the employee ledger carry the loan kind (exceptional flag and installment count)",
      "ms": 30.3549,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "resubmit: a returned regular loan resubmitted by the employee goes through and the month is re-stamped from today; the employee still cannot set or forge a month",
      "ms": 148.6923,
      "pass": true,
      "skip": false
    },
    {
      "file": "loan-single-deduction.integration.cjs",
      "name": "resubmit: a month HR chose (loans.exceptional) survives unchanged — a regular loan filed on behalf, even when the employee resubmits, and an exceptional loan",
      "ms": 339.7243,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "the HR document and letter template editors list «رقم الجواز» and «رقم الهوية أو الجواز» next to «رقم الهوية»",
      "ms": 6061.0365,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "a passport-only employee issues a document with «رقم الهوية أو الجواز»: the ID when present, otherwise the passport, printed left-to-right",
      "ms": 444.6043,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:35:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:96:20)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "an empty «رقم الهوية» is still refused, and the message tells the user to use «رقم الهوية أو الجواز»",
      "ms": 541.0244,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:35:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:118:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "a letter for a passport-only employee prints the passport through «رقم الهوية أو الجواز»",
      "ms": 479.8564,
      "pass": false,
      "error": "The browser is already running for D:\\projects\\hr_system\\api\\test\\codex-review-round20-tmp\\puppeteer_dev_chrome_profile-HgAt6j. Use a different `userDataDir` or stop the running browser first.",
      "cause": "The browser is already running for D:\\projects\\hr_system\\api\\test\\codex-review-round20-tmp\\puppeteer_dev_chrome_profile-HgAt6j. Use a different `userDataDir` or stop the running browser first.",
      "stack": "Error: The browser is already running for D:\\projects\\hr_system\\api\\test\\codex-review-round20-tmp\\puppeteer_dev_chrome_profile-HgAt6j. Use a different `userDataDir` or stop the running browser first.\n    at ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/BrowserLauncher.ts:318:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/ChromeLauncher.ts:59:12)\n    at async PuppeteerNode.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/PuppeteerNode.ts:147:12)\n    at async LetterRenderer.pdf (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\src\\letters\\letter-renderer.service.ts:24:23)\n    at async LettersService.generate (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\src\\letters\\letters.service.ts:65:19)\n    at async EntityManager.transaction (D:\\projects\\hr_system\\api\\node_modules\\src\\entity-manager\\EntityManager.ts:157:28)\n    at async generate (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:130:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:133:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-01: من غير نوع مطلوب التقرير فاضي ومفيش مهمة نظام؛ وعلامة «مطلوب للتعيين» بتتكتب من حساب الشركة بصلاحية الإعدادات بس",
      "ms": 6876.5357,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-02: الناقص = المطلوب المفعّل من غير مستند بملف (الانتهاء مش شرط)، للموظفين الشغالين، بالفرع والقسم؛ والبحث وفلتر الفرع",
      "ms": 148.6872,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-03: نطاق الفروع — حساب الفرع يشوف فرعه بس من غير تسريب، وبرّه النطاق 404 من غير تذكير جزئي، ومن غير الصلاحية 403",
      "ms": 112.931,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-04: التذكير وإشعار «ناقصك من مسوغات التعيين» بالناقص الحالي — الشطب، والتذكير الجديد، والاختفاء لما يكتمل؛ و«المطلوب منّي»",
      "ms": 633.671,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents.integration.cjs",
      "name": "HD-05: مهمة «استلام مسوغات التعيين» — مع المهام وللموجودين مرة واحدة، بالتقدّم والناقص، ماتتقفلش والناقص موجود، وبتكتمل وترجع لوحدها",
      "ms": 690.922,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents-migration.integration.cjs",
      "name": "HD-M1: الملف LF من غير BOM، إضافي بلا تعديل بيانات، وأكواده فريدة، وأسماء القيد والمفتاح والفهرس بتاعة الكيانات، وقاعدة synchronize بنفس الشكل",
      "ms": 7040.9579,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents-migration.integration.cjs",
      "name": "HD-M2: المخطط القديم بأنواع مستندات ومهام تهيئة قائمة — المُرحّل بيضيف العمودين والجدول بس، والقائم «مش مطلوب» ومن غير مفتاح نظام، والفرق صفر",
      "ms": 3133.3735,
      "pass": true,
      "skip": false
    },
    {
      "file": "hiring-documents-migration.integration.cjs",
      "name": "HD-M3: آمن للتكرار، وشكل غلط بيوقف التحقق بكوده ومايسيبش أثر",
      "ms": 1972.881,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-01: سياق العملة لأي مستخدم داخل — الموظف بعملة فرعه، والموارد البشرية بفروع نطاقها بس، وكل الفروع للحساب العام، من غير أسماء",
      "ms": 6824.318,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-02: الإضافة بعملة الفرع — العملة المبعوتة بتتجاهل (حتى AED)، وأجر التعيين في سجل الأجر بنفس العملة",
      "ms": 439.0606,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-03: التعديل العادي بيتجاهل العملة ومابيعيدش كتابة المحفوظ، والنقل بين فرعين بنفس العملة مابيلمسهاش",
      "ms": 284.2711,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-04: تغيير الأجر بيتسجل بعملة الفرع — العملة المبعوتة بتتجاهل، والملف القديم بعملة غلط بيتظبط من خلال سجل الأجر",
      "ms": 277.8107,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-05: النقل من الملف لفرع عملته مختلفة بيغيّر العملة (تسمية بس) ويتسجل، وتغيير الأجر بعدها بيقول يثبّت سجل الأجر بالعملة الجديدة",
      "ms": 281.4434,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-06: النقل لفرع عملته مختلفة مع تغيير أجر في نفس الحفظ — التغيير نفسه بيكتب العملة الجديدة في سجل الأجر من غير انحراف",
      "ms": 264.4103,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-07: طلب نقل منفّذ لفرع عملته مختلفة بيغيّر العملة ويتسجل على الطلب، والنقل لفرع بنفس العملة مابيلمسهاش",
      "ms": 417.7972,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-08: تأمينات دولة الفرع بس — الإنشاء والتعديل بيترفضوا برسالة، والفرع القائم المختلف مابيتغيرش لوحده وبيحفظ باقي حقوله",
      "ms": 261.9453,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-09: عملة معادلات الرواتب من الخادم — معادلات كل الشركة بعملة النظام، ومعادلات الفرع بعملة فرعها، والمبعوت بيتفحص ويتجاهل",
      "ms": 166.7608,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-10: مستند الموارد البشرية بيطبع عملة فرع الموظف مش العمود المحفوظ في ملفه",
      "ms": 438.7573,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\currency-follows-branch.integration.cjs:41:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\currency-follows-branch.integration.cjs:347:18)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-01: the request applies nothing until the final approval, then writes only the changed fields with one change-log row each",
      "ms": 6779.0786,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-02: invalid values are refused at submission with an Arabic message and leave no request; a request invalid at approval applies nothing",
      "ms": 811.1413,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-03: national ID and passport stay unique — checked at the final approval only (no oracle for the employee), and under two simultaneous approvals",
      "ms": 429.6484,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-03b: the final approval of an identity change waits on the same identity lock as the HR edit (hr:employees:identity)",
      "ms": 140.495,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-04: bank, salary, org, codes, dates and the work email are refused — even when configured as a field of the type",
      "ms": 171.4667,
      "pass": true,
      "skip": false
    },
    {
      "file": "profile-self-service.integration.cjs",
      "name": "PD-05: the self photo endpoint — own employee only, image only, uploaded by the caller; the owner and in-scope HR see it",
      "ms": 399.0784,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-11: the legacy branch calculation creates a replacement after cancellation, while an explicit cancelled runId remains locked",
      "ms": 7192.506,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: snapshot payslip maps the saved hireDate to joinDate and keeps employee identity and salary from calculation",
      "ms": 657.9806,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-05: legacy branch payslip never exposes current private data or current salary after an employee transfer",
      "ms": 127.4669,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: an installment-only recalculation appears in changedEmployeeIds while membership and employee salary stay unchanged",
      "ms": 702.7689,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-membership-history.integration.cjs",
      "name": "PR-12: CUSTOM history with old items but no historical members denies branch access even when every current member is local",
      "ms": 625.7739,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "a passport-only employee issues a document with «رقم الهوية أو الجواز»: the ID when present, otherwise the passport, printed left-to-right",
      "ms": 444.6043,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:35:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:96:20)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "an empty «رقم الهوية» is still refused, and the message tells the user to use «رقم الهوية أو الجواز»",
      "ms": 541.0244,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at expect (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:35:42)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:118:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "a letter for a passport-only employee prints the passport through «رقم الهوية أو الجواز»",
      "ms": 479.8564,
      "pass": false,
      "error": "The browser is already running for D:\\projects\\hr_system\\api\\test\\codex-review-round20-tmp\\puppeteer_dev_chrome_profile-HgAt6j. Use a different `userDataDir` or stop the running browser first.",
      "cause": "The browser is already running for D:\\projects\\hr_system\\api\\test\\codex-review-round20-tmp\\puppeteer_dev_chrome_profile-HgAt6j. Use a different `userDataDir` or stop the running browser first.",
      "stack": "Error: The browser is already running for D:\\projects\\hr_system\\api\\test\\codex-review-round20-tmp\\puppeteer_dev_chrome_profile-HgAt6j. Use a different `userDataDir` or stop the running browser first.\n    at ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/BrowserLauncher.ts:318:15)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async ChromeLauncher.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/ChromeLauncher.ts:59:12)\n    at async PuppeteerNode.launch (file:///D:/projects/hr_system/api/node_modules/puppeteer-core/src/node/PuppeteerNode.ts:147:12)\n    at async LetterRenderer.pdf (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\src\\letters\\letter-renderer.service.ts:24:23)\n    at async LettersService.generate (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\src\\letters\\letters.service.ts:65:19)\n    at async EntityManager.transaction (D:\\projects\\hr_system\\api\\node_modules\\src\\entity-manager\\EntityManager.ts:157:28)\n    at async generate (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:130:5)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\hr-document-passport.integration.cjs:133:14)\n    at async Test.run (node:internal/test_runner/test:1113:7)"
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-10: مستند الموارد البشرية بيطبع عملة فرع الموظف مش العمود المحفوظ في ملفه",
      "ms": 438.7573,
      "pass": false,
      "error": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "cause": "{\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n",
      "stack": "AssertionError [ERR_ASSERTION]: {\"statusCode\":500,\"message\":\"Internal server error\"}\n\n500 !== 201\n\n    at ok (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\currency-follows-branch.integration.cjs:41:49)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\api\\test\\codex-review-round20-snapshot\\api\\test\\currency-follows-branch.integration.cjs:347:18)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_hiring_docs_test_232d8da69249b05d is absent from sys.databases.",
    "Cleanup verified: hr_hiring_docs_migration_test_5f845b4cfdce227b is absent from sys.databases.",
    "Cleanup verified: hr_currency_test_159ebece1325bcef is absent from sys.databases.",
    "Cleanup verified: hr_profile_test_e51fccb4704e049e is absent from sys.databases.",
    "Cleanup verified: hr_payroll_history_test_5efb421733e9e21f is absent from sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "tests 41",
    "suites 0",
    "pass 37",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 81562.5589"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_loan_single_test_871a886e946a18a8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_loan_single_test_871a886e946a18a8\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_passport_docs_test_bda03089bbe303b1\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_passport_docs_test_bda03089bbe303b1\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_hiring_docs_test_232d8da69249b05d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_hiring_docs_test_232d8da69249b05d\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_hiring_docs_migration_test_5f845b4cfdce227b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_hiring_docs_migration_test_5f845b4cfdce227b\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_currency_test_159ebece1325bcef\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_currency_test_159ebece1325bcef\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_profile_test_e51fccb4704e049e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_profile_test_e51fccb4704e049e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_payroll_history_test_5efb421733e9e21f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_payroll_history_test_5efb421733e9e21f\"}\n"
  ]
}

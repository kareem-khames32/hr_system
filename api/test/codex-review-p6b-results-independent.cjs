module.exports = {
  "selected": [
    "codex-review-p6b-setup",
    "codex-review-p6b-public",
    "codex-review-p6b-ai-read",
    "codex-review-p6b-ai",
    "codex-review-p6b-ai-assist"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 37,
      "failed": 2,
      "passed": 35,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 37,
      "suites": 0
    },
    "duration_ms": 39709.6689
  },
  "results": [
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-01: الصلاحية والملف — بصلاحية الإعدادات ولحساب بكل الفروع؛ القالب بعناوينه؛ وملف بعناوين غلط أو فاضي مرفوض قبل أي حاجة",
      "ms": 9442.0206,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-02: الهيكل — المعاينة مابتكتبش وبتقول الجديد والموجود والأخطاء بالصف؛ ملف فيه خطأ مابيتطبقش منه حاجة؛ والتطبيق بخدمة الفروع والأقسام، وإعادة الرفع بتتخطّى الموجود",
      "ms": 242.5899,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-03: الموظفين — نفس قواعد إنشاء الموظف في المعاينة (الإلزام والشكل والفرع والقسم والتكرار)، والتطبيق بخدمة إنشاء الموظف (الكود بيتولّد)، والموجود برقم بصمته بيتخطّى",
      "ms": 516.9837,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-04: (ج) الأرصدة الافتتاحية — بصلاحية الأرصدة فوق صلاحية الإعدادات؛ المعاينة مابتكتبش؛ والتطبيق بخدمة تعديل الرصيد (سبب وسجل) لحد ما المتبقي يساوي الملف؛ واللي رصيده زي الملف بيتخطّى",
      "ms": 352.9124,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "SI-05: (ج) السلف القائمة — بصلاحيتَي النيابة والاستثنائية؛ كل صف طلب سلفة بالنيابة بحكم النيابة القايم (من غير سلطة الموارد البشرية بيستنى سلسلته ومفيش سلفة، وبسلطتها بيتعتمد باسم اللي رفع)؛ والطلب القايم بيتخطّى",
      "ms": 357.8948,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "P6B-I01: settings-only account can create an employee despite original route refusing it",
      "ms": 167.2604,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "P6B-I03: balance import bypasses the leave module audience while the original adjustment route refuses",
      "ms": 90.0112,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "P6B-I04: settings-only account can create organization structure despite original route refusal",
      "ms": 20.1562,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "P6B-I05: each kind rejects a settings-only account before template or file processing",
      "ms": 6.8515,
      "pass": false,
      "error": "structure template\n\n404 !== 403\n",
      "cause": "structure template\n\n404 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: structure template\n\n404 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6b-setup.integration.cjs:243:11)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-01: الموديول مقفول افتراضيًا = مفيش مسار (إدارة ولا عام)؛ وقبل ترحيل 183 الشاشة بتقول ناقص والإنشاء مرفوض؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9479.6253,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-02: إدارة المفاتيح — بصلاحيتها ولحساب بكل الفروع؛ القيم بتتفحص؛ المفتاح بيظهر مرة في رد الإنشاء وبيتخزن بصمة؛ والإلغاء مرة واحدة",
      "ms": 144.946,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-03: الـAPI العام — مفتاح صالح بس (ناقص وغلط وملغي نفس الرد)، والنطاق المطلوب، وفروع المفتاح جوه القراءة بفرع الموظف الحالي، ومن غير بيانات حساسة، وللقراءة بس",
      "ms": 236.5567,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-04: حد الطلبات لكل مفتاح — بعد الحد 429، ومفتاح تاني لسه شغال؛ وقفل الموديول بيقفل الـAPI العام",
      "ms": 754.4575,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "PA-05: (ب) الحضور والإجازات وملخص المسير — نطاق القراءة لكل مسار، فروع المفتاح بفرع الموظف الحالي، المعتمد بس، إجمالي من غير مبلغ لموظف، وموديول البيانات المقفول بيقفل مساره",
      "ms": 364.0418,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "P6B-P01: public employee exposes ids of units and manager currently outside key branches",
      "ms": 151.1548,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-public.integration.cjs",
      "name": "P6B-P02: single/list, parent unit, moved team and unrestricted keys agree",
      "ms": 110.5728,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان",
      "ms": 9551.9717,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت",
      "ms": 147.5436,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش",
      "ms": 256.943,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد",
      "ms": 97.6933,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة",
      "ms": 255.6646,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-read.integration.cjs",
      "name": "P6B-A03: employee lookup sends a department identifier after its unit moves outside the caller branches",
      "ms": 66.051,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 11274.4032,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 382.5112,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 1002.7518,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 135.0904,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 234.0619,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 352.0759,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "P6B-A01: fresh identity cannot list, confirm or dismiss an old personal proposal",
      "ms": 152.0058,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai.integration.cjs",
      "name": "P6B-A04: account is rebound after authorization and before the proposal claim",
      "ms": 133.8523,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503",
      "ms": 8824.0306,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن",
      "ms": 239.6969,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض",
      "ms": 68.769,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها",
      "ms": 113.9976,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A02: original ASCII phone and IBAN are removed from provider input",
      "ms": 22.7327,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A05: alternate real-world free-text contact representations still reach provider",
      "ms": 60.6756,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A06: employee-less proposal cannot be decided after account gains an employee link",
      "ms": 72.9962,
      "pass": false,
      "error": "outcome is not defined",
      "cause": "outcome is not defined",
      "stack": "ReferenceError: outcome is not defined\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6b-ai-assist.integration.cjs:247:16)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "codex-review-p6b-setup.integration.cjs",
      "name": "P6B-I05: each kind rejects a settings-only account before template or file processing",
      "ms": 6.8515,
      "pass": false,
      "error": "structure template\n\n404 !== 403\n",
      "cause": "structure template\n\n404 !== 403\n",
      "stack": "AssertionError [ERR_ASSERTION]: structure template\n\n404 !== 403\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6b-setup.integration.cjs:243:11)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "codex-review-p6b-ai-assist.integration.cjs",
      "name": "P6B-A06: employee-less proposal cannot be decided after account gains an employee link",
      "ms": 72.9962,
      "pass": false,
      "error": "outcome is not defined",
      "cause": "outcome is not defined",
      "stack": "ReferenceError: outcome is not defined\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p6b-ai-assist.integration.cjs:247:16)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "{\"direct\":403,\"import\":403}",
    "{\"direct\":404,\"import\":400,\"balance\":17}",
    "{\"direct\":403,\"import\":403}",
    "Cleanup verified: hr_setup_import_test_045d29bda8b216fd is absent from sys.databases.",
    "{\"foreignDepartmentId\":null,\"foreignTeamId\":null,\"foreignManagerId\":null}",
    "{\"scopedReferences\":[5,null,null],\"allBranchesPreserved\":true}",
    "Cleanup verified: hr_public_api_test_43aebefd59b9e437 is absent from sys.databases.",
    "{\"callerBranch\":1,\"departmentCurrentBranch\":2}",
    "Cleanup verified: hr_aiassist_test_5e971114a4ae18db is absent from sys.databases.",
    "{\"closed\":\"fresh-rebinding\",\"write\":false}",
    "{\"race\":\"before-claim\",\"status\":200,\"currentEmployee\":4,\"requestEmployee\":3,\"action\":\"EXECUTED\"}",
    "Cleanup verified: hr_aiaction_test_2d3856e10bc8b2b9 is absent from sys.databases.",
    "{\"asciiPhoneRedacted\":true,\"ibanRedacted\":true}",
    "{\"representation\":\"Persian numerals\",\"providerReceivedContact\":true}",
    "{\"representation\":\"local phone\",\"providerReceivedContact\":true}",
    "{\"representation\":\"separated phone\",\"providerReceivedContact\":true}",
    "Cleanup verified: hr_aiassistx_test_e49b49d016aa86dd is absent from sys.databases.",
    "tests 37",
    "suites 0",
    "pass 35",
    "fail 2",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 39709.6689"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_setup_import_test_045d29bda8b216fd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_setup_import_test_045d29bda8b216fd\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_api_test_43aebefd59b9e437\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_api_test_43aebefd59b9e437\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassist_test_5e971114a4ae18db\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassist_test_5e971114a4ae18db\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_2d3856e10bc8b2b9\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_2d3856e10bc8b2b9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiassistx_test_e49b49d016aa86dd\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiassistx_test_e49b49d016aa86dd\"}\n"
  ]
}

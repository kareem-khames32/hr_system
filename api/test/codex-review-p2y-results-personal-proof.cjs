module.exports = {
  "selected": [
    "codex-review-p2y-personal-proof",
    "tasks-assignment-rules",
    "comments"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 22,
      "failed": 1,
      "passed": 21,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 22,
      "suites": 0
    },
    "duration_ms": 29481.3764
  },
  "results": [
    {
      "file": "codex-review-p2y-personal-proof.integration.cjs",
      "name": "P2Y personal proof follows current employee identity after actual account relinking",
      "ms": 5208.8906,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    comments: 404,\n    detail: 404,\n+   file: 200,\n-   file: 404,\n    log: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    comments: 404,\n    detail: 404,\n+   file: 200,\n-   file: 404,\n    log: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    comments: 404,\n    detail: 404,\n+   file: 200,\n-   file: 404,\n    log: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-personal-proof.integration.cjs:23:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-01: اختبارات المالك الخمسة — زميل مرفوض، وتحت المدير المرؤوس مقبول، وقسم تاني مرفوض برسالة الطلب، والمسؤول مايحوّلش، وHR برّه فروعه 404",
      "ms": 6509.1723,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-02: «تحته في الشجرة» — المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، ومش لفوق ولا للجنب؛ و«كل اللي تحته» بنفس حكم «تحته؟»",
      "ms": 2617.8484,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-03: المهمة الشخصية — لصاحبها ومديره المباشر بس، وبيديرها صاحبها، وبرّه قايمة «المهام» والتقرير، ومن غير إشعار تكليف ولا تبليغ تأخير",
      "ms": 937.3679,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-04: «تكليف أي موظف» — أي موظف في نطاق الحساب، وبيدير اللي كلّف بيه هو بس وبحقه دلوقتي، والصلاحية مش في أي دور جاهز",
      "ms": 168.5672,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-05: اللي كلّف بيها بيديرها بحقه دلوقتي — مسؤولها خرج من تحته = لا يشوفها ولا يديرها، ورجع = رجعت؛ و«فريقي» فيه اللي كلّف بيه حد أبعد من مرؤوسيه",
      "ms": 172.3687,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-06: المسؤول مايرفضش ولا يحوّل ولا يلغي ولا يغيّر الموعد؛ و«مش بتاعتي» تعليق بعلامته بيتشاور فيه للي كلّف من الخادم",
      "ms": 278.9341,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-07: طلب تمديد الميعاد — للمسؤول بسبب، واحد معلّق، واللي بيدير المهمة يوافق أو يرفض، وبيتشال مع تغيير الموعد أو التحويل أو الإقفال",
      "ms": 706.6933,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-08: «خلص لما» والميزة مفتوحة — مهمة معلّمة، اتقفلت متأخر يومين بإثبات، اترجّعت مرة بسبب، واتقبلت واتقيّمت 4؛ وكله في السجل والتقرير",
      "ms": 742.6522,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-09: نفس السيناريو والميزة مقفولة — من غير علامة ولا تقييم ولا خاناتهم، والالتزام والرجوع شغالين",
      "ms": 732.9739,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-10: التقرير — صاحب «عرض كل المهام» في نطاقه، والمدير على اللي يشوفه، وغيرهم فاضي؛ ومهمة الدور والشخصية برّاه؛ وحدود الفترة",
      "ms": 328.2328,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-assignment-rules.integration.cjs",
      "name": "TR-11: سجل المهمة — كل تغيير سطر في حوارها بعلامة نوعه وباسم اللي عمله، بيتقري بحكم المهمة",
      "ms": 486.2368,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل",
      "ms": 7186.7866,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب",
      "ms": 236.4511,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي",
      "ms": 1401.9031,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر",
      "ms": 134.5539,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام",
      "ms": 335.1433,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار",
      "ms": 486.5134,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال",
      "ms": 4612.252,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق",
      "ms": 713.7936,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق",
      "ms": 2815.0266,
      "pass": true,
      "skip": false
    },
    {
      "file": "comments.integration.cjs",
      "name": "CM-10: قفل تعديل الحساب مايستنفدش اتصالات القاعدة — نص المخزن بالكتير، والباقي بيستنى دوره من غير اتصال",
      "ms": 1268.5024,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p2y-personal-proof.integration.cjs",
      "name": "P2Y personal proof follows current employee identity after actual account relinking",
      "ms": 5208.8906,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    comments: 404,\n    detail: 404,\n+   file: 200,\n-   file: 404,\n    log: 404\n  }\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    comments: 404,\n    detail: 404,\n+   file: 200,\n-   file: 404,\n    log: 404\n  }\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  {\n    comments: 404,\n    detail: 404,\n+   file: 200,\n-   file: 404,\n    log: 404\n  }\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p2y-personal-proof.integration.cjs:23:9)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    }
  ],
  "diagnostics": [
    "{\"case\":\"personal-proof-relinked-account\",\"results\":{\"detail\":404,\"log\":404,\"comments\":404,\"file\":200}}",
    "Cleanup verified: hr_task_rules_test_0634b8739ae50426 is absent from sys.databases.",
    "Cleanup verified: hr_comments_test_e9597469edfdcf9e is absent from sys.databases.",
    "tests 22",
    "suites 0",
    "pass 21",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 29481.3764"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2y_personal_proof_test_e206b726f2fbe039\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2y_personal_proof_test_e206b726f2fbe039\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2y_personal_proof_test_e206b726f2fbe039\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_task_rules_test_0634b8739ae50426\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_task_rules_test_0634b8739ae50426\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_comments_test_e9597469edfdcf9e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_comments_test_e9597469edfdcf9e\"}\n"
  ]
}

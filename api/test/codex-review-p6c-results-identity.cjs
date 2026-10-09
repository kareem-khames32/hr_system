module.exports = {
  "selected": [
    "codex-review-p6c-ai"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 11,
      "failed": 0,
      "passed": 11,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 11,
      "suites": 0
    },
    "duration_ms": 23134.344
  },
  "results": [
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 10516.7585,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 342.6487,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 753.205,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 110.8391,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 171.5246,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 288.5095,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A01: fresh identity cannot list, confirm or dismiss an old personal proposal",
      "ms": 112.515,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A04: account is rebound after authorization and before the proposal claim",
      "ms": 56.5425,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A09: disabling the account before claim still permits execution",
      "ms": 98.4006,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A10: removing employee link before claim is refused with no write",
      "ms": 78.5872,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A11: current identity check remains correct while claim waits for the action row",
      "ms": 375.8305,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"closed\":\"fresh-rebinding\",\"write\":false}",
    "{\"race\":\"before-claim\",\"status\":409,\"currentEmployee\":4,\"requestEmployee\":null,\"action\":\"OK\"}",
    "{\"race\":\"disabled-before-claim\",\"status\":200,\"isActive\":false,\"action\":\"EXECUTED\"}",
    "{\"race\":\"unlink-before-claim\",\"status\":409,\"claimed\":null}",
    "{\"race\":\"sql-row-wait\",\"changeCommittedBeforeUnlock\":true,\"decision\":409,\"action\":\"OK\"}",
    "Cleanup verified: hr_aiaction_test_1c438b3339b05272 is absent from sys.databases.",
    "tests 11",
    "suites 0",
    "pass 11",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23134.344"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_1c438b3339b05272\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_1c438b3339b05272\"}\n"
  ]
}

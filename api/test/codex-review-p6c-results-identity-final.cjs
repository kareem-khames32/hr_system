module.exports = {
  "selected": [
    "codex-review-p6c-ai"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 14,
      "failed": 0,
      "passed": 14,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 14,
      "suites": 0
    },
    "duration_ms": 22739.7948
  },
  "results": [
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له",
      "ms": 10034.3626,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط",
      "ms": 312.6095,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل",
      "ms": 920.0435,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة",
      "ms": 119.633,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته",
      "ms": 175.2093,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش",
      "ms": 287.1152,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A01: fresh identity cannot list, confirm or dismiss an old personal proposal",
      "ms": 114.6725,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A04: account is rebound after authorization and before the proposal claim",
      "ms": 47.8635,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A09: disabling the account before claim still permits execution",
      "ms": 110.7247,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A10: removing employee link before claim is refused with no write",
      "ms": 84.1893,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A11: current identity check remains correct while claim waits for the action row",
      "ms": 367.7215,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A13: disabled HR account can still claim and instantly approve a bonus",
      "ms": 121.5923,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A14: loss of HR authority before claim still produces an instantly approved bonus",
      "ms": 159.4331,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p6c-ai.integration.cjs",
      "name": "P6C-A15: rebinding after successful claim retains the accepted identity boundary",
      "ms": 126.335,
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
    "{\"race\":\"disabled-before-bonus-claim\",\"http\":200,\"accountActive\":false,\"bonuses\":1,\"bonusStatus\":\"APPROVED\"}",
    "{\"race\":\"role-revoked-before-claim\",\"http\":200,\"currentRole\":\"employee\",\"bonusStatus\":\"APPROVED\",\"sessionVersion\":2,\"currentVersion\":3}",
    "{\"control\":\"identity-change-after-claim\",\"status\":200,\"acceptedEmployee\":3,\"requestEmployee\":3}",
    "Cleanup verified: hr_aiaction_test_6311e01a10e2ca31 is absent from sys.databases.",
    "tests 14",
    "suites 0",
    "pass 14",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 22739.7948"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_aiaction_test_6311e01a10e2ca31\"}\n",
    "✓ أنواع الطلبات: 75 جديد + 72 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_aiaction_test_6311e01a10e2ca31\"}\n"
  ]
}

module.exports = {
  "selected": [
    "codex-review-round6-requests",
    "codex-review-round11-boundaries",
    "manager-of-direct-manager",
    "codex-review-round12-unit"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 48,
      "failed": 0,
      "passed": 48,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 48,
      "suites": 0
    },
    "duration_ms": 32040.5545
  },
  "results": [
    {
      "file": "codex-review-round6-requests.integration.cjs",
      "name": "CR6 inbox scope matrix hides only current foreign organization and retains all pending requests",
      "ms": 5801.1032,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-requests.integration.cjs",
      "name": "CR6 all request reading routes keep transferred organization hidden from historical parties",
      "ms": 241.8698,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round6-requests.integration.cjs",
      "name": "CR6 concealment preserves approve reject return and exactly one financial effect after transfer",
      "ms": 210.0997,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round11-boundaries.integration.cjs",
      "name": "CR11 six recorded managers in a cycle: reject without state change; repair and resubmit the same draft",
      "ms": 5907.7177,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round11-boundaries.integration.cjs",
      "name": "CR11 natural department and branch fallback loop: submit and complete both named approvals",
      "ms": 446.0181,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round11-boundaries.integration.cjs",
      "name": "CR11 fallback first two hops cannot hide a recorded return from the selected approver to the requester",
      "ms": 249.2792,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round11-boundaries.integration.cjs",
      "name": "CR11 recorded traversal stops at its actual end instead of following a department fallback back to the requester",
      "ms": 326.8724,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس",
      "ms": 7362.3121,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة",
      "ms": 113.2436,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش",
      "ms": 180.4554,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو",
      "ms": 52.5679,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه",
      "ms": 53.4017,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف",
      "ms": 33.0635,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06b: دايرة أطول في المديرين المسجّلين (3 و4 أشخاص) — «مدير المدير» مرؤوس لمقدّم الطلب، فالتقديم بيقف (CR10-N01)",
      "ms": 178.3333,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06c: لفّة التدرّج الطبيعية (مدير فرع جوه قسم مديره تحته) مابتتحسبش دايرة — الخطوة بتروح لمدير الفرع",
      "ms": 105.0886,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه",
      "ms": 72.2667,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-08: «مدير المدير المباشر» مش مقبول كجهة تصعيد (إنشاء السلسلة وتعديل الخطوة)",
      "ms": 20.4879,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-09: الشاشة — الاختيار ظاهر بعد «المدير المباشر» ومش في قايمة التصعيد، وتسميته في الصناديق",
      "ms": 14.8174,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-01: «مدير الإدارة» في محرر السلاسل بعد «مدير القسم» بوصفه، ومش جهة تصعيد، وبتسميته في الصناديق التلاتة",
      "ms": 2.1543,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-02: اختيارات الأب بقواعد الخادم، وتغيير النوع أو الفرع بيشيل الأب اللي مابقاش يصلح",
      "ms": 1.2989,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-03: «الإدارة ← القسم» واختيارات القسم المجمّعة بالإدارة، وفلتر الإدارة بأقسامها جوه فرعها",
      "ms": 1.3335,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-04: الهيكل التنظيمي بشارة «إدارة» من نوع الوحدة (والقديم زي الأول)، وبطاقة صاحب الطلب بـ«الإدارة» ومحجوبة مع orgHidden",
      "ms": 8.5234,
      "pass": true,
      "skip": false
    },
    {
      "file": "administration-level-ui.test.cjs",
      "name": "UI-05: الشاشات متوصلة — «الإدارات والأقسام» والنوع والأب والشجرة، ونموذج الموظف وقايمته وملفه وملفي",
      "ms": 2.4697,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-01: الخادم — أبو القسم في الحسابات من نفس فرعه، فالتوسعة والمسار مايعدّوش للإدارة التنفيذية في فرع تاني",
      "ms": 0.5203,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-02: شاشة المسير — «القسم وأقسامه الفرعية» جوه فرعه زي الخادم بالحرف",
      "ms": 0.2895,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-03: شجرة الأقسام — حساب الفرع: أقسامه اللي تحت الإدارة التنفيذية جذور مش مختفية؛ حساب الشركة: تحتها وفرعها ظاهر",
      "ms": 0.1964,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-04: «القسم الأب» — الإدارة التنفيذية لأي فرع، والباقي من فرع القسم؛ وتغيير الفرع مايسيبش أب غلط مستخبي",
      "ms": 0.249,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-05: الهيكل التنظيمي — حساب الشركة: قسم النصر تحت الإدارة التنفيذية وفرعه ظاهر؛ حساب النصر: قسمه جذر من غير ما يختفي",
      "ms": 1.46,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch.test.cjs",
      "name": "XB-06: شاشة الأقسام — الجذور والشارات واختيارات الأب والتنبيهات متوصلة بالمنطق ده",
      "ms": 0.5037,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "القمة «الإدارة التنفيذية»: الرئيس التنفيذي مديرها، والسكرتير جنبه بس ومش أب لحد",
      "ms": 0.3358,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الإدارات بأبوّة الأقسام: مدير وعدد موظفين شامل الفروع، والفريق بقائده وأعضائه",
      "ms": 0.2427,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "فلتر الفرع وحساب الفرع: الفرع بيشوف جزءه بس، ولو مفيش رئيس تنفيذي ظاهر الفرع هو القمة",
      "ms": 0.2307,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "من غير إعداد: الرئيس التنفيذي والسكرتير يتستنتجوا من المسمى الوظيفي",
      "ms": 0.1763,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "البحث بيعلّم الشخص أو الوحدة ويفتح الطريق ليه (بتطبيع الهمزات)",
      "ms": 0.5431,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "العرض: كروت بخطوط ربط RTL، السكرتير كارت جانبي، والأعضاء والفتح والقفل",
      "ms": 2.5843,
      "pass": true,
      "skip": false
    },
    {
      "file": "org-chart-ui.test.cjs",
      "name": "الشاشة: فتح/قفل الكل، بحث، فلتر فرع، طباعة وتصدير، وإعداد الإدارة التنفيذية لحساب الشركة",
      "ms": 0.7131,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "default resignation factors change exactly at configured 2, 5 and 10 year thresholds",
      "ms": 0.3015,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "termination uses the configured wage tiers without resignation threshold jumps",
      "ms": 0.1079,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "default reason factors apply zero dismissal and full configured non-resignation payouts",
      "ms": 0.1087,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "custom thresholds, wage tiers and reason factors override defaults without changing unspecified reasons",
      "ms": 0.1364,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "payout follows the two-stage money rule (cut at two decimals, no rounding) and zero service or wage yields zero",
      "ms": 0.0554,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "inclusive final working dates reach exactly 2, 5 and 10 years without fractional-year boundary loss",
      "ms": 0.2173,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "calendar service length handles the existing leap-day anniversary convention and impossible/reversed dates",
      "ms": 0.052,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "policy table parsers reject bad factors, missing fields, duplicate or reversed thresholds and unknown reasons",
      "ms": 0.1993,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "legacy missing reason and malformed historical policy use their existing documented fallback rules",
      "ms": 0.0879,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "custom termination reasons use their own factor on the full award, and an unknown code is never resignation or a full award",
      "ms": 0.7484,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "service preview and persisted EOS lines match independent expected amounts at every resignation/termination boundary",
      "ms": 4.2608,
      "pass": true,
      "skip": false
    },
    {
      "file": "eos-policy.test.cjs",
      "name": "service preview respects custom policy and zero payouts do not create a fictitious EOS line",
      "ms": 0.5577,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"inboxScopeMatrix\":[{\"label\":\"legacy A\",\"rows\":6,\"currentTitleVisible\":false},{\"label\":\"A+B\",\"rows\":6,\"currentTitleVisible\":false},{\"label\":\"A+C\",\"rows\":6,\"currentTitleVisible\":true},{\"label\":\"all branches\",\"rows\":6,\"currentTitleVisible\":true},{\"label\":\"super admin\",\"rows\":6,\"currentTitleVisible\":true},{\"label\":\"C only\",\"rows\":0},{\"label\":\"empty scope\",\"rows\":0},{\"label\":\"viewer without approval\",\"rows\":0}],\"transferViaApi\":true}",
    "{\"requestListChecks\":12,\"historicalRequests\":6,\"reportTotal\":6,\"foreignDirectoryHidden\":true,\"confidentialNonPartyMasked\":true,\"ownOrganizationVisible\":true}",
    "{\"decisions\":[{\"action\":\"APPROVE\",\"status\":\"COMPLETED\",\"decisionRows\":1},{\"action\":\"REJECT\",\"status\":\"REJECTED\",\"decisionRows\":1},{\"action\":\"RETURN\",\"status\":\"RETURNED_FOR_INFO\",\"decisionRows\":1}],\"financialExpected\":123.45,\"financialActual\":123.45,\"financialRows\":1,\"retryStatuses\":[400,400],\"pendingRemaining\":2,\"decisionHistory\":4}",
    "Cleanup verified: hr_skip_level_test_b4a433e194930132 is absent from sys.databases.",
    "tests 48",
    "suites 0",
    "pass 48",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 32040.5545"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r6requests_test_c7f077321b512015\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r6requests_test_c7f077321b512015\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r6requests_test_c7f077321b512015\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r11boundaries_test_1cd98eb729603eb7\"}\n",
    "CR11_EVIDENCE {\"case\":\"six-person-cycle-and-repair\",\"rejected\":400,\"stateAfterRejection\":\"DRAFT\",\"resubmitted\":201,\"finalStatus\":\"COMPLETED\",\"approvalCount\":1}\n",
    "CR11_EVIDENCE {\"case\":\"natural-fallback-loop\",\"submission\":201,\"resolved\":[8,7],\"finalStatus\":\"COMPLETED\",\"approvalCount\":2}\n",
    "CR11_EVIDENCE {\"case\":\"fallback-then-recorded-return\",\"submission\":400,\"state\":\"DRAFT\",\"approvalCount\":0}\n",
    "CR11_EVIDENCE {\"case\":\"explicit-chain-with-unrelated-organizational-return\",\"submission\":201,\"finalStatus\":\"COMPLETED\",\"expectedApprover\":15}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r11boundaries_test_1cd98eb729603eb7\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r11boundaries_test_1cd98eb729603eb7\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_skip_level_test_b4a433e194930132\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_skip_level_test_b4a433e194930132\"}\n"
  ]
}

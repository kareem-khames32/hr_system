module.exports = {
  "selected": [
    "manager-of-direct-manager",
    "executive-cross-branch-parent",
    "public-branding",
    "approval-chain-branch-copy",
    "hr-final-authority",
    "overtime-immediate-dispatch"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 44,
      "failed": 0,
      "passed": 44,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 44,
      "suites": 0
    },
    "duration_ms": 193024.2165
  },
  "results": [
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-01: موظف عادي — المدير المباشر ثم مدير مديره، وكل واحد بيعتمد خطوته بس",
      "ms": 21914.9396,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-02: قائد فريق — مدير مديره المسجّل (الرئيس في فرع تاني) بيعتمد من حسابه اللي على مستوى الشركة",
      "ms": 329.0232,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-03: مدير تحت الرئيس مباشرة — الخطوة بتقع على الرئيس (مش مدير الفرع اللي تحته) ومابتتكررش",
      "ms": 480.1179,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-04: لو الرئيس له مدير مسجّل في ملفه، الخطوة بتروحله هو",
      "ms": 150.9344,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-05: مدير مباشر مالوش مدير (بيانات ناقصة) — التقديم بيقف برسالة باسمه",
      "ms": 170.6092,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-06: دايرة في الهيكل (مدير المدير = مقدّم الطلب) — التقديم بيقف",
      "ms": 131.6964,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-07: السرّي — مابيروحش للمدير المباشر، ولا من باب «مدير المدير» لما يقع عليه",
      "ms": 356.9911,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-08: «مدير المدير المباشر» مش مقبول كجهة تصعيد (إنشاء السلسلة وتعديل الخطوة)",
      "ms": 66.4922,
      "pass": true,
      "skip": false
    },
    {
      "file": "manager-of-direct-manager.integration.cjs",
      "name": "MDM-09: الشاشة — الاختيار ظاهر بعد «المدير المباشر» ومش في قايمة التصعيد، وتسميته في الصناديق",
      "ms": 52.671,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-01: قسم من فرع تاني تحت الإدارة التنفيذية — الإنشاء والتعديل ينجحوا، وقسم الفرع يفضل أب لأقسام فرعه",
      "ms": 20714.5105,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-02: أب من فرع مختلف غير الإدارة التنفيذية لسه مرفوض بنفس الرسالة القديمة — ومفيش حاجة بتتكتب",
      "ms": 255.4958,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-03: حساب فرع النصر مايربطش قسم تحت الإدارة التنفيذية (فرعها برّه نطاقه) — 403 في الإنشاء والتعديل",
      "ms": 129.8036,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-04: شيل تعليم الإدارة التنفيذية وتحتها أقسام من فروع تانية مرفوض — صريح وضمني — والرسالة بتسمّي قسم منهم ومفيش حاجة بتتغير",
      "ms": 204.8628,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-05: نقل الإدارة التنفيذية نفسها لفرع تاني عادي وأقسامها في فروعها؛ نقل قسم عادي بيسيب أقسامه الفرعية لسه مرفوض",
      "ms": 159.9235,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-06: الدائرة لسه مرفوضة — حتى عبر أقسام الفروع اللي تحت الإدارة التنفيذية",
      "ms": 155.2356,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-07: عطلة أقسام للفرع الرئيسي على الإدارة التنفيذية ماتوصلش لموظف النصر تحتها — وعطلة النصر على قسمه بتشمل قسمه الفرعي",
      "ms": 1370.9873,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-08: مسير على الإدارة التنفيذية مايسحبش موظفي فرع تاني تحتها، ومسير قسم النصر بياخد قسمه الفرعي",
      "ms": 812.6555,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-09: الخصومات والمكافآت — مسار القسم وأقسامه الفرعية وسلطة مدير القسم جوه الفرع، وقوايم حساب النصر ماتكشفش الإدارة التنفيذية",
      "ms": 459.5113,
      "pass": true,
      "skip": false
    },
    {
      "file": "executive-cross-branch-parent.integration.cjs",
      "name": "EX-10: بعد نقل أقسام الفروع التانية من تحت الإدارة التنفيذية شيل التعليم بيعدّي — القاعدة مابتقفلش أكتر من اللازم",
      "ms": 222.9934,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-branding.integration.cjs",
      "name": "PB-01: مفيش حاجة مضبوطة — الاسم والشعار null، والشعار 404، وبرضه من غير أي توكن",
      "ms": 19572.1048,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-branding.integration.cjs",
      "name": "PB-02: الاسم والشعار مضبوطين — الاسم ورابط الشعار بس، والشعار بايتاته وهيدرزه صح بلا أي تسجيل دخول",
      "ms": 216.9546,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-branding.integration.cjs",
      "name": "PB-02b: شعار SVG بيتقدم بنوعه وبـCSP بتقفل السكربت لو اتفتح لوحده",
      "ms": 95.3098,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-branding.integration.cjs",
      "name": "PB-03: القيمة المؤقتة لاسم الشركة (أو اسم مسافات بس) = null، والشعار مستقل عنها",
      "ms": 194.1047,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-branding.integration.cjs",
      "name": "PB-04: رقم ملف لغير صورة، أو لصورة مش «شعار الشركة»، أو ملف ناقص، أو قيمة تالفة = logoUrl null والشعار 404",
      "ms": 961.8398,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-branding.integration.cjs",
      "name": "PB-05: مفيش مدخل رقم ملف — شعار تاني مش المضبوط ومستند موظف مايتوصلش لهم من النقطة العامة",
      "ms": 310.802,
      "pass": true,
      "skip": false
    },
    {
      "file": "public-branding.integration.cjs",
      "name": "PB-06: الكنترولر مالوش مدخل رقم ملف ولا حارس، وموديوله لوحده متسجّل في AppModule",
      "ms": 2.8922,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-01: من غير نسخ — الفرعين على السلسلة العامة",
      "ms": 20449.374,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-02: نسخة للمعادي بنفس الكود: طلب المعادي لمعتمدها، والنصر فاضل على العامة، ونسخة تانية لنفس الفرع مرفوضة",
      "ms": 436.5349,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-03: تعطيل نسخة المعادي يرجّع طلبات المعادي للعامة، وتفعيلها يرجّعها لنسختها",
      "ms": 297.1182,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-04: حساب فرع النصر يعمل نسخة لفرعه بس — مش للمعادي، ونسخة النصر بتاخد طلبات النصر",
      "ms": 256.0646,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-chain-branch-copy.integration.cjs",
      "name": "BC-05: الشاشة: «نسخة خاصة بفرع» شغالة بنفس الكود مقفول، والفروع اللي مالهاش نسخة بس",
      "ms": 2.4082,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: promotion, title change, contract renewal and secondment HR files on behalf are approved at once and execute exactly as after the last approver",
      "ms": 21728.9306,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: a resignation HR files on behalf is approved at once, puts the employee in notice period and opens the offboarding case",
      "ms": 491.5081,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: money requests HR files on behalf are approved at once and post their ledger entries — expense, per diem and adjustment",
      "ms": 619.8183,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-final-authority.integration.cjs",
      "name": "Owner 26-Sep: a creator without HR authority keeps the whole chain for the same types and never approves his own; HR own resignation keeps its chain too",
      "ms": 631.1171,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: HTTP checkout already has one manager approval request before cron and remains idempotent",
      "ms": 22392.419,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: closed windows incomplete punches and below-threshold days produce no automatic request",
      "ms": 2350.9114,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: a computed day inside an outer transaction routes only after its SQL commit releases the employee lock",
      "ms": 1157.2043,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: rolling back the outer computation leaves no request source claim or punch",
      "ms": 781.1162,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: committing an inner savepoint waits for the outer commit and does not dispatch twice",
      "ms": 1259.9288,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: nested rollback discards only its refreshed existing source and preserves outer committed dispatch",
      "ms": 1868.5845,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: missing manager does not fail a committed punch and cron recovers the same source after configuration is repaired",
      "ms": 1378.704,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: an approved punch correction creates its manager overtime request after correction and attendance commit",
      "ms": 1649.7258,
      "pass": true,
      "skip": false
    },
    {
      "file": "overtime-immediate-dispatch.integration.cjs",
      "name": "Immediate OT dispatch: a top-level routing failure cannot reject the committed attendance and cron recovers its DETECTED record",
      "ms": 1355.222,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_skip_level_test_9509772cdb3f320d is absent from sys.databases.",
    "Cleanup verified: hr_exec_cross_branch_test_402e2903af72c2c6 is absent from sys.databases.",
    "Cleanup verified: hr_public_branding_test_fe2528b92596a615 is absent from sys.databases.",
    "Cleanup verified: hr_chain_branch_copy_test_886f4c6b6f2473a8 is absent from sys.databases.",
    "Cleanup verified: hr_ot_dispatch_test_3e3349b4287f7a68 removed.",
    "Cleanup verified: temporary uploads removed.",
    "tests 44",
    "suites 0",
    "pass 44",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 193024.2165"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_skip_level_test_9509772cdb3f320d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_skip_level_test_9509772cdb3f320d\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_exec_cross_branch_test_402e2903af72c2c6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_exec_cross_branch_test_402e2903af72c2c6\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_public_branding_test_fe2528b92596a615\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_public_branding_test_fe2528b92596a615\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_chain_branch_copy_test_886f4c6b6f2473a8\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_chain_branch_copy_test_886f4c6b6f2473a8\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_final_authority_test_a1aa96b1d6de801e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_final_authority_test_a1aa96b1d6de801e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_dispatch_test_3e3349b4287f7a68\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_dispatch_test_3e3349b4287f7a68\"}\n"
  ]
}

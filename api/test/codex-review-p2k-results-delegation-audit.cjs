module.exports = {
  "selected": [
    "approval-delegations",
    "approval-delegations-migration",
    "audit-log",
    "audit-log-migration"
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
    "duration_ms": 74382.3873
  },
  "results": [
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-01: الإنشاء — الموظف لنفسه، ولغيره بصلاحية وفي نطاقه؛ وحدود الفترة والفئات والبديل؛ والقايمة",
      "ms": 9362.9388,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين",
      "ms": 936.1498,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس",
      "ms": 617.6742,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل",
      "ms": 293.8725,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض",
      "ms": 539.4869,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل",
      "ms": 2440.2833,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
      "ms": 843.4459,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      5,\n      4,\n      true,\n+     false\n-     true\n    ]\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      5,\n      4,\n      true,\n+     false\n-     true\n    ]\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      5,\n      4,\n      true,\n+     false\n-     true\n    ]\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:713:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس",
      "ms": 992.3094,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال",
      "ms": 4905.7067,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى",
      "ms": 1430.5922,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-11: تفويضين متداخلين لنفس المفوِّض في نفس اللحظة — واحد بس",
      "ms": 111.3649,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 9431.6882,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-2: من غير الجدول والعمود التفويض مرفوض برسالة والصندوق والقرار والبريد والتصعيد زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده القرار بيتكتب «بالنيابة عن»",
      "ms": 5107.5121,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 975.0844,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-01 (معيار الخطة): تغيير آيبان (قبل وبعد متخفيين)، وقفل وفتح موديول، وتصدير تقرير رواتب — التلاتة في السجل بمين والـIP",
      "ms": 8443.0248,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-02: الدخول، والإعداد بقيمته قبل وبعد (والمفتاح الحساس نجوم)، والدور بصلاحياته، ومنح الحساب، وحدث المسير — كلهم في السجل",
      "ms": 280.4798,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-03: عملية رجعت (rollback) مالهاش سطر",
      "ms": 45.8839,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-04: البحث بصلاحية «سجل التدقيق» وبنطاق الفرع، والاحتفاظ: القديم في «منتهي الاحتفاظ» بس",
      "ms": 227.0212,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log.integration.cjs",
      "name": "AU-05 (CRP2A-B01): فشل سطر التدقيق بيرجّع التغيير نفسه — منح الحساب وتعديل الدور، ومعاهم إبطال الجلسات",
      "ms": 271.8906,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 9917.9154,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-2: من غير الجدول الإجراءات شغالة والبحث بيقول محتاج الترحيل؛ والمُرحّل بيعمل الجدول والمشغّل والفرق صفر، والتعديل والمسح مرفوضين",
      "ms": 4233.6985,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-3: آمن للتكرار",
      "ms": 1051.3783,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "approval-delegations.integration.cjs",
      "name": "DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش",
      "ms": 843.4459,
      "pass": false,
      "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      5,\n      4,\n      true,\n+     false\n-     true\n    ]\n  ]\n",
      "cause": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      5,\n      4,\n      true,\n+     false\n-     true\n    ]\n  ]\n",
      "stack": "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_CREATED',\n      3,\n      2,\n      true,\n+     false\n-     true\n    ],\n    [\n      'APPROVAL_DELEGATION_REVOKED',\n      5,\n      4,\n      true,\n+     false\n-     true\n    ]\n  ]\n\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\approval-delegations.integration.cjs:713:10)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_delegation_test_abe51cf30883299c is absent from sys.databases.",
    "Cleanup verified: hr_delegation_migration_test_b5508e3f72a5e140 is absent from sys.databases.",
    "Cleanup verified: hr_audit_log_test_9d405d13f66dcccf is absent from sys.databases.",
    "Cleanup verified: hr_audit_log_migration_test_aa074997da31ffa3 is absent from sys.databases.",
    "tests 22",
    "suites 0",
    "pass 21",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 74382.3873"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_delegation_test_abe51cf30883299c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_delegation_test_abe51cf30883299c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_delegation_migration_test_b5508e3f72a5e140\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_delegation_migration_test_b5508e3f72a5e140\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_test_9d405d13f66dcccf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_test_9d405d13f66dcccf\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_migration_test_aa074997da31ffa3\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_migration_test_aa074997da31ffa3\"}\n"
  ]
}

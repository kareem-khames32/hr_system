module.exports = {
  "selected": [
    "audit-log-migration",
    "stored-file-sha256-migration",
    "queue-outbox-migration",
    "notifications-migration",
    "tasks-migration",
    "request-execution-migration",
    "approval-delegations-migration",
    "policies-migration",
    "hr-document-acknowledgements-migration"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 27,
      "failed": 0,
      "passed": 27,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 27,
      "suites": 0
    },
    "duration_ms": 160188.5419
  },
  "results": [
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11687.807,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-2: من غير الجدول الإجراءات شغالة والبحث بيقول محتاج الترحيل؛ والمُرحّل بيعمل الجدول والمشغّل والفرق صفر، والتعديل والمسح مرفوضين",
      "ms": 3262.1852,
      "pass": true,
      "skip": false
    },
    {
      "file": "audit-log-migration.integration.cjs",
      "name": "ALM-3: آمن للتكرار",
      "ms": 763.2959,
      "pass": true,
      "skip": false
    },
    {
      "file": "stored-file-sha256-migration.integration.cjs",
      "name": "FSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10222.8586,
      "pass": true,
      "skip": false
    },
    {
      "file": "stored-file-sha256-migration.integration.cjs",
      "name": "FSM-2: من غير العمود الرفع شغال من غير بصمة؛ والمُرحّل بيضيفه بنفس الشكل، والقديم من غير بصمة، والجديد ببصمته",
      "ms": 3049.9073,
      "pass": true,
      "skip": false
    },
    {
      "file": "stored-file-sha256-migration.integration.cjs",
      "name": "FSM-3: آمن للتكرار",
      "ms": 527.455,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox-migration.integration.cjs",
      "name": "QM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11389.9318,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox-migration.integration.cjs",
      "name": "QM-2: من غير الجدولين الإجراء شغال والحدث مابيتسجلش؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الحدث بيتسجل ويتوزع",
      "ms": 3252.5048,
      "pass": true,
      "skip": false
    },
    {
      "file": "queue-outbox-migration.integration.cjs",
      "name": "QM-3: آمن للتكرار",
      "ms": 737.2261,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11139.4458,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-2: من غير الجداول الإشعارات المخزّنة والبريد واقفين من غير أخطاء؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر",
      "ms": 3786.1034,
      "pass": true,
      "skip": false
    },
    {
      "file": "notifications-migration.integration.cjs",
      "name": "NM-3: آمن للتكرار",
      "ms": 884.1166,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-migration.integration.cjs",
      "name": "TM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10466.6229,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-migration.integration.cjs",
      "name": "TM-2: من غير الجدول «مهامي» شغالة والمهمة العامة مرفوضة برسالة؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده المهمة بتتكلّف وتظهر",
      "ms": 3304.2062,
      "pass": true,
      "skip": false
    },
    {
      "file": "tasks-migration.integration.cjs",
      "name": "TM-3: آمن للتكرار",
      "ms": 553.1568,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-migration.integration.cjs",
      "name": "RM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 10777.6815,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-migration.integration.cjs",
      "name": "RM-2: من غير الأعمدة الإعداد مرفوض برسالة والاعتماد بيكمّل الطلب زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده المهمة بتتفتح",
      "ms": 3753.9033,
      "pass": true,
      "skip": false
    },
    {
      "file": "request-execution-migration.integration.cjs",
      "name": "RM-3: آمن للتكرار",
      "ms": 561.2372,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11076.7711,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-2: من غير الجدول والعمود التفويض مرفوض برسالة والصندوق والقرار والبريد والتصعيد زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده القرار بيتكتب «بالنيابة عن»",
      "ms": 4209.2735,
      "pass": true,
      "skip": false
    },
    {
      "file": "approval-delegations-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 624.2875,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-migration.integration.cjs",
      "name": "PM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11025.5138,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-migration.integration.cjs",
      "name": "PM-2: من غير الجداول الشاشات «مستنية الترحيل» ومفيش بوابة؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده النشر والإقرار شغالين والمشغّلين بيمنعوا التعديل والمسح",
      "ms": 3620.7094,
      "pass": true,
      "skip": false
    },
    {
      "file": "policies-migration.integration.cjs",
      "name": "PM-3: آمن للتكرار",
      "ms": 838.9327,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر",
      "ms": 11687.9522,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-2: من غير الترحيل الإصدار العادي شغال وطلب الإقرار مرفوض برسالته؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الإقرار شغال والمشغّل بيمنع تعديله",
      "ms": 3883.4266,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-acknowledgements-migration.integration.cjs",
      "name": "DM-3: آمن للتكرار",
      "ms": 774.3137,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_audit_log_migration_test_2be2467de8b57fc7 is absent from sys.databases.",
    "Cleanup verified: hr_file_sha_migration_test_bc766edea6a42a0e is absent from sys.databases.",
    "Cleanup verified: hr_queue_migration_test_cb107e39a8b6a5b6 is absent from sys.databases.",
    "Cleanup verified: hr_notify_migration_test_65317db25c895ec6 is absent from sys.databases.",
    "Cleanup verified: hr_tasks_migration_test_bd1f1ff4fee6d49f is absent from sys.databases.",
    "Cleanup verified: hr_reqexec_migration_test_a8802fe1994467b9 is absent from sys.databases.",
    "Cleanup verified: hr_delegation_migration_test_3ba1f084e41cce0d is absent from sys.databases.",
    "Cleanup verified: hr_policies_migration_test_77ed7dbf9cc99f6a is absent from sys.databases.",
    "Cleanup verified: hr_docack_migration_test_eac87dde14949629 is absent from sys.databases.",
    "tests 27",
    "suites 0",
    "pass 27",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 160188.5419"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_audit_log_migration_test_2be2467de8b57fc7\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_audit_log_migration_test_2be2467de8b57fc7\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_file_sha_migration_test_bc766edea6a42a0e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_file_sha_migration_test_bc766edea6a42a0e\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_queue_migration_test_cb107e39a8b6a5b6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_queue_migration_test_cb107e39a8b6a5b6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_notify_migration_test_65317db25c895ec6\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_notify_migration_test_65317db25c895ec6\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_tasks_migration_test_bd1f1ff4fee6d49f\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_tasks_migration_test_bd1f1ff4fee6d49f\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_reqexec_migration_test_a8802fe1994467b9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_reqexec_migration_test_a8802fe1994467b9\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_delegation_migration_test_3ba1f084e41cce0d\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_delegation_migration_test_3ba1f084e41cce0d\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_policies_migration_test_77ed7dbf9cc99f6a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_policies_migration_test_77ed7dbf9cc99f6a\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "REVIEW_PROGRESS deterministic PDF fixture; no native renderer claim\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_docack_migration_test_eac87dde14949629\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_docack_migration_test_eac87dde14949629\"}\n"
  ]
}

module.exports = {
  "selected": [
    "ops-backup-restore"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 4,
      "failed": 4,
      "passed": 0,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 4,
      "suites": 0
    },
    "duration_ms": 3081.023
  },
  "results": [
    {
      "file": "ops-backup-restore.integration.cjs",
      "name": "OB-01: النسخة الكاملة متحقق منها، ونسخة برّه ببصمة مطابقة، والمرفوعات اتنسخت؛ والمرة التانية بتنسخ الجديد بس ومن غير حذف",
      "ms": 360.0854,
      "pass": false,
      "error": "ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak'",
      "cause": "ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak'",
      "stack": "Error: ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak'\n    at Object.copyFileSync (node:fs:3105:11)\n    at sqlGetFile (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\db-migrate.cjs:572:6)\n    at Object.takeCompanyBackup (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\db-migrate.cjs:624:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Object.backup (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-backup.cjs:164:19)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\ops-backup-restore.integration.cjs:55:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "ops-backup-restore.integration.cjs",
      "name": "OB-02: تجربة الاسترجاع على قاعدة باسم مؤقت — CHECKDB وعدد الجداول والصفوف وسجل الترحيلات — والقاعدة المؤقتة بتتمسح، وقاعدة الشركة مابتتلمسش",
      "ms": 14.3772,
      "pass": false,
      "error": "مفيش نسخة «daily» لقاعدة hr_opsbackup_test_d4dba6395f16d12b في D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily — شغّل ops-backup.cjs الأول",
      "cause": "مفيش نسخة «daily» لقاعدة hr_opsbackup_test_d4dba6395f16d12b في D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily — شغّل ops-backup.cjs الأول",
      "stack": "Error: مفيش نسخة «daily» لقاعدة hr_opsbackup_test_d4dba6395f16d12b في D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily — شغّل ops-backup.cjs الأول\n    at latestDaily (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-restore-check.cjs:36:28)\n    at Object.restoreCheck (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-restore-check.cjs:64:60)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\ops-backup-restore.integration.cjs:76:32)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "ops-backup-restore.integration.cjs",
      "name": "OB-03: مسح القديم بالاسم بس، ورفض أي قاعدة مش الشركة ولا مؤقتة، ورفض مكان «برّه» هو نفس مجلد النسخ",
      "ms": 2.9815,
      "pass": false,
      "error": "النسخ الجديدة فضلت",
      "cause": "النسخ الجديدة فضلت",
      "stack": "AssertionError [ERR_ASSERTION]: النسخ الجديدة فضلت\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\ops-backup-restore.integration.cjs:92:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "ops-backup-restore.integration.cjs",
      "name": "OB-04: نسخ الـlog — SIMPLE شرح من غير فشل، وFULL من غير أساس رسالة واضحة، وبعد الأساس نسخة متحقق منها",
      "ms": 224.8064,
      "pass": false,
      "error": "ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\log\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak'",
      "cause": "ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\log\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak'",
      "stack": "Error: ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\log\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak'\n    at Object.copyFileSync (node:fs:3105:11)\n    at Object.sqlGetFile (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\db-migrate.cjs:572:6)\n    at logBackup (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-backup.cjs:150:11)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Object.backup (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-backup.cjs:163:84)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\ops-backup-restore.integration.cjs:108:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "failures": [
    {
      "file": "ops-backup-restore.integration.cjs",
      "name": "OB-01: النسخة الكاملة متحقق منها، ونسخة برّه ببصمة مطابقة، والمرفوعات اتنسخت؛ والمرة التانية بتنسخ الجديد بس ومن غير حذف",
      "ms": 360.0854,
      "pass": false,
      "error": "ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak'",
      "cause": "ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak'",
      "stack": "Error: ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\hr_opsbackup_test_d4dba6395f16d12b_daily_20261003093820_8e29149d.bak'\n    at Object.copyFileSync (node:fs:3105:11)\n    at sqlGetFile (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\db-migrate.cjs:572:6)\n    at Object.takeCompanyBackup (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\db-migrate.cjs:624:3)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Object.backup (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-backup.cjs:164:19)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\ops-backup-restore.integration.cjs:55:17)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async startSubtestAfterBootstrap (node:internal/test_runner/harness:358:3)"
    },
    {
      "file": "ops-backup-restore.integration.cjs",
      "name": "OB-02: تجربة الاسترجاع على قاعدة باسم مؤقت — CHECKDB وعدد الجداول والصفوف وسجل الترحيلات — والقاعدة المؤقتة بتتمسح، وقاعدة الشركة مابتتلمسش",
      "ms": 14.3772,
      "pass": false,
      "error": "مفيش نسخة «daily» لقاعدة hr_opsbackup_test_d4dba6395f16d12b في D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily — شغّل ops-backup.cjs الأول",
      "cause": "مفيش نسخة «daily» لقاعدة hr_opsbackup_test_d4dba6395f16d12b في D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily — شغّل ops-backup.cjs الأول",
      "stack": "Error: مفيش نسخة «daily» لقاعدة hr_opsbackup_test_d4dba6395f16d12b في D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily — شغّل ops-backup.cjs الأول\n    at latestDaily (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-restore-check.cjs:36:28)\n    at Object.restoreCheck (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-restore-check.cjs:64:60)\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\ops-backup-restore.integration.cjs:76:32)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "ops-backup-restore.integration.cjs",
      "name": "OB-03: مسح القديم بالاسم بس، ورفض أي قاعدة مش الشركة ولا مؤقتة، ورفض مكان «برّه» هو نفس مجلد النسخ",
      "ms": 2.9815,
      "pass": false,
      "error": "النسخ الجديدة فضلت",
      "cause": "النسخ الجديدة فضلت",
      "stack": "AssertionError [ERR_ASSERTION]: النسخ الجديدة فضلت\n    at TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\ops-backup-restore.integration.cjs:92:10)\n    at Test.runInAsyncScope (node:async_hooks:214:14)\n    at Test.run (node:internal/test_runner/test:1106:25)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    },
    {
      "file": "ops-backup-restore.integration.cjs",
      "name": "OB-04: نسخ الـlog — SIMPLE شرح من غير فشل، وFULL من غير أساس رسالة واضحة، وبعد الأساس نسخة متحقق منها",
      "ms": 224.8064,
      "pass": false,
      "error": "ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\log\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak'",
      "cause": "ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\log\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak'",
      "stack": "Error: ENOENT: no such file or directory, copyfile 'D:\\var\\opt\\mssql\\data\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak' -> 'D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\codex-review-p1-tmp\\hr-ops-backup-dn7W7J\\daily\\log\\hr_opsbackup_test_d4dba6395f16d12b_logbase_20261003093820_1a1231e9.bak'\n    at Object.copyFileSync (node:fs:3105:11)\n    at Object.sqlGetFile (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\db-migrate.cjs:572:6)\n    at logBackup (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-backup.cjs:150:11)\n    at processTicksAndRejections (node:internal/process/task_queues:103:5)\n    at async Object.backup (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\scripts\\ops-backup.cjs:163:84)\n    at async TestContext.<anonymous> (D:\\projects\\hr_system\\.claude\\worktrees\\review-p01\\api\\test\\ops-backup-restore.integration.cjs:108:16)\n    at async Test.run (node:internal/test_runner/test:1113:7)\n    at async Test.processPendingSubtests (node:internal/test_runner/test:788:7)"
    }
  ],
  "diagnostics": [
    "Cleanup verified: hr_opsbackup_test_d4dba6395f16d12b is absent from sys.databases.",
    "tests 4",
    "suites 0",
    "pass 0",
    "fail 4",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 3081.023"
  ],
  "stdout": [
    "CRP1_OPS backup source is disposable; restore target must be generated by this process\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_opsbackup_test_d4dba6395f16d12b\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_opsbackup_test_d4dba6395f16d12b\"}\n"
  ]
}

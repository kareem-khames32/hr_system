module.exports = {
  "target": "8db1a0b9ccb9b990f3b806a47f8993f8060e181d",
  "trackedFilesUnchanged": 2818,
  "databasesAbsent": 8,
  "server": {
    "version": "16.0.4255.1",
    "edition": "Express Edition (64-bit)"
  },
  "secretScan": "passed",
  "temporaryFilesRemoved": 2,
  "temporaryDirectoryAbsent": true,
  "databases": [
    "hr_tasks_test_94d08314c9545455",
    "hr_tasks_migration_test_898addea9b46e8f8",
    "hr_notifications_test_142ceea3da694b27",
    "hr_hiring_docs_test_a2e727bfcf53e32f",
    "hr_queue_outbox_test_1a06c7229871dac2",
    "hr_codex_p2g_independent_test_05c163d1243d218a",
    "hr_scheduled_jobs_test_2761e70b5367e316",
    "hr_tasks_test_811f1eac51bf5a8e"
  ],
  "results": [
    {
      "file": "codex-review-p2g-results-core.cjs",
      "counts": {
        "tests": 78,
        "failed": 2,
        "passed": 76,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 78,
        "suites": 0
      },
      "failures": [
        {
          "name": "TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة",
          "error": "w1@tasks.invalid\n\n404 !== 200\n"
        },
        {
          "name": "TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها",
          "error": "Expected values to be strictly deep-equal:\n+ actual - expected\n\n  [\n    200,\n+   404\n-   200\n  ]\n"
        }
      ]
    },
    {
      "file": "codex-review-p2g-results-independent.cjs",
      "counts": {
        "tests": 5,
        "failed": 2,
        "passed": 3,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 5,
        "suites": 0
      },
      "failures": [
        {
          "name": "P2G hiring-document work must reappear in My Tasks when its required catalogue flag changes",
          "error": "Current required documents must not depend on opening the source screen first"
        },
        {
          "name": "P2G an old reminder cannot become valid again merely because the new due date got a fresh reminder stamp",
          "error": "A new stamp must not authorize the old deadline text"
        }
      ]
    },
    {
      "file": "codex-review-p2g-results-schedules.cjs",
      "counts": {
        "tests": 4,
        "failed": 0,
        "passed": 4,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 4,
        "suites": 0
      },
      "failures": []
    },
    {
      "file": "codex-review-p2g-results-tasks-files.cjs",
      "counts": {
        "tests": 17,
        "failed": 0,
        "passed": 17,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0,
        "topLevel": 17,
        "suites": 0
      },
      "failures": []
    }
  ]
}

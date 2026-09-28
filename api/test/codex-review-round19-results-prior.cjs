module.exports = {
  "selected": [
    "codex-review-round18-locks",
    "codex-review-round18-overtime",
    "codex-review-round18-required-fields"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 16,
      "failed": 0,
      "passed": 16,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 16,
      "suites": 0
    },
    "duration_ms": 24844.6907
  },
  "results": [
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 four unique fields reject create/update collision after both real preflights pass",
      "ms": 6225.715,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 existing identity lock does not prevent unrelated phone save",
      "ms": 59.1222,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 real finance wait followed by simultaneous creation identity update schedule assignment and ordinary save completes without deadlock",
      "ms": 282.2859,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 concurrent clearing of the two identity fields must preserve at least one on fresh state",
      "ms": 139.3672,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-locks.integration.cjs",
      "name": "CR18 legacy unchanged values allowed but newly invalid values types and lengths still rejected",
      "ms": 111.8426,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 all overtime read surfaces hide historical foreign window names and governing IDs without modifying stored evidence",
      "ms": 9065.1248,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 foreign period ID must also be absent from automatic approval marker in monthly response",
      "ms": 0.3011,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 redaction must preserve automatic pending status for branch reader",
      "ms": 0.1492,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round18-overtime.integration.cjs",
      "name": "CR18 recursive projection preserves input and handles mixed scopes deleted periods and nested review evidence",
      "ms": 1.452,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "رقم الهوية / الإقامة والجواز: أي صيغة لأي جنسية بعد التطبيع — من غير قواعد دولة",
      "ms": 1.6053,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "إضافة: كل حقل إجباري ناقص له رسالة بخطوته، والمكتوب يُفحص شكله",
      "ms": 1.9925,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "تعديل: ملف قديم ناقص يحفظ باقي حقوله، والمسح أو التغيير الغلط بس هو اللي يوقف",
      "ms": 0.3833,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "CreateEmployeeDto: رسالة عربية واحدة لكل حقل إجباري، وUpdateEmployeeDto يفضل اختياري",
      "ms": 8.3907,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "الواجهة: نموذج الموظف يستخدم نفس القاعدة ويعلّم الخانات الإجبارية",
      "ms": 1.5317,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "تاريخ التعيين: سقف سنة قدّام، والمُرحّلون بـ1900-01-01 يعدّوا",
      "ms": 0.2809,
      "pass": true,
      "skip": false
    },
    {
      "file": "employee-required-fields.test.cjs",
      "name": "إضافة موظف: فرع غير فرع المستخدم يُرفض صراحةً بدل إعادة كتابته",
      "ms": 0.3737,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"four-unique-fields-create-update\",\"evidence\":[{\"field\":\"passportNo\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"nationalId\",\"statuses\":[201,409],\"persisted\":1},{\"field\":\"email\",\"statuses\":[409,200],\"persisted\":1},{\"field\":\"fingerprintCode\",\"statuses\":[201,409],\"persisted\":1}]}",
    "{\"case\":\"ordinary-save-with-identity-lock-held\",\"status\":200}",
    "{\"case\":\"lock-order\",\"waitObserved\":true,\"statuses\":[200,201,201,200],\"identityPaths\":[[\"attendance\",\"finance\",\"identity\"],[\"attendance\",\"finance\",\"identity\"]]}",
    "{\"case\":\"concurrent-clear-pair\",\"realSqlWaiters\":2,\"statuses\":[200,400],\"nationalId\":null,\"passportNo\":\"PASS-13\"}",
    "{\"case\":\"all-window-surfaces\",\"checked\":[\"pending\",\"monthly-detected\",\"preview\",\"request-detail\",\"monthly-approved\"],\"storedSnapshotsUnchanged\":true,\"amount\":140.62,\"waitingFlags\":{\"branch\":true,\"company\":true,\"status\":\"DETECTED\"},\"marker\":{\"periodId\":1,\"shownMarker\":{\"periodIds\":[]},\"storedMarker\":{\"periodIds\":[1]}}}",
    "{\"case\":\"foreign-approval-marker\",\"periodId\":1,\"shownMarker\":{\"periodIds\":[]},\"storedMarker\":{\"periodIds\":[1]}}",
    "{\"case\":\"pending-status\",\"branch\":true,\"company\":true,\"status\":\"DETECTED\"}",
    "Cleanup verified: hr_ot_auto_approve_test_c668837ad667dcd5 is absent from sys.databases.",
    "tests 16",
    "suites 0",
    "pass 16",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 24844.6907"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r18_locks_test_930173c6ae5e8db9\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r18_locks_test_930173c6ae5e8db9\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r18_locks_test_930173c6ae5e8db9\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_ot_auto_approve_test_c668837ad667dcd5\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_ot_auto_approve_test_c668837ad667dcd5\"}\n"
  ]
}

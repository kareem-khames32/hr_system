module.exports = {
  "selected": [
    "codex-review-round19-locks",
    "codex-review-round19-overtime",
    "codex-review-round19-bank-pay-codes"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 12,
      "failed": 0,
      "passed": 12,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 12,
      "suites": 0
    },
    "duration_ms": 26885.0802
  },
  "results": [
    {
      "file": "codex-review-round19-locks.integration.cjs",
      "name": "CR19 identity pair remains valid in both serialization orders and rejected side fields roll back",
      "ms": 6265.4874,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round19-locks.integration.cjs",
      "name": "CR19 stale legacy invalid identifier cannot overwrite a concurrent valid correction",
      "ms": 632.903,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round19-locks.integration.cjs",
      "name": "CR19 atomic identity replacement is allowed while clearing the remaining identity is refused",
      "ms": 84.7528,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round19-locks.integration.cjs",
      "name": "CR19 legacy files missing both identities still accept phone email and fingerprint edits",
      "ms": 189.1261,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round19-overtime.integration.cjs",
      "name": "CR19 marker-only and nested references use real period lookup and preserve snapshots for every scope",
      "ms": 8075.1181,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round19-overtime.integration.cjs",
      "name": "CR19 real transfer retains only global marker IDs for new branch without losing pending or approved flags or money",
      "ms": 1619.8717,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "تقسيم الصافي: نقدي كله نقدي، تحويل كله بنك، نقدي + بنك = مبلغ البنك والباقي نقدي بالقص",
      "ms": 1.1655,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "فحص طريقة الصرف: مبلغ البنك > 0 في «نقدي + بنك»، والبنك والآيبان مطلوبان لما البنك داخل، والملف القديم الناقص يتحفظ",
      "ms": 0.2705,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "كشف البنوك: مبلغ البنك والنقدي لكل موظف، وإجمالي كل بنك، والنقدي الكامل خارج البنوك",
      "ms": 1.4232,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "كود الموظف: EMP- + 4 أرقام (شكل النظام القديم)، والتالي = أكبر EMP-#### أو EMP#### + 1 مع تجاهل الأكواد الأخرى",
      "ms": 0.334,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "الـDTO: كود الموظف مش مدخل في الإضافة ولا التعديل (يتشال)، و«نقدي + بنك» مقبولة بمبلغ موجب",
      "ms": 3.1641,
      "pass": true,
      "skip": false
    },
    {
      "file": "bank-pay-codes.test.cjs",
      "name": "الربط: البصمات برقم البصمة وحده، والتوليد داخل معاملة الإضافة بقفل، والشاشات والترحيل",
      "ms": 4.7913,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"both-clear-orders\",\"evidence\":[{\"order\":[\"nationalId\",\"passportNo\"],\"statuses\":[200,400],\"observed\":[1,2],\"preservedField\":\"passportNo\",\"rejectedPhoneRolledBack\":true},{\"order\":[\"passportNo\",\"nationalId\"],\"statuses\":[200,400],\"observed\":[1,2],\"preservedField\":\"nationalId\",\"rejectedPhoneRolledBack\":true}]}",
    "{\"case\":\"legacy-change-after-real-lock\",\"evidence\":[{\"field\":\"nationalId\",\"statuses\":[200,400],\"observed\":[1,2],\"validCorrectionPreserved\":true},{\"field\":\"passportNo\",\"statuses\":[200,400],\"observed\":[1,2],\"validCorrectionPreserved\":true}]}",
    "{\"case\":\"atomic-replacement\",\"statuses\":[200,400],\"savedPassport\":\"AB-123\"}",
    "{\"case\":\"legacy-empty-identities\",\"statuses\":[200,200,200]}",
    "{\"case\":\"marker-only-and-nested-real-sql\",\"evidence\":[{\"scope\":[1],\"visible\":[1,2]},{\"scope\":[1,2],\"visible\":[1,2,3]},{\"scope\":[],\"visible\":[1]},{\"scope\":null,\"visible\":[1,2,3]}],\"storedInputUnchanged\":true}",
    "{\"case\":\"mixed-marker-live-transfer\",\"branchMarker\":{\"periodIds\":[5]},\"companyMarker\":{\"periodIds\":[5,6]},\"pendingBefore\":true,\"approvedAfter\":true,\"pendingAfter\":false,\"amount\":140.62,\"storedSnapshotUnchanged\":true}",
    "Cleanup verified: hr_codex_r19_overtime_test_e64371adc5bd75ca is absent from sys.databases.",
    "tests 12",
    "suites 0",
    "pass 12",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 26885.0802"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r19_locks_test_ceaa190fac3a1c0a\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r19_locks_test_ceaa190fac3a1c0a\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r19_locks_test_ceaa190fac3a1c0a\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r19_overtime_test_e64371adc5bd75ca\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r19_overtime_test_e64371adc5bd75ca\"}\n"
  ]
}

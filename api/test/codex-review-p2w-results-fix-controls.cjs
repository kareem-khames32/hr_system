module.exports = {
  "selected": [
    "codex-review-p2w-fix-controls"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 3,
      "failed": 0,
      "passed": 3,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 3,
      "suites": 0
    },
    "duration_ms": 7280.5231
  },
  "results": [
    {
      "file": "codex-review-p2w-fix-controls.integration.cjs",
      "name": "P2W old approved leave must be cancelled before rehire and must refund only the old row",
      "ms": 4566.2757,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2w-fix-controls.integration.cjs",
      "name": "P2W rollover that read its source before rehire must reevaluate it after the employee lock",
      "ms": 192.5645,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2w-fix-controls.integration.cjs",
      "name": "P2W hidden payroll end cannot be inferred by probing rehire dates, while company reader retains it",
      "ms": 174.3532,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"old-future-leave-closure\",\"initial\":\"REHIRE_FUTURE_LEAVES\",\"newTaken\":2,\"oldTaken\":0}",
    "{\"case\":\"rollover-source-reread\",\"openingDays\":0}",
    "{\"case\":\"hidden-end-oracle\",\"limited\":{\"available\":false,\"code\":\"REHIRE_HIDDEN_RUN\",\"blocked\":\"أيام من خدمته القديمة داخلة في مسير خارج نطاق صلاحيتك — إعادة التعيين محتاجة حساب يشوف المسير ده\",\"lastWorkingDay\":\"2025-06-30\",\"minStartDate\":null,\"maxStartDate\":\"2027-10-08\"},\"companyMinimum\":\"2026-01-01\",\"identicalDateRefusals\":true}",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 7280.5231"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2w_fix_controls_test_aa193f46e916be28\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2w_fix_controls_test_aa193f46e916be28\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2w_fix_controls_test_aa193f46e916be28\"}\n"
  ]
}

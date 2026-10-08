module.exports = {
  "selected": [
    "codex-review-p3k-units",
    "codex-review-p3k-unit-scope"
  ],
  "summary": {
    "success": false,
    "counts": {
      "tests": 2,
      "failed": 1,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 21164.612
  },
  "results": [
    {
      "file": "codex-review-p3k-units.integration.cjs",
      "name": "D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3k-units.integration.cjs",
      "ms": 21163.0488,
      "pass": false,
      "error": "test failed"
    },
    {
      "file": "codex-review-p3k-unit-scope.integration.cjs",
      "name": "P3K-U01: calibration and mandatory-training views expose current foreign department names",
      "ms": 5788.8761,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [
    {
      "file": "codex-review-p3k-units.integration.cjs",
      "name": "D:\\projects\\hr_system\\.claude\\worktrees\\review-p02\\api\\test\\codex-review-p3k-units.integration.cjs",
      "ms": 21163.0488,
      "pass": false,
      "error": "test failed"
    }
  ],
  "diagnostics": [
    "tests 2",
    "suites 0",
    "pass 1",
    "fail 1",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 21164.612"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "\n",
    "<--- Last few GCs --->\n",
    "\n",
    "[29508:00000136F259C000]    20928 ms: Scavenge (interleaved) 4079.7 (4085.4) -> 4078.2 (4085.4) MB, pooled: 0 MB, 0.88 / 0.00 ms  (average mu = 0.865, current mu = 0.705) allocation failure; \n",
    "[29508:00000136F259C000]    20985 ms: Mark-Compact 4111.6 (4117.3) -> 4109.7 (4121.0) MB, pooled: 0 MB, 23.96 / 0.00 ms  (average mu = 0.788, current mu = 0.709) allocation failure; scavenge might not succeed\n",
    "\n",
    "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory\n",
    "----- Native stack trace -----\n",
    "\n",
    " 1: 00007FF7984297FF node::OnFatalError+1343\n",
    " 2: 00007FF79906DA77 v8::Function::NewInstance+423\n",
    " 3: 00007FF798E6E327 v8::base::AddressSpaceReservation::AddressSpaceReservation+322071\n",
    " 4: 00007FF798E6BFC6 v8::base::AddressSpaceReservation::AddressSpaceReservation+313014\n",
    " 5: 00007FF798E8667A X509_STORE_set_cleanup+5098\n",
    " 6: 00007FF798E92458 uv_timer_set_repeat+18968\n",
    " 7: 00007FF798EAD765 uv_timer_set_repeat+130341\n",
    " 8: 00007FF798EAD6CC uv_timer_set_repeat+130188\n",
    " 9: 00007FF798D49389 v8::Promise::MarkAsSilent+476137\n",
    "10: 00007FF798D4D5E6 v8::Promise::MarkAsSilent+493126\n",
    "11: 00007FF798D4C6F1 v8::Promise::MarkAsSilent+489297\n",
    "12: 00007FF798D48F15 v8::Promise::MarkAsSilent+474997\n",
    "13: 00007FF798D48BFD v8::Promise::MarkAsSilent+474205\n",
    "14: 00007FF799024072 X509_STORE_set_get_issuer+473314\n",
    "15: 00000136AFE7727A \n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p3k_unit_scope_test_73ef160104a244eb\"}\n",
    "REVIEW_MEASURE {\"case\":\"U01\",\"calibrationForeignUnit\":true,\"trainingForeignUnit\":true,\"hiddenParentDirect\":404,\"hiddenParentTitleViaChild\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p3k_unit_scope_test_73ef160104a244eb\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p3k_unit_scope_test_73ef160104a244eb\"}\n"
  ]
}

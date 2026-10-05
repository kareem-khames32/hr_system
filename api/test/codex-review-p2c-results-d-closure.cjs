module.exports = {
  "selected": [
    "decimal-output-precision",
    "codex-review-p2c-screen-history",
    "codex-review-p2c-money"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 6,
      "failed": 0,
      "passed": 6,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 6,
      "suites": 0
    },
    "duration_ms": 32213.6969
  },
  "results": [
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-01: متغير جدول الإخراج بنفس دقة العمود — لكل جدول فيه عمود عشري بيرجع بعد الإدخال",
      "ms": 8037.4349,
      "pass": true,
      "skip": false
    },
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-02: بند مسير بكسور — الكائن بعد الحفظ = المحفوظ، والحفظ التاني مابيغيّرش ولا قرش",
      "ms": 78.3585,
      "pass": true,
      "skip": false
    },
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-03: إنشاء موظف ببدلات فيها كسور — المحفوظ بالقرش (الإنشاء بيحفظ الكائن مرتين)",
      "ms": 340.9225,
      "pass": true,
      "skip": false
    },
    {
      "file": "decimal-output-precision.integration.cjs",
      "name": "DP-04 (CRP2B-B-N01): حدث حساب المسير بيخزن أعمدة المبالغ بكسورها زي البند المحفوظ",
      "ms": 946.1059,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-screen-history.integration.cjs",
      "name": "P2B B recalculation keeps all event amount columns and exact old/new hashes; default read remains full",
      "ms": 5843.434,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p2c-money.integration.cjs",
      "name": "P2A payroll outbox and audit failure roll back actual approval; all four money scenarios equal committed phase 1",
      "ms": 8237.0371,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"tablesWithReturnedDecimals\":9,\"returnedDecimalColumns\":35}",
    "Cleanup verified: hr_decimal_precision_test_54656bd46516cd9e is absent from sys.databases.",
    "{\"case\":\"event-numeric-comparison\",\"beforeEvent\":0,\"afterEvent\":123.45,\"beforeStored\":0,\"afterStored\":123.45,\"eventNet\":6123.45,\"storedNet\":6123.45}",
    "{\"case\":\"calculation-event-history\",\"oldNet\":6000,\"newNet\":6123.45,\"oldDetailSavedInEvent\":false,\"bothHashesMatch\":true,\"defaultAndPayslipFull\":true,\"numericDifferences\":[]}",
    "{\"case\":\"P2A-money\",\"totalNet\":34236.56,\"net\":[7455.56,18163,1703,6915],\"allDecimalColumnsEqualPhase1\":true,\"controls\":[{\"failedTable\":\"outbox_events\",\"status\":500,\"allFinancialAndEventRowsUnchanged\":true},{\"failedTable\":\"audit_log\",\"status\":500,\"allFinancialAndEventRowsUnchanged\":true}]}",
    "tests 6",
    "suites 0",
    "pass 6",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 32213.6969"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_decimal_precision_test_54656bd46516cd9e\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_decimal_precision_test_54656bd46516cd9e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2c_screen_history_test_1c1c3c8eeee20e2c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2c_screen_history_test_1c1c3c8eeee20e2c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2c_screen_history_test_1c1c3c8eeee20e2c\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p2a_money_test_10c2001f3b5e0011\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p2a_money_test_10c2001f3b5e0011\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p2a_money_test_10c2001f3b5e0011\"}\n"
  ]
}

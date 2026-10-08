module.exports = {
  "selected": [
    "codex-review-p3l-rewards",
    "codex-review-p3l-preboarding"
  ],
  "summary": {
    "success": true,
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
    "duration_ms": 11288.7411
  },
  "results": [
    {
      "file": "codex-review-p3l-rewards.integration.cjs",
      "name": "P3L-R01 control: detail failure after financial commit links one bonus",
      "ms": 7991.8009,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-rewards.integration.cjs",
      "name": "P3L-R02: editable manual reason hijacks reward reference with a different value",
      "ms": 144.4628,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-rewards.integration.cjs",
      "name": "P3L-R03: failed final link leaves committed bonus and unrecoverable CLAIMED suggestion",
      "ms": 119.709,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-p3l-preboarding.integration.cjs",
      "name": "P3L-B01: preboarding role is employee but structural manager still reads another employee task",
      "ms": 8489.8685,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "تحقق حذف قاعدة الاختبار: hr_preboarding_test_f91f5857fe07ea49",
    "tests 4",
    "suites 0",
    "pass 4",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 11288.7411"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_perf_rewards_test_56bd52e6649c6ea3\"}\n",
    "REVIEW_MEASURE {\"case\":\"R01\",\"first\":200,\"retry\":409,\"bonusRequests\":1,\"linked\":true}\n",
    "REVIEW_MEASURE {\"case\":\"R02\",\"suggested\":123,\"linkedValue\":7,\"linkedManual\":true,\"requests\":1}\n",
    "REVIEW_MEASURE {\"case\":\"R03\",\"first\":500,\"retry\":409,\"status\":\"CLAIMED\",\"linked\":false,\"committedRequests\":1}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_perf_rewards_test_56bd52e6649c6ea3\"}\n",
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_preboarding_test_f91f5857fe07ea49\"}\n",
    "REVIEW_MEASURE {\"case\":\"B01\",\"role\":\"employee\",\"preboarding\":true,\"roleTask\":404,\"subordinateTask\":200}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_preboarding_test_f91f5857fe07ea49\"}\n"
  ]
}

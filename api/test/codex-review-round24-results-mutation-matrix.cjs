module.exports = {
  "selected": [
    "codex-review-round24-mutations"
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
    "duration_ms": 18733.2015
  },
  "results": [
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 all run mutations preserve permissions and exact 13-field operation-only responses",
      "ms": 9833.2965,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 all run mutations preserve permissions and payroll viewer details",
      "ms": 6279.4756,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 scoped operation permission cannot act on a foreign run or return identifiers in the rejection",
      "ms": 200.4315,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"mutation-matrix\",\"viewer\":false,\"actions\":[{\"label\":\"create-draft\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"update-draft\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"calculate-draft\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"recalculate\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve\",\"viewer\":false,\"runType\":null,\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"reopen\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve-again\",\"viewer\":false,\"runType\":null,\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"pay\",\"viewer\":false,\"runType\":null,\"status\":\"PAID\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"create-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"approve-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"pay-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"create-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"calculate-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"pay-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"create-cancel-target\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"cancel-draft\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":0},{\"label\":\"legacy-calculate-defined\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":8123.45},{\"label\":\"cancel-calculated\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":8123.45}],\"netBeforeAndAfter\":23341.37,\"reversalTotal\":-23341.37,\"nextDrafts\":1}",
    "{\"case\":\"mutation-matrix\",\"viewer\":true,\"actions\":[{\"label\":\"create-draft\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"update-draft\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"calculate-draft\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"recalculate\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve\",\"viewer\":true,\"runType\":null,\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"reopen\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve-again\",\"viewer\":true,\"runType\":null,\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"pay\",\"viewer\":true,\"runType\":null,\"status\":\"PAID\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"create-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":-23341.37},{\"label\":\"approve-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":-23341.37},{\"label\":\"pay-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"keys\":32,\"storedTotal\":-23341.37},{\"label\":\"create-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"calculate-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"pay-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"create-cancel-target\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"cancel-draft\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":0},{\"label\":\"legacy-calculate-defined\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":8123.45},{\"label\":\"cancel-calculated\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":8123.45}],\"netBeforeAndAfter\":23341.37,\"reversalTotal\":-23341.37,\"nextDrafts\":1}",
    "{\"case\":\"scope-before-state\",\"responses\":[{\"method\":\"PATCH\",\"tail\":\"\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/calculate\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/recalculate\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/reopen\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/cancel\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/approve\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/pay\",\"status\":403}],\"storedStatus\":\"DRAFT\"}",
    "tests 3",
    "suites 0",
    "pass 3",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 18733.2015"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_mutations_test_b5552317977f8cf2\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_mutations_test_b5552317977f8cf2\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r24_mutations_test_b5552317977f8cf2\"}\n"
  ]
}

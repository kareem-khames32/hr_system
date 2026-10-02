module.exports = {
  "selected": [
    "codex-review-round24-exemptions",
    "codex-review-round24-mutations"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 9,
      "failed": 0,
      "passed": 9,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 9,
      "suites": 0
    },
    "duration_ms": 31607.9043
  },
  "results": [
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 exemption candidate response is the union of legitimate bases, and unlinked users have no implicit role",
      "ms": 7026.6759,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 owning a deduction type must not reveal an employee outside the viewer branch through candidates",
      "ms": 55.6573,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 both structural bases reject foreign preview and direct grant without identifying data",
      "ms": 146.1453,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 authorized structural grants keep amounts, and foreign exemptions stay outside lists and mine",
      "ms": 902.4394,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-exemptions.integration.cjs",
      "name": "CR24 foreign-only run metadata must not pass an out-of-scope structural department relationship",
      "ms": 69.739,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 all run mutations preserve permissions and exact 13-field operation-only responses",
      "ms": 10175.7015,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 all run mutations preserve permissions and payroll viewer details",
      "ms": 6708.2183,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 scoped operation permission cannot act on a foreign run or return identifiers in the rejection",
      "ms": 166.3788,
      "pass": true,
      "skip": false
    },
    {
      "file": "codex-review-round24-mutations.integration.cjs",
      "name": "CR24 membership mutation responses cannot bypass the run read permission",
      "ms": 1671.3095,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"exemption-basis-union\",\"hrTypes\":3,\"dualTypes\":1,\"ownerTypes\":1,\"hrDayRate\":\"300.00\",\"noEmployeeStatus\":403}",
    "{\"case\":\"function-owner-foreign-candidates\",\"listStatus\":200,\"foreignEmployees\":[],\"detailStatus\":403,\"expectedBranch\":1,\"employeeBranch\":2}",
    "{\"case\":\"foreign-mutations-denied\",\"evidence\":[{\"actor\":\"department-manager\",\"statuses\":[403,403,403]},{\"actor\":\"function-owner\",\"statuses\":[403,403,403]}],\"rowsInserted\":0}",
    "{\"case\":\"authorized-grants-and-read-scope\",\"ownerAmount\":\"147.89\",\"departmentAmount\":\"37.50\",\"companyOwnerAmount\":\"147.89\",\"ownRows\":2,\"sharedCandidates\":1}",
    "{\"case\":\"foreign-only-exemption-run\",\"viewerBranch\":1,\"employeeBranch\":2,\"viewerPermissions\":[],\"ownHistoricalGrants\":0,\"results\":[{\"route\":\"/candidates\",\"status\":403,\"body\":{}},{\"route\":\"run-view\",\"status\":403,\"body\":{}}],\"withoutStructuralRelationship\":[{\"route\":\"/candidates\",\"status\":403,\"body\":{\"code\":\"EXEMPTION_RUN_OUT_OF_SCOPE\",\"message\":\"المسير خارج نطاق فرعك\"}},{\"route\":\"run-view\",\"status\":403,\"body\":{\"code\":\"EXEMPTION_RUN_OUT_OF_SCOPE\",\"message\":\"المسير خارج نطاق فرعك\"}}]}",
    "{\"case\":\"mutation-matrix\",\"viewer\":false,\"actions\":[{\"label\":\"create-draft\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"update-draft\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"calculate-draft\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"recalculate\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve\",\"viewer\":false,\"runType\":null,\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"reopen\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve-again\",\"viewer\":false,\"runType\":null,\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"pay\",\"viewer\":false,\"runType\":null,\"status\":\"PAID\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"create-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"approve-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"pay-reversal\",\"viewer\":false,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"keys\":13,\"storedTotal\":-23341.37},{\"label\":\"create-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"calculate-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"approve-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"pay-supplementary\",\"viewer\":false,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"keys\":13,\"storedTotal\":23341.37},{\"label\":\"create-cancel-target\",\"viewer\":false,\"runType\":null,\"status\":\"DRAFT\",\"keys\":13,\"storedTotal\":0},{\"label\":\"cancel-draft\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":0},{\"label\":\"legacy-calculate-defined\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":8123.45},{\"label\":\"cancel-calculated\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":8123.45},{\"label\":\"legacy-calculate-branch\",\"viewer\":false,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":13,\"storedTotal\":7319.17},{\"label\":\"cancel-branch-calculated\",\"viewer\":false,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":13,\"storedTotal\":7319.17}],\"netBeforeAndAfter\":23341.37,\"reversalTotal\":-23341.37,\"nextDrafts\":1}",
    "{\"case\":\"mutation-matrix\",\"viewer\":true,\"actions\":[{\"label\":\"create-draft\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"update-draft\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"calculate-draft\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"recalculate\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve\",\"viewer\":true,\"runType\":null,\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"reopen\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve-again\",\"viewer\":true,\"runType\":null,\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"pay\",\"viewer\":true,\"runType\":null,\"status\":\"PAID\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"create-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":-23341.37},{\"label\":\"approve-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":-23341.37},{\"label\":\"pay-reversal\",\"viewer\":true,\"runType\":\"REVERSAL\",\"status\":\"PAID\",\"keys\":32,\"storedTotal\":-23341.37},{\"label\":\"create-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"calculate-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":23341.37},{\"label\":\"approve-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"APPROVED\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"pay-supplementary\",\"viewer\":true,\"runType\":\"SUPPLEMENTARY\",\"status\":\"PAID\",\"keys\":32,\"storedTotal\":23341.37},{\"label\":\"create-cancel-target\",\"viewer\":true,\"runType\":null,\"status\":\"DRAFT\",\"keys\":45,\"storedTotal\":0},{\"label\":\"cancel-draft\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":0},{\"label\":\"legacy-calculate-defined\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":8123.45},{\"label\":\"cancel-calculated\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":8123.45},{\"label\":\"legacy-calculate-branch\",\"viewer\":true,\"runType\":null,\"status\":\"CALCULATED\",\"keys\":45,\"storedTotal\":7319.17},{\"label\":\"cancel-branch-calculated\",\"viewer\":true,\"runType\":null,\"status\":\"CANCELLED\",\"keys\":45,\"storedTotal\":7319.17}],\"netBeforeAndAfter\":23341.37,\"reversalTotal\":-23341.37,\"nextDrafts\":1}",
    "{\"case\":\"scope-before-state\",\"responses\":[{\"method\":\"PATCH\",\"tail\":\"\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/calculate\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/recalculate\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/reopen\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/cancel\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/approve\",\"status\":403},{\"method\":\"POST\",\"tail\":\"/pay\",\"status\":403}],\"storedStatus\":\"DRAFT\"}",
    "{\"case\":\"membership-mutation-run-leak\",\"permissions\":[\"payroll.calculate\"],\"getStatus\":403,\"bulkDidNotChangeMembership\":true,\"bulk\":{\"kind\":\"bulk\",\"status\":201,\"runKeys\":[\"id\",\"name\",\"period\",\"startDate\",\"endDate\",\"status\",\"branchId\",\"paidAt\",\"payChannel\",\"payReference\",\"runType\",\"parentRunId\",\"correctionReason\"],\"hasEngine\":false},\"single\":{\"kind\":\"single\",\"status\":201,\"runKeys\":[\"id\",\"name\",\"period\",\"startDate\",\"endDate\",\"status\",\"branchId\",\"paidAt\",\"payChannel\",\"payReference\",\"runType\",\"parentRunId\",\"correctionReason\"],\"hasEngine\":false},\"storedTotal\":31464.82,\"authorizedViewerContractMatched\":true}",
    "tests 9",
    "suites 0",
    "pass 9",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 31607.9043"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_exemptions_test_f9610de35aa36706\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_exemptions_test_f9610de35aa36706\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_r24_mutations_test_ccd8ec556d973741\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_r24_mutations_test_ccd8ec556d973741\"}\n",
    "{\"cleanupVerified\":\"hr_codex_r24_mutations_test_ccd8ec556d973741\"}\n"
  ]
}

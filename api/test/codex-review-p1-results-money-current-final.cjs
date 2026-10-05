module.exports = {
  "selected": [
    "codex-review-p1-default-money"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 1,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 1,
      "suites": 0
    },
    "duration_ms": 10015.808
  },
  "results": [
    {
      "file": "codex-review-p1-default-money.integration.cjs",
      "name": "P1 default-off money is identical to ce15142 for Egyptian Saudi and uninsured actual payrolls",
      "ms": 7019.0841,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"case\":\"P1-default-money\",\"variant\":\"current\",\"rows\":[{\"scenario\":\"none\",\"amounts\":{\"absenceDays\":0,\"absenceDeduction\":0,\"allowances\":1400,\"basicSalary\":6000,\"latenessDeduction\":0,\"loanInstallments\":0,\"netPay\":7455.56,\"otherAdditions\":123.45,\"otherDeductions\":67.89,\"overtimeAmount\":0,\"overtimeHours\":0,\"paidBankAmount\":7455.56,\"paidCashAmount\":0,\"shortfallDeduction\":0,\"socialInsuranceDeduction\":0,\"unpaidLeaveDays\":0,\"unpaidLeaveDeduction\":0},\"socialInsurance\":{\"insuredSalary\":0,\"employeePct\":0,\"employerPct\":0,\"employeeShare\":0,\"employerShare\":0}},{\"scenario\":\"egypt-high\",\"amounts\":{\"absenceDays\":0,\"absenceDeduction\":0,\"allowances\":0,\"basicSalary\":20000,\"latenessDeduction\":0,\"loanInstallments\":0,\"netPay\":18163,\"otherAdditions\":0,\"otherDeductions\":0,\"overtimeAmount\":0,\"overtimeHours\":0,\"paidBankAmount\":18163,\"paidCashAmount\":0,\"shortfallDeduction\":0,\"socialInsuranceDeduction\":1837,\"unpaidLeaveDays\":0,\"unpaidLeaveDeduction\":0},\"socialInsurance\":{\"insuredSalary\":16700,\"employeePct\":11,\"employerPct\":18.75,\"employeeShare\":1837,\"employerShare\":3131.25}},{\"scenario\":\"egypt-low\",\"amounts\":{\"absenceDays\":0,\"absenceDeduction\":0,\"allowances\":0,\"basicSalary\":2000,\"latenessDeduction\":0,\"loanInstallments\":0,\"netPay\":1703,\"otherAdditions\":0,\"otherDeductions\":0,\"overtimeAmount\":0,\"overtimeHours\":0,\"paidBankAmount\":1703,\"paidCashAmount\":0,\"shortfallDeduction\":0,\"socialInsuranceDeduction\":297,\"unpaidLeaveDays\":0,\"unpaidLeaveDeduction\":0},\"socialInsurance\":{\"insuredSalary\":2700,\"employeePct\":11,\"employerPct\":18.75,\"employeeShare\":297,\"employerShare\":506.25}},{\"scenario\":\"saudi-old\",\"amounts\":{\"absenceDays\":0,\"absenceDeduction\":0,\"allowances\":1500,\"basicSalary\":6000,\"latenessDeduction\":0,\"loanInstallments\":0,\"netPay\":6915,\"otherAdditions\":0,\"otherDeductions\":0,\"overtimeAmount\":0,\"overtimeHours\":0,\"paidBankAmount\":6915,\"paidCashAmount\":0,\"shortfallDeduction\":0,\"socialInsuranceDeduction\":585,\"unpaidLeaveDays\":0,\"unpaidLeaveDeduction\":0},\"socialInsurance\":{\"insuredSalary\":6000,\"employeePct\":9.75,\"employerPct\":11.75,\"employeeShare\":585,\"employerShare\":705}}],\"totalNet\":34236.56,\"status\":\"PAID\"}",
    "tests 1",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 10015.808"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_codex_p1_money_current_test_af3f2c813007f30c\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_codex_p1_money_current_test_af3f2c813007f30c\"}\n",
    "{\"cleanupVerified\":\"hr_codex_p1_money_current_test_af3f2c813007f30c\"}\n"
  ]
}

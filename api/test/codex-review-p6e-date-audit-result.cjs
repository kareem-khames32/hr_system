module.exports = {
  "unchanged": [
    {
      "file": "api/test/benefits-insurance.integration.cjs",
      "assertionsUnchanged": 49
    },
    {
      "file": "api/test/payroll-financial-exemptions.integration.cjs",
      "assertionsUnchanged": 237
    },
    {
      "file": "api/test/fulltest-leaves-payroll.integration.cjs",
      "assertionsUnchanged": 587
    },
    {
      "file": "api/test/fulltest-reports.integration.cjs",
      "assertionsUnchanged": 536
    }
  ],
  "overtime": [
    {
      "now": "2026-10-06T10:00:00",
      "issues": []
    },
    {
      "now": "2026-10-09T10:00:00",
      "issues": [
        "OVERTIME_BACKDATE_LIMIT"
      ]
    }
  ],
  "insurance": {
    "localTime": "02:15 Africa/Cairo",
    "oldDays": 19,
    "newDays": 20
  },
  "workdayDates": [
    {
      "month": 1,
      "eighth": 12,
      "ninth": 13
    },
    {
      "month": 2,
      "eighth": 10,
      "ninth": 11
    },
    {
      "month": 3,
      "eighth": 10,
      "ninth": 11
    },
    {
      "month": 4,
      "eighth": 12,
      "ninth": 13
    },
    {
      "month": 5,
      "eighth": 12,
      "ninth": 13
    },
    {
      "month": 6,
      "eighth": 10,
      "ninth": 11
    },
    {
      "month": 7,
      "eighth": 12,
      "ninth": 13
    },
    {
      "month": 8,
      "eighth": 11,
      "ninth": 12
    },
    {
      "month": 9,
      "eighth": 10,
      "ninth": 13
    },
    {
      "month": 10,
      "eighth": 12,
      "ninth": 13
    },
    {
      "month": 11,
      "eighth": 10,
      "ninth": 11
    },
    {
      "month": 12,
      "eighth": 10,
      "ninth": 13
    }
  ],
  "pinnedClock": "Explicit Date constructors preserved; native driver dates still pass instanceof; clock advances; process restoration verified."
}

module.exports = {
  "selected": [
    "codex-review-round2-adapted-flex-approval"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 32,
      "failed": 0,
      "passed": 1,
      "cancelled": 0,
      "skipped": 31,
      "todo": 0,
      "topLevel": 32,
      "suites": 0
    },
    "duration_ms": 41091.87
  },
  "results": [
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-03: 09:00, 09:30 and inclusive 10:00 with nine hours earn no lateness, no shortfall and no compensation overtime",
      "ms": 9966.791,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05: arrival 10:01 remains 61 minutes late after either nine complete hours or staying until 20:00",
      "ms": 0.1375,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05 AC1: 10:00:59 exceeds the window before minute rounding and stores 60 late minutes",
      "ms": 0.0544,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04: in-window departures distinguish a 75-minute shortfall from a 30-minute shortfall without lateness",
      "ms": 0.0676,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01: employee ENABLED, DISABLED and INHERIT resolve after that day's shift instead of overriding its duration",
      "ms": 0.0693,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01 extension: WorkSchedule without a Shift applies its own flexible window and employee override",
      "ms": 0.0397,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: moving official start to 08:00 shifts the 60-minute window to 08:00–09:00 only from its effective date",
      "ms": 0.0382,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: reducing the window from 60 to 30 minutes keeps a previous day unchanged after HTTP recomputation",
      "ms": 0.0557,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-02: invalid duration and negative input reject HTTP writes without a new source version",
      "ms": 0.0585,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-01/09: branch-scoped users cannot edit global source definitions or another employee's override",
      "ms": 0.0618,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.2: free and paid permissions retain raw lateness while excusing their interval exactly once",
      "ms": 0.0419,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.1: overnight punch-out belongs to the shift start date and never yields negative work duration",
      "ms": 0.0349,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08: attendance exemption takes precedence over a late/incomplete flexible shift without deleting punches",
      "ms": 0.0416,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-06: early work is excluded by default and counted only with the explicit company setting",
      "ms": 0.0598,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.3: morning half-leave moves the full 60-minute window to 13:30–14:30; explicit proration reduces it to 30",
      "ms": 0.0305,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04: independent shortfall tolerance forgives ten minutes but charges all forty minutes when above fifteen",
      "ms": 0.0278,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-04 financial: 75 minutes inside the window are recovered at .625 each with no lateness at all",
      "ms": 0.0272,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: the whole 130-minute shortfall is charged beside the 70 late minutes — no overlap subtraction",
      "ms": 0.0283,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-07 financial: free and paid permission coverage is counted once and raw lateness cannot erase a real later shortfall",
      "ms": 0.0264,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: forgiven lateness no longer shrinks the shortfall — the unworked 90 minutes are charged in full",
      "ms": 0.0255,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-08.4: missing checkout keeps known lateness, leaves shortfall unknown and blocks payroll approval atomically",
      "ms": 0.0285,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09: approved payroll protects its original attendance and source versions against retroactive edits or recomputation",
      "ms": 28157.4612,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "أ4 financial: no daily cap — lateness and shortfall are each charged in full, and only net protection stops the day going negative",
      "ms": 0.1893,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-05 financial: approved overtime remains a separate source and cannot cancel after-window lateness",
      "ms": 0.0436,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX policy validation: invalid settings are rejected over HTTP and a corrupted SQL policy cannot replace an existing payroll",
      "ms": 0.048,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX regression: final aggregate truncates an exact half-cent to two decimals despite binary floating-point noise",
      "ms": 0.0357,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX / OT-08 regression: fixed-shift attendance materialization preserves a legacy approved overtime source",
      "ms": 0.0353,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX regression: a backdated default work schedule cannot overlap a future default or alter its saved history",
      "ms": 0.0314,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX-09 regression: changing general grace preserves historical source versions and applies only to a new effective version",
      "ms": 0.0375,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: a future shift rejects earlier daily and name assignments and bulk validates each date",
      "ms": 0.0318,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: a week straddling shift creation rejects by id or name and rolls back an earlier valid batch entry",
      "ms": 0.0288,
      "pass": true
    },
    {
      "file": "payroll-flex.integration.cjs",
      "name": "FX assignment date: future deactivation permits earlier new assignments and preserves already saved daily and weekly schedules",
      "ms": 0.0325,
      "pass": true
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_payroll_flex_test_89eb14c8a9821b30 no longer exists in sys.databases.",
    "Cleanup verified: the temporary uploads directory was removed.",
    "tests 32",
    "suites 0",
    "pass 1",
    "fail 0",
    "cancelled 0",
    "skipped 31",
    "todo 0",
    "duration_ms 41091.87"
  ],
  "stdout": []
}

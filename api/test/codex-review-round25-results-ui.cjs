module.exports = {
  "selected": [
    "codex-review-round25-ui"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 18,
      "failed": 0,
      "passed": 18,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 18,
      "suites": 0
    },
    "duration_ms": 2561.5107
  },
  "results": [
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "linked filters: departments follow chosen branches, teams follow chosen departments (with sub-departments), and pruning drops broken links",
      "ms": 1.1282,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "only published policy versions are offered for a run, labelled by the set name (dates only when one set has two)",
      "ms": 0.312,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "membership preview view shows the read-only notice, coverage, the formula set name and plain Arabic exclusion reasons, without codes, day basis, factor or the other run number",
      "ms": 3.9421,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion candidates: employees the preview already excludes (data problems first) can get a written exclusion; transferred-out and manual exclusions cannot",
      "ms": 1.1942,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "stored draft: the membership card says an employee with incomplete employment data is left out of the calculation, and offers the written exclusion on those rows",
      "ms": 6.9747,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: name, formula set, month, linked filters or list, exclusions with a reason, preview and save as draft",
      "ms": 2.3322,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "payroll page: «مسير جديد» is separate from «احتساب المسودة» / «إعادة حساب المسير», and approval no longer waits for an unassigned acknowledgement",
      "ms": 1.5846,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "scope sentence: an empty department or team list reads «كل الأقسام»/«كل الفرق», sub-departments are said out loud, and an empty selection says nobody joins",
      "ms": 0.3532,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "exclusion scope check mirrors the engine: an empty department list covers the whole branch, sub-departments included, and nothing selected covers nobody",
      "ms": 0.1836,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "definition panel: the live scope sentence, «كل الأقسام» selected by default, and an exclusion picker that works before any preview",
      "ms": 2.0809,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-run-definition-ui.test.cjs",
      "name": "no new endpoint: the exclusion picker reuses the employees the screen already loads (or the scoped directory)",
      "ms": 0.4798,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "قراءة الاستعلام: القيم غير الصالحة تسقط، والحالات من نص مفصول بفاصلة، ومن/إلى المقلوبين يتصححوا",
      "ms": 0.3457,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "البحث بالاسم أو الكود بلا حساسية لحالة الحروف، والباقي مطابقة دقيقة",
      "ms": 0.2876,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "مدى تاريخ التعيين شامل الطرفين، وبلا تاريخ = خارج المدى، و«كل التواريخ» ما بتفلترش",
      "ms": 0.104,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "المنظور: الكل / المدرجين في مسير / بلا مسير على نفس الصفوف",
      "ms": 0.0827,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الفلاتر بتشتغل مع بعض (AND)، والعدّاد بيعد المفعّل بس والمنظور مش فلتر",
      "ms": 0.1001,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "الموقوف بيدخل التقرير بس لما يتفلتر بالاسم",
      "ms": 0.0653,
      "pass": true,
      "skip": false
    },
    {
      "file": "payroll-overview-filters.test.cjs",
      "name": "تقسيم الاختيار المختلط: مين ينتقل من أنهي مسير، مين يتضاف، ومين يتخطى وليه",
      "ms": 0.5051,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "tests 18",
    "suites 0",
    "pass 18",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 2561.5107"
  ],
  "stdout": []
}

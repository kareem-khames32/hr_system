module.exports = {
  "selected": [
    "customer-provision"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 2,
      "failed": 0,
      "passed": 2,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 2,
      "suites": 0
    },
    "duration_ms": 153920.7534
  },
  "results": [
    {
      "file": "customer-provision.integration.cjs",
      "name": "CP-01: تجهيز عميل — قاعدة جديدة كاملة: 13 ملف مغطّى بالأساس والباقي مطبّق، الدفتر كامل والفرق عن الكيانات صفر، ومدير نظام مقفول، وكيان وفرع وباقة",
      "ms": 77644.2822,
      "pass": true,
      "skip": false
    },
    {
      "file": "customer-provision.integration.cjs",
      "name": "CP-02: مدخلات التجهيز وحراسته — اسم القاعدة بنمط العميل بس، والمدخلات متحكم فيها قبل أي قاعدة؛ وفشل في النص بيشيل القاعدة اللي اتعملت",
      "ms": 73630.3302,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: 2 provisioning databases are absent from sys.databases.",
    "tests 2",
    "suites 0",
    "pass 2",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 153920.7534"
  ],
  "stdout": [
    "REVIEW_PROGRESS in-process HTTP with abort propagation; no listening ports\n",
    "REVIEW_PROGRESS private task-file transport allows .claude ancestor; authorization unchanged\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_provision_test_ab7fb63ada5e99d1\"}\n",
    "✓ أنواع الطلبات: 72 جديد + 71 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_provision_test_e6fcff6e593012cf\"}\n",
    "✓ أنواع الطلبات: 72 جديد + 71 سلسلة مخصّصة (الإجمالي 75)\n",
    "✓ عُطّل 11 نوع إجازة مستقل (موحّدة تحت «طلب إجازة»)\n",
    "✓ أنواع الإجازات: 11\n",
    "✓ إعدادات المحرك\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_provision_test_e6fcff6e593012cf\"}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_provision_test_ab7fb63ada5e99d1\"}\n"
  ]
}

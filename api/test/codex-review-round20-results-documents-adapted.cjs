module.exports = {
  "selected": [
    "hr-document-passport",
    "currency-follows-branch"
  ],
  "summary": {
    "success": true,
    "counts": {
      "tests": 14,
      "failed": 0,
      "passed": 14,
      "cancelled": 0,
      "skipped": 0,
      "todo": 0,
      "topLevel": 14,
      "suites": 0
    },
    "duration_ms": 23613.1257
  },
  "results": [
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "the HR document and letter template editors list «رقم الجواز» and «رقم الهوية أو الجواز» next to «رقم الهوية»",
      "ms": 5800.7964,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "a passport-only employee issues a document with «رقم الهوية أو الجواز»: the ID when present, otherwise the passport, printed left-to-right",
      "ms": 204.6858,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "an empty «رقم الهوية» is still refused, and the message tells the user to use «رقم الهوية أو الجواز»",
      "ms": 105.5517,
      "pass": true,
      "skip": false
    },
    {
      "file": "hr-document-passport.integration.cjs",
      "name": "a letter for a passport-only employee prints the passport through «رقم الهوية أو الجواز»",
      "ms": 124.3906,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-01: سياق العملة لأي مستخدم داخل — الموظف بعملة فرعه، والموارد البشرية بفروع نطاقها بس، وكل الفروع للحساب العام، من غير أسماء",
      "ms": 9293.6709,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-02: الإضافة بعملة الفرع — العملة المبعوتة بتتجاهل (حتى AED)، وأجر التعيين في سجل الأجر بنفس العملة",
      "ms": 422.0038,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-03: التعديل العادي بيتجاهل العملة ومابيعيدش كتابة المحفوظ، والنقل بين فرعين بنفس العملة مابيلمسهاش",
      "ms": 285.2801,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-04: تغيير الأجر بيتسجل بعملة الفرع — العملة المبعوتة بتتجاهل، والملف القديم بعملة غلط بيتظبط من خلال سجل الأجر",
      "ms": 272.9078,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-05: النقل من الملف لفرع عملته مختلفة بيغيّر العملة (تسمية بس) ويتسجل، وتغيير الأجر بعدها بيقول يثبّت سجل الأجر بالعملة الجديدة",
      "ms": 368.4611,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-06: النقل لفرع عملته مختلفة مع تغيير أجر في نفس الحفظ — التغيير نفسه بيكتب العملة الجديدة في سجل الأجر من غير انحراف",
      "ms": 313.2993,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-07: طلب نقل منفّذ لفرع عملته مختلفة بيغيّر العملة ويتسجل على الطلب، والنقل لفرع بنفس العملة مابيلمسهاش",
      "ms": 551.8873,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-08: تأمينات دولة الفرع بس — الإنشاء والتعديل بيترفضوا برسالة، والفرع القائم المختلف مابيتغيرش لوحده وبيحفظ باقي حقوله",
      "ms": 318.1336,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-09: عملة معادلات الرواتب من الخادم — معادلات كل الشركة بعملة النظام، ومعادلات الفرع بعملة فرعها، والمبعوت بيتفحص ويتجاهل",
      "ms": 128.4884,
      "pass": true,
      "skip": false
    },
    {
      "file": "currency-follows-branch.integration.cjs",
      "name": "CUR-10: مستند الموارد البشرية بيطبع عملة فرع الموظف مش العمود المحفوظ في ملفه",
      "ms": 193.929,
      "pass": true,
      "skip": false
    }
  ],
  "failures": [],
  "diagnostics": [
    "Cleanup verified: hr_currency_test_8025f0a74d7431ac is absent from sys.databases.",
    "tests 14",
    "suites 0",
    "pass 14",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 23613.1257"
  ],
  "stdout": [
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_passport_docs_test_fae53361bb32879e\"}\n",
    "CR20_PDF_RENDER_STUB {\"contentReceived\":true}\n",
    "CR20_PDF_RENDER_STUB {\"contentReceived\":true}\n",
    "CR20_PDF_RENDER_STUB {\"contentReceived\":true}\n",
    "CR20_PDF_RENDER_STUB {\"contentReceived\":true}\n",
    "CR20_PDF_RENDER_STUB {\"contentReceived\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_passport_docs_test_fae53361bb32879e\"}\n",
    "CR5_DATABASE {\"operation\":\"CREATE\",\"database\":\"hr_currency_test_8025f0a74d7431ac\"}\n",
    "CR20_PDF_RENDER_STUB {\"contentReceived\":true}\n",
    "CR5_DATABASE {\"operation\":\"DROP\",\"database\":\"hr_currency_test_8025f0a74d7431ac\"}\n"
  ]
}

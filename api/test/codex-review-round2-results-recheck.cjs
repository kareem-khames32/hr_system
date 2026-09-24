module.exports = {
  "selected": [
    "codex-review-round2-independent",
    "disbursed-recorded-split",
    "two-factor-race"
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
    "duration_ms": 44621.4616
  },
  "results": [
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N02A bulk pay must preserve the payment method used immediately before payment",
      "ms": 24049.5438,
      "pass": true
    },
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N02B bulk mixed payment must freeze its bank/cash amounts after payment",
      "ms": 16491.8764,
      "pass": true
    },
    {
      "file": "codex-review-round2-independent.integration.cjs",
      "name": "CR2-N01 self and branch users cannot enumerate foreign/missing monthly or working-day records",
      "ms": 600.6142,
      "pass": true
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-01: البند المصروف نقدي يفضل نقدي في الشاشات الأربع بعد ما الملف بقى «تحويل بنكي»، واللي لسه ماتصرفش بيتبع الملف",
      "ms": 8770.423,
      "pass": true
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-02: مسير اتصرف كله مرة واحدة بلا علامات بياخد لقطة البند، و«لم يتم» ترجّع الصف لملف الموظف",
      "ms": 342.7392,
      "pass": true
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-03: القسيمة تقول اللي اتصرف فعلًا — نقدي بعد ما الملف بقى «تحويل بنكي»، وبند بلا علامة يتبع الملف",
      "ms": 448.685,
      "pass": true
    },
    {
      "file": "disbursed-recorded-split.integration.cjs",
      "name": "RS-04: التقسيم المثبت وقت الصرف يغلب الملف الحالي ولقطة الحساب في الخمس شاشات، وتعديل الملف بعده مابيغيّرش حاجة",
      "ms": 965.1606,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R1 — جدول الإعدادات مش موجود لحظيًّا: الدخول مرفوض 503 بلا جلسة ولا بريد ولا حالة معلَّقة",
      "ms": 8497.1493,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R2 — 12 تحقق متوازي برمز غلط على القاعدة: العدّاد 5 بالظبط، القفل مكتوب، والرمز الصح مرفوض",
      "ms": 900.2723,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R3 — ونفس الشيء عبر HTTP: 12 طلب تحقق في نفس اللحظة بيقفلوا الحالة عند الحد",
      "ms": 871.0489,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R4 — الحد المعلن نفسه: 4 غلط متوازية مابتقفلش، والخامسة هي اللي تقفل",
      "ms": 509.5738,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R5 — إعادة إرسال وسط تحقق جارٍ: الرمز القديم مرفوض، الحالة مش مستهلكة، والجديد شغّال",
      "ms": 373.55,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R6 — 6 تحققات متوازية بالرمز الصح: جلسة واحدة بالظبط والباقي 401",
      "ms": 461.3406,
      "pass": true
    },
    {
      "file": "two-factor-race.integration.cjs",
      "name": "R7 — 8 إعادات إرسال في نفس اللحظة: رسالة واحدة بالظبط، والعدّاد مش بيضيع، وإجمالي الرسايل = الحد المعلن",
      "ms": 1618.9783,
      "pass": true
    }
  ],
  "failures": [],
  "diagnostics": [
    "{\"scenario\":\"bulk method changed before payment\",\"beforePay\":{\"bank\":[1000,0],\"screen\":[1000,0],\"financial\":[1000,0],\"state\":\"UNPAID\"},\"afterPay\":{\"bank\":[1000,0],\"screen\":[1000,0],\"financial\":[1000,0],\"state\":\"PAID\"},\"marks\":0}",
    "{\"scenario\":\"mixed amount changed after payment\",\"beforeChange\":{\"bank\":[300,700],\"screen\":[300,700],\"financial\":[300,700],\"state\":\"PAID\"},\"afterChange\":{\"bank\":[300,700],\"screen\":[300,700],\"financial\":[300,700],\"state\":\"PAID\"}}",
    "{\"scenario\":\"no employee enumeration\",\"statuses\":[400,403,400,403]}",
    "Cleanup verified: hr_recorded_split_test_787e92903e9ee3c5 is absent from sys.databases.",
    "{\"rejected\":12,\"attempts\":5,\"locked\":true,\"consumed\":false}",
    "{\"statuses\":[401,401,401,401,401,401,401,401,401,401,401,401],\"attempts\":5,\"locked\":true}",
    "{\"oldConsumeGuardMatches\":1,\"newConsumeGuardMatches\":0}",
    "{\"oldCodeStatus\":401}",
    "{\"statuses\":[401,401,200,401,401,401]}",
    "{\"statuses\":[429,200,429,429,429,429,429,429],\"mails\":1,\"resendCount\":1,\"waitedSeconds\":120,\"messages\":[\"استنى 60 ثانية قبل طلب رمز جديد\"]}",
    "{\"statuses\":[429,429,429,429,429,429,429,429],\"resendCount\":3,\"mails\":3}",
    "Cleanup verified: hr_2fa_race_test_94624029301debe0 is absent from sys.databases.",
    "tests 14",
    "suites 0",
    "pass 14",
    "fail 0",
    "cancelled 0",
    "skipped 0",
    "todo 0",
    "duration_ms 44621.4616"
  ],
  "stdout": [
    "{\"cleanupVerified\":\"hr_codex_independent_test_b0a48839d94ac8ec\"}\n"
  ]
}

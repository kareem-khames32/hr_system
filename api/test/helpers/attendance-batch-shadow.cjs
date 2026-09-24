'use strict'
// وضع «الظل» لدفعة حساب الأيام (AttendanceService.batchScope) — للاختبارات فقط، بـ--require قبل ملف الاختبار:
//   node --require ./test/helpers/attendance-batch-shadow.cjs --test test/<ملف>.integration.cjs
// كل نداء لتراكم أيام موظف بيتحسب مرتين داخل نفس المعاملة (القديم بعد نقطة حفظ SQL ثم رجوع، ثم الجديد)،
// وأي فرق في اللي اتكتب أو اللي رجع = خطأ بيوقع الاختبار نفسه.
//
// المقارِن هو مقارِن المراجع المستقل (الجولة التالتة — codex-review-round3-strict-shadow.cjs) بالحرف، مش نسخة
// الأداة الأولى: المراجع أثبت فيها ثغرتين (CR3-N03) — فلترة التاريخ بـtoISOString كانت بتزحزح أول يوم في المدى
// بفرق المنطقة الزمنية، وتحويل كل المعرّفات لمفتاح طبيعي كان ممكن يخبّي تبديل مرجع بين صفّين قدام بنفس المفتاح.
// مقارِنه بيسيب معرّفات الصفوف القديمة زي ما هي ويحوّل الجديدة بس (ويرفض أي مفتاح جديد ملتبس أو مرجع معلّق)،
// وبيقارن كل تواريخ الموظف ومطالبات الإضافي وأحداثه وطلباته ونتيجة الدالة، ويرجّع طابور الإرسال بعد الـcommit
// (الرجوع لنقطة الحفظ في SQL مابيرجّعوش)، والمسار القديم على نسخة خدمة مستقلة بلا تبديل عام للـprototype.
// الملخص بيتطبع في الآخر: CR3_SHADOW_SUMMARY {calls, compared, rows, mismatches, equalErrors}.
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..', '..')
require(path.join(apiRoot, 'node_modules/ts-node')).register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require(path.join(apiRoot, 'node_modules/reflect-metadata'))
require('../codex-review-round3-strict-shadow.cjs')

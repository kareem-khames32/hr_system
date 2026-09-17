# استيراد بيانات النظام القديم (logic-leap)

نقل بيانات «شركة مهارة لتحصيل الديون» من الـAPI القديم إلى نظامنا. القراءة من القديم فقط (GET)، والكتابة عندنا مباشرة بـTypeORM (بلا خدمات أو تحققات أو عزل فروع).

## المسار

1. **خطة الاستخراج**: كل وحدة مجال في هذا المجلد تعلن `DOMAIN` و`DEPENDS_ON` و`SOURCES` و`run`.
   ```
   cd api
   npx ts-node --transpile-only scripts/legacy-import/extract-plan.ts --bundle=<مسار extract-in-page.js>
   ```
   يكتب `D:/projects/migration/extract-plan.json` (بلا تكرار مفاتيح، ومصادر `each` بعد مصدرها) و`extract-bundle.js` (`var PLAN = …` + سكربت الصفحة).
2. **الاستخراج داخل الصفحة**: شغّل مستقبِل الحفظ (`migration-receiver.js` على 127.0.0.1:47831)، ثم الصق `extract-bundle.js` في Console صفحة النظام القديم بجلسة الأدمن. يقلب الصفحات (`per_page=100`)، ويكرر لكل معرّف (`each`)، وينزّل الملفات (`binary`)، بفاصل 1.1ث (حد الـAPI القديم 60 طلب/دقيقة). يرجع أعدادًا فقط، والتقدم في `window.__extractProgress`؛ إعادة اللصق تكمل. الناتج تحت `D:/projects/migration/raw/<key>/` ولا يُطبع أبدًا:
   - `page-0001.json` … قائمة مقسّمة صفحات (الغلاف كما هو)
   - `data.json` مصدر واحد
   - `<id>.json` أو `<id>.page-0001.json` مصدر `each`
   - `<id>.<ext>` + `<id>.meta.json` `{contentType, filename}` ملف مرفق (رابط تخزين كـ`photo_url`: `<id>` = معرّف العنصر الأب)
3. **فحص ما استُخرج** (بلا قاعدة بيانات): `npx ts-node --transpile-only scripts/legacy-import/framework.ts --check` يعرض ترتيب المجالات وعدد العناصر لكل مصدر.
4. **تشغيل المستورد**: `npx ts-node --transpile-only scripts/legacy-import/run.ts` (كل المجالات بترتيب الاعتماديات، معاملة لكل مجال)
   - `--dry-run` تجربة كاملة: معاملة واحدة تُتراجع في النهاية، الملفات لمجلد مؤقت يُحذف، عدّادات IDENTITY تُعاد، والتقرير `report.dry-run.*` بلا لمس `idmap.json`
   - `--only org,employees` مجالات محددة (تعتمد على نجاح اعتمادياتها سابقًا)
   - `--fresh` يبدأ خريطة وتقريرًا جديدين (القديم يُحفظ `.bak`) — بعد مسح القاعدة
   - `--no-transaction` بلا معاملة لكل مجال (الافتراضي: معاملة؛ فشل المجال يتراجع عنه ويتخطى ما يعتمد عليه)
   - متغيرات: `LEGACY_MIGRATION_DIR` (مجلد الخريطة والتقرير)، `MIGRATION_RAW_DIR` (مجلد raw بديل، مثل بيانات تجربة مصطنعة)
5. **التقرير**: `D:/projects/migration/report.md` (عربي) و`report.json` — أعداد وتنبيهات بالنوع والمعرّف القديم فقط، بلا بيانات شخصية. `idmap.json` يربط المعرّف القديم بالجديد لإعادة التشغيل والمجالات اللاحقة.

## قواعد وحدة المجال

- الأدوات: `readRaw` / `readRawEach` / `rawFilePath` و`ctx.ids` و`ctx.flag` و`ctx.count` و`unusablePasswordHash` (مثال في رأس `framework.ts`).
- البيانات الناقصة أو غير الصالحة لا توقف الاستيراد: يُستورد الموجود ويُسجّل تنبيه.
- رسائل التنبيه بلا أسماء أو هويات أو جوالات؛ المعرّف القديم يكفي.
- فحص الأنواع: `npx tsc --noEmit -p scripts/legacy-import/tsconfig.json`

# مراجعة المديريات — نظام الشريك مقابل نظامنا
**التاريخ:** 2026-09-07 · **النطاق:** مراجعة قراءة فقط (لم يُعدَّل أي ملف) · **العمق:** دورة حياة كاملة لكل مديرية

> راجعتُ خمس مديريات: **الموظفون · الحضور والانصراف · الإجازات · الرواتب · إعدادات النظام**.
> لكل واحدة تتبّعتُ المسار كاملًا — من الشاشة إلى قاعدة البيانات إلى الحساب إلى أثره على باقي النظام —
> والحكم ليس «موجود/غير موجود» بل **هل يؤدي غرضه فعليًا؟**

---

## الحكم في سطر واحد

**البنية الهندسية قوية والتغطية واسعة — لكن في كل مديرية توجد مسارات «شكلها شغّال وهي مش شغّالة»، وبعضها يمسّ فلوس الناس مباشرة.**

هذا أخطر نوع من الأعطال: لا يظهر كخطأ، ولا يشتكي منه أحد — يظهر كرقم خاطئ في راتب أو رصيد.

| المديرية | 🔴 حرج | ❌ لا يؤدي غرضه | ✅ سليم | الحكم |
|---|---|---|---|---|
| **الإجازات** | 32 | 26 | 27 | 🔴 **الأخطر — غير جاهزة للتشغيل بثقة** |
| **الإعدادات** | 24 | 35 | 59 | 🔴 **7 من 10 تبويبات وهمية** |
| **الموظفون** | 18 | 46 | 48 | 🟠 أساس سليم بانقطاعات مالية |
| **الحضور** | 12 | 18 | 19 | 🟠 الحساب دقيق والوصلات مقطوعة |
| **الرواتب** | 12 | 29 | 51 | 🟠 المحرّك جيد ومسار التعديل اليدوي معطوب |

---

## أخطر عشر نقاط في النظام كله

### 🔴 ١. الغياب لا يُخصم من الراتب إطلاقًا
المسير يقرأ **طلبات الإجازة بدون راتب فقط**. صفوف الحضور المعلَّمة `absent` **لا تدخل المسير أبدًا**.
**الأثر:** موظف يغيب شهرًا بلا إذن ⇒ **راتب كامل**. وبند «الغياب» الظاهر في القسيمة هو في الحقيقة الإجازة بدون راتب متنكّرة.

### 🔴 ٢. الإجازة المعتمدة تظهر «غياب» — وحالة «في إجازة» لا تُكتب أبدًا
لا يوجد سطر واحد في النظام كله يكتب `on_leave`. التقرير الشهري يعتبر أي يوم عمل بلا سجل **غيابًا**، ولا يستشير جدول الإجازات.
**الأثر:** الموظف يرى في «حضوري» أنه غائب يوم إجازته المعتمدة · «على إجازة اليوم» في لوحة القيادة **صفر دائمًا**.

### 🔴 ٣. الإجازة بدون راتب تُخصم بأيام تقويمية والرصيد بأيام عمل
الرصيد يُخصم بأيام العمل (يستثني العطل ونهاية الأسبوع)، والراتب يُخصم بـ`diffInDays+1` **تقويميًا**.
**الأثر:** إجازة من الخميس إلى الأحد ⇒ **الرصيد ينقص يومين والراتب ينقص أربعة**. والأسوأ: معامل عقوبة الغياب (المخصَّص للغياب بلا إذن) يُضاعف خصم **إجازة معتمدة قانونًا**.

### 🔴 ٤. رفض الإجازة بعد اعتمادها يبتلع أيام الموظف
الاسترداد يتجاهل توزيع الأيام على الدفعات ويتجاهل خاصية «يخصم من الرصيد».
**مثال من الكود:** إجازة ٨ أيام (٥ من دفعة مُرحَّلة + ٣ من الاستحقاق) ⇒ الرفض يستدعي استرداد ٨ ⇒ الاستحقاق يصير صفرًا والدفعة تبقى منقوصة ٥ ⇒ **الموظف يخسر ٥ أيام نهائيًا**.

### 🔴 ٥. سبع تبويبات إعدادات وهمية بالكامل
تبويبات **الإشعارات · الأمان · الحضور · الإجازات · الرواتب** (ومنها دورة الراتب ونسب التأمينات وسقفها وفترة السماح وسياسة كلمة المرور) — زر الحفظ فيها **لا يستدعي أي API**، فقط يعرض «تم الحفظ بنجاح».
**الأثر:** المستخدم يضبط سياسات النظام، يرى رسالة نجاح، وتُمسح عند أول تحديث للصفحة. **قائمة أنواع الإجازات المعروضة فيها ثوابت مكتوبة داخل الواجهة.**

### 🔴 ٦. جدول العمل المسنَد للموظف لا يقرؤه محرّك الحضور
`WorkSchedule` يُحفظ ويُسنَد للموظف — ومحرّك الحضور **لا يقرؤه إطلاقًا**، بل يستخدم سلّمًا آخر تمامًا.
**الأثر:** موظف مسنَد لجدول «وردية ليلية» يُحاسَب على **دوام الشركة الافتراضي** ⇒ تأخير وغياب وأوفرتايم وخصومات كلها خاطئة، **بصمت**.

### 🔴 ٧. العطلة متعددة الأيام تُدخَل وتُعرض ولا تُقرأ
حقل «تاريخ نهاية العطلة» موجود في الشاشة وفي قاعدة البيانات — و**لا يقرؤه أي كود**: لا في العطل، ولا في الإجازات، ولا في ترحيل الغياب.
**الأثر:** عيد ٥ أيام ⇒ **يُخصم ٤ أيام إجازة زائدة من رصيد الموظف، وتُسجَّل عليه ٤ أيام غياب**.

### 🔴 ٨. تجديد العقد بزيادة راتب لا يزيد الراتب فعليًا
المسير يقرأ راتب **الموظف** لا راتب **العقد**، والمزامنة أحادية الاتجاه (موظف ← عقد).
**الأثر:** التجديد بزيادة يظهر في كل الشاشات والمستندات **ولا يُصرف**. ومعه: العقد المنتهي يبقى `active` إلى الأبد (لا كود يكتب «منتهي»)، ولا شيء يحدث عند انتهاء العقد بلا تجديد.

### 🔴 ٩. مزامنة البصمة تدهس التصحيحات المعتمدة
تصحيح بصمة مرّ بدورة اعتماد كاملة يُمحى في أول إعادة مزامنة تلمس اليوم نفسه — لا حارس على الإدخال اليدوي ولا على التصحيح المعتمد.

### 🔴 ١٠. التعديل اليدوي على بند المسير يُسقط نصف الخصومات
إعادة الحساب اليدوية تُسقط من الإجمالي: الانصراف المبكر · الخصومات بالنطاق · الخصومات الدائمة · الالتزامات · المعادلات — **ولا تُحدّث مبالغ الصرف النقدي/البنكي**.
ويُضاف إليه: القسيمة تعرض التأخير والغياب والسلفة **مرتين** (عمود مجمّع + أسطر) ⇒ مجموع البنود ≠ إجمالي الاستقطاعات.

---

## ملاحظة منهجية مهمة

القاسم المشترك في كل ما سبق **نمط واحد متكرر**: حقل يُجمَع ويُخزَّن ويُعرض — **ولا يقرؤه أحد**.
`salary_cycle` · `sick_leave_days` · `emergency_leave_days` · `holidays.end_date` · `passport_expiry` · `certifications.expiry_date` · `housing/transport_allowance` في شاشة العقود · إعدادات خمس تبويبات كاملة.

هذا يعني أن **اختبار «هل الحقل يُحفظ؟» لا يكفي** — المعيار الصحيح: **هل يوجد كود يقرؤه ويؤثر في نتيجة؟**

---

## كيف تقرأ التقرير
الأقسام الخمسة التالية تفصيلية: لكل مديرية **مخطط دورة الحياة** بنقاط الانقطاع، ثم **جدول تقييم** (✅ يؤدي غرضه / ⚠️ جزئيًا / ❌ لا) بالدليل `ملف:سطر`، ثم **مقارنة بنظامنا**، ثم الحكم.


---

# مديرية ١ — الإجازات ⚠️ (الأخطر)

# تدقيق مديرية الإجازات — نظام الشريك (Laravel) مقابل نظامنا

## ١) دورة الحياة الكاملة — مع نقاط الانقطاع

```
[أ] إعداد النوع  ── LeaveTypeController → StoreLeaveTypeRequest → leave_types
     │  annual_days · is_paid · deducts_from_balance · salary_effect · requires_attachment
     │  max_consecutive_days · carry_over_days · applicable_gender · once_per_service
     │
     ├─✗ requires_attachment      → لا يُقرأ في أي منطق. المرفق nullable دائماً
     ├─✗ max_consecutive_days     → يُحفظ ويُعرض ولا يُفحص عند التقديم إطلاقاً
     ├─✗ salary_effect            → المسير يقرأ is_paid=0 فقط؛ 'partial' قيمة ميتة
     ├─✗ carry_over_expiry_months → غير موجود في FormRequest ولا في Resource → غير قابل للضبط من الواجهة
     └─✓ deducts_from_balance · once_per_service · applicable_gender (جزئياً) · carry_over_days

[ب] الرصيد ── مساران متوازيان لا يعرف أحدهما الآخر
     مسار 1: leave_balances (entitled/used/adjusted/carried_over)
        ├─ initializeForEmployee: توزيع نسبي بالشهر (12−month+1) لمن التحق داخل السنة
        ├─ accrueForEmployee: تراكم شهري/يومي/سنوي — يعمل فقط لمن عنده employees.accrual_method
        │    └─ leave:accrue شهرياً يوم 1 (routes/console.php:36) ✓ حي فعلاً
        └─ setCarriedOver → carried_over_days (إدخال يدوي)
     مسار 2: leave_opening_balances (دفعات lots بصلاحية، FIFO)
        ├─ addLot يدوي من تبويب الموظف
        └─ leave:carry-over سنوياً 1 يناير → ينشئ lot ويصفّر متبقي السنة القديمة
     │
     ├─🔴 المساران يُضافان معاً بلا أي حماية: نفس الأيام يمكن إدخالها في «المُرحّل»
     │    و«الرصيد الافتتاحي» من نفس الشاشة → رصيد مضاعف
     └─🔴 شاشة «أرصدة الإجازات» لا تعرض lots إطلاقاً (تعرض remaining_days فقط)

[ج] التقديم ── StoreLeaveRequestForm → LeaveService::create
     ├─ countWorkingDays (يستثني الويك إند + العطلات) → total_days
     ├─ فحص الكفاية = remaining_days + availableTotal(lots)  ✓ صحيح
     ├─ فحص التداخل (نصف يوم صباحي/مسائي لا يتصادمان) ✓ جيد
     ├─✗ لا فحص max_consecutive_days · لا فحص requires_attachment
     ├─✗ لا فحص applicable_gender على مسار الأدمن (POST /leaves)
     └─✗ start_date >= today → استحالة تسجيل إجازة مرضية بأثر رجعي

[د] الاعتماد ── ApproveLeaveAction (أو ApprovalEngine → SyncLeaveOnApprovalDecision)
     ├─ يعيد حساب countWorkingDays (⚠ قد يختلف عن total_days المخزّن)
     ├─ consumeFifo على lots ثم deduct من الاستحقاق ✓ ويسجّل lot_consumption
     └─🔴 لا يكتب أي أثر في الحضور — لا سجل on_leave

[هـ] الإلغاء / الرفض
     ├─ Cancel: يرجّع lots بالخريطة + الباقي للاستحقاق ✓ صحيح
     │   └─🟠 ممنوع بعد بدء الإجازة · ولا يوجد endpoint إلغاء لـHR أصلاً
     └─🔴 Reject بعد اعتماد: يرجّع كل الأيام للاستحقاق ويتجاهل lot_consumption
         ويتجاهل deducts_from_balance → أيام تضيع من الموظف نهائياً

[و] الأثر على الحضور
     ├─ MarkEmployeeAbsencesAction يتخطّى يوم الإجازة (لا يكتب absent) ✓ جزئياً
     └─🔴 لكن التقرير الشهري لا يستشير الإجازات: يوم بلا سجل = «غياب»
          و on_leave لا يكتبها أي كود في النظام كله → leave_days = 0 دائماً

[ز] الأثر على الراتب
     ├─🔴 الإجازة بدون راتب تُخصم بأيام تقويمية (diffInDays+1)
     │    بينما الرصيد خُصم بأيام عمل → تناقض مباشر
     ├─🔴 نصف اليوم غير مدفوع يُخصم يوماً كاملاً (period مُتجاهَل في المسير)
     └─🔴 معامل عقوبة الغياب absence_penalty_days يُطبَّق على إجازة معتمدة

[ح] نهاية الخدمة
     └─🔴 SettlementService يصرف بدل نقدي عن مجموع كل الأنواع
          (مرضي 30 + اضطراري 5 + زواج 5 + حج 10 …) لا السنوي فقط
```

---

## ٢) جدول التقييم

| البند | يؤدي غرضه؟ | الدليل | الملاحظة |
|---|---|---|---|
| **أنواع الإجازات** | | | |
| `deducts_from_balance` | ✅ | `ApproveLeaveAction.php:49` · `LeaveService.php:156` · `CancelLeaveAction.php:38` | مُطبَّق في التقديم والاعتماد والإلغاء بشكل متسق |
| `once_per_service` | ✅ | `LeaveService.php:121-131` | يفحص pending+approved معاً — صحيح |
| `applicable_gender` | ⚠️ | `LeaveBalanceService.php:35` · `SelfServiceLeaveController.php:116` | يُفلتر القائمة والأرصدة فقط. مسار الأدمن `POST /leaves` لا يفحصه؛ الحماية عرضية عبر «رصيد صفر» |
| `requires_attachment` | ❌ | `StoreLeaveRequestForm.php:27` (`nullable`) — لا مرجع في `app/` كله | 🔴 عمود ميت. إجازة مرضية بلا تقرير طبي تمرّ |
| `max_consecutive_days` | ❌ | موجود فقط في Model/Request/Resource — بلا أي فحص | 🔴 عمود ميت. طلب 200 يوم «اضطرارية» يمرّ |
| `salary_effect` | ❌ | `PayrollCalculationService.php:808` يقرأ `is_paid=0` لا `salary_effect` | 🔴 عمود ميت. `'partial'` (مرضي ٧٥٪) مستحيل التنفيذ |
| `carry_over_days` | ⚠️ | `LeaveCarryOverCommand.php:67` | يعمل للنوع `annual` فقط؛ أي نوع آخر بسقف ترحيل يُتجاهل |
| `carry_over_expiry_months` | ⚠️ | `LeaveCarryOverCommand.php:80` — غائب عن `StoreLeaveTypeRequest`/`LeaveTypeResource` | المنطق حي لكن **لا سبيل لضبطه إلا من قاعدة البيانات** |
| **الرصيد** | | | |
| `accrual_method` / `accrual_start` | ✅ | `LeaveBalanceService.php:104-140` + `LeaveAccrueCommand.php:43` + `routes/console.php:36` | **ليست أعمدة ميتة** — التراكم مُنفَّذ ومجدول وidempotent عبر `last_accrued_period` |
| التوزيع النسبي للملتحق داخل السنة | ⚠️ | `LeaveBalanceService.php:67-70` | بالشهر لا باليوم: التحق ٣١ يناير يأخذ ١٢/١٢ كاملة |
| معادلة «المتبقي» | ⚠️ | `LeaveBalance.php:48-51` + `LeaveBalanceResource.php:29` | `remaining = entitled + carried_over + adjusted − used`، والمتاح الحقيقي `= remaining + lots`. المعادلتان موجودتان لكن الشاشة تعرض الأولى |
| نموذج التراكم | ⚠️ | `routes/console.php:36` `monthlyOn(1)` | يُرصَّد أول الشهر عن شهر **لم يُعمل بعد** — تقديم لا «accrue-as-you-work» كما يدّعي التعليق |
| `hasSufficientBalance()` | ❌ | `LeaveBalanceService.php:338` — لا مستدعي في المشروع | كود ميت |
| **الترحيل السنوي** | | | |
| أمر الترحيل | ✅ | `LeaveCarryOverCommand.php` + `routes/console.php:37` | موجود، بسقف، وبصلاحية انتهاء، ومجدول |
| ازدواج آليتَي الترحيل | ❌ | `LeaveBalanceService.php:329` (`carried_over_days`) مقابل `LeaveCarryOverCommand.php:84` (lot) | 🔴 الشاشة `EmployeeLeavesTab.tsx:34-45` و`:49-70` تعرض الحقلين جنباً إلى جنب بلا تحذير → **رصيد مضاعف بضغطتين** |
| صحة الترحيل بعد إلغاء لاحق | ⚠️ | `LeaveCarryOverCommand.php:97` | يصفّر المتبقي بـ`adjusted -= remaining`؛ إلغاء إجازة من السنة المغلقة بعدها يرفع الرصيد من العدم |
| **الأرصدة الافتتاحية** | | | |
| دفتر الدفعات FIFO | ✅ | `OpeningLeaveBalanceService.php:80-115` | الأقدم انتهاءً أولاً، مع قفل تشاؤمي وخريطة استرداد دقيقة. **أنضج جزء في المديرية** |
| ظهورها في شاشة الأرصدة | ❌ | `hr-dashboard/.../leaves/pages/balance/page.tsx:57,239` | 🔴 الشاشة الرسمية للأرصدة لا تعرض `opening_active` ولا `available_days`؛ موظف كل رصيده مُرحّل يظهر «المتبقي: 0» بينما الباك يسمح له بأخذها |
| **دورة الطلب** | | | |
| فحص التداخل | ✅ | `LeaveService.php:189-211` | يميّز نصف اليوم الصباحي عن المسائي — دقيق |
| فحص الكفاية | ✅ | `LeaveService.php:156-182` | يجمع الاستحقاق + الدفعات النشطة ويحترم `deducts_from_balance` |
| تسجيل بأثر رجعي | ❌ | `StoreLeaveRequestForm.php:16` `after_or_equal:today` | 🟠 مرض الأسبوع الماضي لا يمكن تسجيله |
| خصم الرصيد عند الاعتماد | ✅ | `ApproveLeaveAction.php:54-63` | حارس idempotency على `status!=='pending'` موجود |
| ثبات عدد الأيام | ⚠️ | `LeaveService.php:142` مقابل `ApproveLeaveAction.php:33` مقابل `CancelLeaveAction.php:39` | يُعاد الحساب ٣ مرات؛ تعديل جدول أو عطلة بين التقديم والاعتماد يُحدث انحرافاً في الرصيد |
| **الرفض بعد الاعتماد** | ❌ | `RejectLeaveAction.php:30-41` | 🔴 **أخطر خلل**: يتجاهل `lot_consumption` ويتجاهل `deducts_from_balance`. مثال: إجازة ٨ أيام، ٥ من دفعة و٣ من الاستحقاق → الرفض يستدعي `restore(8)` فيصير `used = max(0, 3−8) = 0` والدفعة تبقى منقوصة ٥ → **الموظف يخسر ٥ أيام نهائياً** |
| الإلغاء | ⚠️ | `CancelLeaveAction.php:20-59` | المنطق سليم، لكن `start_date <= now` يمنع الإلغاء بعد البدء، **ولا يوجد مسار إلغاء لـHR إطلاقاً** (`Routes/api.php` فيه `me/leaves/{id}/cancel` فقط) |
| فشل الاعتماد الصامت | ⚠️ | `SyncLeaveOnApprovalDecision.php:42-48` | `catch(Throwable)` + `Log::warning` فقط: تعثّر الخصم يترك الطلب `pending` بينما الدورة «معتمدة» بلا أي إشعار |
| **حساب الأيام** | | | |
| أيام عمل لا تقويمية للرصيد | ✅ | `LeaveDayCalculator.php:57-83` | يستثني أيام الراحة والعطلات |
| **وحدة مصدر «يوم العمل»** | ❌ | `LeaveDayCalculator.php:36-46` مقابل `AttendanceCalculationService.php:248-273` | 🔴 **أوراكلان مختلفان**: الحضور يمرّ على الجدول المنشور ثم استثناءات الجدول ثم التخصيصات المؤرّخة ثم `WorkDay`؛ الإجازات تقرأ `WeeklyScheduleEntry` الخام فقط. استثناء يحوّل الجمعة لعمل → الحضور يعتبره عملاً والإجازة لا تخصمه = يوم مجاني |
| جدول جزئي | ⚠️ | `LeaveDayCalculator.php:63-70` | إن وُجد صف واحد فقط لموظف، كل أيام الأسبوع الأخرى تُعتبر عمل (لا رجوع لـ`WorkDay`) |
| **الربط بالحضور** | | | |
| يوم الإجازة لا يُحسب غياباً | ❌ | `AttendanceReportService.php:145-152` | 🔴 التقرير الشهري لا يستشير `leave_requests`: يوم عمل بلا سجل = `absent`. الحماية في `MarkEmployeeAbsencesAction.php:67` تمنع **الصف** فقط لا **التصنيف** |
| حالة `on_leave` | ❌ | `grep on_leave app/` → قرّاء فقط، بلا كاتب واحد | 🔴 `leave_days` في التقرير الشهري و«على إجازة اليوم» في لوحة القيادة (`DashboardService.php:183`) **أصفار دائمة** |
| اعتماد متأخر بعد تجسيد الغياب | ❌ | `ApproveLeaveAction` لا يمسّ الحضور | صف `absent` مكتوب قبل الاعتماد يبقى إلى الأبد |
| **الربط بالرواتب** | | | |
| خصم الإجازة بدون راتب | ❌ | `PayrollCalculationService.php:826-829` `diffInDays+1` | 🔴 **أيام تقويمية** بينما الرصيد خُصم **أيام عمل** — إجازة خميس→أحد: الرصيد ينقص ٢، الراتب ينقص ٤ |
| نصف اليوم في المسير | ❌ | نفس الموضع — `period` غير مقروء | نصف يوم غير مدفوع = خصم يوم كامل |
| معامل عقوبة الغياب | ❌ | `PayrollCalculationService.php:834-837` | 🔴 `absence_penalty_days` (المقصود للغياب بلا إذن) يضاعف خصم **إجازة معتمدة** |
| خصم الغياب بلا إذن | ❌ | لا قارئ لـ`status='absent'` في المسير | المسير لا يخصم الغياب أصلاً؛ بند «الغياب» فيه هو الإجازة بدون راتب متنكّرة (`:1065-1069`) |
| بدل رصيد الإجازات عند ترك الخدمة | ❌ | `SettlementService.php:203-210` | 🔴 يجمع **كل** الأنواع: مرضي ٣٠ + حج ١٠ + زواج ٥ … وأيضاً **يتجاهل الدفعات المُرحَّلة** فيبخس المستحق الحقيقي ويضخّم غيره |
| **العطل الرسمية** | | | |
| تعريف متكرر سنوياً | ⚠️ | `HolidayService.php:78-83` | Gregorian فقط — لا يخدم الأعياد الهجرية، و29 فبراير يفيض إلى 1 مارس |
| **العطلة متعددة الأيام** | ❌ | `holidays.end_date` (`Setting/.../2026_08_03_000006:31`) — بلا قارئ واحد | 🔴 الشاشة تُدخل `end_date` وتعرضه (`holidays/page.tsx:111,260`)، والباك يتجاهله في `getHolidayDatesForYear` و`isHoliday` و`MarkEmployeeAbsencesAction` و`LeaveCalendarController`. **عيد ٥ أيام يخصم ٤ أيام إجازة زائدة ويسجّل ٤ أيام غياب** |
| **الصلاحيات** | | | |
| تسوية الرصيد | ⚠️ | `LeaveBalanceController.php:73-95` | الوحيد بلا `scope->authorize()` — مدير فرع بصلاحية `leave_balances:adjust` يعدّل رصيد أي موظف في المستأجر |
| **الأداء** | 🟡 | `LeaveBalanceResource.php:14-16` | استعلامان لكل صف رصيد (N+1) |

---

## ٣) المقارنة مع نظامنا

| القدرة | عندهم | عندنا | الأنضج |
|---|---|---|---|
| نموذج الاستحقاق | مهمة مجدولة تكتب `entitled_days` شهرياً (`LeaveAccrueCommand`) — قابلة للتفويت والانحراف، لكنها **قابلة للتدقيق** | حساب متراكم **عند القراءة** `accruedEntitlement()` (`leave-balances.service.ts:47-75`) — لا cron ولا انحراف، لكن بلا أثر تاريخي | **نحن** (صحّة أعلى) / **هم** (تدقيق أفضل) |
| بداية الاستحقاق | 3 أوضاع لكل موظف: `from_joining` / `after_probation` / `after_6months` (`LeaveBalanceService.php:120-126`) | إعداد عام واحد `leave.probation_months` | **هم** |
| طبقات الرصيد | دفتر lots كامل: مصدر + كمية + صلاحية + FIFO + خريطة استرداد + سجل تدقيق | طبقة افتتاحية واحدة على صف الرصيد (`openingDays/openingTaken/openingExpiry`) | **هم** بوضوح |
| الترحيل السنوي | آلي مجدول 1 يناير بسقف نوع + سقف موظف + انتهاء صلاحية | يدوي `POST leave-balances/rollover/:fromPeriod` بسقف وصلاحية — بلا جدولة | **هم** |
| ازدواج مسارات الترحيل | 🔴 مساران متنافسان في نفس الشاشة | مسار واحد | **نحن** |
| `maxDays` / حد النوع | ❌ عمود ميت | ✅ مُطبَّق `requests.service.ts:424-429` بأيام العمل | **نحن** |
| المرفق الإجباري | ❌ عمود ميت | ✅ مُطبَّق `requests.service.ts:483-488` باسم المستند المطلوب | **نحن** |
| مرة واحدة طوال الخدمة | ✅ pending+approved | ✅ **أقوى**: سجلات + طلبات in-flight عبر كل حالات المسار (`:435-478`) | **نحن** |
| نصف اليوم | ✅ في الرصيد والتداخل — ❌ في المسير | ✅ في الرصيد والتداخل **و**المسير (`payroll.service.ts:300-303`) وفي الحضور (`partial_leave`) | **نحن** |
| أوراكل «يوم العمل» | 🔴 اثنان متباعدان (إجازات ≠ حضور) | واحد: `workingDaysForEmployee` → `nonWorkingContext` هو نفسه أوراكل الحضور | **نحن** |
| العطلة متعددة الأيام | 🔴 `end_date` يُدخل ويُعرض ولا يُقرأ | ✅ `attendance.service.ts:168-170, 216-221` يحترم `endDate` في الحضور والإجازات | **نحن** |
| العطلة المتكررة سنوياً | ⚠️ ميلادي فقط | ❌ غير موجود (إدخال سنوي) | **هم** |
| يوم الإجازة في الحضور | 🔴 `on_leave` بلا كاتب؛ التقرير يعتبره غياباً | ✅ `computeDay` يكتب `leave`/`partial_leave` ويرصد `leaveConflict` (بصمة داخل إجازة) | **نحن** بفارق كبير |
| إعادة الحساب بعد قرار الإجازة | ❌ لا شيء | ✅ `requests.service.ts:756-770` و`leaves.controller.ts:105-118` يعيدان حساب كل يوم متأثر | **نحن** |
| الإجازة بدون راتب في المسير | 🔴 أيام تقويمية + معامل عقوبة الغياب | ⚠️ أيام تقويمية أيضاً (`payroll.service.ts:293-303`) — **نفس الضعف عندنا** لكن بلا معامل عقوبة وبنصف يوم صحيح | **نحن** جزئياً — والبند مفتوح عندنا |
| خصم الغياب بلا إذن | ❌ غير موجود في المسير | ✅ `payroll.service.ts:284-286` بمعامل عقوبة مستقل ومن مصدر `status='absent'` | **نحن** |
| بدل الرصيد عند ترك الخدمة | 🔴 كل الأنواع + يتجاهل الدفعات | ✅ سنوي فقط + طبقة افتتاحية + استحقاق متراكم لتاريخ آخر يوم (`offboarding.service.ts:252-290`) | **نحن** بوضوح |
| الرفض بعد الاعتماد | 🔴 يُتلف الرصيد | ✅ `destinations.service.ts:144-172` استرداد بالطبقات العكسية | **نحن** |
| إلغاء HR لإجازة معتمدة | ❌ غير موجود | ✅ `leaves.controller.ts:62-120` بنطاق الفرع + استرداد + إعادة حساب حضور | **نحن** |
| دورة اعتماد قابلة للتعريف | ✅ ApprovalEngine متعدد الخطوات | ✅ سلاسل + `approvalChainId` لكل نوع إجازة | تعادل |
| مرفقات متعددة | ✅ 0..n بتحقق MIME مزدوج وقرص خاص وrollback | ⚠️ `attachmentUrl` واحد في الـpayload | **هم** |
| تصدير + تدقيق | ✅ Excel/CSV + `LogAuditTrail` + `AuditLogService` على التسويات والدفعات | ⚠️ أقل نضجاً | **هم** |
| تعدد المستأجرين | ✅ | ❌ | **هم** |

---

## ٤) الخلاصة

**هل مديرية الإجازات عندهم جاهزة للتشغيل الحقيقي؟ — لا، ليس على المسير.**

الهيكل مُصمَّم جيداً على الورق: دفتر دفعات FIFO بخريطة استرداد دقيقة، تراكم مجدول idempotent، ترحيل سنوي بسقف وصلاحية، نصف يوم موحّد في مكان واحد، وحراس idempotency على الاعتماد. **الحساب في المسار المستقيم (قدّم → اعتمد → ألغِ قبل البدء) صحيح.** لكن كل مسار خارج هذا الخط المستقيم يسرّب: الرفض يتلف الرصيد، الرواتب تخصم بوحدة مختلفة عن الرصيد، وتقرير الحضور يقلب الإجازة المعتمدة إلى غياب. وثلث خصائص «نوع الإجازة» أعمدة تُملأ من الواجهة ولا يقرأها أحد — وهذا أخطر من غيابها، لأن HR يظن أن الضابط مفعَّل.

### أخطر ٣ نقاط

**١. 🔴 التناقض بين وحدة خصم الرصيد ووحدة خصم الراتب** — `PayrollCalculationService.php:826-829`
الرصيد يُخصم **أيام عمل** (`LeaveDayCalculator`)، والراتب يُخصم **أيام تقويمية** (`diffInDays+1`)، ثم يُضرب في معامل عقوبة الغياب `absence_penalty_days`. إجازة بدون راتب من الخميس للأحد: الرصيد ينقص يومين، والراتب ينقص أربعة — أو ستة إن ضُبط المعامل على 1.5. ونصف اليوم يُخصم يوماً كاملاً. هذا خطأ مالي مباشر في كل مسير.

**٢. 🔴 `RejectLeaveAction` يُتلف رصيد الموظف** — `RejectLeaveAction.php:30-41`
هو النسخة الوحيدة من الاسترداد التي لا تقرأ `lot_consumption` ولا تفحص `deducts_from_balance`، بعكس `CancelLeaveAction` المجاور له تماماً. رفض إجازة سبق اعتمادها يترك الدفعة منقوصة ويحرق الاسترداد في `max(0, …)` — والأيام تختفي بلا أثر ولا إشعار. ولأن `SyncLeaveOnApprovalDecision.php:42` يبتلع كل استثناء بـ`Log::warning`، لن يشتكي أحد.

**٣. 🔴 حقول تُملأ من الواجهة ولا يقرأها أي منطق** — ثلاث حالات مؤكدة بالـgrep:
- `holidays.end_date`: الشاشة تُدخل عيداً من ٥ أيام وتعرضه، والباك لا يقرأه في أي مكان → ٤ أيام تُخصم زائدة من الرصيد **و**تُسجَّل غياباً.
- `leave_types.requires_attachment` و`max_consecutive_days`: مُصدَّران في الـResource ومُتحقَّق منهما في الـFormRequest ومُخزَّنان — وبلا فحص واحد عند التقديم. إجازة مرضية بلا تقرير، و«اضطرارية» ٢٠٠ يوم، كلاهما يمرّ.
- `leave_types.salary_effect`: المسير يقرأ `is_paid` فقط، فقيمة `partial` (المرضي بنسبة من الأجر — أساس نظام الإجازات المرضية) **لا يمكن تنفيذها إطلاقاً**.

### ما يستحق أن نأخذه منهم
دفتر الدفعات `leave_opening_balances` بمصدرها وصلاحيتها وسجل تدقيقها وخريطة الاسترداد الدقيقة — أنضج من طبقتنا الواحدة على صف الرصيد؛ و**جدولة** الترحيل السنوي (عندنا endpoint يدوي بلا cron)؛ و`accrual_start` لكل موظف (عندنا إعداد عام واحد)؛ والمرفقات المتعددة بتحقق MIME مزدوج وrollback للملفات.

### ما يجب أن نصلحه عندنا فوراً
`payroll.service.ts:293-303` — نحن أيضاً نخصم الإجازة بدون راتب **بأيام تقويمية** بينما نخصم الرصيد بأيام عمل. نصف اليوم عندنا صحيح والمعامل غير مطبَّق، لكن جوهر التناقض قائم. ويجب جدولة `rollover` بدل تركها نداءً يدوياً — وإلا فأول يناير يمرّ بلا ترحيل.

---

# مديرية ٢ — إعدادات النظام

# تقرير مراجعة: إعدادات النظام (Settings) + البنية الحاكمة — نظام الشريك

---

## 1. دورة الحياة — المسار الكامل ونقاط الانقطاع

### أ) المسار السليم (الهيكل التنظيمي)
```
شاشة /settings/departments (React)
   ↓ POST /api/settings/departments  [permission:settings:departments:manage|settings:manage]
   ↓ StoreDepartmentRequest ──✂── لا يفحص tenant_id على أي FK  ← انقطاع #1
   ↓ DepartmentService::applyBranchInheritance() → وراثة الفرع من السلسلة الأبوية ✅
   ↓ Department (BaseModel → BelongsToTenant global scope) ✅
   ↓ يُقرأ فعلياً في:
        EmployeeScopeService::visibleBranchIds()  → نطاق رؤية كل شاشة ✅
        ScopeResolver::departmentChain()          → أسبقية الجداول/البدلات ✅
        ApprovalEngine:1107 (departments.manager_id) → توجيه الاعتمادات ✅
        CalendarGenerationService::scopeChainFor() → توليد التقاويم ✅
   → أثر حقيقي على الرواتب والحضور ✅
```

### ب) المسار المكسور (الإعدادات التشغيلية) — **الانقطاع الأخطر**
```
شاشة /settings (الصفحة الرئيسية) — 10 تبويبات
   ├─ «الشركة»  → PUT /settings/company ✅ يُحفظ
   ├─ «إقليمي»  → PUT /settings/company ✅ يُحفظ … ──✂── ثم لا يُقرأ أبداً  ← انقطاع #2
   ├─ «الإشعارات» ──✂── onClick = showToast('تم الحفظ بنجاح') فقط     ← انقطاع #3
   ├─ «الأمان»    ──✂── نفس الشيء (سياسة كلمة المرور/القفل/انتهاء الجلسة)
   ├─ «الحضور»   ──✂── نفس الشيء (فترة السماح/الحد الأدنى للساعات)
   ├─ «الإجازات» ──✂── نفس الشيء + القائمة المعروضة **ثوابت داخل JSX**
   └─ «الرواتب»  ──✂── نفس الشيء (دورة الراتب/نسب GOSI/سقف 45000)
        ↓
   لا استدعاء API · لا حفظ · لا قراءة · تُمسح عند refresh · والمستخدم يرى «تم الحفظ بنجاح»
```

### ج) المسار «موجود لكنه معطّل» (جداول العمل)
```
/settings/work-days → POST/PUT /settings/work-schedules
   ↓ WorkSchedule{work_days, work_hours, rules} يُحفظ في القاعدة ✅
   ↓ employees.work_schedule_id يُسند للموظف ✅
   ↓ ──✂── AttendanceCalculationService لا يقرأ WorkSchedule إطلاقاً   ← انقطاع #4
       سُلّم الحل الفعلي: exception → scoped assignment → weekly entry → WorkDay (على مستوى المستأجر)
   → الموظف المسند لجدول «وردية ليلية» يُحاسَب على دوام الشركة الافتراضي
   → تأخير/غياب/أوفرتايم/خصومات كلها خاطئة، بصمت
```

### د) مسار الحُكم (الأدوار والجلسات)
```
PUT /roles/{id}/permissions
   ↓ Role::syncPermissions()  ← جدول roles **بلا tenant_id** (config/permission.php:134 teams=false) ← انقطاع #5
   ↓ PermissionSyncService::onRolePermissionsChanged() → مسح كاش + إبطال توكنات المتضررين ✅ (ممتاز)
   ↓ ──✂── لا يُكتب أي سطر في audit_logs                                ← انقطاع #6
PUT /users/{id}  (role: super_admin)
   ↓ ──✂── لا فحص أن الفاعل يملك رتبة أعلى → تصعيد امتيازات ذاتي        ← انقطاع #7
PUT /users/{id}  (is_active: false)
   ↓ ──✂── لا حذف للتوكنات · لا middleware يفحص is_active → الجلسة تبقى حيّة ← انقطاع #8
```

---

## 2. جدول التقييم

### 2-أ · أسطح الإعدادات: هل القيمة تُستهلك فعلاً؟

| البند | يؤدي غرضه؟ | الدليل | الملاحظة |
|---|---|---|---|
| 🔴 تبويبات «الأمان/الحضور/الإجازات/الرواتب/الإشعارات» في `/settings` | ❌ لا | `hr-dashboard/src/features/settings/pages/SettingsHomePageContent.tsx:602,750,899,1045,1106` — `onClick={() => showToast('تم الحفظ بنجاح')}` | زر «حفظ» **يكذب**. لا API. الحالة كلها `useState` محلي في `useSettingsHomePage.ts:245-280`. المستخدم يضبط سقف GOSI 45000 ونسبة 9.75% وانتهاء كلمة المرور 90 يوم — ولا شيء يُحفظ |
| 🔴 قائمة أنواع الإجازات في تبويب «الإجازات» | ❌ لا | `SettingsHomePageContent.tsx:1054-1065` — مصفوفة حرفية داخل JSX | تعرض «سنوية 30 · مرضية 30 · أمومة 70» بلا أي علاقة بجدول `leave_types` الحقيقي |
| 🔴 تبويب «التكاملات» — GOSI و«مُدد» بحالة **«متصل»** | ❌ لا | `SettingsHomePageContent.tsx:1339-1352` (`status:'connected'` ثابت) مقابل `grep mudad\|gosi-api` في الباك = صفر | لا يوجد تكامل GOSI ولا مُدد في الباك — فقط تصدير ملف WPS. حالة «متصل» مُختلَقة |
| 🔴 `company_infos.timezone` (الافتراضي Asia/Riyadh في الواجهة) | ❌ لا | يُحفظ في `CompanyInfo.php:31`، لا قارئ واحد في `app/`. و`config/app.php:68` = `'timezone' => 'UTC'` **مثبّت** (بلا `env()`) | كل الطوابع الزمنية UTC. بصمة الساعة 01:30 بتوقيت الرياض تُختم على **اليوم السابق** → حدود يوم الحضور وحدود فترة المسير مزاحة 3 ساعات لكل المستأجرين |
| 🔴 `weekend_days` / `week_start` / `calendar` / `date_format` | ❌ لا | `CompanyInfo.php:32-35` + `Migrations/2026_07_02_000001` — لا قارئ في `app/` | يُحفظ عبر `PUT /settings/company` ثم يُهمل. عطلة نهاية الأسبوع الفعلية تأتي من `work_days.is_working_day` وحده |
| 🟠 `company_infos.currency` | ⚠️ جزئياً | `EmployeeService.php:133` فقط (افتراضي عند إنشاء موظف) | لا يستخدمه المسير ولا التقارير ولا الـPDF |
| 🔴 `WorkSchedule` (جداول عمل مسمّاة + `rules` JSON) | ❌ لا | `Setting/Models/WorkSchedule.php` · مسند عبر `employees.work_schedule_id` · القارئ الوحيد `Employee.php:171` (عرض فقط) و`EmployeesExport.php:222`. سُلّم `AttendanceCalculationService.php:104-152` لا يذكره | **CRUD كامل + شاشة كاملة + إسناد للموظف = صفر أثر على الحساب**. حقل `rules` (تحويل دوام↔إجازة، نصف يوم، رمضان) لا يقرأه أي محرك |
| 🔴 `policies` (سياسات الحضور/الإجازات/الرواتب) | ❌ لا | `Setting/Controllers/PolicyController.php` كامل · `rules` JSON حر (`StorePolicyRequest.php:107`) · لا قارئ خارج الموديول | CRUD مغلق على نفسه. التعليق في `PolicyController.php:82` يعترف: «add checks here when employees are linked to policies» |
| 🔴 `grades.min_salary/max_salary` | ❌ لا | يُتحقق منهما عند الإدخال (`StoreGradeRequest.php:19-20`) ولا يُقرآن في أي مكان | نطاق الراتب لكل درجة **زينة**: يمكن تعيين موظف بدرجة «مبتدئ» براتب 200,000 بلا اعتراض |
| 🔴 `is_active` على الفروع/الأقسام/الفرق/المسميات/الدرجات | ❌ لا | `StoreEmployeeRequest.php:66-71` — `Rule::exists('branches','id')->where('tenant_id',…)` بلا `->where('is_active',true)`. صفر فحص في Employee/Attendance/Payroll | «تعطيل» أي عنصر تنظيمي لا يمنع الإسناد إليه. زر التعطيل ديكور |
| 🟠 `notification_settings` (قنوات/أحداث) | ⚠️ جزئياً | `NotificationSettingController.php:37,53` — `Cache::get/put` بلا جدول | تُستهلك فعلاً (`NotificationPreferenceService.php:47,70`) ✅ لكن التخزين في الكاش: أي `php artisan cache:clear` في نشرة عادية يعيد سياسة الإشعارات لكل المستأجرين للافتراضي بصمت |
| ✅ `work_days` (الأسبوع الافتراضي) | ✅ نعم | يُقرأ في `AttendanceCalculationService:139,210,340,356` · `WeeklyBoardService:78,350,475` · `LeaveDayCalculator` · `ScheduleGenerationService:215` | مستهلك بعمق — أفضل إعداد عندهم |
| ✅ `payroll_formulas` (18 مفتاحاً) | ✅ نعم | `PayrollCalculationService:80-82,529-530,836` · `PayrollCycleService:25` · `ApprovePayrollAction:30` | مستهلك حقيقي — لكن انظر بند التحقق أدناه |
| ✅ `gosi_settings` | ✅ نعم | `GosiSettingController` + `PayrollCalculationService:113` + `UpdateGosiSettingRequest` بحدود 0-100 | الشاشة الحقيقية `/payroll/gosi`. المشكلة أن تبويب «الرواتب» في `/settings` يعيد نفس الحقول **ميتة** فيتوهم المستخدم أنه ضبطها |
| ✅ قوالب المستندات · `document_templates` | ✅ نعم | موديول كامل: `DocumentTemplateVersion` · `TemplateRenderer` · `DocumentPdfRenderer` · `GenerateDocumentFromTemplateAction` | يعمل فعلاً مع إصدارات |
| ✅ تصدير الإعدادات (`ConfigExportRegistry`) | ✅ نعم | `Setting/Exports/ConfigExportRegistry.php` — سجل مغلق، أعمدة صريحة، بوابة لكل مورد، `LogAuditTrail` | تصميم متين ومبرَّر بتوثيق ممتاز |

### 2-ب · التحقق والحماية من القيم الكارثية

| البند | يؤدي غرضه؟ | الدليل | الملاحظة |
|---|---|---|---|
| 🔴 حدود مفاتيح الرواتب | ❌ لا | `Payroll/Requests/UpdatePayrollFormulaRequest.php:14` — `'value' => 'required\|string\|max:255'` فقط | **بلا نوع، بلا حد أدنى/أقصى، بلا enum** |
| 🔴 قسمة على صفر في المسير | ❌ لا | `PayrollCalculationService.php:80,85,86`:<br>`$divisor = (float) PayrollFormula::getForTenant(…,'daily_salary_divisor','30');`<br>`$dailySalary = $basicSalary / $divisor;`<br>`$hourlyRate = $dailySalary / $dailyHours;` | ضبط `daily_salary_divisor = 0` (أو أي نص غير رقمي → `(float)` = 0.0) **يفجّر المسير بالكامل** `DivisionByZeroError`. نفس الشيء لـ`daily_work_hours`. لا حارس في نقطة الكتابة ولا في نقطة الاستهلاك |
| 🔴 `payroll_approver_role` نص حر | ❌ لا | `ApprovePayrollAction.php:30` يقرأ القيمة ويقارنها بـ`hasRole()` | ضبطها لاسم دور غير موجود = **قفل اعتماد المسير نهائياً**؛ ضبطها لـ`employee` = كل موظف يعتمد المسير |
| 🔴 `Policy.type` — تعارض واجهة/قاعدة | ❌ لا | `StorePolicyRequest.php:106` = `string\|max:100` مقابل `Migrations/2026_04_07_000003:111` = `enum(['attendance','leave','payroll','general'])` | إرسال `type:"custom"` يمرّ من التحقق ثم يسقط بـ500 من MySQL |
| 🟠 حذف الدرجات/الفرق/المسميات بلا فحص تبعية | ❌ لا | `GradeController.php:53`، `TeamController`، `JobTitleController` — كلها تحمل التعليق نفسه: «Dependency check: add checks here when employees are linked to…» ثم `->delete()` مباشرة | الفروع (`BranchController.php:56-64`) ومراكز التكلفة محميّة، والأقسام محميّة من الفرق/الأبناء **لكن ليس من الموظفين**. النتيجة: `grade_id`/`team_id`/`job_title_id` معلّقة على صف محذوف ناعماً |
| ✅ حراسة الهرمية | ✅ نعم | `DepartmentService::wouldCreateCycle()` + `Department::isAncestorOrSelf()` + حارس `$guard < 20` في `ScopeResolver:73` و`resolveBranchId()` | معالجة صحيحة لحالة حدّية حقيقية |
| ✅ حدود GOSI | ✅ نعم | `UpdateGosiSettingRequest.php:14-20` — `numeric\|min:0\|max:100` | الاستثناء الوحيد المحمي |

### 2-ج · الصلاحيات والأدوار

| البند | يؤدي غرضه؟ | الدليل | الملاحظة |
|---|---|---|---|
| ✅ سجل صلاحيات مركزي | ✅ نعم | `Core/Authorization/PermissionRegistry.php` — **~138 صلاحية** مجمّعة، اتفاقية `resource:action` موحّدة، مع اختبارات ratchet (`RouteCoverageTest`/`PermissionNamingTest`/`OrphanPermissionTest`) | من أنضج ما رأيته: كل مسار محمي مُثبت في جدول المسارات لا في جسم الدالة |
| ✅ صلاحيات على مستوى الحقل | ✅ نعم | `Core/Authorization/SensitiveFields.php` (راتب/بنك/GOSI + national_id/passport) + `ProtectsSensitiveFields.php` — الحجب عند **التسلسل** (المفتاح يُحذف لا يُفرَّغ) + تجريد على الكتابة | متفوّق بوضوح — قراءة وكتابة متماثلتان بتصميم |
| ✅ النطاق (scope) كخاصية للدور | ✅ نعم | `roles.scope_level` (`2026_08_08_000015`) + `EmployeeScopeService::levelOfRole()` مع fallback للأسماء القديمة، و`super_admin` مثبّت global لا يُضيَّق | إصلاح واعٍ لعيب حقيقي موثّق في المهاجرة |
| ✅ إبطال الجلسة عند تقليل الصلاحيات | ✅ نعم | `PermissionSyncService.php` — مسح كاش Spatie متزامن + حذف توكنات من فقدوا صلاحية فعلياً (`$user->can()` لا مجرد فرق قوائم)، والإضافي لا يُخرج أحداً | تصميم دقيق |
| 🔴 الأدوار **عامة عبر كل المستأجرين** | ❌ لا | `database/migrations/2026_04_07_143806_create_permission_tables.php:37-51` — `unique(['name','guard_name'])` بلا `tenant_id`؛ `config/permission.php:134` → `'teams' => false`؛ `DefaultRoleSeeder` يستخدم `Role::firstOrCreate` بلا نطاق | أدمن المستأجر A بصلاحية `settings:roles:manage` يعدّل `hr_manager` → **يتغيّر لكل مستأجري المنصّة**، و`PermissionSyncService` يُخرج مستخدمي كل المستأجرين. أخطر تسرّب في المديرية |
| 🔴 لا يمكن إنشاء دور مخصّص | ❌ لا | `Auth/Routes/api.php:61-68` — `GET roles` · `GET/PUT roles/{id}/permissions` · `PUT scope-level` فقط. **لا `POST /roles` ولا `DELETE`** | التعليقات تتحدث عن «admin-created custom roles» (`StoreUserRequest.php:27`) وواجهة الأدوار لا تعرض زر إنشاء. الأدوار التسعة المزروعة هي السقف |
| 🔴 لا تدقيق لتغيير الصلاحيات | ❌ لا | `RolePermissionController::update` → `PermissionSyncService::logInvalidation()` = `Log::info()` لملف نصي فقط. لا `AuditLogService::log` ولا `LogAuditTrail` على المسار | شاشة `/settings/audit` تعرض تعديلات الورديات ولا تعرض «من جعل أحمد super_admin». نفس الشيء لكل مسارات `settings/*` وكل مسارات `users/*` المُعدِّلة — `LogAuditTrail` مُطبَّق حصراً على مسارات **التصدير** |
| 🟠 `old_values` دائماً null في التدقيق الوسيط | ⚠️ جزئياً | `Core/Middleware/LogAuditTrail.php:91` — `'old_values' => null` و`new_values` = كامل الطلب | «ماذا تغيّر» غير مستنتج من الأثر. `AuditLogService` (المستدعى من الخدمات) يفعلها صحيحاً — الوسيط لا |

### 2-د · المستخدمون والدخول

| البند | يؤدي غرضه؟ | الدليل | الملاحظة |
|---|---|---|---|
| 🔴 تصعيد امتيازات عبر تعديل المستخدم | ❌ لا | `Auth/Controllers/UserController.php:166-187` — لا فحص لرتبة الفاعل؛ و`UpdateUserRequest.php:65` = `Rule::exists('roles','name')` بلا قيد | حامل `users:update` (وحده) يرسل `PUT /users/{self}` بـ`role: super_admin` → يصبح مدير النظام. الحارس الوحيد في الملف هو منع حذف الذات (`:193`) |
| 🔴 التعطيل لا ينهي الجلسة | ❌ لا | `AuthService.php:44` — `is_active` يُفحص **عند تسجيل الدخول فقط**؛ `UserController::update:170-175` يحفظ `is_active=false` بلا `$user->tokens()->delete()`؛ لا middleware يفحصه | التناقض صارخ: تقليل صلاحية = إخراج فوري (`PermissionSyncService`)، وتعطيل الحساب كلياً = الجلسة تبقى صالحة بلا انتهاء (Sanctum بلا expiration مضبوط) |
| 🔴 سياسة كلمة المرور | ❌ لا | `StoreUserRequest.php:26` / `UpdateUserRequest.php:62` / `ChangeOwnPasswordRequest.php:94` = `min:8` فقط | لا تعقيد · لا تاريخ · لا انتهاء. `password_changed_at` يُكتب (`AuthService.php:221`) ويُعرض (`SelfSecurityController:44`) و**لا يُفرَض** — الشاشة تعرض حقل «انتهاء كلمة المرور 90 يوم» وهو ميت |
| 🟠 القفل غير قابل للضبط | ⚠️ جزئياً | `Auth/Models/User.php:78-81` — `MAX_FAILED_ATTEMPTS = 5` و`LOCKOUT_MINUTES = 30` **ثوابت في الكود** | المنطق نفسه ممتاز: فحص القفل **قبل** التحقق من كلمة المرور (يمنع أوراكل)، ونافذة جديدة بعد انتهاء القفل (يمنع DoS دائم) — `User.php:105-120`. لكن الشاشة تعرض «أقصى محاولات فاشلة» كحقل قابل للتعديل وهو ثابت |
| 🟠 middleware القفل معطّل | ⚠️ | `Auth/Middleware/CheckAccountLockout.php:11-23` — التوثيق نفسه يقول «applied to NO route, so it does not run» + `User::withoutGlobalScopes()` عابر للمستأجرين | كود ميت موثّق بأمانة (يُحسب لهم) لكنه يظل ميتاً |
| ✅ المصادقة الثنائية | ✅ نعم | `AuthService.php:106-192` — توكن جسر مخزَّن **خادمياً** (يُحرق عند الاستخدام)، ربط بالـIP قابل للإطفاء، رموز استرداد مُجزّأة ومُعمّاة، وعدّاد القفل يُزاد على فشل TOTP | من أنضج ما في النظام — راجعوا التعليقات على السطر 96-105 |
| ✅ LDAP / Active Directory | ✅ نعم | `LdapService` + `users.auth_source/ad_username` + `verifyCredentials()` | موجود وشغّال |
| ✅ ربط الحساب بالموظف | ✅ نعم | `StoreEmployeeRequest.php:20-25` — `Rule::unique('employees','user_id')->where('tenant_id')` + فهرس فريد في المهاجرة | 1:1 مضمون على مستوى القاعدة |

### 2-هـ · تعدّد المستأجرين

| البند | يؤدي غرضه؟ | الدليل | الملاحظة |
|---|---|---|---|
| ✅ الحارس العابر للمستأجرين | ✅ نعم | `Core/Middleware/TenantResolver.php:42-49` — التوكن يجب أن يخصّ المستأجر المحلول، بغضّ النظر عن ترتيب الـmiddleware | يغلق ثغرة «بدّل `X-Tenant-ID` لتتصفّح مستأجراً آخر» |
| ✅ النطاق العام على الموديلات | ✅ نعم | `Core/Traits/BelongsToTenant.php` + `BaseModel` — كل موديلات Setting تحمله | + `ConfigExportsTest` يؤكد أن كل مورد مصدَّر يحمل `BelongsToTenant` |
| 🔴 `exists:` غير مقيّد بالمستأجر في كل موديول Setting | ❌ لا | `StoreDepartmentRequest.php:19,20,24,26` · `StoreTeamRequest.php:47,51` · `StoreCostCenterRequest.php:80` · `Auth/Requests/UpdateUserBranchesRequest.php:18` — كلها `exists:table,id` عارية | التحصين مُطبَّق في `StoreEmployeeRequest.php:66-71` مع تعليق صريح («a foreign-tenant id can no longer satisfy validation») و**لم يُنقل** للموديول الذي يعرّف الهيكل. النتيجة العملية: `manager_id` لقسم = مستخدم من مستأجر آخر → `ApprovalEngine:1107` يوجّه الاعتماد له، `TenantResolver` يمنعه من الدخول → **دورة الاعتماد تتجمّد للأبد**، و`NotifyRequesterOnApprovalDecision:39` (`User::withoutGlobalScopes()->find`) يراسله |
| 🟠 `withoutGlobalScope` — 60+ موضعاً | ⚠️ جزئياً | الأغلبية منضبطة (`->where('tenant_id', $tenantId)` صريح): `MarkEmployeeAbsencesAction:45-72` · `LogAuditTrail:87` · `AttendanceCalculationService` | استثناءات: `CalendarGenerationService:297,309,319,324,328` بحث بالـid بلا فلتر مستأجر (دفاع بالعمق مفقود)، و`BiometricDevice::findByPlainToken:82` عابر بالتصميم (مقبول) |
| 🔴 جدول `roles` بلا `tenant_id` | ❌ لا | (أعلاه) | التسرّب الوحيد ذو الأثر الفوري والواسع |

---

## 3. المقارنة مع نظامنا

| القدرة | عندهم (Laravel) | عندنا (NestJS) | الأنضج |
|---|---|---|---|
| عدد الصلاحيات المفردة | ~138، مجمّعة، مع اختبارات ratchet لكل مسار | 40 (`api/src/auth/permissions.ts:8-59`) | **هم** — بفارق كبير في الحبيبية والضمانات |
| صلاحيات على مستوى الحقل (راتب/PII) | ✅ `SensitiveFields` + `ProtectsSensitiveFields` — حجب عند التسلسل + تجريد على الكتابة | ❌ لا يوجد نظير مركزي | **هم** |
| إنشاء أدوار مخصّصة | ❌ لا endpoint إطلاقاً | ✅ `roles.controller.ts:108-154` — إنشاء/تعديل، حماية `*`، منع تعطيل الأدوار الأساسية | **نحن** |
| تجاوزات لكل مستخدم (GRANT/REVOKE) | ❌ لا واجهة (Spatie يدعمها ولا شاشة/مسار) | ✅ `UserPermissionOverride` + `PUT /users/:id/permissions` مع منع GRANT+REVOKE لنفس المفتاح | **نحن** |
| نطاق البيانات | ✅ `roles.scope_level` (self/team/branch/global) + تقاطع مع الفروع المسندة | ⚠️ `branchScopeOf()` — فرع واحد أو الكل، لا مستوى فريق/ذات | **هم** |
| إبطال الجلسة عند تغيير الصلاحية | ✅ `PermissionSyncService` — دقيق (يفحص `can()` لا فرق القوائم) | ✅ `tokenVersion` (`user.entity.ts:43`) + `jwt.strategy.ts:34` | تعادل — منطقهم أذكى، آليتنا أبسط وأشمل |
| **إبطال الجلسة عند تعطيل الحساب** | ❌ الجلسة تبقى حيّة | ✅ `jwt.strategy.ts:31` يفحص `isActive` **كل طلب** + `tokenVersion++` | **نحن** |
| **منع تصعيد الامتيازات** | ❌ أي حامل `users:update` يصنع نفسه super_admin | ✅ `users.controller.ts:146,196-201` — إنشاء/تعديل super_admin لـsuper_admin فقط | **نحن** |
| حدود القيم الحرجة | ❌ `string\|max:255` على كل مفاتيح الرواتب → قسمة على صفر | ✅ `settings.controller.ts:371-381` — `NUMERIC_MIN` بما فيه `payroll.monthly_days:1` و`payroll.daily_hours:1` **تحديداً لمنع القسمة على صفر**، + مفاتيح جديدة ممنوعة إلا من الكود | **نحن** |
| صدق شاشة الإعدادات | ❌ 5 تبويبات بـ«حفظ» كاذب + قوائم ثابتة + تكاملات وهمية «متصل» | ✅ `src/app/settings/page.tsx:207` يصرّح: «قيم فعلية تُحفظ في قاعدة البيانات وتؤثر على الحسابات»، وكل لوحة لها `panelSaving` حقيقي | **نحن** |
| سجل تدقيق | ⚠️ جدول + شاشة + `AuditLogService` غنيّ في الحضور/الاعتمادات — **وصفر تغطية للإعدادات والأدوار والمستخدمين** | ❌ لا يوجد سجل تدقيق إطلاقاً | **هم** (ناقصون، ونحن غائبون) |
| تعدّد المستأجرين | ✅ بنية كاملة (global scope + حارس عابر + خطط/اشتراكات) — بثغرة الأدوار العامة و`exists:` غير المقيّد | ❌ أحادي المستأجر بالتصميم | **هم** (مع تحفّظ) |
| 2FA / LDAP / قفل الحساب | ✅ الثلاثة، ومنطق 2FA ممتاز | ❌ ولا واحد | **هم** |
| سياسة كلمة المرور | ❌ `min:8` فقط، وحقول الشاشة ميتة | ❌ `MinLength(8)` فقط (`users.controller.ts:68`) — لكن بلا شاشة تدّعي غير ذلك | تعادل (نحن أصدق) |
| هرمية الأقسام + وراثة الفرع + حارس الدورات | ✅ `DepartmentService` كامل + `resolveBranchId()` + `isAncestorOrSelf()` | ⚠️ `parentId` موجود (`department.entity.ts:28`) بلا وراثة فرع ولا حارس دورات ظاهر | **هم** |
| مراكز التكلفة / الدرجات / المسميات | ✅ كيانات مستقلة بـCRUD وتصدير | ⚠️ `job_titles/grades/cost_centers` في `assets.entities.ts` عبر `catalogs.controller.ts` (كتالوج عام) | **هم** شكلياً — لكن الدرجات عندهم بحدود رواتب غير مُفعَّلة، فالفارق الوظيفي أصغر مما يبدو |
| جداول عمل مسمّاة تؤثر على الحساب | ❌ `WorkSchedule` مُخزَّن ومُسنَد و**غير مقروء** | ⚠️ لدينا `attendance/shifts` و`weekly-schedule` — مقروءة فعلاً في الحساب | **نحن** (وظيفياً) |

---

## 4. الخلاصة

### هل هذه المديرية جاهزة للتشغيل الحقيقي؟
**البنية الحاكمة: نعم بتحفّظات جدّية. سطح الإعدادات: لا.**

الفصل بينهما حادّ وغير معتاد. طبقة التفويض (`PermissionRegistry` · `SensitiveFields` · `EmployeeScopeService` · `PermissionSyncService` · `TenantResolver`) مبنية بمستوى هندسي عالٍ، موثّقة بتعليقات تشرح **لماذا** لا **ماذا**، ومحمية باختبارات ratchet تمنع الانحدار. لكن شاشة الإعدادات الرئيسية — الواجهة الأولى التي يراها كل عميل جديد — تحتوي على خمسة تبويبات كاملة بأزرار حفظ **كاذبة**، وقوائم بيانات مُختلقة، وحالة تكاملات مزوّرة. وبين الطرفين طبقة كاملة من إعدادات تُحفظ بأمانة ولا يقرأها أحد.

نمط متكرّر واضح: **التحصين يُطبَّق حيث يوجد اختبار، ولا يُنقل إلى ما جاوره.** `Rule::exists()->where('tenant_id')` مطبّق في `Employee` مع تعليق يشرح الخطر، وغائب تماماً عن `Setting` — الموديول الذي يعرّف الهيكل الذي يُنطَق به كل نطاق. `LogAuditTrail` مُلحق بكل مسار تصدير (لوجود ratchet) وغائب عن كل مسار يغيّر دوراً أو مستخدماً أو إعداداً.

### أخطر ثلاث نقاط

**🔴 1 — الأدوار مشتركة بين كل المستأجرين**
`create_permission_tables.php:37-51` ينشئ `roles` بـ`unique(['name','guard_name'])` بلا `tenant_id`، و`config/permission.php:134` يعطّل ميزة teams. أدمن أي مستأجر يملك `settings:roles:manage` يفتح `/settings/roles`، يعدّل `hr_manager` — فيتغيّر الدور لدى **كل مستأجري المنصّة**، و`PermissionSyncService::onRolePermissionsChanged` يمسح كاش الجميع ويُخرج مستخدمي مستأجرين لا علاقة لهم. هذا نقض لأساس الـSaaS متعدد المستأجرين من داخل الشاشة المخصّصة لإدارته، ولا يوجد اختبار يكشفه لأن كل اختبارات التفويض تعمل بمستأجر واحد.

**🔴 2 — إعدادات تشغيلية كاذبة تُفسد قرارات المشغّل**
`SettingsHomePageContent.tsx:602,750,899,1045,1106` — خمسة أزرار «حفظ» لا تفعل شيئاً سوى `showToast('تم الحفظ بنجاح')`. المشغّل يضبط سقف GOSI 45000 ونسبة 9.75% ودورة الراتب وفترة السماح وسياسة كلمة المرور، يرى تأكيد النجاح، ويبني عليه. ويتضاعف الضرر بأن نفس الإعدادات موجودة **فعلاً** في شاشات أخرى حقيقية (`/payroll/gosi`، `/settings/attendance-rules`) — فالمشغّل يظن أنه ضبطها ولن يعود إليها. وإلى جانبها: تبويب «الإجازات» يعرض استحقاقات ثابتة داخل JSX لا صلة لها بجدول `leave_types`، وتبويب «التكاملات» يعلن GOSI و«مُدد» **«متصل»** بينما لا يوجد في الباك أي تكامل معهما — فقط تصدير ملف WPS.

**🔴 3 — إعدادات مُخزَّنة وغير مستهلكة تُنتج حسابات خاطئة بصمت**
ثلاثة أمثلة متراكمة في نفس المسار:
- `WorkSchedule` — شاشة كاملة + CRUD + `employees.work_schedule_id`، ولا يقرأه `AttendanceCalculationService` إطلاقاً (`:104-152`). الموظف المسند لـ«وردية ليلية 22:00-06:00» يُحاسَب على دوام الشركة الافتراضي → تأخير وغياب وأوفرتايم وخصومات كلها خاطئة، ولا رسالة خطأ واحدة. ويزيدها سوءاً أن `employeeCount` في الواجهة ثابت `0` (`useWorkDays.ts:58`) فحارس الحذف `if (schedule.employeeCount > 0)` (`:218`) كود ميت — يُحذف جدول مرتبط بمئات الموظفين بلا تحذير.
- `company_infos.timezone` — يُحفظ (Asia/Riyadh افتراضياً في الواجهة) ولا يُقرأ، و`config/app.php:68` يثبّت `'timezone' => 'UTC'` بلا `env()`. كل ختم زمني بفارق 3 ساعات عن الواقع → حدود يوم الحضور وحدود فترة المسير مزاحة.
- `payroll_formulas` — `UpdatePayrollFormulaRequest.php:14` يقبل أي نص، و`PayrollCalculationService.php:85` يقسم عليه مباشرة. `daily_salary_divisor = 0` يفجّر المسير بالكامل. عندنا هذه الحالة بالذات محميّة صراحةً (`settings.controller.ts:379-380`: «مقسوم عليه — لا يكون صفراً»).

### ثلاث نقاط أدنى في الخطورة تستحق التسجيل
- **🟠 تصعيد الامتيازات**: `UserController.php:166-187` بلا فحص رتبة الفاعل — حامل `users:update` يجعل نفسه `super_admin` (عندنا محمي: `users.controller.ts:146,196-201`).
- **🟠 التعطيل لا ينهي الجلسة**: `is_active` يُفحص عند الدخول فقط (`AuthService.php:44`)، بلا middleware وبلا حذف توكنات — بينما تقليل صلاحية واحدة يُخرج المستخدم فوراً. تناقض أمني داخلي.
- **🟠 صفر تدقيق على طبقة الحُكم**: لا سطر في `audit_logs` لتغيير دور أو صلاحية أو نطاق أو مستخدم أو أي إعداد — بينما تعديل وردية واحدة يُسجَّل بالتفصيل.

### ما يستحق أن نأخذه عنهم
1. `SensitiveFields` + `ProtectsSensitiveFields` — الحجب عند التسلسل مع تماثل قراءة/كتابة مفروض بقائمة واحدة. أنظف من أي شيء عندنا.
2. `roles.scope_level` كخاصية للدور بدل استنتاج النطاق من أسماء أدوار مثبّتة — وقراءة تعليق المهاجرة `2026_08_08_000015` تشرح العيب الذي أصلحته بدقة.
3. اختبارات الـratchet (`RouteCoverageTest` · `OrphanPermissionTest`) التي تجعل «كل مسار مُعدِّل محمي في جدول المسارات» ضماناً لا عرفاً.

---

# مديرية ٣ — الموظفون

# تقرير مراجعة مديرية «الموظفون» — نظام الشريك (Laravel + React) مقابل نظامنا

---

## ١) دورة الحياة — المسار الكامل ونقاط الانقطاع

```
[التعيين]
شاشة add (wizard 5 خطوات)
  → buildCreateEmployeeBody  (addEmployeeApiSchema.ts:351)
  → POST /employees → StoreEmployeeRequest (~70 حقل) → guardSensitiveFields → enforceWritableBranch
  → EmployeeService::persist (EmployeeService.php:198)
        ├─ Employee::create
        ├─ EmployeeContract::create  (لو contract_type مُرسَل)          ✅
        ├─ syncPayrollAllowances → employee_allowances (يقرأها المسير) ✅
        └─ LeaveBalanceService::initializeForEmployee                  ✅ (سنوي فقط)
  → ثم من الواجهة: uploadPhoto · uploadEmployeeDocuments · saveEmployeeQualifications
                                                       (خارج المعاملة — فشلها = Toast تحذيري فقط) ⚠️
  ✗ لا يُنشأ حساب دخول (خطوة يدوية منفصلة من بطاقة EmployeeUserLinkCard) 
  ✗ sick_leave_days / emergency_leave_days تُحفظ ولا تُقرأ أبداً        ❌
  ✗ salary_cycle تُحفظ ولا تُقرأ أبداً                                  ❌

[فترة التجربة]
status='probation' (قيمة فقط) + probation_end_date + probation_months
  → القارئ الوحيد: LeaveBalanceService::accrueForEmployee (بوابة بدء الاستحقاق) ✅
  ✗ لا انتقال آلي probation→active · لا Command · لا تنبيه                ❌ انقطاع
  ✗ probation_end_date لا يُعرض في أي شاشة عرض (buildEmployeeProfile لا يُخرّجه) ❌ انقطاع

[العقود]
كيان مستقل employee_contracts ✅ · renew / terminate / expiring ✅
  ✗ RenewContractAction لا ينسخ contract_number/duration_months/notice_period_days → تضيع ❌
  ✗ التجديد يبدأ من now() لا من نهاية العقد السابق → فجوة/قفزة في السلسلة ❌
  ✗ راتب/بدلات التجديد تُكتب على العقد ولا تُنقل لـ employees.basic_salary
     ← والمسير يقرأ employees.basic_salary فقط → «تجديد بزيادة» لا يزيد الراتب فعلياً 🔴
  ✗ status='expired' لا يُكتب أبداً في قاعدة البيانات؛ «منتهي» اشتقاق واجهة فقط
     ← العقد المنتهي يبقى active إلى الأبد، و activeContract يستمر يعيده        🔴
  ✗ لا شيء يحدث عند انتهاء العقد دون تجديد: لا إيقاف، لا تنبيه، لا Command      🔴

[الوثائق والمؤهلات]
5 قوائم مؤهلات (education/certifications/skills/languages/experiences) + وحدة Document مستقلة ✅
  ✗ employee_certifications.expiry_date تُخزَّن ولا يقرأها أي كود (لا فلترة ولا تذكير) ❌
  ✗ passport_expiry: تُخزَّن وتُصدَّر ولا تدخل أي منطق انتهاء/تنبيه              ❌

[التعديلات والنقل]
تعديل مباشر بـ PUT /employees (بلا تاريخ سريان وبلا سجل) 
+ طلبات موافقة: promotion / salary_increase / termination / resignation (Listeners) ✅
  ✗ لا نقل بتاريخ سريان داخل مديرية الموظفين (النقل بين الفرق موجود في وحدة الحضور)
  ✗ ApplyPromotion لا يكتب سجلاً وظيفياً ولا حارس idempotency                 ⚠️
  ✗ طلب تصحيح البيانات يشمل iban/bank_name ويُطبَّق بـ update() مباشرة
     ← يتجاوز guardSensitiveFields وبلا فحص صيغة IBAN وبلا مسار أمني            🔴

[الإيقاف/الإنهاء/الأرشفة]
مساران متوازيان لا يلتقيان:
 (أ) عبر الموافقات → OffboardingService: notice_period → إخلاء طرف → تصفية → finalize → archived + سجل حالات ✅
 (ب) زر «إنهاء الخدمة» في الملف → معالج 5 خطوات → archive() فقط 
     ← lastWorkDay (حقل إلزامي في المعالج!) لا يُحفظ · لا إنهاء عقد · لا توليد تصفية · لا سجل حالة 🔴
 Suspend/Reactivate/Archive/Restore لا تكتب EmployeeStatusHistory (فقط OffboardingService يكتبه) ❌
 لا يوجد أصلاً endpoint لقراءة السجل الوظيفي، ولا شاشة تعرضه                      ❌

[المالية على الموظف → المسير]
basic_salary → PayrollCalculationService:84 ✅
allowances(JSON) → employee_allowances → AllowanceService ✅ (فقط عبر مسار الموظف، لا مسار العقد)
payment_method / preferred_cash_amount ✅ · gosi_* ✅
salary_cycle ❌ صفر قراء · iban/bank_name → تقارير الصرف ✅

[الصلاحيات]
employees:salary:read/update · employees:pii:read مطبَّقة في Resource + Controller + Export ✅ (أنضج ما في المديرية)
  ✗ ثقوب: import · org-chart · contracts/expiring · طلبات تصحيح البيانات — كلها بلا نطاق أو بلا بوابة 🔴
```

---

## ٢) جدول التقييم

| # | البند | يؤدي غرضه؟ | الدليل | الملاحظة |
|---|---|---|---|---|
| 1 | حفظ حقول التعيين (~70 حقلاً) | ✅ | `hr/app/Modules/Employee/Requests/StoreEmployeeRequest.php:19-152` · `hr-dashboard/.../add/addEmployeeApiSchema.ts:351-482` | تغطية ممتازة؛ كل حقل مُجمَّع له عمود وقاعدة تحقق |
| 2 | إنشاء عقد عند التعيين | ✅ | `Services/EmployeeService.php:203-220` | اختياري، ويُملأ من راتب/بدلات الموظف |
| 3 | بذر أرصدة الإجازات | ⚠️ | `Services/EmployeeService.php:230-231` · `Leave/Services/LeaveBalanceService.php:56-88` | السنوي فقط يحترم قيمة الموظف؛ **`sick_leave_days` و`emergency_leave_days` تُجمع وتُخزَّن ولا تُقرأ في أي مكان** |
| 4 | `salary_cycle` (شهري/نصف شهري/أسبوعي) | ❌ | صفر قراء خارج CRUD الموظف؛ المسير شهري فقط | حقل مُفعَّل بصرياً وميت وظيفياً |
| 5 | إنشاء حساب دخول عند التعيين | ❌ | `hr-dashboard/.../_id/EmployeeUserLinkCard.tsx:100-118` | خطوة يدوية منفصلة تماماً؛ لا شيء في المعالج يذكّر بها |
| 6 | رفع الصور/المستندات/المؤهلات | ⚠️ | `hr-dashboard/.../add/useEmployeeWizard.ts:600-635` | خارج معاملة الإنشاء؛ الفشل = «تعذّر حفظ N من المؤهلات» فقط، والموظف مُنشأ ناقصاً |
| 7 | انتقال آلي probation → active | ❌ | لا شيء في `hr/routes/console.php:20-45` · صفر مطابقات لانتقال probation | حالة نصية فقط |
| 8 | تنبيه قبل انتهاء فترة التجربة | ❌ | لا Notification ولا Command | — |
| 9 | عرض بيانات فترة التجربة في الملف | ❌ | `hr-dashboard/.../_id/employeeProfileModel.ts:150-224` (لا probation) · `EmployeeEmploymentTab.tsx:55-96` | يُدخلها HR ولا يراها أحد بعدها إلا من داخل نموذج التعديل |
| 10 | العقد ككيان مستقل + تجديد/إنهاء | ✅ | `Models/EmployeeContract.php` · `Actions/RenewContractAction.php` · `Actions/TerminateContractAction.php` | نموذج سليم أساساً |
| 11 | ثبات «عقد نشط واحد» | ⚠️ | `Models/EmployeeContract.php:34-51` · تعليق `Employee.php:196-213` | الحارس موجود في 3 مسارات، والتعليق نفسه يقرّ بأن الثبات **غير مفروض** وأن السجلات الحالية قد تخالفه |
| 12 | التجديد يحفظ بيانات العقد كاملة | ❌ | `Actions/RenewContractAction.php:20-31` | `contract_number` و`duration_months` و`notice_period_days` تُفقد → العقد الجديد بلا رقم ولا مهلة إشعار |
| 13 | تسلسل تواريخ التجديد | ❌ | `RenewContractAction.php:24` `'start_date' => now()` | التجديد قبل الانتهاء يُلغي المدة المتبقية فوراً (القديم → `renewed` في نفس اللحظة) |
| 14 | أثر تجديد/تعديل العقد على المسير | ❌ 🔴 | `RenewContractAction.php:26` مقابل `Payroll/Services/PayrollCalculationService.php:84` و`Payroll/Actions/CalculatePayrollAction.php:54` | المسير يقرأ `employees.basic_salary` حصراً. المزامنة أحادية الاتجاه (موظف→عقد) في `EmployeeService.php:307-339`. **تجديد بزيادة راتب = زيادة تظهر في كل الشاشات والمستندات ولا تُصرف** |
| 15 | كتابة حالة `expired` على العقد | ❌ 🔴 | صفر مطابقات لكتابة `'expired'` في وحدة Employee · الاشتقاق في `contracts/contractsPageModel.ts:91-107` | العقد المنتهي يبقى `active` في قاعدة البيانات إلى الأبد |
| 16 | ماذا يحدث عند انتهاء العقد بلا تجديد | ❌ 🔴 | لا Command · `Services/ContractService.php:105-115` | لا إيقاف، لا إشعار، لا تغيير حالة. `contracts/expiring` تجمع المنتهين مع القادمين ولا يخرجون منها أبداً |
| 17 | نطاق `contracts/expiring` | ❌ | `Controllers/ContractController.php:130-137` (بلا `visibleEmployeeIds`) مقابل `index` في السطر 31 | مستخدم مقيّد بفرع يرى عقود كل الفروع من هذا الـ endpoint |
| 18 | «بدل السكن/النقل» في شاشة العقود | ❌ | `contracts/contractsApiSchema.ts:23-24, 36-37` مقابل `Requests/StoreContractRequest.php:17-29` و`UpdateContractRequest.php:17-28` | الواجهة ترسل `housing_allowance`/`transport_allowance`، والباك لا يعرّفهما → `validated()` يسقطهما بصمت. **حقول تُجمع ولا تُحفظ** |
| 19 | «عدد التجديدات / آخر تجديد / البدلات» في تفاصيل العقد | ❌ | `contractsPageModel.ts:140-143` تقرأ `row.renewal_count` و`row.last_renewal_date` و`row.housing_allowance` — و`Resources/ContractResource.php:19-43` لا يُخرج أياً منها | **شاشة تعرض ثوابت**: دائماً 0 و«—» |
| 20 | إنشاء عقد غير محدد المدة من شاشة العقود | ❌ | `contractsPageModel.ts:70-72` (خيار واحد فقط) + `contractsApiSchema.ts:8` (نهاية إلزامية) | قائمة «نوع العقد» ذات خيار واحد = عنصر ميت؛ غير محدد المدة يُنشأ من معالج التعيين فقط |
| 21 | تخزين المؤهلات والخبرات | ✅ | `Controllers/EmployeeQualificationController.php:26-70` · هجرة `2026_06_28_000010` | 5 أنواع، CRUD كامل، بوابة `employees:update\|employees:create` |
| 22 | تتبع انتهاء الشهادات + تذكير | ❌ | `expiry_date` مخزَّن؛ صفر قراء (grep على `expiry_date` لا يُظهر أي استخدام في وحدة Employee) | حقل يبدو موجوداً ولا يفعل شيئاً |
| 23 | تتبع انتهاء الجواز | ❌ | `passport_expiry` في Resource + Export فقط | لا فلتر، لا تنبيه |
| 24 | توليد مستندات من قوالب | ✅ | `_id/useEmployeeProfilePage.ts:92-113` → `documents/generateFromTemplate` (توليد خادمي) | جيد — يقرأ بيانات الشركة الحقيقية |
| 25 | نقل بين فرق/أقسام بتاريخ سريان | ⚠️ | يوجد في `Attendance/Controllers/TeamTransferController.php` + `Console/Commands/ExecuteTeamTransfersCommand.php` — **خارج مديرية الموظفين** | تعديل القسم/الفرع من ملف الموظف فوري وبلا تاريخ سريان وبلا سجل |
| 26 | ترقية بموافقة | ⚠️ | `Listeners/ApplyPromotionOnApprovalDecision.php:41-59` | تُطبَّق فعلاً، لكن بلا `recordStatusChange` وبلا حارس idempotency وبلا تاريخ سريان (بعكس listener زيادة الراتب الذي يحترم `effective_date`) |
| 27 | زيادة راتب بموافقة | ✅ | `Listeners/ApplySalaryIncreaseOnApprovalDecision.php:41-75` | idempotent + يرفض التاريخ المستقبلي بسجل واضح + يزامن العقد. أنظف listener في المديرية |
| 28 | طلبات تعديل بيانات بموافقة | ⚠️🔴 | `Controllers/ProfileUpdateRequestController.php:110-127, 129-187` · `Models/ProfileUpdateRequest.php:12-24` | آلية جيدة (diff، إعادة تحقق عند الاعتماد، إشعارات) **لكن**: (أ) لا نطاق فروع إطلاقاً في `index`/`approve`/`reject` — مدير فرع يرى ويعتمد طلبات كل الفروع؛ (ب) `iban`/`bank_name` ضمن الحقول القابلة للتعديل وتُطبَّق بـ `$employee->update()` متجاوزة `guardSensitiveFields`؛ (ج) `assertStillApplicable:267` يتحقق من IBAN بـ `max:34` فقط بلا regex |
| 29 | إيقاف / إعادة تنشيط | ⚠️ | `Actions/SuspendEmployeeAction.php:14-27` · `pages/page.tsx:172-180` | يعمل ويقفل الدخول ويُخرج من المسير والحضور — لكن بلا سجل حالة وبلا سبب مُوثَّق (لا reason) |
| 30 | الأرشفة | ⚠️ | `Actions/ArchiveEmployeeAction.php:13-31` | بوابة إخلاء العهدة ✅ · تعطيل الدخول ✅ · **لا إنهاء عقد · لا `last_working_day` · لا سجل حالة** |
| 31 | معالج «إنهاء الخدمة» (5 خطوات) | ❌ 🔴 | `_id/terminate/page.tsx:215-252` → `proceedArchive` (السطر 200) → `archive(id, reason)` فقط | يجمع `lastWorkDay` (إلزامي!) · `noticeDate` · `noticePeriod` · `exitInterviewDone` · `exitInterviewNotes` → **لا شيء منها يُرسل**. السبب فقط يصل، مدموجاً في نص واحد |
| 32 | `archive_date` في الأرشفة | ❌ | `Requests/ArchiveEmployeeRequest.php:19` يدعمه · `services/employees.service.ts:328` لا يرسله | قدرة خادمية لا تصل إليها أي شاشة |
| 33 | استعادة موظف | ⚠️ | `Actions/RestoreEmployeeAction.php:11-20` | يعيد `status='active'` بلا شروط ولا يمسح `last_working_day`/`termination_reason` → **الموظف المُستعاد لو استقال لاحقاً لن تُفتح له حالة إنهاء خدمة إطلاقاً** (`Listeners/ApplyResignationOnApprovalDecision.php:39` و`ApplyTermination...:36` يتخطيان من عنده `last_working_day`) |
| 34 | الحذف (DELETE) | ⚠️ | `Controllers/EmployeeController.php:190-196` · `archived/useArchivedEmployeesPage.ts:60-73` | Soft delete بلا أي حارس (رواتب/حضور/عقود قائمة)، **وبلا أي مسار استرجاع** — `restore` يستخدم `findOrFail` الذي يستثني المحذوف. والفهرس الفريد يبقى محجوزاً |
| 35 | التصفية النهائية (خادمياً) | ⚠️ | `Services/SettlementService.php:36-97` | كيان مخزَّن + بنود + موافقة + ربط التزامات العهدة ✅ — لكن: مكافأة نهاية الخدمة على **الأساسي فقط** (`:216-234`) وبلا تمييز استقالة/فصل (المادة 85)؛ و`remainingLeaveDays` (`:204-210`) يجمع **كل أنواع الإجازات** فيُصرف بدل نقدي عن رصيد الإجازة المرضية |
| 36 | شاشة التصفية (واجهة) | ❌ 🔴 | `_id/settlement/SettlementPageContent.tsx:118` (اللوحة الحقيقية) + `:275-505` (الحاسبة الوهمية) · `useSettlementPage.ts:95-137, 181-192` | **حاسبة كاملة موازية بمعادلات مختلفة عن الخادم** (المكافأة/الإجازة على الإجمالي÷30، «التأمينات = 10٪ من الأساسي» ثابتة)، وزرّا «اعتماد التصفية» و«تأكيد الصرف» = `setIsApproved(true)` و`alert()` لا يحفظان شيئاً. رقمان صافيان متناقضان على شاشة واحدة |
| 37 | الاستيراد من Excel | ❌ 🔴 | `Controllers/EmployeeImportExportController.php:24-34` · `Imports/EmployeesImport.php:27-38, 70` | (أ) يكتب `basic_salary`/`bank_name`/`iban` **بلا بوابة `employees:salary:update`** — باب خلفي حول `guardSensitiveFields`؛ (ب) بلا `enforceWritableBranch` → الموظفون يدخلون بـ `branch_id = NULL` وهم مرئيون لكل مستخدمي الفروع (`EmployeeScopeService.php:200-210`)؛ (ج) قواعد تحقق مختلفة عن المعالج (هوية 10 أو 14 رقماً فقط، بينما المعالج يقبل 6–20 ويسمح بجواز فقط)؛ (د) بلا قسم/مسمى/فرع/عقد |
| 38 | التصدير | ✅ | `Exports/EmployeesExport.php:36-101` · `Controllers/EmployeeImportExportController.php:51-60` | نموذجي: نفس بوابات `salary:read`/`pii:read`، نفس نطاق السجلات، CSV متدفق، سقف XLSX، تدقيق على POST |
| 39 | الهيكل التنظيمي | ❌ | `Controllers/EmployeeOrgChartController.php:13-28` | **بلا أي نطاق فروع** رغم أن نفس البوابة `employees:read` مقيّدة في `index`. وكذلك: `status='active'` فقط (يُخفي فترة التجربة والموقوفين)، وموظفو `branch_id = NULL` يسقطون من الشجرة بلا أثر |
| 40 | العزل بين المستأجرين والفروع (المسار الأساسي) | ✅ | `Services/EmployeeScopeService.php:80-133, 182-222, 308-328` | تصميم ناضج: `scope_level` على الدور + احتياط بالأسماء + `constraintFor` كـ subquery + `enforceWritableBranch` |
| 41 | حماية الراتب/PII | ✅ | `Core/Authorization/SensitiveFields.php` · `Resources/EmployeeResource.php:35-80` · `Controllers/EmployeeController.php:95-135` | قائمة واحدة للقراءة والكتابة، ورفض 403 صريح بدل الإسقاط الصامت. أقوى نقطة في المديرية |
| 42 | السجل الوظيفي (status history) | ⚠️ | `Models/Employee.php:317-343` · الكُتّاب الوحيدون في `Offboarding/Services/OffboardingService.php:78, 273, 316, 350, 373` | الجدول موجود ويُكتب في مسار واحد فقط، **وبلا endpoint وبلا شاشة تعرضه** (صفر مطابقات في الواجهة) |
| 43 | تعطيل تعديل `status` من نموذج التحرير | ✅ | `AddEmployeeFormContent.tsx:905, 1084` (`!isEdit`) · `UpdateEmployeeRequest.php` بلا قاعدة `status` | مُحكم من الطرفين — لا حقول تسقط بصمت هنا |
| 44 | الخدمة الذاتية `/me/*` | ✅ | `Controllers/SelfServiceController.php:21-77` | ملف + عقد + مستندات + مؤهلات، مع كشف الراتب للمالك عبر `whenCanOrSelf` |
| 45 | مزامنة Active Directory | ✅ | `Controllers/AdSyncController.php:25-74` | بريد + تحويلة + ربط دخول LDAP — قدرة لا نظير لها عندنا |

---

## ٣) المقارنة مع نظامنا

| القدرة | عندهم | عندنا | الأنضج |
|---|---|---|---|
| عدد حقول ملف الموظف | ~70 عموداً + 5 جداول مؤهلات | ~65 عموداً + 5 جداول مؤهلات (`api/src/employees/employee.entity.ts`) | **تعادل** |
| العقد ككيان مستقل | جدول `employee_contracts` + تجديد + إنهاء + سجل | **مسطّح على الموظف** (`contractType/Start/End/Number`) — التجديد PATCH يمسح التواريخ القديمة (`src/app/employees/contracts/page.tsx:213-231`) | **هم** |
| صحة بيانات التجديد | ⚠️ تفقد رقم العقد والمهلة ولا تنقل الراتب للمسير | ❌ لا سجل تجديدات إطلاقاً | **هم** (بعيوبه) |
| كتابة حالة انتهاء العقد | ❌ اشتقاق واجهة فقط | ❌ اشتقاق واجهة فقط | **تعادل — عيب مشترك** |
| صلاحيات حقلية للراتب/PII | ✅ `salary:read/update` + `pii:read` في Resource وController وExport | ❌ **لا شيء** — `employees.view` تكشف `basicSalary`/`iban`/`nationalId`/`gosiBaseSalary` كاملة (`api/src/auth/permissions.ts:10-13`) | **هم بفارق كبير** |
| نطاق الفروع | ✅ `scope_level` على الدور + 4 مستويات + subquery | ⚠️ `branchScopeOf` بفرع واحد فقط (`employees.controller.ts:32`) — لا مستوى «فريق/مدير مباشر» | **هم** |
| تسريبات النطاق | ❌ org-chart · contracts/expiring · طلبات تصحيح البيانات | ✅ لا org-chart خادمي أصلاً؛ المسارات القائمة مُقيّدة | **نحن** |
| فترة التجربة | ❌ حالة + تاريخ بلا انتقال ولا تنبيه ولا عرض | ❌ حالة + تاريخ بلا انتقال ولا تنبيه — **لكن يُعرض في الملف** (`src/app/employees/[id]/page.tsx:1331`) والافتراضي `probation` | **نحن قليلاً** |
| السجل الوظيفي | ⚠️ جدول يُكتب من مسار واحد، بلا endpoint ولا شاشة | ✅ يُكتب من 5 مسارات: ترقية · راتب · نقل · تغيير بنكي · تغيير حالة (`api/src/requests/destinations.service.ts:262-410`) | **نحن** |
| النقل بتاريخ سريان | ⚠️ موجود في وحدة الحضور، خارج مديرية الموظفين | ✅ `transferHandler` + جدولة يومية + سجل (`destinations.service.ts:281-335`) | **نحن** |
| تغيير الحساب البنكي | ❌ ضمن «طلب تصحيح بيانات» عام بلا مسار أمني ومتجاوزاً بوابة الراتب | ✅ `bankChangeHandler` — مسار أمني مستقل + سجل (`destinations.service.ts:395-410`) | **نحن بفارق كبير** |
| إنهاء الخدمة | 🔴 مساران متناقضان؛ المسار المرئي (زر الملف) يفقد كل ما جمعه | ✅ مسار واحد: استقالة معتمدة → `notice_period` → إخلاء طرف → تصفية → `finalize` بحلول الموعد | **نحن** |
| بناء التصفية | ⚠️ الأساسي فقط · بلا تمييز سبب الإنهاء · يصرف بدلاً عن الإجازة المرضية | ✅ الإجمالي (أساسي+بدلات) · معامل قابل للإعداد · **الاستحقاق المتراكم لتاريخه** · أوفرتايم غير مصروف · أقساط السلف (`api/src/offboarding/offboarding.service.ts:217-340`) | **نحن بفارق كبير** |
| شاشة التصفية | 🔴 حاسبة وهمية بمعادلات مختلفة بجانب اللوحة الحقيقية | ✅ مربوطة بالخادم | **نحن** |
| بذر أرصدة الإجازات عند التعيين | ✅ + استحقاق سنوي مخصّص + تراكم شهري/يومي/سنوي + ترحيل مُحكم | ✅ + **رصيد افتتاحي مُرحَّل بتاريخ انتهاء** (`employees.service.ts:219-236`) | **تعادل** (هم أعمق في التراكم، نحن أعمق في الأرصدة الافتتاحية) |
| أرصدة مرضي/اضطراري مخصّصة للموظف | ❌ تُجمع وتُهمل | ⚠️ ثابت 180 يوماً للمرضي من الإعدادات | **تعادل — كلاهما ناقص** |
| استيراد/تصدير الموظفين | ✅ تصدير نموذجي (بوابات + نطاق + CSV متدفق) · ❌ استيراد بثغرة صلاحيات | ❌ **غير موجود** | **هم (التصدير)** |
| طلبات تصحيح البيانات الذاتية | ✅ آلية كاملة بـ diff وإشعارات (بعيوب النطاق والـ IBAN) | ⚠️ `employeeRecordHandler` — 3 حقول فقط (phone/email/bankName) | **هم** |
| الخدمة الذاتية `/me/*` | ✅ ملف/عقد/مستندات/مؤهلات | ❌ `auth/me` فقط | **هم** |
| مزامنة Active Directory | ✅ | ❌ | **هم** |
| الهيكل التنظيمي | ⚠️ endpoint خادمي بلا نطاق | ⚠️ اشتقاق واجهة من قائمة الموظفين (`src/app/employees/org-chart/page.tsx`) | **تعادل** |
| صور الموظفين | ✅ رفع/حذف + تنظيف الملف القديم | ✅ عبر `photoFileId` + `/files/upload` | **تعادل** |
| تعدد المستأجرين | ✅ | ❌ أحادي المستأجر | **هم** (بحسب نموذج العمل) |

---

## ٤) الخلاصة

**هل هذه المديرية جاهزة للتشغيل الحقيقي؟ — لا، ليس كما هي.**

البنية التحتية للمديرية ناضجة بشكل لافت: نموذج بيانات غني ومُتحقَّق منه، عزل مستأجر/فرع مُهندس بعناية (`EmployeeScopeService`)، صلاحيات حقلية للراتب والهوية مطبَّقة في القراءة والكتابة والتصدير معاً، وتصدير Excel/CSV نموذجي. لكن **الطبقة التي تحوّل هذه البنية إلى دورة عمل مكتملة مفقودة أو مكسورة في ثلاث نقاط تمسّ المال والامتثال مباشرة**، وفوقها ثقوب نطاق في أربع نقاط تلتفّ حول العزل الذي بُني بعناية في مكان آخر.

المديرية اليوم = **ملف موظف ممتاز + دورة حياة نصف مكتملة**. القراءة والبحث والتصدير جاهزة للإنتاج. التعيين جاهز. أما العقود وإنهاء الخدمة والتصفية فتحتاج عملاً حقيقياً قبل أي تشغيل.

### أخطر ثلاث نقاط

**🔴 ١ — العقد منفصل عن المال والزمن معاً.**
`RenewContractAction.php:26` يكتب الراتب الجديد على العقد، والمسير يقرأ `employees.basic_salary` حصراً (`PayrollCalculationService.php:84`) والمزامنة أحادية الاتجاه (`EmployeeService.php:307-339`). النتيجة: **تجديد عقد بزيادة راتب يظهر في الملف وفي شاشة العقود وفي كل مستند مُولَّد — ولا يُصرف**. ويضاعف الضرر أن حالة `expired` لا تُكتب أبداً، فالعقد المنتهي منذ سنتين ما زال `active` ويعود من `activeContract()` كأنه ساري، ولا Command ولا تنبيه ولا أي أثر لانقضاء المدة. مع فقد `contract_number` و`notice_period_days` عند كل تجديد، السجل التعاقدي غير صالح للاحتجاج به.

**🔴 ٢ — مساران متناقضان لإنهاء الخدمة، والمرئي منهما يفقد ما جمعه.**
معالج «إنهاء الخدمة» ذو الخمس خطوات (`terminate/page.tsx`) يفرض إدخال آخر يوم عمل ويجمع تاريخ الإشعار ومدته ومقابلة الخروج وملاحظاتها — ثم `handleSubmit:215-252` ينادي `archive(id, reason)` **فقط**. لا `last_working_day`، لا إنهاء عقد، لا توليد تصفية، لا سجل حالة. والأثر تسلسلي: `last_working_day` الفارغ يجعل `SettlementService:66-68` يحسب المكافأة حتى **اليوم** لا حتى آخر يوم عمل. وفي المقابل يوجد مسار ثانٍ سليم تماماً عبر الموافقات (`OffboardingService`) لا يعرف عنه هذا الزر شيئاً. وعلى شاشة التصفية نفسها تتعايش لوحة خادمية حقيقية مع **حاسبة وهمية بمعادلات مختلفة** وزرّي اعتماد وصرف لا يحفظان شيئاً (`useSettlementPage.ts:181-192`) — رقمان صافيان متناقضان أمام المستخدم في آنٍ واحد.

**🔴 ٣ — أربعة ثقوب تلتفّ حول نظام الصلاحيات المبني بعناية.**
(أ) **الاستيراد** (`EmployeeImportExportController.php:24-34`) يكتب `basic_salary` و`iban` بلا بوابة `employees:salary:update` وبلا `enforceWritableBranch` — باب خلفي كامل حول `guardSensitiveFields`، والموظفون يدخلون بـ `branch_id = NULL` فيصيرون مرئيين لكل مستخدمي الفروع. (ب) **طلبات تصحيح البيانات** (`ProfileUpdateRequestController.php:110-187`) بلا أي نطاق فروع في العرض والاعتماد والرفض، وتشمل `iban`/`bank_name` وتُطبَّق بـ `update()` مباشرة بلا بوابة راتب وبلا فحص صيغة IBAN — **مسار كامل لإعادة توجيه راتب موظف إلى حساب آخر بموافقة مدير فرع لا يملك أصلاً صلاحية رؤية بياناته المالية**. (ج) `contracts/expiring` بلا نطاق بينما `contracts` مُقيّدة. (د) `org-chart` بلا نطاق إطلاقاً.

**ملاحظة موازية جديرة بالتوثيق:** المديرية بها طبقة معتبرة من **الحقول التي تُجمع وتُخزَّن ولا تُقرأ**: `salary_cycle` · `sick_leave_days` · `emergency_leave_days` · `certifications.expiry_date` · `passport_expiry` · `actual_start_date` — وحقلان يُجمعان ولا يُحفظان أصلاً (`housing_allowance`/`transport_allowance` في شاشة العقود) — وثلاثة حقول تُعرض كثوابت دائمة (عدد التجديدات، آخر تجديد، بدلات العقد). لا شيء منها يوقف التشغيل، لكنها مجتمعة تصنع انطباعاً كاذباً بالاكتمال يقود إلى قرارات تشغيلية خاطئة.

---

# مديرية ٤ — الحضور والانصراف

# مديرية الحضور والانصراف — تدقيق دورة الحياة الكاملة (نظام الشريك)

نطاق التدقيق: `hr/app/Modules/Attendance` (158 ملف · ~9.7 ألف سطر خدمات/تحكم) + `hr-dashboard/src/features/attendance` (23 شاشة · ~8.9 ألف سطر) — مقابل `api/src/attendance` (2.3 ألف سطر) و`src/app/attendance` عندنا.

---

## 1) دورة الحياة — المسار الكامل ونقاط الانقطاع

```
[أ] مصدر البصمة
    ZKTeco ── TCP:4370 (أساسي) ─┐
              UDP:4370 (احتياطي)┤→ ZKTecoClient::getAttendance()
                                 │   يفك 40-byte/16-byte، يسقط التواريخ غير المعقولة
    وكيل محلي ── POST attendance/punches (X-Device-Token مُجزّأ) ─┐
                                                                  │
    خدمة ذاتية ── POST me/attendance/check-in|check-out ───────────┤
    إدخال يدوي ── POST attendance/manual-entry ────────────────────┤
                                                                  ▼
                       ✗✗ لا يوجد جدول «بصمات خام» إطلاقاً ✗✗
                       الـ logs تُجمَّع في الذاكرة ثم تُهدَر
                                     │
    [جدولة] Schedule::command('biometric:sync')->everyThirtyMinutes()
             نافذة تزايدية = last_sync_at − يومين
                                     ▼
[ب] التجميع  writeGroupedLogs()   BiometricSyncService:401
    grouped[deviceUserId][YYYY-MM-DD][] ← substr(ts,0,10)
    أول بصمة = check_in · آخر بصمة = check_out (>1 فقط)   :446
    ✗ نقطة انقطاع #1 — التجميع بالتاريخ التقويمي فقط. is_overnight
      غير مُستشار هنا إطلاقاً ⇒ الوردية الليلية تنكسر (تفصيل أدناه)
    ✗ نقطة انقطاع #2 — punchType() (in/out/overtime-in/out) يُفَكّ لكل
      سجل ثم يُهمَل تماماً؛ لا شيء يقرأ 'type'
                                     ▼
[ج] حسم جدول اليوم  resolveScheduleFor()   AttendanceCalculationService:69
    if (mode == published):  ← AttendanceConfiguration.consumption_mode
        استثناء (دائماً أولاً) → PublishedScheduleReader::dayFor()
        فجوة تغطية → Log 'published_divergence' → سقوط للسلسلة القديمة
    legacy (الافتراضي):
        1. ScheduleException (أولوية ثم تخصّص scope)
        2. ScheduleAssignment المؤرّخ (employee>team>dept-chain>branch>company)
        3. WeeklyScheduleEntry لكل موظف
        4. WorkDay على مستوى الـtenant
    ✗ نقطة انقطاع #3 — الخطوة 2: إن كان القيد is_off_day فالمحرك **يسقط**
      إلى 3 ثم 4 ويعيد نافذة دوام من WorkDay. بينما isScheduledWorkingDay()
      يُرجع false لنفس اليوم. أوراكلان متضاربان لنفس التاريخ.
                                     ▼
[د] الحساب اليومي  computeDerivedFields()   :430
    late_minutes/late_deduction_tier (LatenessTierService، شرائح قابلة للتحرير)
    early_departure_minutes | shortfall_minutes (FX-07) | raw_lateness_minutes
    applied_flex_window_minutes (FX-05) | total_work_minutes − break
    calculation_profile ← يُثبَّت على الصف فلا يُعاد كتابة التاريخ
    ✗ نقطة انقطاع #4 — الأذونات: فقط kind='late_arrival' يزحزح خط الأساس :551
      إذن exit_return (الخروج أثناء الدوام) بلا أي أثر على الحساب
                                     ▼
[هـ] الكتابة  updateOrCreate([tenant,employee,date])   :506
    is_manual_entry ← false  (يُصفَّر دائماً)   :491
    ✗✗ نقطة انقطاع #5 (الأخطر) — لا يُفحص is_manual_entry ولا وجود تصحيح
      معتمد. «البصمة مرجع» تعني أن أي مزامنة لاحقة تدهس التصحيح المعتمد
                                     ▼
[و] الأوفرتايم  syncAutoOvertime()   :790
    كشف تلقائي فقط من فارق check_out − scheduled_end
    نافذة OvertimePeriodService::isOpen() · حد أدنى overtime_min_minutes
    ✗ نقطة انقطاع #6 — لا مسار «طلب موظف» إطلاقاً (لا route لـ me/overtime)
                                     ▼
[ز] ترحيل الغياب  attendance:mark-absent  يومياً 01:00
    لكل tenant: يوم عمل مجدول + لا صف + لا إجازة معتمدة ⇒ صف 'absent'
    (أو 'holiday' لو اليوم عطلة رسمية)
    ✗ نقطة انقطاع #7 — الأمر لا يربط current_tenant (تسريب بين المستأجرين)
    ✗ نقطة انقطاع #8 — يوم الإجازة المعتمدة **لا يُكتب له صف** ⇒ لا شيء
      يكتب status='on_leave' في النظام كله
                                     ▼
[ح] التقارير  AttendanceReportService
    monthlyEmployeeDetail: يوم بلا صف وليس off ⇒ 'absent'  :149
    ✗✗ نقطة انقطاع #9 — لذلك يوم الإجازة المعتمدة يظهر «غياب» في تقرير
      الموظف الشهري وفي شاشة «حضوري» للموظف نفسه، وleave_days = 0 دائماً
                                     ▼
[ط] الرواتب  PayrollCalculationService
    late_deduction_tier → خصم بالشريحة              ✅ مُستهلك
    early_departure + COALESCE(shortfall) → خصم زمني ✅ مُستهلك (opt-in)
    OvertimeRecord status='approved' → أجر إضافي     ✅ مُستهلك
    ExitPermit.deduction_minutes (غير مُعفى) → خصم    ✅ مُستهلك
    ✗✗ نقطة انقطاع #10 — calculateAbsenceDeductions() :803 يقرأ
      **إجازات بدون أجر فقط**. صفوف status='absent' لا تدخل المسير أبداً.
      الغياب بلا عذر = صفر ريال خصماً.
```

---

## 2) جدول التقييم

| # | البند | يؤدي غرضه؟ | الدليل | الملاحظة |
|---|---|---|---|---|
| 1 | سحب ZKTeco (TCP/UDP، فك 40/16 بايت، فحص اكتمال، حارس تواريخ) | ✅ | `Services/ZKTecoClient.php:1-120,240-330` | 🟢 أنضج ما في المديرية. تشخيص ميداني موثَّق بأرقام حقيقية (فقدان UDP 2.54% ⇒ إزاحة محاذاة ⇒ بيانات مُلفَّقة) + سقف ذاكرة + مهلات |
| 2 | مسار push للمواقع المحجوبة (وكيل + توكن مُجزّأ) | ✅ | `Controllers/PunchIngestController.php` | throttle:60,1 · حد 5000 بصمة |
| 3 | حفظ البصمة الخام | ❌ | لا جدول punches في أي migration؛ `BiometricSyncService::writeGroupedLogs` يكتب `AttendanceRecord` فقط | 🔴 اللقطة الخام تُهدَر. إعادة الحساب بعد إصلاح جدول ممكنة فقط بإعادة السحب من الجهاز — وطالما الجهاز ما زال يحتفظ بالتاريخ |
| 4 | **الوردية الليلية** | ❌ | `BiometricSyncService.php:401,446` مقابل `AttendanceCalculationService.php:630,819` | 🔴 الحساب يدعم `is_overnight` بالكامل، والتجميع لا يعرفه. وردية 22:00→06:00 تنتج **صفّين** كلٌّ ببصمة واحدة وcheck_out=NULL ⇒ `total_work_minutes=NULL`، لا انصراف مبكر، لا أوفرتايم. عامل الليل يختفي من الرواتب |
| 5 | **صمود تصحيح البصمة أمام المزامنة** | ❌ | `PunchCorrectionService.php:244` يكتب `is_manual_entry=true`؛ `BiometricSyncService.php:491,506` يكتب `false` ويستبدل بـ`updateOrCreate` بلا أي فحص | 🔴 grep على `is_manual_entry` في كل التطبيق: 3 كتّاب و**صفر قرّاء** (خارج التصدير/العرض). نافذة المزامنة = يومان والدورة كل 30 دقيقة ⇒ التصحيح المعتمد أمس يُمحى خلال نصف ساعة. الطلب يبقى `applied` وrecalc_result يعرض القيم المصحَّحة بينما الصف الفعلي رجع للبصمة |
| 6 | **خصم الغياب في المسير** | ❌ | `PayrollCalculationService.php:803-838` | 🔴 `calculateAbsenceDeductions` يقرأ `LeaveRequest` غير المدفوعة فقط؛ لا استعلام على `attendance_records.status='absent'`. البند يُسمّى `absence_deductions` ويُطبع «Unpaid leave (N days)». `absence_penalty_days` (وصفه: «أيام تُخصم لكل يوم غياب بلا عذر») يُضرب في أيام الإجازة بدون أجر. Docblock الأكشن يعترف: "Does NOT change payroll" |
| 7 | **status='on_leave'** | ❌ | enum في `2026_04_15_000001:64`؛ يُقرأ في `AttendanceReportService:127,203,264` و`DashboardService:183` — و**لا كاتب واحد** (5 مسارات كتابة، كلها present/absent/holiday) | 🔴 `leave_days` = 0 هيكلياً، و«في إجازة اليوم» في اللوحة = 0 دائماً |
| 8 | **الإجازة المعتمدة في التقرير الشهري** | ❌ | `MarkEmployeeAbsencesAction` يتخطّى يوم الإجازة بلا صف؛ `AttendanceReportService.php:149-150` يصنّف يوماً بلا صف وغير off ⇒ `absent` | 🔴 موظف في إجازة سنوية معتمدة يظهر **غائباً** في تقريره الشهري وفي شاشته الذاتية `my-monthly` |
| 9 | ترحيل الغياب — العزل بين المستأجرين | ❌ | `MarkAbsentCommand.php:30` (`Tenant::all()` بلا `app()->instance('current_tenant')`) → `ScheduleAssignmentService.php:131` (`ScheduleAssignment::query()` بلا tenant صريح) + `BelongsToTenant` يصير no-op عند tenant=null | 🔴 الكرون يحمّل تخصيصات الجداول من **كل المستأجرين**؛ و`ScopeResolver::resolve` يفهرس بـ`scope_type:scope_id` فقط، فمفتاح `company:` يُدهس بآخر مستأجر. النتيجة: غياب يُرحَّل/يُتخطّى بجدول شركة أخرى. الفريق يعرف الفخّ — `GenerateSchedulesCommand.php:44` يربط الـtenant صراحةً ويعلّق عليه؛ أمر الغياب فقط نسيه |
| 10 | حسم جدول اليوم — تناسق الأوراكل | ⚠️ | `AttendanceCalculationService.php:115-152` (سقوط عند `is_off_day`) مقابل `:243-252` (`isScheduledWorkingDay` يحترمه) | 🟠 يوم مُعلَّم «راحة» على مستوى القسم: الكرون لا يُغيّبه، لكن لو بصم فيه يُحاسَب على نافذة WorkDay. موثَّق كـ"legacy quirk" ولم يُصلَح |
| 11 | تعديل الوردية ⇐ الأيام المُولَّدة | ❌ | `ShiftService::update` غائب عن قائمة مُطلِقي `FutureRegenerationService` (المُطلِقون: تخصيصات، استثناءات، أنماط، عطلات فقط) | 🟠 في وضع `published` تعديل توقيت وردية لا يُعيد توليد أي يوم منشور — لا مسار يدوي ولا آلي. الـcron الليلي «يملأ الفجوات» ولا يراجع فترة مُولَّدة |
| 12 | ما يراه الموظف = ما يُحاسَب عليه (وضع published) | ❌ | العرض: `dayInfoFor():290` و`WeeklyBoardService:449` يقرآن `day->scheduled_start` (اللقطة). الحساب: `publishedScheduleFor():207` يستدعي `scheduleFromShift($day->shift)` = أوقات الوردية **الحيّة** | 🟠 بعد تعديل وردية، «جدولي القادم» ولوحة الجدولة تعرضان التوقيت القديم بينما التأخير يُقاس بالجديد |
| 13 | لقطة قواعد الحساب على الصف (`calculation_profile`, WS-11 pinning) | ✅ | `:365-420`, `pinProfile():766`, `AttendanceService.php:105` | 🟢 تصميم ممتاز: تفعيل/تعطيل علم سلوكي لا يُعيد كتابة أيام سابقة، وإعادة المزامنة تُثبِّت البروفايل الأصلي |
| 14 | النافذة المرنة FX-05 (العتبة بالثانية، القياس بالدقيقة) | ✅ | `:487-530` + `ValidatesShiftWindow.php:56-105` | 🟢 القاعدة مُطبَّقة بدقة والنافذة إجبارية وقت التعريف، لا مفاجأة وقت الحساب |
| 15 | تصنيف الأذونات — إذن الخروج أثناء الدوام | ❌ | `AttendanceCalculationService.php:890-901` (فقط `kind='late_arrival'`) | 🟠 موظف بإذن `exit_return` معتمد يغادر 14:00 ولا يعود: يُخصم `deduction_minutes` من الإذن **و** `early_departure_minutes` من الحضور. خصم مزدوج على نفس الدقائق |
| 16 | إعدادات نوع الإذن `deduction_type` / `deduction_threshold_minutes` | ❌ | يُتحقق منها في `StorePermitTypeRequest:26-27`، تُخزَّن، تظهر في `PermitTypeResource:23-24` — و`ExitPermitService::computeDeduction():95-130` لا يقرؤها إطلاقاً | 🟠 حقول مُعرَّفة في الواجهة بأربعة خيارات (none/full/partial/after_threshold) بلا أي أثر. الخصم يُحسب من `financial_effect` + الرصيد الشهري + `deduction_rate` فقط |
| 17 | `actual_departure_time` / `actual_return_time` على الإذن | ❌ | عمودان في `2026_04_15_000001:99-100` + Resource — صفر كاتب وصفر قارئ | 🟡 لا مطابقة بين الإذن والبصمة الفعلية |
| 18 | حساب رصيد الإذن الشهري | ⚠️ | `ExitPermitService.php:110-135` | 🟡 يُحسب مرة واحدة وقت الإنشاء ويُجمَّد. يشمل الأذونات `pending`؛ رفض إذن سابق لاحقاً لا يُعيد حساب اللاحق ⇒ خصم يعتمد على ترتيب الإدخال |
| 19 | **طلب أوفرتايم من الموظف** | ❌ | `Routes/api.php` كامل: `overtime` له index/export/approve/reject فقط. لا `me/overtime` | 🟠 الأوفرتايم كشف تلقائي حصراً. لا استئذان مسبق، ولا سقف معتمد، ولا `min(المطلوب، الفعلي)` |
| 20 | نوافذ فتح/قفل الأوفرتايم | ✅ | `OvertimePeriodService::isOpen()` + استدعاء في `syncAutoOvertime():807` | 🟢 CLOSED يغلب، وغياب النوافذ = مسموح. لكن القفل بأثر رجعي يحذف فقط سجلاً `pending` (`:817-830`) ولا يمسّ `approved` |
| 21 | مضاعفات الأوفرتايم (عادي/ويك إند/عطلة) | ✅ | `PayrollCalculationService:525-561` | 🟢 والعطلة تغلب الويك إند |
| 22 | دورة اعتماد الأوفرتايم | ✅ | `SyncOvertimeOnApprovalDecision` + `openIfConfigured` + إلغاء الطلب المعلَّق عند سقوط السجل | 🟢 حارس `pending` يمنع الدهس المزدوج |
| 23 | الإدخال اليدوي — تعارض مع صف قائم | ❌ | `ManualEntryRequest.php` بلا فحص تكرار؛ `AttendanceService.php:75` `create()`؛ القيد `unique(tenant,employee,date)` في `2026_04_15_000001:68` | 🟠 السيناريو الطبيعي (كرون 01:00 أنشأ 'absent' لأمس، ثم HR تُدخل البصمة المنسية) ينتهي بـ**خرق قيد قاعدة بيانات = 500**، لا رسالة مفهومة ولا تحديث |
| 24 | الإدخال اليدوي — نطاق الصلاحية | ❌ | `AttendanceController.php:57-60` بلا `scope->authorize()` بينما `update():72` و`destroy():91` تفعلها صراحةً تحت AUD-050 | 🟠 حامل `attendance:create` مقيَّد بفرع يستطيع إنشاء صف لأي موظف في المستأجر |
| 25 | تعديل صف الحضور — كتابة مباشرة على حقول الرواتب | ❌ | `AttendanceController.php:84` يمرّر `$request->all()`؛ `AttendanceService.php:120` يكتب `$record->update($data)` بلا FormRequest وبلا AuditLog | 🔴 `late_deduction_tier` و`late_minutes` و`shortfall_minutes` و`status` كلها في `$fillable`. طلب PUT يحمل `{"late_deduction_tier":"none"}` وحده لا يفعّل شرط إعادة الحساب (`array_intersect` على حقول الوقت) ⇒ يُكتب مباشرة، يُسقط خصم التأخير، بلا أثر تدقيق |
| 26 | الخدمة الذاتية — الانصراف في وردية ليلية | ❌ | `CheckOutAction.php:19-27` (`whereDate('date', now())` فقط) | 🔴 من بصم دخولاً 22:00 وانصرافاً 06:00 يحصل على «لا توجد بصمة دخول مسجَّلة لهذا اليوم» |
| 27 | الخدمة الذاتية — GPS | ❌ | `CheckInRequest.php:16-17` يتحقق من نطاق الإحداثيات؛ `check_in_lat/lng` تُخزَّن وتُعرَض ولا تُقارن بأي موقع/نصف قطر (لا وجود لكلمة geofence/radius في التطبيق) | 🟠 `method='gps'` تجميلي — البصمة من أي مكان في العالم مقبولة |
| 28 | حماية الحضور بعد آخر يوم عمل (offboarding) | ✅ | `CheckInAction.php:17` `OffboardingGuard::assertActivityAllowed` | 🟢 لكن الحارس على الخدمة الذاتية فقط، لا على المزامنة ولا على الإدخال اليدوي |
| 29 | التقرير اليومي | ⚠️ | `AttendanceReportService.php:190-210` | 🟠 `total_employees` = عدد **الصفوف** لا الموظفين. و`absent` ليوم اليوم = 0 دائماً (الترحيل 01:00 لليوم السابق) ⇒ شاشة اليوم تُظهر صفر غياب طوال اليوم |
| 30 | التقرير الشهري المجمَّع | ⚠️ | `:246-270` (`groupBy('employee_id')` على الصفوف) | 🟡 موظف بلا أي صف في المدى يختفي من التقرير بدل أن يظهر بأصفار |
| 31 | اتساق التقرير مع دورة الرواتب | ✅ | `resolvePeriod()` عبر `PayrollCycleService` + بانر `CyclePeriodBanner.tsx` | 🟢 الشهر «23→22» يُعرض بصدق، والتفصيلي والمجمَّع يستخدمان نفس النافذة |
| 32 | التصدير = ما تراه الشاشة | ✅ | `exportQuery()` = `baseQuery()` في `OvertimeService`/`ExitPermitService` + سقف XLSX + بثّ CSV + `LogAuditTrail` | 🟢 انضباط ممتاز؛ الصلاحية ونطاق الموظفين لا يسقطان في التصدير |
| 33 | لوحة الجدولة الأسبوعية (016) | ✅ | `WeeklyBoardService.php` (تحميل مسبق، provenance، فجوات تغطية، مُجمِّع خطة) | 🟢 أقوى أداة جدولة رأيتها في المقارنة، وتعكس أولوية المحرك — عدا فروق البند 10 و12 |
| 34 | خط أنابيب المؤسسة (نمط → تقويم → جدول → نشر) + مفتاح الإيقاف | ✅ | `WorkingDayPattern` → `CalendarGenerationService` → `ScheduleGenerationService` → `publish()` + `effectiveConsumptionMode()` + معالج `setup` | 🟢 نُسخ غير قابلة للتعديل، سبب نشر إلزامي، أرشفة تلقائية، سقوط آمن عند فجوة التغطية |
| 35 | إعادة التوليد بعد تغيير الإعداد | ✅ | `FutureRegenerationService` + `RegenerateFutureSchedules` (queued, 3 محاولات، فشل يُسجَّل) | 🟢 المستقبل فقط؛ اليوم والماضي لا يُمسّان — عدا فجوة الورديات (البند 11) |
| 36 | تغطية الاختبارات | ✅ | 31 ملف اختبار في مسارات الحضور | 🟢 لكن لا اختبار واحد يغطي: وردية ليلية عبر المزامنة، دهس التصحيح، أو خصم الغياب |

---

## 3) المقارنة مع نظامنا

| القدرة | عندهم | عندنا | الأنضج |
|---|---|---|---|
| بروتوكول ZKTeco | تنفيذ PHP خام، TCP أساسي + UDP احتياطي، فحص اكتمال، حارس تواريخ، رفع سقف الذاكرة، قياسات ميدانية موثَّقة | `node-zklib` جاهز بمهلات 8s/4s | **هم** بفارق كبير |
| البصمة الخام | ✗ لا تُحفظ | `attendance_punches` (كود، وقت، جهاز، receivedAt) مع dedupe ±500ms | **نحن** — وهو فرق معماري لا تُعوّضه ميزة |
| نموذج الحساب | لقطة على الصف؛ إعادة الحساب تحتاج إعادة سحب | اشتقاق من الخام في كل مرة (`computeDay` idempotent) + `recomputeDate` + `recomputeForShift` | **نحن** للتصحيحية · **هم** لثبات الرواتب التاريخي |
| صمود التصحيح أمام المزامنة | ✗ يُدهَس (بند 5) | التصحيحات جدول منفصل تُطبَّق فوق الخام في كل حساب ⇒ تصمد دائماً | **نحن** |
| الوردية الليلية | ✗ مكسورة على مسار المزامنة والانصراف الذاتي | `shiftEnd > shiftStart ? … : +1440` في الوضع المرن؛ لا يزال ناقصاً في التجميع اليومي | **نحن** جزئياً (كلاهما ناقص) |
| طبقة الجدولة | أنماط أيام عمل → تقويم مُولَّد → جدول أسبوعي بنُسخ مُعتمَدة + استثناءات مُنطَّقة + لوحة أسبوعية + معالج إعداد | جدول أسبوعي مؤرَّخ (`weekStart`) + تجاوز يوم + قواعد استثناء (LAST SAT = دوام) | **هم** بفارق جيل كامل |
| أولوية حسم الجدول | 5 مستويات (استثناء > تخصيص مُنطَّق مؤرَّخ > أسبوعي > WorkDay) + وضع published | 3 مستويات (تجاوز يوم > أسبوع > جدول عمل الموظف > افتراضي) | **هم** |
| تعديل الوردية على أيام سابقة | مُثبَّت عمداً (WS-11) — لا يُعاد كتابة التاريخ ✅؛ لكن الأيام المنشورة المستقبلية لا تُعاد توليدها ✗ | `recomputeForShift` يعيد حساب كل الأيام ≤ اليوم | **هم** فلسفياً · **نحن** تنفيذياً |
| الأذونات | نوع إذن مُعرَّف (سقف، رصيد شهري بالدقائق/العدد، نسبة، kind) — لكن نصف الإعدادات ميت ونطاق التغطية ينحصر في «تأخير صباحي» | `PermissionType` بـ`coverage: morning/evening/both` + `isDeductible` + `deductionPct` + رصيد؛ مُطبَّق فعلياً على طرفَي الوردية مع اتحاد نوافذ بلا تكرار (`paidPay`) | **نحن** بوضوح |
| الإجازة نصف يوم في الحضور | ✗ لا وجود لها | `partial_leave` + نافذة تغطية نصف الوردية + خصمها من المطلوب في الوردية المرنة | **نحن** |
| تعارض بصمة/إجازة | ✗ غير مُكتشَف | `leaveConflict` عَلَم يُعرَض لـHR للقرار | **نحن** |
| طلب أوفرتايم من الموظف | ✗ غير موجود | `PRE_REQUESTED` عبر محرك الطلبات، `payable = min(المطلوب، الفعلي)`، والمعتمد مسبقاً يغلب القفل | **نحن** |
| نوافذ الأوفرتايم | `OvertimePeriod` OPEN/CLOSED بالفرع، CLOSED يغلب | مطابق تماماً + حذف بأثر رجعي للمكتشَف غير المعتمد | **تعادل** |
| مضاعفات الأوفرتايم | 3 مستويات في المسير | 3 مستويات تُحسم وقت الكشف وتُخزَّن على القيد | **تعادل** |
| خصم الغياب في المسير | ✗ صفر (بند 6) | `materializeAbsences` + المسير يجسّد الفترة عند الحساب ويخصم | **نحن** — وهذه أخطر فجوة عندهم |
| حالة «في إجازة» في الحضور | ✗ enum ميت | `leave` / `partial_leave` تُكتب فعلياً من `computeDay` | **نحن** |
| علَم سلوكي/بروفايل حساب على الصف | `calculation_profile` بـtokens مستقرة + `pinProfile` + parity harness | ✗ لا مقابل | **هم** |
| نموذج شرائح التأخير | `LatenessTierService` بشرائح قابلة للتحرير + `absence_penalty_days` | إعدادات عامة + `graceMinutes` لكل وردية | **هم** |
| تعدد المستأجرين | مدعوم — مع ثغرة عزل في كرون الغياب (بند 9) | أحادي المستأجر | لا ينطبق |
| التدقيق والتصدير | `AuditLogService` على الجداول/الورديات/الاستثناءات + `LogAuditTrail` على كل تصدير + سقوف | أخفّ بكثير | **هم** |
| GPS/geofence | ✗ إحداثيات بلا تحقق | ✗ غير مُنفَّذ | تعادل سلبي |
| عدد الشاشات | 23 شاشة (لوحة أسبوعية، تقويم، أنماط، نُسخ مخططة، معالج، تصحيحات، نقل فرق…) | 8 شاشات | **هم** |

---

## 4) الخلاصة

**هل هذه المديرية جاهزة للتشغيل الحقيقي؟ — لا، ليس بحالتها الراهنة.**

الهندسة المعمارية أنضج من نظامنا في الجدولة والحوكمة بفارق واضح: خطّ إنتاج «نمط ← تقويم ← جدول ← نشر» بنُسخ غير قابلة للتعديل، مفتاح إيقاف على مستوى المستأجر، سقوط آمن عند فجوة التغطية، تثبيت قواعد الحساب على كل صف حتى لا يُعاد كتابة التاريخ، انضباط استثنائي في «التصدير = الشاشة»، وتوثيق داخلي بمستوى نادر (قياسات فقدان UDP الحقيقية، تعليل كل قرار بمعرّف متطلّب). لكن **الحوكمة العميقة بُنيت فوق أرضية تشغيلية بها ثقوب تُفرِغ نصف المديرية من غرضها**: النظام يُحسِن ضبط ما يقيسه، ثم لا يقيس أهمّ ما يجب قياسه أو يمحوه بعد قياسه.

النمط المتكرر واضح: **حقول تُكتَب ولا تُقرَأ** (`is_manual_entry`، `punch.type`، `deduction_type`، `actual_return_time`، `check_in_lat`)، و**قيم تُقرَأ ولا تُكتَب** (`on_leave`)، و**قدرات مُعرَّفة في طبقة ولا تصل الطبقة التالية** (`is_overnight` في الحساب دون التجميع، `absent` في الحضور دون المسير، اللقطة المنشورة في العرض دون الحساب).

### أخطر 3 نقاط

**1. 🔴 الغياب لا يكلّف شيئاً — والإجازة المعتمدة تُحسب غياباً.**
سلسلة كاملة (كرون + أوراكل مشترك + عَلَم عطلة رسمية + تقارير) تُنتج صفوف `absent`، ثم `PayrollCalculationService.php:803` لا يقرؤها إطلاقاً؛ يقرأ الإجازات بدون أجر ويسمّي الناتج «خصم غياب». وفي الاتجاه المعاكس، يوم الإجازة المعتمدة لا يُكتب له صف (`MarkEmployeeAbsencesAction` يتخطّاه) فيُصنَّف في التقرير الشهري `absent` (`AttendanceReportService.php:149`). النتيجة المزدوجة: **من يتغيّب لا يُخصم منه، ومن هو في إجازة نظامية يظهر غائباً** — في تقريره وفي شاشته الذاتية. أي عميل سيكتشف هذا في أول مسير.

**2. 🔴 «البصمة مرجع» تمحو التصحيح المعتمد — والوردية الليلية أصلاً بلا بيانات.**
`updateOrCreate` في `BiometricSyncService.php:506` يستبدل الصف بلا فحص، ويصفّر `is_manual_entry` (`:491`)، ونافذة المزامنة يومان كل 30 دقيقة: تصحيح معتمد لأمس يُدهَس خلال نصف ساعة بينما الطلب يبقى «مُطبَّق». وفي نفس الدالة، التجميع بالتاريخ التقويمي (`:401`) يتجاهل `is_overnight` تماماً رغم دعمه الكامل في محرك الحساب — فوردية 22:00→06:00 تنتج صفّين ببصمة واحدة، بلا ساعات عمل ولا أوفرتايم ولا انصراف مبكر. ولأن **البصمة الخام لا تُحفَظ أبداً**، لا يوجد مصدر ثانٍ يُعاد منه الحساب بعد الإصلاح.

**3. 🔴 حقول الرواتب قابلة للكتابة المباشرة، وكرون الغياب يعبر حدود المستأجرين.**
`PUT attendance/{id}` يمرّر `$request->all()` (`AttendanceController.php:84`) إلى `$record->update($data)` (`AttendanceService.php:120`) بلا FormRequest وبلا سجل تدقيق؛ وإرسال `late_deduction_tier` وحده لا يستوفي شرط إعادة الحساب، فيُكتب كما هو ويُسقط خصم التأخير بصمت. وبالتوازي، `MarkAbsentCommand.php:30` يمرّ على `Tenant::all()` دون ربط `current_tenant`، فيصير نطاق `BelongsToTenant` معطّلاً و`ScheduleAssignmentService.php:131` يحمّل تخصيصات كل المستأجرين، و`ScopeResolver::resolve` — الذي يفهرس بـ`scope_type:scope_id` بلا `tenant_id` — يسلّم جدول شركة أخرى. الفريق يعرف هذا الفخّ بالاسم ويعلّق عليه في `GenerateSchedulesCommand.php:44`؛ أمر الغياب وحده أفلت منه.

### ما يستحق النقل إلى نظامنا
`calculation_profile` مع `pinProfile` (تفعيل علم سلوكي لا يُعيد كتابة أيام سابقة) · طبقة النُسخ المُعتمَدة للجداول (`draft → published → archived` بسبب نشر إلزامي) · لوحة الجدولة الأسبوعية بـ`source_scope` وفجوات التغطية · انضباط «التصدير = الشاشة» عبر `baseQuery()` مشتركة · حارس اكتمال النقل في عميل ZKTeco.

---

# مديرية ٥ — الرواتب

# تقرير: مديرية الرواتب (Payroll) — دورة التشغيل الفعلية وصحة الأرقام

## 1. دورة الحياة — المسار الكامل ونقاط الانقطاع

```
[إنشاء المسير]  POST payroll/runs  {period_year, period_month, type}
   │  StorePayrollRunRequest.php:16-20 — لا يوجد أي حقل نطاق (فرع/قسم/موظفين)
   │  PayrollRunService.php:36-50 — منع التكرار لنوع regular فقط
   ✂ انقطاع #1: مسير «supplementary» لنفس الفترة يمر بلا أي منع
   │  PayrollCycleService::resolvePeriod — calendar أو custom (إعداد عام للمستأجر)
   ✂ انقطاع #2: لا فترة مخصّصة لكل مسير (من تاريخ ← إلى تاريخ)؛ الفترة تُشتق من year+month
   ↓
[الاحتساب]  POST runs/{id}/calculate  → CalculatePayrollAction:52-60
   │  SELECT كل الموظفين active|probation في المستأجر (hire_date <= period_end)
   ✂ انقطاع #3: مسير supplementary يحسب الراتب الكامل لكل الموظفين مرة ثانية
   ↓ لكل موظف: PayrollCalculationService::calculateForEmployee (سطر 67-230)
   │
   ├─ الأساسي ← employees.basic_salary  →  تناسب بتاريخ التعيين فقط (سطر 474-512)
   │     ✂ انقطاع #4: تارك الخدمة داخل الفترة يأخذ شهراً كاملاً (موثّق عندهم OBD-8)
   ├─ البدلات ← employee_allowances نشطة عند period_end (AllowanceService:135-172)
   │     ✂ انقطاع #5: بدل بدأ/انتهى داخل الفترة يُدفع/يُسقط كاملاً بلا تناسب
   ├─ الإضافي ← overtime_records APPROVED × معامل يوم/عطلة/عيد ✅
   ├─ المكافآت ← bonuses status=pending (بلا أي فلترة تاريخ) — BonusService:40
   ├─ التعويضات بالنطاق ← scoped_compensations (company/branch/dept/team/employee) ✅
   ├─ التأمينات ← GosiCalculationService (سعودي/غير سعودي، سقف/أرضية) ✅
   ├─ التأخير ← attendance_records.late_deduction_tier × شريحة قابلة للتعريف ✅
   ├─ «الغياب» ← إجازات غير مدفوعة فقط  ← PayrollCalculationService:803-838
   │     ✂✂ انقطاع #6 (الأخطر): يوم الغياب بلا إذن (status='absent') لا يُخصم إطلاقاً
   ├─ الأذونات ← exit_permits.deduction_minutes ✅
   ├─ نقص الساعات/الانصراف المبكر ← مشروط بمفتاح early_departure_deduction
   │     ✂ انقطاع #7: هذا المفتاح غير مبذور ولا يظهر في أي شاشة → الكود ميت عملياً
   ├─ السلف ← أقساط pending/partial/carried_over مستحقة ✅
   ├─ الالتزامات ← دفتر المديونيات (credit/debit) ✅
   └─ المعادلات ← FormulaOverlayService (طبقة إضافية اختيارية) ✅
   ↓  إنشاء PayrollEntry + PayrollEntryLine لكل بند
   ↓
[التعديل اليدوي]  POST entries/{id}/adjust  → AdjustPayrollEntryAction::recalculateEntry:100-136
   ✂✂ انقطاع #8 (الأخطر مالياً): إعادة الحساب اليدوية تُسقط من الإجمالي
      early_deductions + الخصومات بالنطاق + الخصومات الدائمة + الالتزامات + المعادلات،
      ولا تُحدّث cash_paid/bank_paid إطلاقاً
   ↓
[المراجعة] → [الاعتماد] (بدور معتمد قابل للتعريف ✅) → [الصرف]
   ✂ انقطاع #9: revert من calculated/reviewed فقط — لا يوجد فكّ اعتماد
   ↓
[الصرف] MarkPayrollPaidAction — يقفل الأقساط ويحدّث رصيد السلفة ✅
   ↓
[التصدير] WPS = CSV بخمسة أعمدة (اسم/بنك/آيبان/مبلغ/عملة)
   ✂ انقطاع #10: ليس صيغة SIF المعتمدة، ويقرأ bank_paid البائت بعد أي تعديل يدوي
   ↓
[القسيمة] payslip/_id/page.tsx
   ✂✂ انقطاع #11: التأخير والغياب والسلفة تُعرض مرتين (عمود مجمّع + أسطر) →
      مجموع البنود المعروضة ≠ «إجمالي الاستقطاعات» المعروض أسفلها
```

---

## 2. جدول التقييم — نظام الشريك

| البند | يؤدي غرضه؟ | الدليل | الملاحظة |
|---|---|---|---|
| **إنشاء المسير بنطاق مختار** | ❌ لا | `StorePayrollRunRequest.php:16-20` · `CalculatePayrollAction.php:52-60` | لا يوجد نطاق أصلاً — كل مسير = كل موظفي المستأجر. لا فرع، لا قسم، لا قائمة مخصّصة | 🔴
| **منع صرف الموظف مرتين في نفس الفترة** | ❌ لا | `PayrollRunService.php:41-50` · migration `2026_04_20:133-156` | المنع تطبيقي لنوع `regular` فقط، وبلا فهرس فريد في القاعدة. الشاشة نفسها تعرض زر «+ إنشاء مسير تكميلي لنفس الفترة» (`pages/page.tsx:612-628`) والاحتساب لا يميّز النوع → **راتب كامل ثانٍ للجميع** | 🔴
| **الفترة قابلة للتعريف** | ⚠️ جزئيًا | `PayrollCycleService.php:23-50` | calendar أو custom (بداية/نهاية من إعداد المستأجر). لا فترة مخصّصة لكل مسير، ولا نطاق تواريخ حر | 🟠
| **الأساسي** | ✅ نعم | `PayrollCalculationService.php:83` | من `employees.basic_salary` |
| **التناسب — منضم داخل الفترة** | ✅ نعم | `PayrollCalculationService.php:474-512` | نمطان (legacy/full_coverage) بمعالجة صريحة للشهر 31 و28 |
| **التناسب — تارك داخل الفترة** | ❌ لا | نفس الملف، تعليق `OBD-8` سطر 470 | «مغادر منتصف الدورة يستلم دورة كاملة» — مذكور صراحةً كفجوة | 🔴
| **البدلات — كتالوج + إسناد** | ✅ نعم | `AllowanceService.php:135-172` | كتالوج أنواع + إسناد لكل موظف + fixed/percentage + effective/end date |
| **تناسب البدل داخل الفترة** | ❌ لا | `AllowanceService.php:139-145` | الاستحقاق يُقاس عند `period_end` فقط → بدل انتهى يوم 2 من الشهر يُدفع كاملاً، وبدل بدأ يوم 28 يُدفع كاملاً |🟠
| **الإضافي** | ✅ نعم | `PayrollCalculationService.php:514-560` | ثلاثة معاملات (عادي/عطلة أسبوعية/عيد) مع أولوية العيد |
| **المكافآت** | ⚠️ جزئيًا | `BonusService.php:40-45` · `CalculatePayrollAction.php:73-80` | كل مكافأة `pending` تدخل أي مسير يُحتسب — بلا تاريخ استحقاق ولا ربط بفترة. مكافأة مقصودة لشهر قادم تُصرف الآن |🟠
| **التعويضات بالنطاق** | ✅ نعم | `PayrollCalculationService.php:264-290` | company/branch/department/team/employee، معاملة كقواعد قائمة (idempotent) |
| **خصم التأخير** | ✅ نعم | `PayrollCalculationService.php:562-590` · `LatenessTierService.php` | شرائح قابلة للتعريف من الواجهة (`settings/lateness-tiers`)، كسر يوم × الأجر اليومي |
| **خصم الغياب بلا إذن** | ❌ **لا** | `PayrollCalculationService.php:803-838` · `MarkEmployeeAbsencesAction.php:24` | الدالة اسمها `calculateAbsenceDeductions` لكنها تقرأ **الإجازات غير المدفوعة فقط**. تعليقهم الحرفي: «the payroll engine does not deduct on `absent` records». يوم غياب بلا بصمة وبلا إجازة = **صفر خصم** | 🔴
| **معامل عقوبة الغياب** | ❌ لا (مُطبَّق خطأً) | `PayrollCalculationService.php:836` | `absence_penalty_days` (المخصّص «لكل يوم غياب بلا إذن») يُضرب في **أيام الإجازة بلا أجر المعتمدة** → ضبطه على 2 يضاعف خصم إجازة معتمدة، بينما الغياب الحقيقي يبقى صفراً | 🔴
| **خصم الأذونات** | ✅ نعم | `PayrollCalculationService.php:434-449` | يحترم `deduction_waived` |
| **خصم نقص الساعات / الانصراف المبكر** | ❌ لا (غير قابل للتفعيل) | `PayrollCalculationService.php:127` · `PayrollFormula.php:seedDefaults` | يقرأ `early_departure_deduction` بافتراضي `none`، لكن المفتاح **غير مبذور**، و`PayrollFormulaController::update` يستخدم `firstOrFail` → لا يمكن إنشاؤه من الـAPI. كل منظومة FX-07 (التوزيع بالسنتات، أسطر النقص لكل يوم) كود لا يُنفَّذ أبداً | 🟠
| **الإجازة بلا أجر** | ⚠️ جزئيًا | `PayrollCalculationService.php:803-838` | تقاطع صحيح مع الفترة، لكن `diffInDays+1` يحسب **أيام تقويمية** — لا يستثني العطلة الأسبوعية ولا الأعياد داخل الإجازة |🟠
| **التأمينات (GOSI)** | ⚠️ جزئيًا | `GosiCalculationService.php:60-104` | سعودي/غير سعودي + سقف/أرضية + `gosi_base_salary` ✅. لكن: بدل السكن يُقرأ عند `now()` لا عند تاريخ الفترة (سطر 82-84) → مسير رجعي يستخدم بدل اليوم؛ شرط `is_taxable=true` على نوع البدل شرط هشّ؛ `orWhere('name_en','like','%سكن%')` يبحث عن نص عربي في عمود إنجليزي = شرط ميت (سطر 91-92)؛ والأساس لا يتناسب مع المنضم منتصف الشهر | 🟠
| **السلف — الإنشاء والسقوف** | ✅ نعم | `CreateLoanAction.php:70-80` · `SelfServicePayrollController.php:118-152` | سقف رصيد 5× الأساسي + سقفان (% ومبلغ ثابت) لطلبات السلفة/القرض بالأصغر منهما |
| **السلف — الأقساط والخصم الشهري** | ✅ نعم | `PayrollCalculationService.php:840-866` · `MarkPayrollPaidAction.php:36-75` | يحصّل المتأخرات (`due_date <= end of month`)، يعالج التحصيل الجزئي بتراكم `amount_paid`، ويمنع الصافي السالب |
| **السلف — سداد مبكر** | ❌ لا | `LoanController.php` (المسارات: index/store/show/write-off فقط) | لا يوجد سداد مبكر ولا تعديل قسط. البديل الوحيد «إعدام» (`write_off`) وهو معنى محاسبي مختلف تماماً |🟠
| **السلف — عند ترك الخدمة** | ✅ نعم | `OffboardingService.php:219` · `OffboardingReadinessService.php:58-65` | تُدرج في التصفية النهائية + حاجز `loans_outstanding` |
| **حالة السلفة في الواجهة** | ❌ لا | `pages/loans/page.tsx:16,207` مقابل `Loan.php:25` | الواجهة تعرض/تفلتر على `settled` — والباك لا ينتج إلا `fully_paid`. السلفة المسددة تظهر بشارة فارغة والفلتر لا يعيد شيئاً |🟠
| **الخصومات الدائمة** | ✅ نعم | `DeductionService.php` | كتالوج + إسناد + fixed/percentage + نافذة سريان |
| **دفتر الالتزامات** | ✅ نعم | `ObligationService.php:88-140` | credit/debit، قصّ على المتاح، تحرير عند إعادة الحساب، تخطّي حالات إنهاء الخدمة |
| **الشرائح/المعادلات من الواجهة** | ✅ نعم | `pages/formulas/page.tsx` · `pages/formula-builder/page.tsx` (904 سطر) | ثوابت + محرّك معادلات مُصرَّف بترتيب طوبولوجي + نسخ + rollback + preview/simulate. الأنضج في السوق |
| **مفتاح `payslip_language`** | ❌ لا | مبذور في `PayrollFormula.php:43` وقابل للتحرير في الشاشة — **ولا يُقرأ في أي مكان بالباك** | إعداد يعرضه النظام ولا يفعل شيئاً | 🟡
| **دورة الاعتماد** | ⚠️ جزئيًا | `PayrollRunController.php:56-79` · `ApprovePayrollAction.php:26-36` | draft→calculated→reviewed→approved→paid بدور معتمد قابل للتعريف ✅. لكن `revert` من calculated/reviewed فقط → **مسير معتمد بخطأ لا يمكن فكّه** إلا بتدخل قاعدة بيانات | 🟠
| **إعادة الحساب بعد التعديل اليدوي** | ❌ **لا** | `AdjustPayrollEntryAction.php:100-136` | `total_deductions = gosi + late + absence + permit + loan + manual` — تُسقط `early_deductions` والخصومات بالنطاق والدائمة والالتزامات والمعادلات (كلها `is_manual=false`). **أي تعديل يدوي واحد يمحو هذه الخصومات من الصافي بينما تبقى أسطرها معروضة** | 🔴
| **تجميد لقطة الصرف بعد التعديل** | ❌ لا | نفس الملف — `cash_paid`/`bank_paid` غير محسوبين في `recalculateEntry` | ملف WPS يقرأ `bank_paid` (`PayrollExportService.php:26`) → **البنك يُحوَّل المبلغ قبل التعديل** | 🔴
| **الإعفاء من خصم تلقائي** | ⚠️ جزئيًا | `AdjustPayrollEntryAction.php:57-63` | إعفاء `late` يحذف كل سطر `reference_type='attendance_record'` — أي **يحذف أيضاً أسطر نقص الساعات وأسطر FR-032** بينما يُصفّر عمود التأخير وحده. وإعفاء `absence` يطابق بنص `label_en like 'Unpaid leave%'` (هشّ) | 🟠
| **تصدير WPS** | ⚠️ جزئيًا | `PayrollExportService.php:9-70` | CSV بخمسة أعمدة. لا صيغة SIF، لا رمز بنك، لا رقم هوية، لا تفصيل (أساسي/سكن/بدلات/خصومات) الذي يشترطه مُدد. صالح كتقرير داخلي لا كملف بنكي |🟠
| **تصدير GOSI** | ⚠️ جزئيًا | `PayrollExportService.php:72-110` | بلا رقم المنشأة ولا رقم اشتراك الموظف |🟡
| **التقارير** | ⚠️ جزئيًا | `PayrollReportService.php:14-40,42-70` | تقرأ أول مسير `regular` معتمد فقط → **المسيرات التكميلية غائبة عن كل التقارير**. و`monthlySummary` تُسقط `early/permit/formula/obligation` من عرض الخصومات |🟠
| **القسيمة — الأسطر تساوي الإجماليات؟** | ❌ **لا** | `pages/payslip/_id/page.tsx:213-247` | جانب الاستقطاعات يعرض `late_deductions` و`absence_deductions` و`loan_deductions` كأعمدة مجمّعة **ثم** يعرض `deductionLines` التي تحوي نفس الأسطر (فئتها `deduction`) → عرض مزدوج، ومجموع المرئي > الإجمالي المعروض. جانب الاستحقاقات متّسق ✅ | 🔴
| **القسيمة — هل يفهم الموظف مصدر الرقم؟** | ⚠️ جزئيًا | نفس الملف | ممتاز في حالتَي `zero`/`failed` (يعرض رمز البند والمعادلة والسبب — أنضج ما رأيته). لكن لا يعرض تواريخ الفترة ولا أيام العمل ولا تقسيم كاش/بنك، والازدواج أعلاه يهدم الثقة بالرقم |
| **حقول غير معروضة في الـResource** | ⚠️ جزئيًا | `PayrollEntryResource.php` | `obligation_earnings/deductions` و`formula_earnings/deductions` غير مُصدَّرة → الواجهة لا تستطيع تفسير `gross_earnings` من الأعمدة المعروضة |🟡
| **موظف مستثنى من الحضور (راتب ثابت)** | ❌ لا | لا وجود لأي علم `exempt_from_attendance` في وحدة الرواتب | الاستثناء الوحيد الممكن هو الإعفاء اليدوي لكل موظف لكل مسير |🟠
| **موظف بلا سجلات حضور** | ✅ نعم | ضمنياً | لا سجلات = لا خصم تأخير/أذونات (والغياب أصلاً لا يُخصم) |
| **موظف انضم داخل الفترة** | ✅ نعم | `calculateProRating` | باستثناء أن التأمينات والبدلات لا تتناسب |
| **موظف ترك داخل الفترة** | ❌ لا | `calculateProRating` لا يقرأ تاريخ الإنهاء | يقبض شهراً كاملاً | 🔴

---

## 3. المقارنة مع نظامنا

| القدرة | عندهم | عندنا | الأنضج |
|---|---|---|---|
| نطاق المسير (شركة/فرع/قسم/فريق/مركز تكلفة/مخصّص) | ❌ لا يوجد — كل الموظفين دائماً | ✅ backend كامل (`payroll.service.ts:106-137`) بستة أنواع + لقطة أعضاء | **نحن** — بشرط: غير موصول بالواجهة (`src/lib/api.ts:417` يستدعي `/runs/calculate` بالفرع فقط) |
| اسم المسير + عدة مسيرات للفترة | ⚠️ نوعان فقط | ✅ اسم + نطاق حر | نحن |
| منع صرف الموظف مرتين لنفس الفترة | ❌ | ❌ (`PayrollRunMember` تُكتب ولا تُقرأ أبداً — `payroll.service.ts:218`) | **متعادلان في الفشل** |
| الفترة | calendar / custom (23→22) قابل للتبديل | 23→22 فقط (`periodRange:88-101`) | **هم** |
| كتالوج البدلات + إسناد بتواريخ | ✅ كامل + نسبة/ثابت | ❌ ثلاثة أعمدة ثابتة في ملف الموظف (سكن/انتقال/أخرى) | **هم** |
| التأمينات GOSI | ✅ محسوبة ومصدَّرة | ❌ الحقول موجودة في `employee.entity.ts:236-244` و**لا يقرأها المسير إطلاقاً**؛ شاشة GOSI صفحة نسب ثابتة | **هم** بفارق كبير |
| خصم الغياب بلا إذن | ❌ صفر | ✅ `materializeAbsences` + `status='absent'` × معامل عقوبة (`payroll.service.ts:262-268`) | **نحن** |
| شرائح التأخير | ✅ كسر يوم | ✅ كسر يوم **أو** بالدقيقة (`latenessForDay:65-80`) + دقائق الإذن بالدقيقة | **نحن** (نمطان لا نمط) |
| نقص الساعات/الانصراف المبكر | ⚠️ مكتوب لكن غير قابل للتفعيل | ✅ `deductibleMinutes` بالدقيقة داخل خصم التأخير | نحن |
| الإجازة بلا أجر | ⚠️ أيام تقويمية | ✅ + دعم نصف يوم (`period='FULL'` وإلا ×0.5) | نحن |
| المكافآت والخصومات لمرة واحدة | ✅ bonuses + scoped + obligations | ✅ عبر دفتر المديونيات (CREDIT/DEBIT) فقط | هم (طبقات أكثر) |
| السلف — أقساط ومتأخرات | ✅ يحصّل المتأخر ويعالج الجزئي | ❌ `dueDate Between(startDate,endDate)` → **قسط فات ولم يُحصَّل لا يُطالَب به أبداً** | **هم** |
| السلف — سقوف | ✅ 5× + سقفا الطلب | ⚠️ سقف واحد في الواجهة | هم |
| التناسب (منضم/تارك) | ⚠️ منضم فقط | ❌ **لا تناسب إطلاقاً** — منضم يوم 20 يقبض شهراً كاملاً | **هم** |
| محرّك معادلات | ✅ موصول + نسخ + rollback + preview | ❌ `safe-formula.ts` و`payroll-variables.ts` **غير مستوردَين في أي ملف** — أساس M1 غير موصول | **هم** |
| دورة الاعتماد | 5 حالات + دور معتمد قابل للتعريف | 3 حالات (CALCULATED→APPROVED→PAID)، الاعتماد يفحص الحالة فقط بلا دور | هم |
| القفل عند الصرف | أقساط السلف | أقساط + أوفرتايم→PAID + التزامات→APPLIED | **نحن** |
| تصدير WPS / GOSI | ⚠️ CSV مبسّط | ❌ لا يوجد | هم |
| تقرير طريقة الصرف | ✅ cash/bank snapshot مجمّد | ✅ `payMethodReport` تجميع بطريقة الدفع | متقاربان |
| أسطر القسيمة (line items) | ✅ جدول أسطر مفصّل بمرجع لكل بند | ❌ أعمدة مجمّعة + `breakdown` JSON | **هم** |
| اتساق القسيمة (أسطر = إجمالي) | ❌ ازدواج ثلاثي | ✅ الجانبان يُشتقان من نفس الأعمدة → متطابقان مع `netPay` | **نحن** |
| تتبّع مصدر الخصم | ✅ `reference_type/reference_id` | ✅ `attendanceDayIds/unpaidLeaveIds/installmentIds` في breakdown | متعادلان |
| شفافية «صفر/فشل» في القسيمة | ✅ ثلاث حالات مميّزة بصرياً + نص المعادلة والسبب | ❌ | **هم** بفارق كبير |
| خدمة ذاتية (طلب سلفة/قسائمي) | ✅ + تقديم نيابةً عن | ✅ قسائمي فقط | هم |
| أزرار ميتة في القسيمة | — | ❌ «تحميل PDF» و«إرسال بالبريد» بلا `onClick`، و«QR Code» مربّع نصّي | نحن أسوأ |
| اتساق نص الواجهة مع الباك | ⚠️ (`settled` الميت) | ⚠️ شاشة البدلات تقول «المسير لا يشمل البدلات» بينما الباك يجمعها فعلياً (`payroll.service.ts:~230`) | متعادلان في الخلل |

---

## 4. الخلاصة

**هل هذه المديرية جاهزة للتشغيل الحقيقي؟ لا — ليس بحسابها الحالي.**

البنية الحوكمية عندهم لافتة فعلاً (أعلام سلوك، خطوط أساس مجمّدة، تقارير تكافؤ، محرّك معادلات بنسخ وrollback، وثلاث حالات عرض للصفر في القسيمة). لكن هذه الطبقة تحرس **حساباً فيه ثقوب في الأساسيات**: بند خصم رئيسي لا يعمل، تعديل يدوي واحد يمحو خصومات حقيقية من الصافي، وزر ظاهر في الشاشة يصرف رواتب مضاعفة. الحوكمة هنا تحرس الطابق الثاني وباب الأرضي مفتوح.

**أخطر ثلاث نقاط:**

1. 🔴 **الغياب بلا إذن لا يُخصم إطلاقاً** — `PayrollCalculationService.php:803-838` تحسب الإجازات غير المدفوعة فقط، وتعليقهم في `MarkEmployeeAbsencesAction.php:24` يقرّ بذلك حرفياً. والأسوأ: معامل العقوبة `absence_penalty_days` — الموصوف بأنه «لكل يوم غياب بلا إذن» — يُضرب في **أيام الإجازة بلا أجر المعتمدة**، فضبطه على 1.5 يعاقب من أخذ إجازة نظامية ولا يمسّ الغائب. الحقل اسمه «خصم الغياب» في القسيمة والشاشة، ومحتواه شيء آخر.

2. 🔴 **التعديل اليدوي يخرق الأرقام مرتين** — `AdjustPayrollEntryAction.php:100-136`: إعادة حساب الإجمالي تُسقط `early_deductions` والخصومات بالنطاق والدائمة والالتزامات والمعادلات (كلها `is_manual=false`) → الصافي يرتفع بلا مبرر بينما أسطر تلك الخصومات تبقى معروضة في القسيمة. وفي نفس الدالة لا يُعاد حساب `cash_paid`/`bank_paid`، وملف WPS يقرأ `bank_paid` → **البنك يُحوَّل المبلغ قبل التعديل**. مكافأة يدوية بـ500 ريال قد تُغيّر الصافي بألوف وتُصرف بمبلغ ثالث مختلف عن الاثنين.

3. 🔴 **لا شيء يمنع صرف الموظف مرتين لنفس الفترة** — `PayrollRunService.php:41-50` يمنع تكرار `regular` فقط، ولا فهرس فريد في القاعدة، و`CalculatePayrollAction` لا يميّز نوع المسير: مسير «تكميلي» يعيد حساب **الراتب الكامل + كل البدلات + كل المكافآت المعلّقة** لكل موظف نشط. والشاشة تعرض الزر مباشرة: «+ إنشاء مسير تكميلي لهذه الفترة» (`pages/page.tsx:612-628`). ضغطتان = مسير مضاعف كامل.

**ونقطتان عنّا لا تقلّان خطورة قبل أي مقارنة:** التأمينات عندنا حقول مخزّنة لا يقرأها المسير (`employee.entity.ts:236-244`)، ولا يوجد أي تناسب لمنضم أو تارك داخل الفترة (`payroll.service.ts:110` يفلتر `isActive` فقط) — وهذه أخطر من كل ما سبق عليهم لأنها تُنتج رقماً خاطئاً بصمت لكل موظف جديد. يُضاف إليها أن مسيرنا القابل للتعريف (النطاق + لقطة الأعضاء) مكتوب في الباك وغير موصول بالواجهة، وأن `PayrollRunMember` تُكتب ولا تُقرأ فلا تمنع ازدواجاً رغم التعليق الذي يقول إنها لذلك.
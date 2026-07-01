# مهمة الفرونت إند: رفع ميزان المراجعة + السنة المقارنة (القوائم المالية)

## الفكرة العامة
القوائم المالية بتحتاج سنتين: **السنة الحالية** (تُستورد من ملف Excel للميزان)، و**السنة المقارنة/السابقة**. السنة المقارنة ليها 3 حالات:

1. **الشركة لها عقد سنة سابقة عندنا** → النظام بيلاقيها تلقائياً ونقدر نستدعيها بضغطة زر.
2. **مفيش سنة سابقة عندنا** → المستخدم يختار السنة ويدخّل ميزان مراجعة يدوي (كل خانة بإيده).
3. **شركة جديدة (أول سنة)** → سنة واحدة بس بدون مقارنة، والتقرير بيطلع عادي.

> كل الطلبات محمية بتوكن (Bearer) زي باقي الـ API. البيز لكل المسارات: `/contracts/:contractId`

---

## 1) رفع ميزان السنة الحالية (موجود بالفعل)
**`POST /contracts/:contractId/trial-balance/upload`** — `multipart/form-data`، الحقل اسمه **`file`** (ملف Excel).
- الرد: `{ message, importedAccountsCount, trialBalanceId, balanced }`
- النظام بيسجّل الميزان تلقائياً على سنة العقد الحالية.
- عرض الجدول: **`GET /contracts/:contractId/trial-balance?page=&limit=&search=`** → `{ data, summary, pagination, status }`
- تعديل تسوية حساب: **`PATCH /contracts/trial-balance/accounts/:accountId`**
- اعتماد وقفل السنة الحالية: **`POST /contracts/:contractId/trial-balance/confirm`**

---

## 2) السنة المقارنة (جديد)

### أ) سياق المقارنة — نداء أول ما تفتح تبويب المقارنة
**`GET /contracts/:contractId/comparative/context`**
```json
{
  "currentYear": "2025",
  "hasCurrent": true,
  "comparatives": [ { "year": "2024", "status": "DRAFT", "accountsCount": 40 } ],
  "linkable": { "contractId": "…", "year": "2024" }  // أو null
}
```
- لو `linkable` **مش null** → اعرض زر **"استدعاء السنة السابقة (موجودة عندنا)"**.
- دايماً اعرض **dropdown لاختيار سنة المقارنة** (مثلاً 2024، 2023…) للإدخال اليدوي.
- `comparatives` = السنوات المقارنة المُنشأة بالفعل (اعرضها كتبويبات/قائمة).

### ب) استدعاء السنة السابقة (الحالة 1)
**`POST /contracts/:contractId/comparative/link`** (بدون body)
- الرد: `{ message, data: { year, status, accountsCount, accounts:[...] } }` — بيرجّع الجدول جاهز.

### ج) إنشاء سنة مقارنة يدوية (الحالة 2)
**`POST /contracts/:contractId/comparative`** body:
```json
{ "year": "2024" }
```
- بيرجّع جدول مُهيّأ بنفس حسابات السنة الحالية (نفس الأكواد والأسماء) بأرصدة **صفرية**، عشان المستخدم يكتب القيم بس.
- الرد: `{ message, data: { year, status, accountsCount, accounts:[...] } }`

### د) جلب جدول سنة مقارنة (للعرض/التعديل)
**`GET /contracts/:contractId/comparative/:year`** → `{ year, status, accountsCount, accounts:[...] }`

### هـ) حفظ القيم المُدخلة يدوياً
**`PUT /contracts/:contractId/comparative/:year`** body:
```json
{
  "accounts": [
    {
      "accountCode": "1111",
      "accountName": "الصندوق الرئيسي",
      "beginningDebit": 0,
      "beginningCredit": 0,
      "debitMovement": 50000,
      "creditMovement": 0,
      "assignedAccountGuideId": 12,
      "worksheetOrder": 1
    }
  ]
}
```
- المستخدم بيدخل: **مدين افتتاحي / دائن افتتاحي / حركة مدينة / حركة دائنة** لكل حساب. الباقي (الرصيد النهائي…) النظام بيحسبه.
- **استبدال كامل:** ابعت كل صفوف الجدول في كل حفظ.
- **إضافة صف جديد يدوي:** ضيف عنصر جديد في مصفوفة `accounts` بـ `accountCode` (فريد) + `accountName` + القيم. **مهم:** لازم تبعت معاه `assignedAccountGuideId` (ربط بحساب من دليل الحسابات) عشان الصف يظهر في القوائم المالية — الصف غير المربوط بيتحفظ لكن مبيدخلش في التقرير. (اجلب الدليل من `GET /account-guides`.)
- أكواد الحسابات لازم تكون **غير مكررة** وإلا بيرجع خطأ 400 برسالة بالأكواد المكررة.
- الرد: الجدول بعد الحساب `{ message, data: {...} }`

### و) اعتماد وقفل سنة المقارنة (اختياري)
**`POST /contracts/:contractId/comparative/:year/confirm`**

---

## 3) شكل كائن الحساب (account) في الجدول
عند العرض بيرجع الحقول دي (المحسوبة تظهر للقراءة):
```
id, accountCode, accountName,
beginningDebit, beginningCredit, debitMovement, creditMovement,   // إدخال
adjustedBeginningBalance, netMovement, closingDebit, closingCredit,
finalBalance, balanceType,                                          // محسوبة (قراءة)
assignedAccountGuideId, worksheetOrder
```
عند الحفظ (PUT) ابعت حقول **الإدخال** فقط + `accountCode`/`accountName` (+ `assignedAccountGuideId` لو بتغيّره).

---

## 4) الفلو المطلوب في الواجهة
1. المستخدم يرفع ملف ميزان السنة الحالية (`upload`) ويقدر يعدّل عليه في الجدول ويحفظ/يعتمد.
2. ينده `comparative/context`:
   - لو `linkable` موجود → زر "استدعاء السنة السابقة" (`/comparative/link`).
   - وإلا/أو يدوي → dropdown يختار السنة → `POST /comparative` → يظهر جدول ميزان قابل للتعديل بكل الخانات → المستخدم يدخل القيم → `PUT /comparative/:year`.
3. بعد وجود السنة الحالية + المقارنة، يطلّع التقرير:
   **`GET /contracts/:contractId/../financial-statements/:contractId/full/pdf`** (PDF).
4. **الشركة الجديدة:** لو مفيش سنة مقارنة، التقرير بيطلع بفترة واحدة عادي — مفيش داعي لإجبار المستخدم على إدخال سنة سابقة.

## 5) رسائل الأخطاء
كل الأخطاء بترجع `{ "message": "نص عربي واضح" }` مع status مناسب (400/403/404) — اعرض الـ `message` للمستخدم مباشرة.

---
**ملاحظة:** خطوة "الأثر المالي" (تعديلات/إعادة عرض الفترة السابقة) لسه تحت التحديد وهتتضاف لاحقاً.

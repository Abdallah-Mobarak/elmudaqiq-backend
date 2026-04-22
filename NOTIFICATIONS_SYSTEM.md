# نظام الإشعارات (Notifications System) — توثيق كامل

> تم تطوير النظام على مرحلتين (Phase 1 + Phase 2) ليغطي كل الأحداث المهمة في السيستم ويرسل إشعارات تلقائية للأدوار المعنية، مع دعم البريد الإلكتروني للأحداث الحرجة.

---

## 📐 الهيكل المعماري (Architecture)

### الفلسفة
1. **Helper مركزي واحد** (`src/utils/notify.js`) يتعامل مع كل شيء.
2. **Fail-safe:** فشل الإشعار لا يوقف أبداً العملية الأصلية (أي إنشاء عقد أو رد شكوى إلخ).
3. **Role-based routing:** الإشعار بيروح للأدوار المعنية فقط، مش broadcast لكل حد.
4. **Tenant isolation:** كل إشعار مربوط بـ `subscriberId` عشان الـ multi-tenancy.
5. **Entity linking:** كل إشعار بيحمل `entityType` و `entityId` عشان الفرونت يعمل deep-linking لما اليوزر يضغط على الإشعار.

---

## 🗂️ الملفات الجديدة

### 1. `src/config/notificationTypes.js`
ثوابت (constants) لأنواع الإشعارات والكيانات:

```javascript
NOTIFICATION_TYPES:
  - CONTRACT_CREATED             // عقد جديد
  - CONTRACT_ACTIVATED           // إرجاع العقد للسكرتارية بتعليقات
  - CONTRACT_STAGE_ADVANCED      // انتقال مرحلة في الـ workflow
  - COMPLAINT_SUBMITTED          // شكوى جديدة (للأدمن)
  - COMPLAINT_REPLIED            // رد الأدمن على شكوى
  - SUBSCRIPTION_RENEWAL_DUE     // اشتراك قريب الانتهاء
  - SUBSCRIPTION_EXPIRED         // اشتراك منتهي
  - SYSTEM_ERROR                 // خطأ في النظام

ENTITY_TYPES:
  - CONTRACT
  - COMPLAINT
  - SUBSCRIPTION
  - SYSTEM
```

### 2. `src/utils/notify.js`
الـ helper المركزي. يحتوي على:

| الدالة | الاستخدام |
|--------|----------|
| `notifyUser(userId, payload)` | إشعار لمستخدم واحد |
| `notifyUsersByRole(subId, roleName, payload)` | إشعار لكل مستخدمي دور معين |
| `notifyUsersByRoles(subId, [roles], payload)` | إشعار لعدة أدوار في وقت واحد |
| `notifyBranchManager(branchId, payload)` | إشعار لمدير فرع |
| `notifySubscriberOwner(subId, payload)` | إشعار لمالك الاشتراك |
| `notifyAdmins(payload)` | إشعار لكل الأدمنز |
| `notifySubscriber(subId, payload)` | إشعار على مستوى السبسكريبر (ظاهر في الأدمن داشبورد) |
| `notifySystemError(context, error)` | إشعار خطأ سيستم للأدمنز |

**دعم البريد الإلكتروني:** أي `payload` يمكن إضافة له `sendEmail: true` وسيتم إرسال إيميل + تسجيل إشعار في الـ DB.

---

## 🗄️ تعديلات قاعدة البيانات

### Model: `Notification` (تم التعديل)
**الفيلدات الجديدة:**
```prisma
entityType String?   // CONTRACT | COMPLAINT | SUBSCRIPTION | SYSTEM
entityId   String?   // ID الكيان للـ deep-linking

@@index([userId, isRead])
@@index([subscriberId, isRead])
@@index([createdAt])
```

**لماذا:**
- `entityType` + `entityId` ← لما اليوزر يضغط على الإشعار، الفرونت يعرف يوديه لفين (العقد/الشكوى المعنية).
- الـ indexes ← لتسريع جلب الإشعارات غير المقروءة + الترتيب حسب التاريخ.

---

## 🎯 الأحداث المغطاة (Triggers)

### 1. الشكاوى (`src/services/complaint.service.js`)

| الحدث | المُبلَّغ | إيميل |
|-------|---------|-------|
| إنشاء شكوى جديدة | كل الأدمنز | ❌ |
| رد الأدمن على الشكوى | SUBSCRIBER_OWNER | ✅ |

---

### 2. العقود (`src/services/engagementContract.service.js`)

#### **إنشاء عقد جديد:**
| المُبلَّغ | إيميل |
|---------|-------|
| كل AUDIT_MANAGERs في نفس الفرع | ✅ |
| SUBSCRIBER_OWNER | ❌ |
| Branch Manager (لو العقد في فرع) | ❌ |

#### **مراجعة العقد (Audit Manager):**
| الحدث | المُبلَّغ |
|-------|---------|
| إرجاع للسكرتارية بتعليقات (status=ACTIVE) | Secretary (المُنشئ) |
| اعتماد العقد (→ PENDING_TECHNICAL_AUDIT) | كل TECHNICAL_AUDITORs |

#### **Workflow Stages Transitions (`submitStage`):**
كل ما حد يقدّم مرحلة، المرحلة التالية + الأودت مانجر بياخدوا إشعار:

| الانتقال | المُبلَّغ الأساسي | الأودت مانجر |
|---------|-----------------|-------------|
| PENDING_TECHNICAL_AUDIT → PENDING_FIELD_AUDIT | FIELD_AUDITOR + ASSISTANT_TECHNICAL_AUDITOR | ✅ |
| PENDING_FIELD_AUDIT → PENDING_QC_REVIEW | QUALITY_CONTROL | ✅ |
| PENDING_QC_REVIEW → PENDING_PARTNER_REVIEW | MANAGING_PARTNER | ✅ |
| PENDING_PARTNER_REVIEW → PENDING_REGULATORY_FILING | REGULATORY_FILINGS_OFFICER | ✅ |
| PENDING_REGULATORY_FILING → PENDING_ARCHIVING | ARCHIVE | ✅ |
| PENDING_ARCHIVING → COMPLETED | Secretary (المُنشئ) | ✅ |

#### **تعيين موظف على عقد (`assignStaff`):**
| المُبلَّغ | إيميل |
|---------|-------|
| الموظف المعيَّن | ❌ |

---

### 3. الاشتراكات (`src/services/renewalNotification.service.js`)

**تم إعادة كتابة الـ service بالكامل** لأنه كان يستخدم field (`subscriptionEndDate`) غير موجود في الـ schema الحالي. دلوقتي بيستخدم `Subscription` model الصحيح.

| الحالة | المُبلَّغ | إيميل |
|--------|---------|-------|
| اشتراك باقي عليه 7 أيام | SUBSCRIBER_OWNER + Admins | ❌ |
| اشتراك باقي عليه 1 يوم | SUBSCRIBER_OWNER + Admins | ✅ |
| اشتراك منتهي فعلاً | SUBSCRIBER_OWNER + Admins | ✅ |
| فشل الـ cron job | Admins (SYSTEM_ERROR) | ❌ |

> **منطق منع التكرار:** كل سبسكريبر بياخد إشعار واحد في اليوم فقط (عبر `lastRenewalNotification`).

---

### 4. ترقية الاشتراك (`src/services/subscriber.service.js`)

| الحدث | المُبلَّغ | إيميل |
|-------|---------|-------|
| ترقية لباقة جديدة (`upgradeSubscription`) | SUBSCRIBER_OWNER | ❌ |

---

## 🌐 API Endpoints

تم توسيع endpoints الإشعارات:

### للمستخدم المسجّل:

| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| GET | `/notifications/mine?page=1&limit=20&isRead=false` | جلب إشعاراتي مع pagination + فلتر |
| GET | `/notifications/mine/unread-count` | عدد غير المقروء (للـ badge) |
| PATCH | `/notifications/mine/mark-all-read` | تعليم كل إشعاراتي كمقروءة |
| PATCH | `/notifications/:id/read` | تعليم إشعار واحد كمقروء |

### للأدمن فقط:

| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| POST | `/notifications` | إنشاء إشعار يدوي |
| GET | `/notifications` | جلب كل الإشعارات |

---

## 📧 البريد الإلكتروني

### `src/services/email.service.js` (جديد: `sendNotificationEmail`)

دالة آمنة (لا ترمي errors) تستخدم transporter الموجود:

```javascript
sendNotificationEmail({ to, title, message })
  → ترسل HTML email بتنسيق RTL عربي
  → لو فشلت: بس بتكتب log ومبترميش error
```

**الاستخدام:** أضف `sendEmail: true` لأي payload في `notify.js`:

```javascript
notify.notifyUser(userId, {
  title: "...",
  message: "...",
  type: "...",
  sendEmail: true  // ← هيرسل إيميل + إشعار معاً
});
```

### الأحداث اللي بترسل إيميل تلقائياً:
1. ✅ إنشاء عقد جديد (للأودت مانجر)
2. ✅ رد على شكوى (للسبسكريبر)
3. ✅ اشتراك منتهي (للمالك + الأدمنز)
4. ✅ اشتراك باقي عليه يوم واحد (للمالك + الأدمنز)

---

## 🛡️ مبادئ الأمان والموثوقية

### 1. Fail-Safe
كل دوال `notify.js` تستخدم `safeCreate` / `safeCreateMany`:
- لو فشل الإشعار → تكتب log فقط
- **لا ترمي exception أبداً** → العملية الأصلية (إنشاء عقد، رد شكوى) مش هتتوقف

### 2. Tenant Isolation
- كل إشعار مربوط بـ `subscriberId` أو بـ `userId` (اللي بدوره مربوط بـ subscriber)
- دوال الـ role-based filtering تفلتر بـ `subscriberId` دايماً

### 3. Authorization في Mark-as-Read
- اليوزر يقدر يعلّم **إشعاراته فقط** كمقروءة
- لو حاول يعلّم إشعار لحد تاني → 403 Unauthorized

### 4. Duplicate Prevention
- Renewal notifications: `lastRenewalNotification` بتمنع تكرار نفس الإشعار في نفس اليوم

---

## 🧪 دليل التيست

### تيست Phase 1:

```bash
# 1. إنشاء شكوى → كل الأدمنز ياخدوا إشعار
POST /complaints
Body: { subscriberId, subscriberName, phone, email, message, type: "TECHNICAL" }

# 2. رد على الشكوى → SUBSCRIBER_OWNER ياخد إشعار + إيميل
POST /complaints/:id/respond
Body: { response: "..." }

# 3. إنشاء عقد → Audit Manager + Owner + Branch Manager
POST /engagement-contracts
Body: { ... }

# 4. إرجاع عقد بتعليقات → السكرتارية ياخد إشعار
PATCH /engagement-contracts/:id/review
Body: { status: "ACTIVE", comments: "يحتاج تعديل..." }

# 5. اعتماد عقد → Technical Auditors ياخدوا إشعار
PATCH /engagement-contracts/:id/review
Body: { status: "INACTIVE", comments: "..." }
```

### تيست Phase 2:

```bash
# 1. Submit Stage (بأي دور) → المرحلة التالية ياخدوا إشعار
PATCH /engagement-contracts/:id/submit-stage

# 2. تعيين موظف → الموظف ياخد إشعار
POST /engagement-contracts/:id/assign-staff
Body: { userId, role: "FIELD_AUDITOR" }

# 3. ترقية اشتراك → Owner ياخد إشعار
POST /subscribers/:id/upgrade
Body: { planId }

# 4. Cron job: شغله يدوي لاختبار renewal
# (أو انتظر 10 صباحاً)
```

### تيست الـ Endpoints:

```bash
# جلب إشعاراتي
GET /notifications/mine?page=1&limit=10
Authorization: Bearer <token>

# عدد غير المقروء
GET /notifications/mine/unread-count

# تعليم الكل كمقروء
PATCH /notifications/mine/mark-all-read

# تعليم واحد
PATCH /notifications/5/read
```

---

## 📊 ملخص الملفات المعدّلة

### ملفات جديدة (2):
- `src/config/notificationTypes.js`
- `src/utils/notify.js`

### ملفات معدّلة (8):
1. `prisma/schema.prisma` — إضافة `entityType`, `entityId`, indexes
2. `src/services/notification.service.js` — pagination + unread count + markAllAsRead
3. `src/controllers/notification.controller.js` — endpoints جديدة
4. `src/routes/notification.routes.js` — routes جديدة
5. `src/services/complaint.service.js` — hooks في create + respond
6. `src/services/engagementContract.service.js` — hooks في create + review + submitStage + assignStaff
7. `src/services/renewalNotification.service.js` — إعادة كتابة كاملة
8. `src/services/subscriber.service.js` — hook في upgradeSubscription
9. `src/cron/renewalNotifications.job.js` — notifySystemError عند فشل الـ cron
10. `src/services/email.service.js` — إضافة `sendNotificationEmail`

---

## 🔮 التحسينات المستقبلية المقترحة

1. **WebSocket / Server-Sent Events** للإشعارات الحية (real-time)
2. **Push Notifications** للموبايل
3. **Notification Preferences** لكل يوزر (يختار يستقبل إيه)
4. **Daily Digest Email** للإشعارات المتراكمة
5. **Templates** للإيميلات بدل الـ HTML الـ inline
6. **Activity Feed** مجمّع (من الإشعارات + activity logs)

---

## 📝 كيفية إضافة إشعار جديد (للمطورين)

### مثال: إضافة إشعار لما حد يعدّل العقد

```javascript
// 1. استيراد الأدوات
const notify = require("../utils/notify");
const { NOTIFICATION_TYPES, ENTITY_TYPES } = require("../config/notificationTypes");

// 2. في الـ service بعد عملية التعديل:
await notify.notifyUser(contract.createdById, {
  title: "تم تعديل عقدك",
  message: `قام ${user.fullName} بتعديل العقد.`,
  type: NOTIFICATION_TYPES.CONTRACT_STAGE_ADVANCED,
  entityType: ENTITY_TYPES.CONTRACT,
  entityId: contract.id,
  sendEmail: true,  // اختياري
});
```

**هذا كل ما يلزم.** الـ helper بيعمل الباقي: التحقق من الـ userId، إنشاء السجل، إرسال الإيميل (لو طلبت)، والـ error handling.

---

**تم التوثيق في:** 2026-04-21
**الإصدار:** 2.0 (Phase 1 + Phase 2 مكتمل)

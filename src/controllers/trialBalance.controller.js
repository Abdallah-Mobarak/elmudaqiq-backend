const importExcel = require("../utils/fileHandlers/importExcel");
const exportExcel = require("../utils/fileHandlers/exportExcel");
const exportPdf = require("../utils/fileHandlers/exportPdf");
const { calculateBalances } = require("../utils/calculations/trialBalanceCalc");
// استخدم الـ Prisma Client الموحد في مشروعك
const prisma = require("../config/prisma"); 

exports.uploadTrialBalance = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.id; // Int
    const fileBuffer = req.file;

    if (!fileBuffer) {
      return res.status(400).json({ message: "يرجى إرفاق ملف الإكسيل" });
    }

    // 1. جلب ميزان المراجعة إن وجد
    let trialBalance = await prisma.trialBalance.findUnique({ where: { contractId } });

    if (trialBalance) {
      if (trialBalance.status === "CONFIRMED") {
        return res.status(403).json({ message: "لا يمكن رفع ميزان جديد، الميزان الحالي معتمد (Locked)." });
      }
      // حذف الحسابات القديمة فقط بدلاً من حذف الميزان بأكمله للحفاظ على الـ Relations
      await prisma.trialBalanceAccount.deleteMany({
        where: { trialBalanceId: trialBalance.id }
      });
    } else {
      // إنشاء الميزان لأول مرة
      trialBalance = await prisma.trialBalance.create({
        data: { contractId, uploadedById: userId, status: "DRAFT" }
      });
    }

    const accountsData = [];
    const seenAccountCodes = new Set();
    const duplicateCodes = [];

    // 2. استخدام importExcel لقراءة البيانات
    await importExcel({
      fileBuffer: req.file,
      rowMapper: (row) => {
        const values = row.values;
        return {
          trialBalanceId: trialBalance.id,
          accountCode: String(values[1] || "").trim(),
          accountName: String(values[2] || "بدون اسم").trim(),
          beginningDebit: values[3] ? Number(values[3]) : 0,
          beginningCredit: values[4] ? Number(values[4]) : 0,
          debitMovement: values[5] ? Number(values[5]) : 0,
          creditMovement: values[6] ? Number(values[6]) : 0,
        };
      },
      insertHandler: async (mappedData) => {
        if (!mappedData.accountCode) return; // تخطي الصفوف الفارغة

        // التحقق من الحسابات المكررة
        if (seenAccountCodes.has(mappedData.accountCode)) {
          duplicateCodes.push(mappedData.accountCode);
          return;
        }
        seenAccountCodes.add(mappedData.accountCode);

        // حساب النتائج وتجميعها في الـ Array بدلاً من إدخالها مباشرة
        const calculations = calculateBalances(mappedData);
        accountsData.push({ ...mappedData, ...calculations });
      }
    });

    // 3. التحقق من وجود حسابات مكررة قبل الإدخال (Data Integrity Check)
    if (duplicateCodes.length > 0) {
      return res.status(400).json({
        message: "الملف مرفوض لاحتوائه على أكواد حسابات مكررة. يرجى تصحيحها وإعادة الرفع.",
        duplicateCodes
      });
    }

    // 4. تنفيذ إدخال جماعي (Bulk Insert - Performance Optimized)
    if (accountsData.length > 0) {
      await prisma.trialBalanceAccount.createMany({ data: accountsData });
    }

    return res.status(200).json({
      message: "تم رفع ميزان المراجعة ومعالجته بنجاح",
      importedAccountsCount: accountsData.length,
      trialBalanceId: trialBalance.id
    });

  } catch (error) {
    console.error("Trial Balance Upload Error:", error);
    res.status(error.status || 500).json({ message: error.customMessage || "حدث خطأ أثناء الرفع" });
  }
};

/**
 * المرحلة 5: اعتماد ميزان المراجعة (Confirm & Lock)
 */
exports.confirmTrialBalance = async (req, res, next) => {
  try {
    const { contractId } = req.params;

    const trialBalance = await prisma.trialBalance.findUnique({
      where: { contractId },
    });

    if (!trialBalance) {
      return res.status(404).json({ message: "لم يتم العثور على ميزان مراجعة لهذا العقد." });
    }

    if (trialBalance.status === 'CONFIRMED') {
      return res.status(400).json({ message: "ميزان المراجعة معتمد ومقفل بالفعل." });
    }

    const updated = await prisma.trialBalance.update({
      where: { id: trialBalance.id },
      data: { status: 'CONFIRMED' }
    });

    res.status(200).json({ 
      message: "تم اعتماد ميزان المراجعة بنجاح. لا يمكن تعديله بعد الآن.", 
      status: updated.status 
    });
  } catch (error) {
    console.error("Confirm Trial Balance Error:", error);
    next(error);
  }
};

/**
 * المرحلة 6: تصدير التقرير كـ Excel
 */
exports.exportTrialBalanceExcel = async (req, res, next) => {
  try {
    const { contractId } = req.params;

    const trialBalance = await prisma.trialBalance.findUnique({
      where: { contractId },
      include: {
        accounts: { orderBy: { accountCode: 'asc' } }
      }
    });

    if (!trialBalance || trialBalance.accounts.length === 0) {
      return res.status(404).json({ message: "لا توجد بيانات لتصديرها." });
    }

    const headers = [
      "Account Code", "Account Name", "Beginning Debit", "Beginning Credit",
      "Debit Movement", "Credit Movement", "Adj Beg Balance", "Net Movement", 
      "Closing Debit", "Closing Credit", "Final Balance", "Balance Type"
    ];

    const rows = trialBalance.accounts.map(acc => [
      acc.accountCode,
      acc.accountName,
      Number(acc.beginningDebit) + Number(acc.beginningDebitAdjustment),
      Number(acc.beginningCredit) + Number(acc.beginningCreditAdjustment),
      Number(acc.debitMovement) + Number(acc.debitMovementAdjustment),
      Number(acc.creditMovement) + Number(acc.creditMovementAdjustment),
      Number(acc.adjustedBeginningBalance),
      Number(acc.netMovement),
      Number(acc.closingDebit),
      Number(acc.closingCredit),
      Number(acc.finalBalance),
      acc.balanceType
    ]);

    const { filePath } = await exportExcel({
      headers,
      rows,
      filePrefix: "Trial_Balance"
    });

    res.download(filePath);
  } catch (error) {
    console.error("Export Excel Error:", error);
    next(error);
  }
};

/**
 * المرحلة 6: تصدير التقرير كـ PDF
 */
exports.exportTrialBalancePdf = async (req, res, next) => {
  try {
    const { contractId } = req.params;

    const trialBalance = await prisma.trialBalance.findUnique({
      where: { contractId },
      include: {
        accounts: { orderBy: { accountCode: 'asc' } }
      }
    });

    if (!trialBalance || trialBalance.accounts.length === 0) {
      return res.status(404).json({ message: "لا توجد بيانات لتصديرها." });
    }

    const headers = [
      { label: "Code", width: 60 },
      { label: "Account Name", width: 140 },
      { label: "Adj Beg Bal", width: 70 },
      { label: "Net Mov", width: 70 },
      { label: "Closing Dr", width: 70 },
      { label: "Closing Cr", width: 70 },
      { label: "Final Bal", width: 70 },
      { label: "Type", width: 50 }
    ];

    const rows = trialBalance.accounts.map(acc => [
      acc.accountCode,
      acc.accountName,
      Number(acc.adjustedBeginningBalance).toFixed(2),
      Number(acc.netMovement).toFixed(2),
      Number(acc.closingDebit).toFixed(2),
      Number(acc.closingCredit).toFixed(2),
      Number(acc.finalBalance).toFixed(2),
      acc.balanceType
    ]);

    const { filePath, stream } = await exportPdf({
      title: "Trial Balance Report",
      headers,
      rows,
      filePrefix: "Trial_Balance",
      landscape: true
    });

    stream.on("finish", () => res.download(filePath));
    stream.on("error", (err) => next(err));
  } catch (error) {
    console.error("Export PDF Error:", error);
    next(error);
  }
};

/**
 * المرحلة 3: جلب بيانات ميزان المراجعة للعرض في جدول (Grid)
 */
exports.getTrialBalance = async (req, res, next) => {
  try {
    const { contractId } = req.params;
    const { page = 1, limit = 25, search } = req.query;

    const trialBalance = await prisma.trialBalance.findUnique({
      where: { contractId },
    });

    if (!trialBalance) {
      return res.status(404).json({ message: "لم يتم العثور على ميزان مراجعة لهذا العقد." });
    }

    const where = { trialBalanceId: trialBalance.id };
    if (search) {
      where.OR = [
        { accountCode: { contains: search, mode: 'insensitive' } },
        { accountName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // تنفيذ عدة استعلامات معاً لتحسين الأداء
    const [accounts, totalAccounts, totals, totalFinalDebit, totalFinalCredit] = await prisma.$transaction([
      // 1. جلب الحسابات للصفحة الحالية
      prisma.trialBalanceAccount.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { accountCode: 'asc' }
      }),
      // 2. جلب العدد الإجمالي للحسابات (لـ Pagination)
      prisma.trialBalanceAccount.count({ where }),
      // 3. جلب مجاميع الأعمدة الأساسية
      prisma.trialBalanceAccount.aggregate({
        _sum: {
          beginningDebit: true,
          beginningCredit: true,
          debitMovement: true,
          creditMovement: true,
          beginningDebitAdjustment: true,
          beginningCreditAdjustment: true,
          debitMovementAdjustment: true,
          creditMovementAdjustment: true,
          closingDebit: true,
          closingCredit: true,
        },
        where,
      }),
      // 4. جلب مجموع الأرصدة النهائية المدينة
      prisma.trialBalanceAccount.aggregate({
        _sum: { finalBalance: true },
        where: { ...where, finalBalance: { gt: 0 } }
      }),
      // 5. جلب مجموع الأرصدة النهائية الدائنة
      prisma.trialBalanceAccount.aggregate({
        _sum: { finalBalance: true },
        where: { ...where, finalBalance: { lt: 0 } }
      })
    ]);

    const finalDebit = totalFinalDebit._sum.finalBalance || 0;
    const finalCredit = Math.abs(totalFinalCredit._sum.finalBalance || 0);

    // تجميع الإجماليات في كائن واحد لإرساله للـ Frontend
    const summary = {
      ...totals._sum,
      totalFinalDebit: finalDebit,
      totalFinalCredit: finalCredit,
      difference: finalDebit - finalCredit,
    };

    res.status(200).json({
      data: accounts,
      summary,
      pagination: {
        total: totalAccounts,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalAccounts / limit)
      },
      status: trialBalance.status // لإعلام الواجهة إذا كان الميزان مقفلاً
    });

  } catch (error) {
    console.error("Get Trial Balance Error:", error);
    next(error);
  }
};

/**
 * المرحلة 4: تحديث التسويات (Adjustments) لحساب معين
 */
exports.updateAccountAdjustments = async (req, res, next) => {
  try {
    const { accountId } = req.params;
 
    const account = await prisma.trialBalanceAccount.findUnique({
      where: { id: accountId },
      include: { 
        trialBalance: { 
          include: { contract: true } 
        } 
      }
    });
 
    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }
    
    if (account.trialBalance.contract.workflowStage !== 'PENDING_TECHNICAL_AUDIT') {
      return res.status(403).json({ message: "لا يمكن التعديل، تم إغلاق هذه المرحلة من العمل." });
    }
 
    if (account.trialBalance.status === 'CONFIRMED') {
      return res.status(403).json({ message: "لا يمكن تعديل التسويات، ميزان المراجعة معتمد ومقفل." });
    }

    const accountForCalc = { ...account, ...req.body };
    const newCalculations = calculateBalances(accountForCalc);

    const updatedAccount = await prisma.trialBalanceAccount.update({
      where: { id: accountId },
      data: { ...req.body, ...newCalculations }
    });

    res.status(200).json(updatedAccount);

  } catch (error) {
    console.error("Update Adjustment Error:", error);
    next(error);
  }
}; 
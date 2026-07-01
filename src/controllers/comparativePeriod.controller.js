const svc = require("../services/comparativePeriod.service");

// سياق المقارنة: السنة الحالية + السنوات الموجودة + هل يوجد عقد سابق للاستدعاء
exports.getContext = async (req, res, next) => {
  try {
    res.status(200).json(await svc.getContext(req.params.contractId));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

// إنشاء فترة مقارنة يدوية لسنة محددة (تُهيّأ بهيكل حسابات السنة الحالية)
exports.createManual = async (req, res, next) => {
  try {
    const { year } = req.body;
    if (!year) return res.status(400).json({ message: "السنة (year) مطلوبة." });
    const data = await svc.createManual(req.params.contractId, year, req.user.id);
    res.status(201).json({ message: "تم إنشاء فترة المقارنة، أدخل القيم ثم احفظ.", data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

// استدعاء فترة المقارنة من عقد سنة سابقة لنفس الشركة
exports.linkFromPrior = async (req, res, next) => {
  try {
    const data = await svc.linkFromPrior(req.params.contractId, req.user.id);
    res.status(201).json({ message: "تم استدعاء بيانات السنة السابقة بنجاح.", data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

// جلب جدول فترة المقارنة للعرض/التعديل
exports.getGrid = async (req, res, next) => {
  try {
    res.status(200).json(await svc.getGrid(req.params.contractId, req.params.year));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

// حفظ القيم المُدخلة يدوياً
exports.saveManual = async (req, res, next) => {
  try {
    const data = await svc.saveManual(req.params.contractId, req.params.year, req.body.accounts);
    res.status(200).json({ message: "تم حفظ فترة المقارنة بنجاح.", data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

// اعتماد وقفل فترة المقارنة
exports.confirm = async (req, res, next) => {
  try {
    const data = await svc.confirm(req.params.contractId, req.params.year);
    res.status(200).json({ message: "تم اعتماد فترة المقارنة.", data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  }
};

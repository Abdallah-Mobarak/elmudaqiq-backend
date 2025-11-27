// src/utils/fileHandlers/importExcel.js

const ExcelJS = require("exceljs");

/**
 * importExcel
 * @param {Object} options
 * @param {string} options.filePath - مسار ملف الإكسيل اللي اترفع
 * @param {(row: any) => Object | null} options.mapRowToModel - دالة تحول الصف لـ object مناسب للداتابيز
 * @param {number} [options.headerRow] - رقم صف الـ header (افتراضي 1)
 * @returns {Promise<Array<Object>>}
 */
const importExcel = async ({ filePath, mapRowToModel, headerRow = 1 }) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0]; // أول شيت
  const result = [];

  worksheet.eachRow((row, rowNumber) => {
    // تخطي صف الهيدر
    if (rowNumber <= headerRow) return;

    const mapped = mapRowToModel(row);
    if (mapped) {
      result.push(mapped);
    }
  });

  return result;
};

module.exports = {
  importExcel,
};

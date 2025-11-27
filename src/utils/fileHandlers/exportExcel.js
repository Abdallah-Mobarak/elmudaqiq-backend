// src/utils/fileHandlers/exportExcel.js

const ExcelJS = require("exceljs");

/**
 * exportExcel
 * @param {Object} options
 * @param {Array<{ key: string, header?: string, label?: string, width?: number }>} options.columns
 * @param {Array<Object>} options.data
 * @param {string} [options.sheetName]
 * @returns {Promise<Buffer>} Excel file as Buffer
 */
const exportExcel = async ({ columns, data, sheetName = "Sheet1" }) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // إعداد الأعمدة من الـ config
  worksheet.columns = columns.map((col) => ({
    header: col.header || col.label || col.key,
    key: col.key,
    width: col.width || 20,
  }));

  // إضافة الصفوف من الـ data (كل object بيمثل صف)
  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // نرجّع Buffer علشان الـ controller أو الـ service يتصرف فيه
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  exportExcel,
};

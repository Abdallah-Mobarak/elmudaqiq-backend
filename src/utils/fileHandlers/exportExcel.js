const ExcelJS = require("exceljs");
const fs = require("fs");


module.exports = async ({ headers, rows, filePrefix }) => {

  if (!rows.length) {
    throw new Error("No data to export");
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export");

  sheet.addRow(headers);
  rows.forEach(row => sheet.addRow(row));

  if (!fs.existsSync("exports")) fs.mkdirSync("exports");

  const filePath = `exports/${filePrefix}_${Date.now()}.xlsx`;

  await workbook.xlsx.writeFile(filePath);

  return { filePath };
};

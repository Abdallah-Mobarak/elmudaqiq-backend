const ExcelJS = require("exceljs");

/*
  Generic Excel Import Function
  - Accepts file buffer
  - Accepts a row mapper
  - Accepts insert handler
*/

module.exports = async ({ fileBuffer, rowMapper, insertHandler }) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer.buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw { customMessage: "Excel sheet not found", status: 400 };
  }

  const rows = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    rows.push(rowMapper(row));
  });

  let imported = 0;

  for (const r of rows) {
    await insertHandler(r);
    imported++;
  }

  return { imported };
};

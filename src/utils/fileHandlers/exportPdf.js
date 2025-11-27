const PDFDocument = require("pdfkit");

/**
 * exportPDF
 * @param {Object} options
 * @param {string} options.title - عنوان التقرير
 * @param {Array<{ key: string, label: string, width?: number }>} options.columns
 * @param {Array<Object>} options.data
 * @returns {Promise<Buffer>} PDF file as Buffer
 */

const exportPDF = ({ title, columns, data }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on("error", (err) => reject(err));

    // العنوان
    doc.fontSize(18).text(title, { align: "center" });
    doc.moveDown(1.5);

    // الهيدر (أسماء الأعمدة)
    doc.fontSize(12).font("Helvetica-Bold");
    columns.forEach((col) => {
      doc.text(col.label || col.key, {
        continued: true,
        width: col.width || 100,
      });
    });
    doc.text(""); // move to next line
    doc.moveDown(0.5);
    doc.moveTo(doc.x, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // الصفوف
    doc.fontSize(10).font("Helvetica");
    data.forEach((row) => {
      columns.forEach((col) => {
        const value = row[col.key] != null ? String(row[col.key]) : "";
        doc.text(value, {
          continued: true,
          width: col.width || 100,
        });
      });
      doc.text(""); // next line
    });

    doc.end();
  });
};

module.exports = {
  exportPDF,
};

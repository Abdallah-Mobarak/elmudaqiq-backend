const PDFDocument = require("pdfkit");
const fs = require("fs");

/*
  Generic PDF Export
  - title: document title
  - headers: table headers
  - rows: table rows
  - filePrefix: output file prefix
*/

module.exports = async ({ title, headers, rows, filePrefix }) => {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  if (!fs.existsSync("exports")) fs.mkdirSync("exports");

  const filePath = `exports/${filePrefix}_${Date.now()}.pdf`;
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const drawHeader = () => {
    doc.font("Helvetica-Bold").fontSize(20).text("AL MUDAQIQ", { align: "left" });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(14).text(title, { align: "center" });
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);
  };

  drawHeader();
  doc.on("pageAdded", drawHeader);

  doc.font("Helvetica-Bold").fontSize(10);
  let y = doc.y;
  let x = 40;

  headers.forEach((h) => {
    doc.rect(x, y, h.width, 20).stroke();
    doc.text(h.label, x + 5, y + 6, { width: h.width - 10 });
    x += h.width;
  });

  y += 20;
  doc.font("Helvetica").fontSize(9);

  rows.forEach((row) => {
    let xRow = 40;

    if (y > 750) {
      doc.addPage();
      y = doc.y;
    }

    row.forEach((cell, i) => {
      doc.rect(xRow, y, headers[i].width, 18).stroke();
      doc.text(cell ?? "", xRow + 5, y + 5, {
        width: headers[i].width - 10,
      });
      xRow += headers[i].width;
    });

    y += 18;
  });

  doc.end();
  return { filePath, stream };
};

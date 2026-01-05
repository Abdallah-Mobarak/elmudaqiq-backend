const PDFDocument = require("pdfkit");
const fs = require("fs");

/*
  Generic PDF Export
  - title: document title
  - headers: table headers (array of {label, width?})
  - rows: table rows
  - filePrefix: output file prefix
*/

module.exports = async ({ title, headers, rows, filePrefix, landscape = true }) => {
  // Use landscape orientation for better column width handling
  const doc = new PDFDocument({ 
    size: landscape ? [842, 595] : [595, 842], // [width, height] - landscape: [842, 595]
    margin: 40,
    autoFirstPage: true
  });

  if (!fs.existsSync("exports")) fs.mkdirSync("exports");

  const filePath = `exports/${filePrefix}_${Date.now()}.pdf`;
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Page dimensions - landscape: width=842, height=595
  const pageWidth = landscape ? 842 : 595; // A4 landscape width in points
  const pageHeight = landscape ? 595 : 842; // A4 landscape height in points
  const margin = 40;
  const availableWidth = pageWidth - (margin * 2); // ~762 points for landscape
  const bottomMargin = 40;
  const maxY = pageHeight - bottomMargin;

  // Calculate column widths automatically if not provided
  const calculateColumnWidths = () => {
    const totalDefinedWidth = headers.reduce((sum, h) => sum + (h.width || 0), 0);
    const columnsWithoutWidth = headers.filter(h => !h.width).length;
    const totalColumns = headers.length;
    
    // If all widths are defined and fit, use them
    if (columnsWithoutWidth === 0 && totalDefinedWidth <= availableWidth) {
      return headers.map(h => h.width);
    }
    
    // Auto-calculate widths with better distribution
    if (columnsWithoutWidth > 0) {
      const remainingWidth = availableWidth - totalDefinedWidth;
      const autoWidth = Math.floor(remainingWidth / columnsWithoutWidth);
      
      return headers.map(h => {
        if (h.width) return h.width;
        // Minimum width to prevent too narrow columns
        return Math.max(autoWidth, 60);
      });
    } else {
      // Scale down all widths proportionally if they exceed available width
      if (totalDefinedWidth > availableWidth) {
        const scale = availableWidth / totalDefinedWidth;
        return headers.map(h => Math.max(Math.floor(h.width * scale), 50));
      }
      return headers.map(h => h.width);
    }
  };

  const columnWidths = calculateColumnWidths();
  const cellPadding = 4;
  const headerHeight = 22;
  const minRowHeight = 18;
  const fontSize = 8; // Smaller font for better fit
  const headerFontSize = 9;

  // Helper function to detect if text contains Arabic characters
  const hasArabic = (text) => {
    if (!text) return false;
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(String(text));
  };

  // Helper function to get text height with wrapping
  const getTextHeight = (text, width, fontSize) => {
    if (!text) return minRowHeight;
    try {
      doc.fontSize(fontSize);
      const textWidth = width - (cellPadding * 2);
      const height = doc.heightOfString(String(text), {
        width: textWidth
      });
      return Math.max(minRowHeight, height + (cellPadding * 2));
    } catch (error) {
      return minRowHeight;
    }
  };

  // Helper function to draw text with Arabic support and better wrapping
  const drawText = (text, x, y, width, fontSize, isBold = false) => {
    if (!text) return;
    const font = isBold ? "Helvetica-Bold" : "Helvetica";
    doc.font(font).fontSize(fontSize);
    
    const textStr = String(text);
    const textWidth = width - (cellPadding * 2);
    
    // For Arabic text, use right-to-left alignment
    const alignment = hasArabic(textStr) ? 'right' : 'left';
    
    try {
      // Use better text wrapping with proper line gap
      doc.text(textStr, x + cellPadding, y + cellPadding, {
        width: textWidth,
        align: alignment,
        ellipsis: false, // Don't truncate, wrap instead
        lineGap: 1,
        paragraphGap: 0
      });
    } catch (error) {
      // Fallback: truncate very long text if wrapping fails
      const maxChars = Math.floor(textWidth / (fontSize * 0.6)); // Approximate chars per line
      const safeText = textStr.length > maxChars * 2 
        ? textStr.substring(0, maxChars * 2) + '...' 
        : textStr;
      doc.text(safeText, x + cellPadding, y + cellPadding, {
        width: textWidth,
        align: alignment,
        lineGap: 1
      });
    }
  };

  const drawHeader = () => {
    doc.font("Helvetica-Bold").fontSize(18).text("AL MUDAQIQ", margin, margin, {
      align: "left"
    });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(12).text(title, margin, doc.y, {
      align: "center",
      width: availableWidth
    });
    doc.moveDown(0.8);
    const lineY = doc.y;
    doc.moveTo(margin, lineY).lineTo(pageWidth - margin, lineY).stroke();
    doc.moveDown(0.8);
  };

  drawHeader();
  doc.on("pageAdded", drawHeader);

  // Draw table headers
  let y = doc.y;
  let x = margin;

  doc.font("Helvetica-Bold").fontSize(headerFontSize);
  
  headers.forEach((h, i) => {
    const width = columnWidths[i];
    doc.rect(x, y, width, headerHeight).stroke();
    drawText(h.label, x, y, width, headerFontSize, true);
    x += width;
  });

  y += headerHeight;
  doc.font("Helvetica").fontSize(fontSize);

  // Draw table rows
  rows.forEach((row) => {
    // Check if we need a new page
    if (y > maxY - minRowHeight) {
      doc.addPage();
      y = doc.y;
    }

    // Calculate row height based on content
    let rowHeight = minRowHeight;
    row.forEach((cell, i) => {
      const cellHeight = getTextHeight(cell, columnWidths[i], fontSize);
      rowHeight = Math.max(rowHeight, cellHeight);
    });

    // Draw cells
    let xRow = margin;
    row.forEach((cell, i) => {
      const width = columnWidths[i];
      doc.rect(xRow, y, width, rowHeight).stroke();
      drawText(cell, xRow, y, width, fontSize, false);
      xRow += width;
    });

    y += rowHeight;
  });

  // Return stream and filePath immediately
  // Controller will attach 'finish' event listener, then we call doc.end()
  const result = { filePath, stream };
  
  // Use process.nextTick to ensure doc.end() is called after the return
  // This allows controller to attach event listeners first
  process.nextTick(() => {
    doc.end();
  });
  
  return result;
};
 
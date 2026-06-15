const fs = require("fs");
const path = require("path");

/**
 * Render an HTML string to a formal A4 PDF using a headless browser (Puppeteer).
 * Handles Arabic shaping + RTL natively. Returns { filePath, buffer }.
 *
 * On the server, set PUPPETEER_EXECUTABLE_PATH to a system Chrome to avoid
 * bundling Chromium; locally puppeteer's bundled Chromium is used by default.
 */
let _browserPromise = null;

async function getBrowser() {
  const puppeteer = require("puppeteer");
  if (!_browserPromise) {
    _browserPromise = puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });
  }
  return _browserPromise;
}

module.exports = async function exportPdfFromHtml({
  html,
  filePrefix = "document",
  outDir = "exports",
  format = "A4",
  landscape = false,
  margin = { top: "16mm", bottom: "18mm", left: "12mm", right: "12mm" },
}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    // Give web fonts a moment to load.
    if (page.evaluateHandle) {
      try {
        await page.evaluate(async () => document.fonts && document.fonts.ready);
      } catch (_) {}
    }

    const buffer = await page.pdf({
      format,
      landscape,
      printBackground: true,
      margin,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="width:100%; font-size:9px; color:#666; padding:0 12mm;
                    font-family:'Cairo','Arial',sans-serif; direction:rtl;
                    display:flex; justify-content:space-between;">
          <span>المدقق — ALMUDAQIQ</span>
          <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>`,
    });

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, `${filePrefix}_${Date.now()}.pdf`);
    fs.writeFileSync(filePath, buffer);
    return { filePath, buffer };
  } finally {
    await page.close();
  }
};

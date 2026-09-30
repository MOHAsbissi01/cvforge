import { chromium, webkit, devices } from "playwright";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const base = process.env.CVFORGE_URL || "http://127.0.0.1:5173/cvforge/";
const lines = [
  "Jordan Rivera",
  "Data Analyst",
  "jordan@example.com",
  "SUMMARY",
  "I build SQL dashboards and data pipelines.",
  "EXPERIENCE",
  "Northstar | Data Intern",
  "Built Power BI reports for sales teams.",
  "SKILLS",
  "Data: SQL, Power BI, Python",
];

const pdf = await PDFDocument.create();
const pdfPage = pdf.addPage([595, 842]);
lines.forEach((line, index) =>
  pdfPage.drawText(line, { x: 45, y: 790 - index * 30, size: 12 }),
);
const pdfBytes = Buffer.from(await pdf.save());

const zip = new JSZip();
zip.file(
  "[Content_Types].xml",
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
);
zip.file(
  "_rels/.rels",
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
);
zip.file(
  "word/document.xml",
  `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map((line) => `<w:p><w:r><w:t>${line.replaceAll("&", "&amp;")}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`,
);
const docxBytes = await zip.generateAsync({ type: "nodebuffer" });

const results = [];
for (const [engine, device] of [
  [chromium, devices["Pixel 7"]],
  [webkit, devices["iPhone 13"]],
]) {
  const browser = await engine.launch({
    headless: true,
    ...(engine === chromium &&
    (process.env.CHROME_PATH || process.platform === "win32")
      ? {
          executablePath:
            process.env.CHROME_PATH ||
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        }
      : {}),
  });
  const page = await browser.newPage({ ...device, acceptDownloads: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (engine === webkit) {
    await page.addInitScript(() => {
      Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, {
        value: undefined,
        configurable: true,
      });
    });
  }
  try {
    await page.goto(`${base}#/import`);
    const imageBytes = Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 1600;
        const context = canvas.getContext("2d");
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "black";
        context.font = "42px Arial";
        [
          "Jordan Rivera",
          "Data Analyst",
          "jordan@example.com",
          "SUMMARY",
          "I build SQL dashboards and data pipelines.",
        ].forEach((line, index) =>
          context.fillText(line, 70, 100 + index * 100),
        );
        return canvas.toDataURL("image/png").split(",")[1];
      }),
      "base64",
    );
    const scanned = await PDFDocument.create();
    const scannedPage = scanned.addPage([595, 842]);
    const image = await scanned.embedPng(imageBytes);
    scannedPage.drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
    const scannedBytes = Buffer.from(await scanned.save());
    for (const [format, files] of [
      [
        "PDF",
        [
          {
            name: "cv.pdf",
            mimeType: "application/octet-stream",
            buffer: pdfBytes,
          },
        ],
      ],
      [
        "DOCX",
        [
          {
            name: "cv.docx",
            mimeType: "application/octet-stream",
            buffer: docxBytes,
          },
        ],
      ],
      [
        "Scanned PDF",
        [
          {
            name: "scan.pdf",
            mimeType: "application/pdf",
            buffer: scannedBytes,
          },
        ],
      ],
      [
        "PNG",
        [{ name: "page1.png", mimeType: "image/png", buffer: imageBytes }],
      ],
      [
        "Multiple PNG",
        [
          { name: "page1.png", mimeType: "image/png", buffer: imageBytes },
          { name: "page2.png", mimeType: "image/png", buffer: imageBytes },
        ],
      ],
    ]) {
      await page.goto(`${base}#/import`);
      const picker = page.waitForEvent("filechooser");
      await page.locator(".upload-zone").tap();
      await (await picker).setFiles(files);
      await page
        .getByText("Imported information may contain errors")
        .waitFor({ timeout: 60000 });
      if ((await page.getByLabel("First name").inputValue()) !== "Jordan")
        throw new Error(`${engine.name()} ${format}: name was not imported`);
      results.push(`${engine.name()} ${format}`);
    }
    await page
      .getByRole("button", { name: /Accept and review in builder/ })
      .click();
    await page.getByRole("heading", { name: "Build your CV" }).waitFor();
    await page.getByRole("link", { name: /3 Check/ }).click();
    await page.getByRole("heading", { name: /working/ }).waitFor();
    await page.getByRole("link", { name: /Continue to preview/ }).click();
    await page.getByRole("heading", { name: "Ready to share." }).waitFor();
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: "Export PDF" }).last().click();
    const download = await downloadPromise;
    const output = join(tmpdir(), `cvforge-${engine.name()}-mobile.pdf`);
    await download.saveAs(output);
    if ((await PDFDocument.load(readFileSync(output))).getPageCount() !== 1)
      throw new Error(`${engine.name()}: export was not one page`);
    if (errors.length)
      throw new Error(`${engine.name()} page errors: ${errors.join("; ")}`);
    results.push(`${engine.name()} flow`);
  } finally {
    await browser.close();
  }
}
console.log(JSON.stringify({ status: "passed", results }, null, 2));

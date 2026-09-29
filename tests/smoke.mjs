import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PDFDocument } from "pdf-lib";

const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({
  headless: true,
  executablePath: chrome,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const base = process.env.CVFORGE_URL || "http://127.0.0.1:5173/cvforge/";
try {
  await page.goto(base);
  await page
    .getByRole("heading", { name: /Build a CV recruiters can actually read/ })
    .waitFor();
  await page.goto(`${base}#/resources`);
  await page.getByRole("heading", { name: "Good CVs are clear." }).waitFor();
  await page.goto(base);
  await page.screenshot({
    path: join(tmpdir(), "cvforge-landing.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Build my CV" }).click();
  await page.getByRole("button", { name: "Try demo data" }).click();
  await page.getByText("Alex Martin", { exact: false }).first().waitFor();
  await page.waitForTimeout(650);
  await page.reload();
  if (
    !(await page.getByText("Alex Martin", { exact: false }).first().isVisible())
  )
    throw new Error("Draft did not persist after reload");
  await page.screenshot({
    path: join(tmpdir(), "cvforge-builder.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "ATS review" }).click();
  await page.getByText("ATS readiness check").waitFor();
  await page
    .getByPlaceholder(/Paste a job description/)
    .fill("Python SQL Power BI Kubernetes");
  await page.getByText("kubernetes", { exact: false }).first().waitFor();
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await page.getByRole("button", { name: /Technical Student/ }).waitFor();
  await page.getByLabel("QR destination").selectOption("github");
  await page
    .getByAltText(/QR code for/)
    .first()
    .waitFor();
  await page.getByLabel("Include small QR code in CV").check();
  await page.locator(".cv-document .cv-qr").waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).last().click();
  const download = await downloadPromise;
  const pdfPath = join(tmpdir(), "cvforge-smoke-export.pdf");
  await download.saveAs(pdfPath);
  if (!existsSync(pdfPath)) throw new Error("PDF download missing");
  const pdf = await PDFDocument.load(readFileSync(pdfPath));
  if (pdf.getPageCount() !== 1 || !pdf.getPages()[0].node.Annots())
    throw new Error("A4 PDF or link annotations missing");
  await page.screenshot({
    path: join(tmpdir(), "cvforge-preview.png"),
    fullPage: true,
  });

  const longProfile = JSON.parse(
    await page.evaluate(() => localStorage.getItem("cvforge.profile.v1")),
  );
  longProfile.experience = Array.from({ length: 15 }, (_, index) => ({
    id: `long-${index}`,
    company: `Fictional Organization ${index + 1}`,
    position: "Contributor",
    startDate: "2024-01",
    endDate: "2024-06",
    description:
      "Built a reporting workflow for a student case study.\nDocumented the process and shared findings with the team.",
  }));
  const longPage = await browser.newPage({ acceptDownloads: true });
  longPage.on("pageerror", (error) => errors.push(error.message));
  await longPage.goto(base);
  await longPage.evaluate(
    (profile) =>
      localStorage.setItem("cvforge.profile.v1", JSON.stringify(profile)),
    longProfile,
  );
  await longPage.reload();
  await longPage.goto(`${base}#/preview`);
  await longPage.getByRole("button", { name: "Export PDF" }).last().click();
  await longPage
    .getByRole("alert")
    .getByText(/does not fit on one page/)
    .waitFor();
  await longPage.close();

  const emptyPage = await browser.newPage();
  await emptyPage.goto(`${base}#/preview`);
  await emptyPage.getByRole("button", { name: "Export PDF" }).last().click();
  await emptyPage
    .getByRole("alert")
    .getByText(/first and last name/)
    .waitFor();
  await emptyPage.close();

  let importResult = "not requested";
  if (process.argv[2]) {
    const importPage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    importPage.on("pageerror", (error) => errors.push(error.message));
    await importPage.goto(`${base}#/import`);
    await importPage
      .locator("input[type=file]")
      .setInputFiles({
        name: "invalid.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("not a pdf"),
      });
    await importPage
      .getByRole("alert")
      .getByText("This file does not appear to be a valid PDF.")
      .waitFor();
    await importPage.locator("input[type=file]").setInputFiles(process.argv[2]);
    await importPage
      .getByText("Imported information may contain errors")
      .waitFor({ timeout: 15000 });
    if (
      !(await importPage.getByLabel("First name").inputValue()) ||
      !(await importPage.getByLabel("Last name").inputValue())
    )
      throw new Error("Import missed the profile name");
    await importPage.screenshot({
      path: join(tmpdir(), "cvforge-import.png"),
      fullPage: true,
    });
    importResult = await importPage.locator(".import-counts").innerText();
    await importPage.close();
  }

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  // Safari can provide ReadableStream.getReader() without async iteration.
  await mobile.addInitScript(() => {
    Object.defineProperty(ReadableStream.prototype, Symbol.asyncIterator, {
      value: undefined,
      configurable: true,
    });
  });
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto(base);
  await mobile.screenshot({
    path: join(tmpdir(), "cvforge-mobile.png"),
    fullPage: true,
  });
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  if (overflow)
    throw new Error("Landing page has horizontal overflow on mobile");
  await mobile.goto(`${base}#/import`);
  const mobilePdf = await PDFDocument.create();
  const mobilePdfPage = mobilePdf.addPage([595, 842]);
  mobilePdfPage.drawText("Jordan Rivera", { x: 50, y: 790, size: 20 });
  mobilePdfPage.drawText("Data Analyst", { x: 50, y: 760, size: 12 });
  mobilePdfPage.drawText("jordan@example.com", { x: 50, y: 740, size: 12 });
  mobilePdfPage.drawText("SUMMARY", { x: 50, y: 700, size: 12 });
  mobilePdfPage.drawText(
    "I build dashboards and SQL reports for business teams.",
    { x: 50, y: 680, size: 12 },
  );
  const picker = mobile.waitForEvent("filechooser");
  await mobile.locator(".upload-zone").tap();
  const chooser = await picker;
  await chooser.setFiles({
    name: "mobile-cv.pdf",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(await mobilePdf.save()),
  });
  await mobile.getByText("Imported information may contain errors").waitFor();
  if ((await mobile.getByLabel("First name").inputValue()) !== "Jordan")
    throw new Error("Mobile upload missed the name");
  await mobile.goto(base);
  await mobile.getByRole("link", { name: "Build my CV" }).click();
  await mobile.getByRole("button", { name: "Try demo data" }).click();
  await mobile.getByRole("button", { name: "Preview", exact: true }).click();
  await mobile.locator(".preview-scroll .cv-document").waitFor();
  await mobile.screenshot({
    path: join(tmpdir(), "cvforge-mobile-builder.png"),
    fullPage: true,
  });
  await mobile.getByRole("button", { name: "Clear all data" }).click();
  await mobile.getByRole("button", { name: "Clear all data" }).last().click();
  await mobile.waitForTimeout(600);
  if (await mobile.evaluate(() => localStorage.getItem("cvforge.profile.v1")))
    throw new Error("Clear data did not remove draft");
  await mobile.close();
  console.log(
    JSON.stringify(
      {
        status: "passed",
        pdfPath,
        longPdfBlocked: true,
        mobileImport: true,
        importResult,
        browserErrors: errors,
        screenshots: [
          "cvforge-landing.png",
          "cvforge-builder.png",
          "cvforge-preview.png",
          "cvforge-import.png",
          "cvforge-mobile.png",
          "cvforge-mobile-builder.png",
        ].map((name) => join(tmpdir(), name)),
      },
      null,
      2,
    ),
  );
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}

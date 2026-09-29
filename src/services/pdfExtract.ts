import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export const MAX_PDF_SIZE = 10 * 1024 * 1024;
export type PdfExtraction = {
  text: string;
  mainText: string;
  sidebarText: string;
  ocrUsed: boolean;
};

type PositionedText = { str: string; x: number; y: number; width: number };

function orderedLines(items: PositionedText[]): string {
  const rows: PositionedText[][] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((group) => Math.abs(group[0].y - item.y) < 3);
    if (row) row.push(item);
    else rows.push([item]);
  }
  return rows
    .sort((a, b) => b[0].y - a[0].y)
    .map((row) =>
      row
        .sort((a, b) => a.x - b.x)
        .reduce((line, item, index, all) => {
          const prior = all[index - 1];
          const gap = prior ? item.x - (prior.x + prior.width) : 0;
          return line + (line && gap > 2 ? " " : "") + item.str;
        }, "")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

export async function extractPdf(
  file: File,
  onProgress?: (message: string) => void,
): Promise<PdfExtraction> {
  if (file.size > MAX_PDF_SIZE)
    throw new Error("Choose a PDF smaller than 10 MB.");
  // iOS and cloud file providers sometimes omit or mislabel the MIME type.
  if (!file.name.toLowerCase().endsWith(".pdf"))
    throw new Error("Choose a PDF file.");
  const bytes = await file.arrayBuffer();
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("This file does not appear to be a valid PDF.");

  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const main: string[] = [];
  const sidebar: string[] = [];
  let ocrUsed = false;
  let worker:
    | Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>
    | undefined;
  try {
    for (let number = 1; number <= Math.min(document.numPages, 20); number++) {
      onProgress?.(`Reading page ${number} of ${document.numPages}…`);
      const page = await document.getPage(number);
      // Safari does not expose ReadableStream's async iterator in some versions.
      // PDF.js getTextContent() uses that iterator, so consume its stream reader.
      const reader = page.streamTextContent().getReader();
      const textItems: Awaited<ReturnType<typeof page.getTextContent>>["items"] = [];
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          textItems.push(...value.items);
        }
      } finally {
        reader.releaseLock();
      }
      const items: PositionedText[] = textItems
        .filter((item) => "str" in item && Boolean(item.str.trim()))
        .map((item) => ({
          str: "str" in item ? item.str : "",
          x: "transform" in item ? item.transform[4] : 0,
          y: "transform" in item ? item.transform[5] : 0,
          width: "width" in item ? item.width : 0,
        }));
      const pageText = orderedLines(items);
      if (pageText.replace(/\s/g, "").length >= 50) {
        const pageWidth = page.view[2] - page.view[0];
        const left = items.filter((item) => item.x < pageWidth * 0.3);
        const right = items.filter((item) => item.x >= pageWidth * 0.3);
        // LinkedIn's saved PDF places contact and skills in a narrow left rail.
        if (left.length >= 4 && right.length >= 4) {
          sidebar.push(orderedLines(left));
          main.push(orderedLines(right));
        } else main.push(pageText);
        continue;
      }

      onProgress?.(
        `Recognizing scanned page ${number} of ${document.numPages}…`,
      );
      if (!worker) {
        const { createWorker } = await import("tesseract.js");
        worker = await createWorker(["eng", "fra"]);
      }
      const viewport = page.getViewport({
        scale: Math.min(2, 1800 / page.view[2]),
      });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("OCR is unavailable in this browser.");
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      main.push(result.data.text.trim());
      canvas.width = canvas.height = 0;
      ocrUsed = true;
    }
  } finally {
    await worker?.terminate();
    await document.cleanup();
  }
  return {
    text: [...main, ...sidebar].filter(Boolean).join("\n"),
    mainText: main.filter(Boolean).join("\n"),
    sidebarText: sidebar.filter(Boolean).join("\n"),
    ocrUsed,
  };
}

export async function extractPdfText(file: File): Promise<string> {
  return (await extractPdf(file)).text;
}

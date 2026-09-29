import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
export const MAX_PDF_SIZE = 10 * 1024 * 1024;

export async function extractPdfText(file: File): Promise<string> {
  if (file.size > MAX_PDF_SIZE)
    throw new Error("Choose a PDF smaller than 10 MB.");
  if (
    !file.name.toLowerCase().endsWith(".pdf") ||
    (file.type && file.type !== "application/pdf")
  )
    throw new Error("Choose a PDF file.");
  const bytes = await file.arrayBuffer();
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("This file does not appear to be a valid PDF.");
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  for (let number = 1; number <= Math.min(document.numPages, 20); number++) {
    const content = await (await document.getPage(number)).getTextContent();
    let text = "";
    let previousY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      text += previousY !== null && Math.abs(previousY - y) > 3 ? "\n" : " ";
      text += item.str;
      previousY = y;
    }
    pages.push(text);
  }
  return pages.join("\n");
}

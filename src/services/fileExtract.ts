import type { PdfExtraction } from "./pdfExtract";

export type ImportedText = PdfExtraction & {
  source: "pdf" | "docx" | "image";
};

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_IMAGES = 4;

function imageKind(file: File, bytes: Uint8Array): boolean {
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const heic =
    /^(heic|heix|hevc|mif1)$/i.test(
      String.fromCharCode(...bytes.slice(8, 12)),
    ) && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  return (
    png ||
    jpeg ||
    webp ||
    heic ||
    (/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name) &&
      /image\/(png|jpeg|webp|heic|heif)/i.test(file.type))
  );
}

async function readImage(file: File): Promise<HTMLCanvasElement> {
  let imageFile: Blob = file;
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const heicSignature =
    String.fromCharCode(...signature.slice(4, 8)) === "ftyp" &&
    /^(heic|heix|hevc|mif1)$/i.test(
      String.fromCharCode(...signature.slice(8, 12)),
    );
  if (
    heicSignature ||
    /\.(heic|heif)$/i.test(file.name) ||
    /image\/(heic|heif)/i.test(file.type)
  ) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/png" });
      imageFile = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      throw new Error(
        "Could not open this iPhone photo. Save it as a PNG or JPG screenshot and try again.",
      );
    }
  }
  const url = URL.createObjectURL(imageFile);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error(
            `Could not read ${file.name || "this image"}. Choose a PNG, JPG, WebP, or HEIC image.`,
          ),
        );
      image.src = url;
    });
    const scale = Math.min(
      1,
      2000 / image.naturalWidth,
      2400 / image.naturalHeight,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error("Image recognition is unavailable in this browser.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function extractImages(
  files: File[],
  onProgress?: (message: string) => void,
): Promise<ImportedText> {
  const { createWorker } = await import("tesseract.js");
  onProgress?.("Loading image recognition…");
  let worker: Awaited<ReturnType<typeof createWorker>>;
  try {
    worker = await createWorker(["eng", "fra"]);
  } catch {
    throw new Error(
      "Could not load image recognition. Check your connection and try again.",
    );
  }
  const pages: string[] = [];
  try {
    for (const [index, file] of files.entries()) {
      onProgress?.(`Reading image ${index + 1} of ${files.length}…`);
      const canvas = await readImage(file);
      const result = await worker.recognize(canvas);
      pages.push(result.data.text.trim());
      canvas.width = canvas.height = 0;
    }
  } finally {
    await worker.terminate();
  }
  const text = pages.filter(Boolean).join("\n");
  return {
    source: "image",
    text,
    mainText: text,
    sidebarText: "",
    ocrUsed: true,
  };
}

export async function extractFiles(
  files: File[],
  onProgress?: (message: string) => void,
): Promise<ImportedText> {
  if (!files.length)
    throw new Error("Choose a PDF, DOCX, or screenshot to import.");
  if (files.length > MAX_IMAGES)
    throw new Error(`Choose up to ${MAX_IMAGES} screenshots at a time.`);
  const kinds = await Promise.all(
    files.map(async (file) => {
      const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const signature = new TextDecoder().decode(bytes.slice(0, 5));
      if (signature === "%PDF-") return "pdf" as const;
      if (
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        (/\.docx$/i.test(file.name) ||
          /wordprocessingml\.document/i.test(file.type))
      )
        return "docx" as const;
      if (imageKind(file, bytes)) return "image" as const;
      return "unsupported" as const;
    }),
  );
  if (kinds.includes("unsupported"))
    throw new Error(
      "Choose a valid PDF, DOCX, PNG, JPG, WebP, or HEIC file. Word .doc files are not supported.",
    );
  if (files.length > 1 && kinds.some((kind) => kind !== "image"))
    throw new Error(
      "Choose one PDF or DOCX, or up to four screenshots together.",
    );
  if (kinds[0] === "image") {
    if (files.some((file) => file.size > MAX_IMAGE_SIZE))
      throw new Error("Each screenshot must be smaller than 15 MB.");
    return extractImages(files, onProgress);
  }
  const file = files[0];
  if (file.size > MAX_DOCUMENT_SIZE)
    throw new Error("Choose a PDF or DOCX smaller than 10 MB.");
  if (kinds[0] === "pdf") {
    const { extractPdf } = await import("./pdfExtract");
    return { ...(await extractPdf(file, onProgress)), source: "pdf" };
  }
  onProgress?.("Reading Word document…");
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    const text = result.value.trim();
    return {
      source: "docx",
      text,
      mainText: text,
      sidebarText: "",
      ocrUsed: false,
    };
  } catch {
    throw new Error(
      "Could not read this DOCX. Check that it opens in Word, then try again.",
    );
  }
}

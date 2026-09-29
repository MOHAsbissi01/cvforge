import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFString,
  rgb,
  type PDFFont,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import regularFontUrl from "@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?url";
import boldFontUrl from "@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff?url";
import QRCode from "qrcode";
import type { CandidateProfile, Entry, SectionKey } from "../models/profile";
import { SECTION_LABELS } from "../models/profile";
import { normalizeUrl } from "./validation";

const A4: [number, number] = [595.28, 841.89];
const text = (value: unknown) => String(value ?? "").trim();
const safe = (value: string) =>
  value
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[^\x20-\x7e\n\u00a0-\u00ff]/g, "?");
const date = (entry: Entry) =>
  [entry.startDate, entry.endDate || (entry.current ? "Present" : "")]
    .filter(Boolean)
    .join(" – ");

export class PdfExportError extends Error {}
const PAGE_FULL = Symbol("page full");

export async function makePdf(profile: CandidateProfile): Promise<Uint8Array> {
  if (!profile.basics.firstName.trim() || !profile.basics.lastName.trim())
    throw new PdfExportError(
      "Add your first and last name in the builder before exporting.",
    );
  for (const scale of [1, 0.94, 0.88]) {
    try {
      return await renderPdf(profile, scale);
    } catch (error) {
      if (error !== PAGE_FULL) throw error;
    }
  }
  throw new PdfExportError(
    "This CV does not fit on one page. Shorten descriptions or hide lower-priority sections in the builder, then export again.",
  );
}

async function renderPdf(
  profile: CandidateProfile,
  scale: number,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(
    `${profile.basics.firstName} ${profile.basics.lastName} CV`.trim() || "CV",
  );
  const [regularBytes, boldBytes] = await Promise.all(
    [regularFontUrl, boldFontUrl].map(
      async (url) => new Uint8Array(await (await fetch(url)).arrayBuffer()),
    ),
  );
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const accent =
    profile.template === "classic"
      ? rgb(0.13, 0.17, 0.22)
      : profile.template === "student"
        ? rgb(0.08, 0.31, 0.35)
        : rgb(0.13, 0.25, 0.48);
  const ink = rgb(0.12, 0.16, 0.2);
  const page = pdf.addPage(A4);
  let y = A4[1] - 37;
  const margin = 40;
  const width = A4[0] - margin * 2;
  const ensure = (height: number) => {
    if (y - height < 37) throw PAGE_FULL;
  };
  const wrap = (
    value: string,
    font: PDFFont,
    size: number,
    maxWidth = width,
  ) => {
    const rows: string[] = [];
    for (const paragraph of safe(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
          rows.push(line);
          line = word;
        } else line = candidate;
      }
      if (line) rows.push(line);
    }
    return rows;
  };
  const draw = (
    value: string,
    options: {
      size?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      gap?: number;
    } = {},
  ) => {
    const size = (options.size ?? 9) * scale;
    const font = options.font ?? regular;
    const indent = options.indent ?? 0;
    for (const line of wrap(value, font, size, width - indent)) {
      ensure(size + 4 * scale);
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font,
        color: options.color ?? ink,
      });
      y -= size + 3.2 * scale;
    }
    y -= (options.gap ?? 0) * scale;
  };
  const heading = (label: string) => {
    ensure(29 * scale);
    y -= 7 * scale;
    page.drawText(label.toUpperCase(), {
      x: margin,
      y,
      size: 8.7 * scale,
      font: bold,
      color: accent,
    });
    y -= 5 * scale;
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + width, y },
      thickness: 0.6,
      color: accent,
    });
    y -= 11 * scale;
  };
  const drawLink = (value: string) => {
    const url = normalizeUrl(value);
    if (!url) {
      draw(value, { size: 8.5, gap: 1 });
      return;
    }
    const printable = safe(value.replace(/^https?:\/\//, ""));
    ensure(14 * scale);
    page.drawText(printable, {
      x: margin,
      y,
      size: 8.5 * scale,
      font: regular,
      color: accent,
    });
    const rect = [
      margin,
      y - 2,
      Math.min(
        margin + width,
        margin + regular.widthOfTextAtSize(printable, 8.5 * scale),
      ),
      y + 10,
    ];
    const annotation = pdf.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: rect,
      Border: [0, 0, 0],
      A: { S: "URI", URI: PDFString.of(url) },
    });
    const ref = pdf.context.register(annotation);
    const annots =
      page.node.lookupMaybe(PDFName.of("Annots"), PDFArray) ??
      pdf.context.obj([]);
    annots.push(ref);
    page.node.set(PDFName.of("Annots"), annots);
    y -= 11 * scale;
  };
  const item = (
    title: string,
    subtitle: string,
    description: string,
    extras: string[] = [],
  ) => {
    if (!title && !subtitle && !description) return;
    ensure(26 * scale);
    if (title) draw(title, { size: 10, font: bold, gap: 1 });
    if (subtitle)
      draw(subtitle, { size: 8.5, color: rgb(0.36, 0.4, 0.45), gap: 2 });
    if (description)
      for (const line of description.split("\n").filter(Boolean))
        draw(`• ${line.replace(/^[-•]\s*/, "")}`, { indent: 5, gap: 1 });
    for (const extra of extras.filter(Boolean)) {
      if (normalizeUrl(extra)) drawLink(extra);
      else draw(extra, { size: 8.5, gap: 1 });
    }
    y -= 4 * scale;
  };
  const fullName =
    `${profile.basics.firstName} ${profile.basics.lastName}`.trim();
  draw(fullName, {
    size: 21,
    font: bold,
    color: accent,
    gap: 2,
  });
  if (profile.basics.headline)
    draw(profile.basics.headline, { size: 11, gap: 5 });
  const contact = [
    profile.basics.email,
    profile.basics.phone,
    [profile.basics.city, profile.basics.country].filter(Boolean).join(", "),
  ].filter(Boolean);
  if (contact.length) draw(contact.join("  |  "), { size: 8.5, gap: 2 });
  for (const value of [
    profile.basics.linkedin,
    profile.basics.github,
    profile.basics.portfolio,
    profile.basics.website,
  ]) {
    const url = normalizeUrl(value);
    if (!url) continue;
    drawLink(value);
  }
  if (profile.qr.includeInCv && profile.qr.source !== "none") {
    const destination =
      profile.qr.source === "custom"
        ? profile.qr.customUrl
        : profile.basics[profile.qr.source];
    const url = normalizeUrl(destination);
    if (url) {
      const data = await QRCode.toDataURL(url, { margin: 0, width: 150 });
      const image = await pdf.embedPng(data);
      page.drawImage(image, {
        x: A4[0] - margin - 54,
        y: A4[1] - 112,
        width: 54,
        height: 54,
      });
    }
  }
  const ordered = profile.sections.filter(
    (section) => section.visible && section.key !== "contact",
  );
  for (const { key } of ordered) {
    if (key === "summary" && profile.summary) {
      heading("Professional summary");
      draw(profile.summary);
      continue;
    }
    if (key === "custom") {
      for (const section of profile.custom) {
        if (!section.title || !section.entries.length) continue;
        heading(section.title);
        for (const entry of section.entries)
          item(
            text(entry.title),
            [text(entry.subtitle), date(entry)].filter(Boolean).join(" | "),
            text(entry.description),
          );
      }
      continue;
    }
    const entries = profile[
      key as Exclude<SectionKey, "contact" | "summary" | "custom">
    ] as Entry[];
    if (!entries?.length) continue;
    heading(SECTION_LABELS[key]);
    if (key === "skills") {
      const general = entries.filter(
        (entry) =>
          !text(entry.category) ||
          text(entry.category).toLowerCase() === "skills",
      );
      if (general.length)
        draw(
          general
            .map((entry) => text(entry.items))
            .filter(Boolean)
            .join("  ·  "),
          { gap: 2 },
        );
    }
    for (const entry of entries) {
      switch (key as SectionKey) {
        case "experience":
          item(
            [text(entry.position), text(entry.company)]
              .filter(Boolean)
              .join(" | "),
            [date(entry), text(entry.location), text(entry.employmentType)]
              .filter(Boolean)
              .join(" | "),
            text(entry.description),
            [text(entry.technologies)],
          );
          break;
        case "education":
          item(
            [text(entry.degree), text(entry.field)]
              .filter(Boolean)
              .join(" in ") || text(entry.institution),
            [text(entry.institution), date(entry), text(entry.location)]
              .filter(Boolean)
              .join(" | "),
            text(entry.description),
            [text(entry.coursework), text(entry.honors)],
          );
          break;
        case "projects":
          item(
            text(entry.name),
            [text(entry.role), date(entry)].filter(Boolean).join(" | "),
            [text(entry.description), text(entry.achievements)]
              .filter(Boolean)
              .join("\n"),
            [
              text(entry.technologies),
              text(entry.githubUrl),
              text(entry.demoUrl),
            ],
          );
          break;
        case "skills":
          if (
            text(entry.category) &&
            text(entry.category).toLowerCase() !== "skills"
          )
            draw(`${text(entry.category)}: ${text(entry.items)}`, { gap: 2 });
          break;
        case "languages":
          draw(
            `${text(entry.language)}${entry.proficiency ? `: ${text(entry.proficiency)}` : ""}`,
            { gap: 3 },
          );
          break;
        case "certifications":
          item(
            text(entry.name),
            [text(entry.issuer), text(entry.date)].filter(Boolean).join(" | "),
            "",
            [text(entry.credentialId), text(entry.credentialUrl)],
          );
          break;
        case "awards":
          item(
            text(entry.title),
            [text(entry.organization), text(entry.date)]
              .filter(Boolean)
              .join(" | "),
            text(entry.description),
          );
          break;
        case "volunteering":
          item(
            [text(entry.role), text(entry.organization)]
              .filter(Boolean)
              .join(" | "),
            [date(entry), text(entry.location)].filter(Boolean).join(" | "),
            text(entry.description),
          );
          break;
      }
    }
  }
  return pdf.save();
}

export async function downloadPdf(profile: CandidateProfile) {
  const bytes = await makePdf(profile);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${
    [profile.basics.firstName, profile.basics.lastName]
      .filter(Boolean)
      .join("_")
      .replace(/[^a-z0-9_-]/gi, "_") || "My"
  }_CV.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 30000);
}

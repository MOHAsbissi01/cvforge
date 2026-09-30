import type { CandidateProfile, Entry } from "../models/profile";
import { blankProfile, createEntry } from "../models/profile";
import type { PdfExtraction } from "./pdfExtract";

const headings: Record<
  string,
  keyof Pick<
    CandidateProfile,
    | "summary"
    | "education"
    | "experience"
    | "projects"
    | "skills"
    | "certifications"
    | "languages"
    | "awards"
    | "volunteering"
  >
> = {
  "professional summary": "summary",
  summary: "summary",
  profile: "summary",
  about: "summary",
  experience: "experience",
  "professional experience": "experience",
  "work experience": "experience",
  "work history": "experience",
  "employment history": "experience",
  employment: "experience",
  education: "education",
  "academic background": "education",
  qualifications: "education",
  projects: "projects",
  "selected projects": "projects",
  skills: "skills",
  "key skills": "skills",
  "core skills": "skills",
  "core competencies": "skills",
  "technical skills": "skills",
  certifications: "certifications",
  "licenses and certifications": "certifications",
  certificates: "certifications",
  languages: "languages",
  awards: "awards",
  "awards / competitions": "awards",
  achievements: "awards",
  volunteering: "volunteering",
  leadership: "volunteering",
};

export function splitSections(text: string): Record<string, string[]> {
  const result: Record<string, string[]> = { header: [] };
  let current = "header";
  for (const original of text.split(/\r?\n/)) {
    const line = original.trim();
    if (!line) continue;
    const heading = headings[line.toLowerCase().replace(/[:：]$/, "")];
    if (heading) {
      current = heading;
      result[current] ??= [];
      continue;
    }
    result[current] ??= [];
    result[current].push(line);
  }
  return result;
}

function groupEntries(lines: string[], label: string, detail: string): Entry[] {
  if (!lines.length) return [];
  const entries: Entry[] = [];
  let current: Entry | null = null;
  for (const line of lines) {
    const startsWithDate =
      /^(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4})\b/i.test(
        line,
      );
    const looksLikeHeading =
      (!startsWithDate && /\s[|–—]\s/.test(line)) ||
      /^[A-Z][^.!?]{8,100}\s{2,}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/.test(
        line,
      );
    if (!current || looksLikeHeading) {
      current = createEntry();
      const parts = line.split(/\s[|–—]\s/, 2);
      current[label] = parts[0] ?? line;
      current[detail] = parts[1] ?? "";
      current.description = "";
      entries.push(current);
    } else {
      const range = line.match(
        /^(\w+\s+\d{4}|\d{4}(?:-\d{2})?)\s*[-–—]\s*(Present|\w+\s+\d{4}|\d{4}(?:-\d{2})?)/i,
      );
      if (range) {
        current.startDate = range[1];
        current.endDate = range[2];
      } else if (
        !current[detail] &&
        !current.description &&
        detail !== "role" &&
        line.length < 90 &&
        !/[.!?]$/.test(line)
      ) {
        current[detail] = line;
      } else
        current.description = `${String(current.description ?? "")}${current.description ? "\n" : ""}${line.replace(/^[-•]\s*/, "")}`;
    }
  }
  return entries;
}

export function parseGenericCv(text: string): CandidateProfile {
  const profile = blankProfile();
  const sections = splitSections(text);
  const header = sections.header.join(" ");
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = header.match(/\+?\d[\d ()-]{7,}\d/)?.[0];
  const linkedin = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i,
  )?.[0];
  const github = text.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i,
  )?.[0];
  const nameIndex = sections.header.findIndex((line) => {
    const words = line.trim().split(/\s+/);
    return (
      words.length >= 2 &&
      words.length <= 5 &&
      !/^(?:curriculum vitae|resume|my cv|contact|personal information)$/i.test(
        line,
      ) &&
      !/[@/\d:|]/.test(line) &&
      words.every((word) => /^\p{Lu}[\p{L}'-]*$/u.test(word))
    );
  });
  const firstLine = sections.header[nameIndex >= 0 ? nameIndex : 0] ?? "";
  const name = firstLine
    .replace(/[^\p{L}' -]/gu, "")
    .trim()
    .split(/\s+/);
  if (name.length >= 2 && name.length <= 5) {
    profile.basics.firstName = name[0];
    profile.basics.lastName = name.slice(1).join(" ");
  }
  profile.basics.headline =
    sections.header
      .slice((nameIndex >= 0 ? nameIndex : 0) + 1)
      .find((line) => !/[@/\d]/.test(line)) ?? "";
  profile.basics.email = email ?? "";
  profile.basics.phone = phone ?? "";
  profile.basics.linkedin = linkedin ?? "";
  profile.basics.github = github ?? "";
  const location = sections.header
    .find((line) => line.includes(email ?? "\u0000") && line.includes("|"))
    ?.split("|")[1]
    ?.trim()
    .split(",");
  if (location?.length) {
    profile.basics.city = location[0]?.trim() ?? "";
    profile.basics.country = location[1]?.trim() ?? "";
  }
  profile.basics.portfolio =
    text.match(/(?:https?:\/\/)?[\w.-]+\.github\.io\/[\w/-]*/i)?.[0] ?? "";
  profile.summary = (sections.summary ?? []).join(" ");
  profile.experience = groupEntries(
    sections.experience ?? [],
    "company",
    "position",
  );
  profile.education = groupEntries(
    sections.education ?? [],
    "institution",
    "degree",
  );
  profile.projects = groupEntries(sections.projects ?? [], "name", "role");
  profile.awards = groupEntries(sections.awards ?? [], "title", "organization");
  profile.volunteering = groupEntries(
    sections.volunteering ?? [],
    "organization",
    "role",
  );
  profile.certifications = (sections.certifications ?? [])
    .flatMap((line) => line.split(/\s\|\s|\s·\s/))
    .filter(Boolean)
    .map((name) => ({ ...createEntry(), name, issuer: "" }));
  profile.skills = (sections.skills ?? []).map((line) => {
    const [category, ...rest] = line.split(":");
    return {
      ...createEntry(),
      category: rest.length ? category : "Skills",
      items: rest.length ? rest.join(":").trim() : category,
    };
  });
  profile.languages = (sections.languages ?? [])
    .flatMap((line) => line.split(/\s\|\s|\s·\s/))
    .map((line) => {
      const [language, proficiency] = line.split(":");
      return {
        ...createEntry(),
        language: language.trim(),
        proficiency: proficiency?.trim() ?? "",
      };
    });
  return profile;
}

const linkedInDate =
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*[-–]\s*(Present|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i;

function linkedInDescription(lines: string[]): {
  description: string;
  location: string;
  technologies: string;
} {
  const cleaned = lines.filter((line) => !/^Page \d+ of \d+$/i.test(line));
  const location = /^.+,\s*(?:Tunisie|Tunisia|France|United States|UK)$/i.test(
    cleaned[0] ?? "",
  )
    ? (cleaned.shift() ?? "")
    : "";
  const technologies =
    cleaned
      .find((line) => /^Tech Stack\s*:/i.test(line))
      ?.replace(/^Tech Stack\s*:\s*/i, "") ?? "";
  const statements: string[] = [];
  for (const line of cleaned) {
    if (/^(Core Achievements|Tech Stack)\s*:/i.test(line)) continue;
    if (
      statements.length &&
      !/^[-•]\s/.test(line) &&
      !/[.!?:;]$/.test(statements.at(-1) ?? "")
    )
      statements[statements.length - 1] += ` ${line}`;
    else statements.push(line.replace(/^[-•]\s*/, ""));
  }
  return { description: statements.join("\n"), location, technologies };
}

function parseLinkedInColumns(input: PdfExtraction): CandidateProfile {
  const profile = blankProfile();
  const lines = input.mainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const side = splitSections(
    input.sidebarText.replace(/^Top Skills\s*$/gim, "Skills"),
  );
  const name = (lines[0] ?? "").split(/\s+/);
  if (name.length >= 2 && name.length <= 5) {
    profile.basics.firstName = name[0];
    profile.basics.lastName = name.slice(1).join(" ");
  }
  profile.basics.headline = lines[1] ?? "";
  const location = (lines[2] ?? "").split(",").map((part) => part.trim());
  profile.basics.city = location[0] ?? "";
  profile.basics.country = location[1] ?? "";
  profile.basics.email =
    input.sidebarText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ??
    "";
  profile.basics.linkedin =
    input.sidebarText.match(
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i,
    )?.[0] ?? "";
  profile.skills = (side.skills ?? []).map((item) => ({
    ...createEntry(),
    category: "Skills",
    items: item,
  }));
  profile.languages = (side.languages ?? []).map((language) => ({
    ...createEntry(),
    language,
    proficiency: "",
  }));
  const certs = side.certifications ?? [];
  profile.certifications = certs.reduce<Entry[]>((entries, line) => {
    if (entries.length && (entries.at(-1)?.name as string)?.endsWith(" -"))
      entries.at(-1)!.name = `${entries.at(-1)!.name} ${line}`;
    else if (entries.length && /^by\s/i.test(line))
      entries.at(-1)!.name = `${entries.at(-1)!.name} ${line}`;
    else entries.push({ ...createEntry(), name: line, issuer: "" });
    return entries;
  }, []);

  const sectionNames = new Set([
    "summary",
    "experience",
    "education",
    "projects",
  ]);
  const sectionAt = (label: string) =>
    lines.findIndex((line) => line.toLowerCase() === label);
  const between = (label: string) => {
    const start = sectionAt(label);
    if (start < 0) return [];
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (sectionNames.has(lines[i].toLowerCase())) {
        end = i;
        break;
      }
    }
    return lines.slice(start + 1, end);
  };
  profile.summary = between("summary").join(" ").replace(/-\s+/g, "-");
  const experience = between("experience");
  let cursor = 0;
  for (let i = 2; i < experience.length; i++) {
    if (!linkedInDate.test(experience[i])) continue;
    const company = experience[i - 2];
    const position = experience[i - 1];
    if (!company || !position) continue;
    if (profile.experience.length && i - 2 > cursor) {
      Object.assign(
        profile.experience.at(-1)!,
        linkedInDescription(experience.slice(cursor, i - 2)),
      );
    }
    const dates = experience[i].match(linkedInDate);
    profile.experience.push({
      ...createEntry(),
      company,
      position,
      startDate: dates?.[0].split(/\s*[-–]\s*/)[0] ?? "",
      endDate: dates?.[0].split(/\s*[-–]\s*/)[1] ?? "",
      description: "",
    });
    cursor = i + 1;
  }
  if (profile.experience.length)
    Object.assign(
      profile.experience.at(-1)!,
      linkedInDescription(experience.slice(cursor)),
    );
  const education = between("education");
  if (education.length) {
    profile.education.push({
      ...createEntry(),
      institution: education[0],
      degree: education.slice(1).join(" ").split(" · ")[0] ?? "",
      description: "",
    });
  }
  return profile;
}

export function parseLinkedInPdf(
  input: string | PdfExtraction,
): CandidateProfile {
  if (typeof input !== "string" && input.sidebarText && input.mainText)
    return parseLinkedInColumns(input);
  const text = typeof input === "string" ? input : input.text;
  const normalized = text
    .replace(/^Contact\s*$/gim, "")
    .replace(/^Top Skills\s*$/gim, "SKILLS")
    .replace(/^Licenses & Certifications\s*$/gim, "CERTIFICATIONS")
    .replace(/^About\s*$/gim, "SUMMARY");
  const profile = parseGenericCv(normalized);
  const linkedin = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i,
  )?.[0];
  if (linkedin) profile.basics.linkedin = linkedin;
  return profile;
}

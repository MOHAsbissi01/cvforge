import type { CandidateProfile, Entry } from "../models/profile";
import { blankProfile, createEntry } from "../models/profile";

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
  "work experience": "experience",
  employment: "experience",
  education: "education",
  projects: "projects",
  "selected projects": "projects",
  skills: "skills",
  "technical skills": "skills",
  certifications: "certifications",
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
      /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i.test(
        line,
      );
    const looksLikeHeading =
      (!startsWithDate && /\s\|\s/.test(line)) ||
      /^[A-Z][^.!?]{8,100}\s{2,}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/.test(
        line,
      );
    if (!current || looksLikeHeading) {
      current = createEntry();
      const parts = line.split(/\s\|\s/, 2);
      current[label] = parts[0] ?? line;
      current[detail] = parts[1] ?? "";
      current.description = "";
      entries.push(current);
    } else
      current.description = `${String(current.description ?? "")}${current.description ? "\n" : ""}${line.replace(/^[-•]\s*/, "")}`;
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
  const nameIndex = sections.header.findIndex(
    (line) =>
      /^[A-Z][A-Z ' -]{3,70}$/.test(line) &&
      line.trim().split(/\s+/).length >= 2,
  );
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
    sections.header[(nameIndex >= 0 ? nameIndex : 0) + 1] ?? "";
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

export function parseLinkedInPdf(text: string): CandidateProfile {
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

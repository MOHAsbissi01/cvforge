import { z } from "zod";
import {
  blankProfile,
  SECTION_ORDER,
  type CandidateProfile,
} from "../models/profile";

export function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      /\s/.test(value)
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

const entrySchema = z
  .object({ id: z.string() })
  .catchall(z.union([z.string(), z.boolean()]));
const basicSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  city: z.string(),
  country: z.string(),
  linkedin: z.string(),
  github: z.string(),
  portfolio: z.string(),
  website: z.string(),
});
export const profileSchema = z.object({
  version: z.literal(1),
  basics: basicSchema,
  summary: z.string(),
  education: z.array(entrySchema),
  experience: z.array(entrySchema),
  projects: z.array(entrySchema),
  skills: z.array(entrySchema),
  certifications: z.array(entrySchema),
  languages: z.array(entrySchema),
  awards: z.array(entrySchema),
  volunteering: z.array(entrySchema),
  custom: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      entries: z.array(entrySchema),
    }),
  ),
  sections: z.array(
    z.object({ key: z.enum(SECTION_ORDER), visible: z.boolean() }),
  ),
  template: z.enum(["classic", "modern", "student"]),
  qr: z.object({
    source: z.enum([
      "none",
      "linkedin",
      "github",
      "portfolio",
      "website",
      "custom",
    ]),
    customUrl: z.string(),
    includeInCv: z.boolean(),
  }),
});

export function parseProfile(value: unknown): CandidateProfile | null {
  const result = profileSchema.safeParse(value);
  if (!result.success) return null;
  const profile = result.data as CandidateProfile;
  const seen = new Set(profile.sections.map((section) => section.key));
  profile.sections = [
    ...profile.sections.filter(
      (section, index, items) =>
        items.findIndex((item) => item.key === section.key) === index,
    ),
    ...blankProfile().sections.filter((section) => !seen.has(section.key)),
  ];
  return profile;
}

export function completion(profile: CandidateProfile): number {
  const checks = [
    Boolean(profile.basics.firstName && profile.basics.lastName),
    Boolean(profile.basics.email),
    Boolean(profile.basics.headline),
    Boolean(profile.summary.trim()),
    profile.education.some((x) => x.institution && x.degree),
    profile.experience.some((x) => x.company && x.position) ||
      profile.projects.some((x) => x.name && x.description),
    profile.skills.some((x) => x.items),
    Boolean(profile.basics.city || profile.basics.country),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

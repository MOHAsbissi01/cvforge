import type { CandidateProfile } from "../models/profile";
import { normalizeUrl } from "./validation";

export type Feedback = {
  priority: "high" | "optional" | "good";
  message: string;
  why: string;
};
export type Review = {
  score: number;
  categories: { label: string; score: number; max: number }[];
  feedback: Feedback[];
};
const has = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;
const bullets = (value: unknown) =>
  typeof value === "string"
    ? value
        .split(/\n|•/)
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

export function reviewProfile(profile: CandidateProfile): Review {
  const b = profile.basics;
  const experience = profile.experience.filter(
    (x) => has(x.company) || has(x.position),
  );
  const projects = profile.projects.filter((x) => has(x.name));
  const education = profile.education.filter((x) => has(x.institution));
  const skills = profile.skills.filter((x) => has(x.items));
  const allBullets = [
    ...experience.flatMap((x) => bullets(x.description)),
    ...projects.flatMap((x) => bullets(x.achievements)),
  ];
  const action =
    /^(built|created|developed|designed|implemented|improved|analyzed|led|delivered|automated|coordinated|optimized|launched|integrated|tested|researched)\b/i;
  const categories = [
    {
      label: "Structure",
      max: 20,
      score:
        (has(b.firstName) && has(b.lastName) ? 5 : 0) +
        (has(b.headline) ? 5 : 0) +
        (has(profile.summary) ? 5 : 0) +
        (education.length || experience.length || projects.length ? 5 : 0),
    },
    {
      label: "Contact",
      max: 10,
      score:
        (has(b.email) ? 3 : 0) +
        (has(b.phone) ? 2 : 0) +
        (has(b.city) || has(b.country) ? 2 : 0) +
        (normalizeUrl(b.linkedin) ? 3 : 0),
    },
    {
      label: "Experience",
      max: 20,
      score:
        (experience.length ? 6 : 0) +
        (allBullets.length ? 4 : 0) +
        (allBullets.some((x) => action.test(x)) ? 4 : 0) +
        (allBullets.some((x) => /\d+(?:%|\b)/.test(x)) ? 3 : 0) +
        (allBullets.length && allBullets.every((x) => x.length <= 220) ? 3 : 0),
    },
    {
      label: "Skills",
      max: 15,
      score:
        (skills.length ? 6 : 0) +
        (skills.length >= 2 ? 5 : 0) +
        (skills.reduce(
          (n, x) =>
            n +
            String(x.items ?? "")
              .split(",")
              .filter(Boolean).length,
          0,
        ) >= 4
          ? 4
          : 0),
    },
    {
      label: "Education",
      max: 10,
      score:
        (education.length ? 5 : 0) +
        (education.some((x) => has(x.degree) && has(x.field)) ? 3 : 0) +
        (education.some((x) => has(x.startDate)) ? 2 : 0),
    },
    {
      label: "Projects",
      max: 10,
      score:
        (projects.length ? 5 : 0) +
        (projects.some((x) => has(x.description)) ? 3 : 0) +
        (projects.some(
          (x) =>
            normalizeUrl(String(x.githubUrl ?? "")) ||
            normalizeUrl(String(x.demoUrl ?? "")),
        )
          ? 2
          : 0),
    },
    { label: "Formatting", max: 10, score: 10 },
    {
      label: "Links",
      max: 5,
      score: [b.linkedin, b.github, b.portfolio, b.website].some((x) =>
        normalizeUrl(x),
      )
        ? 5
        : 0,
    },
  ];
  const feedback: Feedback[] = [];
  const add = (priority: Feedback["priority"], message: string, why: string) =>
    feedback.push({ priority, message, why });
  if (!b.email || !b.phone)
    add(
      "high",
      "Complete your email and phone.",
      "Recruiters need a reliable way to reach you.",
    );
  if (!profile.summary)
    add(
      "high",
      "Write a focused professional summary.",
      "A short summary gives context to your experience and target role.",
    );
  else if (profile.summary.length > 500)
    add(
      "optional",
      "Shorten your summary to roughly 2–4 lines.",
      "A concise summary is easier to scan.",
    );
  if (!education.length)
    add(
      "high",
      "Add your education.",
      "Education is especially useful for student and early-career CVs.",
    );
  if (!experience.length && !projects.length)
    add(
      "high",
      "Add experience or a substantial project.",
      "Concrete work gives readers evidence of your skills.",
    );
  if (!skills.length)
    add(
      "high",
      "Group your relevant skills.",
      "Plain-text skill groups are easy to scan and search.",
    );
  if (
    allBullets.some((x) =>
      /^(responsible for|worked on|helped with)\b/i.test(x),
    )
  )
    add(
      "optional",
      "Replace vague openings with specific actions where accurate.",
      "A clear action helps readers understand your contribution.",
    );
  if (allBullets.some((x) => x.length > 220))
    add(
      "optional",
      "Split long achievement bullets.",
      "Shorter statements are easier to scan.",
    );
  if (experience.length && !allBullets.some((x) => /\d+(?:%|\b)/.test(x)))
    add(
      "optional",
      "Consider adding a measurable result if you have one.",
      "Real scale or outcomes can make contributions clearer.",
    );
  if (
    [...experience, ...education, ...projects].some(
      (x) =>
        (has(x.startDate) && !has(x.endDate) && !x.current) ||
        (!has(x.startDate) && has(x.endDate)),
    )
  )
    add(
      "optional",
      "Check incomplete date ranges.",
      "Consistent dates make the chronology easier to follow.",
    );
  const titles = [
    ...experience.map((x) => `${x.company}|${x.position}`),
    ...projects.map((x) => String(x.name ?? "")),
  ]
    .filter(Boolean)
    .map((x) => x.toLowerCase());
  if (new Set(titles).size < titles.length)
    add(
      "optional",
      "Review duplicate entries.",
      "Repeated information uses space without adding evidence.",
    );
  if (
    skills.reduce(
      (count, x) =>
        count +
        String(x.items ?? "")
          .split(",")
          .filter(Boolean).length,
      0,
    ) > 40
  )
    add(
      "optional",
      "Prioritize the most relevant skills.",
      "A long skill list can make your strongest skills harder to find.",
    );
  if (
    [b.linkedin, b.github, b.portfolio, b.website].some(
      (x) => x && !normalizeUrl(x),
    )
  )
    add(
      "high",
      "Check your web links.",
      "Broken-looking URLs prevent readers from opening your work.",
    );
  if (
    projects.length &&
    !projects.some(
      (x) =>
        normalizeUrl(String(x.githubUrl ?? "")) ||
        normalizeUrl(String(x.demoUrl ?? "")),
    )
  )
    add(
      "optional",
      "Link to public project evidence when available.",
      "A repository or demo lets readers verify your work.",
    );
  if (profile.summary && profile.summary.length <= 500)
    add(
      "good",
      "Your summary is concise.",
      "It gives readers a quick overview.",
    );
  if (education.length)
    add(
      "good",
      "Education is structured.",
      "Clear institution and degree fields help scanning.",
    );
  add(
    "good",
    "The export uses standard headings and selectable text.",
    "Simple structure improves readability across systems.",
  );
  return {
    score: categories.reduce((sum, category) => sum + category.score, 0),
    categories,
    feedback,
  };
}

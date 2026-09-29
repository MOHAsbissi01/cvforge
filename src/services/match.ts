import type { CandidateProfile } from "../models/profile";

const stop = new Set(
  "a an and are as at be by can for from have in into is it of on or our the their this to using we with you your will work team role experience skills ability strong excellent good years year required preferred".split(
    " ",
  ),
);
export function keywords(text: string): { term: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z][a-z+#.-]{1,}/g) ?? []) {
    const term = raw.replace(/[.-]$/, "");
    if (term.length < 3 || stop.has(term)) continue;
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return [...counts]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 30);
}
export function matchJob(profile: CandidateProfile, description: string) {
  const cvText = [
    Object.values(profile.basics).join(" "),
    profile.summary,
    ...(
      [
        "experience",
        "projects",
        "education",
        "skills",
        "certifications",
      ] as const
    ).flatMap((key) =>
      profile[key].flatMap((entry) => Object.values(entry).map(String)),
    ),
  ]
    .join(" ")
    .toLowerCase();
  const terms = keywords(description);
  const matched = terms.filter(({ term }) =>
    new RegExp(
      `(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`,
      "i",
    ).test(cvText),
  );
  return {
    terms,
    matched,
    missing: terms.filter((term) => !matched.includes(term)),
    overlap: terms.length
      ? Math.round((matched.length / terms.length) * 100)
      : 0,
  };
}

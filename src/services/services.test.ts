import { describe, expect, it } from "vitest";
import { blankProfile, chooseTemplate, demoProfile } from "../models/profile";
import { completion, normalizeUrl, parseProfile } from "./validation";
import { reviewProfile } from "./review";
import { keywords, matchJob } from "./match";
import { parseGenericCv, parseLinkedInPdf, splitSections } from "./import";
import { clearProfile, loadProfile, saveProfile, STORAGE_KEY } from "./storage";
import { fixtureProfiles } from "../data/fixtures";

describe("validation and scoring", () => {
  it("scores a filled profile above an empty profile and stays within 100", () => {
    const empty = reviewProfile(blankProfile());
    const filled = reviewProfile(demoProfile());
    expect(empty.score).toBeLessThan(filled.score);
    expect(filled.score).toBeLessThanOrEqual(100);
    expect(
      filled.categories.reduce((sum, category) => sum + category.max, 0),
    ).toBe(100);
  });
  it("calculates completion from actual content", () => {
    expect(completion(blankProfile())).toBe(0);
    expect(completion(demoProfile())).toBeGreaterThan(70);
  });
  it("promotes projects and skills in the student template", () => {
    const profile = blankProfile();
    chooseTemplate(profile, "student");
    expect(
      profile.sections.findIndex((item) => item.key === "projects"),
    ).toBeLessThan(
      profile.sections.findIndex((item) => item.key === "experience"),
    );
    expect(
      profile.sections.findIndex((item) => item.key === "skills"),
    ).toBeLessThan(
      profile.sections.findIndex((item) => item.key === "experience"),
    );
  });
  it("accepts web URLs and rejects unsafe schemes and malformed hosts", () => {
    expect(normalizeUrl("github.com/example")).toBe(
      "https://github.com/example",
    );
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
  it("validates restored data", () => {
    const profile = demoProfile();
    expect(
      parseProfile(JSON.parse(JSON.stringify(profile)))?.basics.firstName,
    ).toBe("Alex");
    expect(parseProfile({ ...profile, version: 2 })).toBeNull();
  });
});

describe("local job comparison", () => {
  it("counts recurring terms and finds matches without inserting content", () => {
    expect(keywords("Python and SQL, Python dashboards")[0]).toEqual({
      term: "python",
      count: 2,
    });
    const profile = demoProfile();
    const before = JSON.stringify(profile);
    const result = matchJob(
      profile,
      "Looking for SQL, Python, Power BI and Kubernetes experience",
    );
    expect(result.matched.map((item) => item.term)).toContain("python");
    expect(result.missing.map((item) => item.term)).toContain("kubernetes");
    expect(JSON.stringify(profile)).toBe(before);
  });
});

describe("PDF text parser helpers", () => {
  it("splits common sections and extracts contact details for review", () => {
    const raw =
      "Alex Martin\nData Analyst\nalex@example.com\nlinkedin.com/in/alex-martin\nPROFESSIONAL SUMMARY\nI build dashboards.\nEXPERIENCE\nNorthstar | Data Intern\nBuilt SQL views.\nSKILLS\nData & BI: SQL, Power BI";
    expect(splitSections(raw).summary).toEqual(["I build dashboards."]);
    const parsed = parseGenericCv(raw);
    expect(parsed.basics.email).toBe("alex@example.com");
    expect(parsed.basics.firstName).toBe("Alex");
    expect(parsed.experience[0].company).toBe("Northstar");
    expect(parsed.skills[0].items).toContain("SQL");
  });
  it("maps LinkedIn About and Top Skills headings separately", () => {
    const parsed = parseLinkedInPdf(
      "Alex Martin\nSoftware Engineer\nAbout\nBuilds systems.\nTop Skills\nTypeScript",
    );
    expect(parsed.summary).toBe("Builds systems.");
    expect(parsed.skills[0].items).toBe("TypeScript");
  });
});

describe("local persistence", () => {
  it("round trips and clears a versioned profile", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    expect(saveProfile(demoProfile(), storage)).toBe(true);
    expect(values.has(STORAGE_KEY)).toBe(true);
    expect(loadProfile(storage).basics.firstName).toBe("Alex");
    clearProfile(storage);
    expect(loadProfile(storage).basics.firstName).toBe("");
  });
  it("falls back safely when stored JSON is corrupt", () => {
    expect(loadProfile({ getItem: () => "{broken" }).version).toBe(1);
  });
});

describe("development fixtures", () => {
  it("provides distinct empty, complete, long, student, and imported cases", () => {
    expect(Object.keys(fixtureProfiles)).toHaveLength(5);
    expect(fixtureProfiles.empty().experience).toHaveLength(0);
    expect(fixtureProfiles.long().experience.length).toBeGreaterThan(10);
    expect(fixtureProfiles.imported().basics.email).toBe("sam@example.com");
  });
});

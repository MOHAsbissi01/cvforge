export type TemplateId = "classic" | "modern" | "student";
export type SectionKey =
  | "contact"
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "certifications"
  | "languages"
  | "awards"
  | "volunteering"
  | "custom";
export type Entry = { id: string; [key: string]: string | boolean };
export type CustomSection = { id: string; title: string; entries: Entry[] };
export type SectionSetting = { key: SectionKey; visible: boolean };

export interface CandidateProfile {
  version: 1;
  basics: {
    firstName: string;
    lastName: string;
    headline: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    linkedin: string;
    github: string;
    portfolio: string;
    website: string;
  };
  summary: string;
  education: Entry[];
  experience: Entry[];
  projects: Entry[];
  skills: Entry[];
  certifications: Entry[];
  languages: Entry[];
  awards: Entry[];
  volunteering: Entry[];
  custom: CustomSection[];
  sections: SectionSetting[];
  template: TemplateId;
  qr: {
    source: "none" | "linkedin" | "github" | "portfolio" | "website" | "custom";
    customUrl: string;
    includeInCv: boolean;
  };
}

export const SECTION_LABELS: Record<SectionKey, string> = {
  contact: "Personal information",
  summary: "Professional summary",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  languages: "Languages",
  awards: "Awards & achievements",
  volunteering: "Volunteering & leadership",
  custom: "Custom sections",
};

export const SECTION_ORDER: SectionKey[] = [
  "contact",
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
  "certifications",
  "languages",
  "awards",
  "volunteering",
  "custom",
];

export const blankProfile = (): CandidateProfile => ({
  version: 1,
  basics: {
    firstName: "",
    lastName: "",
    headline: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    linkedin: "",
    github: "",
    portfolio: "",
    website: "",
  },
  summary: "",
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certifications: [],
  languages: [],
  awards: [],
  volunteering: [],
  custom: [],
  sections: SECTION_ORDER.map((key) => ({ key, visible: true })),
  template: "classic",
  qr: { source: "none", customUrl: "", includeInCv: false },
});

export const createEntry = (): Entry => ({ id: crypto.randomUUID() });

export function chooseTemplate(
  profile: CandidateProfile,
  template: TemplateId,
): void {
  profile.template = template;
  if (template !== "student") return;
  const promoted = (["skills", "projects"] as const).flatMap((key) =>
    profile.sections.filter((section) => section.key === key),
  );
  const remaining = profile.sections.filter(
    (section) => section.key !== "projects" && section.key !== "skills",
  );
  const afterSummary =
    remaining.findIndex((section) => section.key === "summary") + 1;
  remaining.splice(afterSummary, 0, ...promoted);
  profile.sections = remaining;
}

export const demoProfile = (): CandidateProfile => {
  const profile: CandidateProfile = {
    ...blankProfile(),
    basics: {
      firstName: "Alex",
      lastName: "Martin",
      headline: "Data & BI Engineering Student",
      email: "alex.martin@example.com",
      phone: "+1 555 010 2048",
      city: "Boston",
      country: "United States",
      linkedin: "https://linkedin.com/in/alex-martin-demo",
      github: "https://github.com/alex-martin-demo",
      portfolio: "",
      website: "",
    },
    summary:
      "Engineering student focused on data pipelines and business intelligence. Built reporting workflows with SQL and Power BI, and enjoy turning complex data into clear decisions. Seeking an internship in analytics engineering.",
    experience: [
      {
        id: "demo-exp",
        company: "Northstar Analytics",
        position: "Data Intern",
        employmentType: "Internship",
        location: "Remote",
        startDate: "2025-06",
        endDate: "2025-08",
        current: false,
        description:
          "Built a SQL reporting pipeline for weekly product metrics.\nCreated Power BI dashboards used by the product team to review trends.",
        technologies: "SQL, Power BI, Python",
      },
    ],
    projects: [
      {
        id: "demo-project",
        name: "Campus Energy Dashboard",
        role: "Data lead",
        description:
          "Combined public energy data into an interactive dashboard for campus sustainability research.",
        technologies: "Python, PostgreSQL, Power BI",
        githubUrl: "https://github.com/alex-martin-demo",
        demoUrl: "",
        startDate: "2025-01",
        endDate: "2025-04",
        achievements: "Presented findings to a student research group.",
      },
    ],
    education: [
      {
        id: "demo-edu",
        institution: "Riverton University",
        degree: "BSc",
        field: "Computer Engineering",
        startDate: "2022-09",
        endDate: "2026-06",
        current: false,
        location: "Boston, US",
        description: "",
        coursework: "Databases, statistics, software engineering",
        honors: "",
      },
    ],
    skills: [
      {
        id: "demo-skill-1",
        category: "Data & BI",
        items: "SQL, Power BI, data modeling",
      },
      {
        id: "demo-skill-2",
        category: "Programming Languages",
        items: "Python, TypeScript",
      },
    ],
    languages: [
      { id: "demo-language", language: "English", proficiency: "Fluent" },
    ],
    template: "student",
  };
  chooseTemplate(profile, "student");
  return profile;
};

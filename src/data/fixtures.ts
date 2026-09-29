import {
  blankProfile,
  demoProfile,
  type CandidateProfile,
} from "../models/profile";
import { parseGenericCv } from "../services/import";

export function completeFixture(): CandidateProfile {
  const profile = demoProfile();
  profile.certifications = [
    {
      id: "fixture-cert",
      name: "Data Foundations",
      issuer: "Example Learning",
      date: "2025-05",
      credentialId: "DEMO-001",
      credentialUrl: "",
    },
  ];
  profile.awards = [
    {
      id: "fixture-award",
      title: "Student Research Showcase",
      organization: "Riverton University",
      date: "2025-04",
      description: "Presented a campus energy dashboard.",
    },
  ];
  profile.volunteering = [
    {
      id: "fixture-volunteer",
      organization: "Community Data Club",
      role: "Mentor",
      startDate: "2024-09",
      endDate: "",
      current: true,
      description: "Helped students learn data visualization basics.",
    },
  ];
  return profile;
}

export function longFixture(): CandidateProfile {
  const profile = completeFixture();
  profile.experience = Array.from({ length: 15 }, (_, index) => ({
    id: `long-${index}`,
    company: `Fictional Organization ${index + 1}`,
    position: "Project Contributor",
    startDate: "2024-01",
    endDate: "2024-06",
    description:
      "Built a reporting workflow for a student case study.\nDocumented the process and shared findings with the team.",
  }));
  return profile;
}

export function importedFixture(): CandidateProfile {
  return parseGenericCv(
    "Sam Rivera\nSoftware Engineering Student\nsam@example.com\nSUMMARY\nStudent interested in accessible web tools.\nEDUCATION\nExample University | BSc Computer Science\nPROJECTS\nOpen Library | Developer\nBuilt a searchable catalog.",
  );
}

export const fixtureProfiles = {
  empty: blankProfile,
  student: demoProfile,
  complete: completeFixture,
  long: longFixture,
  imported: importedFixture,
};

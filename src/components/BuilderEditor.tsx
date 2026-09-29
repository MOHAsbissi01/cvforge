import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createEntry,
  SECTION_LABELS,
  type CandidateProfile,
  type Entry,
  type SectionKey,
} from "../models/profile";
import { useProfile } from "../context/ProfileContext";
import { normalizeUrl } from "../services/validation";

type Field = {
  key: string;
  label: string;
  type?: "textarea" | "date" | "checkbox" | "select" | "url";
  placeholder?: string;
  options?: string[];
};
const fields: Partial<Record<SectionKey, Field[]>> = {
  education: [
    { key: "institution", label: "Institution" },
    { key: "degree", label: "Degree" },
    { key: "field", label: "Field of study" },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    { key: "current", label: "Currently studying", type: "checkbox" },
    { key: "location", label: "City / country" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "coursework", label: "Relevant coursework" },
    { key: "honors", label: "Honors" },
  ],
  experience: [
    { key: "company", label: "Company" },
    { key: "position", label: "Position" },
    {
      key: "employmentType",
      label: "Employment type",
      type: "select",
      options: [
        "Internship",
        "Full-time",
        "Part-time",
        "Contract",
        "Freelance",
        "Other",
      ],
    },
    { key: "location", label: "Location" },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    { key: "current", label: "Current position", type: "checkbox" },
    {
      key: "description",
      label: "Achievements — one per line",
      type: "textarea",
      placeholder: "Action + task + result, using facts you can verify",
    },
    { key: "technologies", label: "Technologies / skills" },
  ],
  projects: [
    { key: "name", label: "Project name" },
    { key: "role", label: "Your role" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "technologies", label: "Technologies" },
    { key: "githubUrl", label: "GitHub URL", type: "url" },
    { key: "demoUrl", label: "Demo URL", type: "url" },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    {
      key: "achievements",
      label: "Key achievements — one per line",
      type: "textarea",
    },
  ],
  skills: [
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        "Programming Languages",
        "Data & BI",
        "Databases",
        "ERP",
        "Cloud",
        "Frameworks",
        "Tools",
        "AI / Machine Learning",
        "Languages",
        "Other",
      ],
    },
    { key: "items", label: "Skills, separated by commas" },
  ],
  certifications: [
    { key: "name", label: "Certification name" },
    { key: "issuer", label: "Issuing organization" },
    { key: "date", label: "Date", type: "date" },
    { key: "credentialId", label: "Credential ID" },
    { key: "credentialUrl", label: "Credential URL", type: "url" },
  ],
  languages: [
    { key: "language", label: "Language" },
    {
      key: "proficiency",
      label: "Proficiency",
      type: "select",
      options: ["Native", "Fluent", "Professional", "Intermediate", "Basic"],
    },
  ],
  awards: [
    { key: "title", label: "Title" },
    { key: "organization", label: "Organization" },
    { key: "date", label: "Date", type: "date" },
    { key: "description", label: "Description", type: "textarea" },
  ],
  volunteering: [
    { key: "organization", label: "Organization" },
    { key: "role", label: "Role" },
    { key: "location", label: "Location" },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
    { key: "current", label: "Current role", type: "checkbox" },
    { key: "description", label: "Description", type: "textarea" },
  ],
};
const guidance: Partial<Record<SectionKey, string>> = {
  summary:
    "Aim for 2–4 lines: your current role, specialization, strongest skills, and direction.",
  experience:
    "Focus on what you accomplished. Use action + task + result when you have a genuine result to share.",
  projects:
    "Projects demonstrate practical experience, especially when you are early in your career.",
  skills:
    "Prioritize skills relevant to the roles you are targeting. Avoid rating bars.",
  contact:
    "Use public links that recruiters can open. Skip sensitive details such as an exact street address.",
};
const basicsFields: {
  key: keyof CandidateProfile["basics"];
  label: string;
  type?: string;
}[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "headline", label: "Professional headline" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "linkedin", label: "LinkedIn", type: "url" },
  { key: "github", label: "GitHub", type: "url" },
  { key: "portfolio", label: "Portfolio", type: "url" },
  { key: "website", label: "Personal website", type: "url" },
];
const arrayKeys = [
  "education",
  "experience",
  "projects",
  "skills",
  "certifications",
  "languages",
  "awards",
  "volunteering",
] as const;
type ArrayKey = (typeof arrayKeys)[number];

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
}) {
  const id = `field-${field.key}-${crypto.randomUUID()}`;
  if (field.type === "checkbox")
    return (
      <label className="check-row">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.label}
      </label>
    );
  return (
    <label className="field">
      <span>{field.label}</span>
      {field.type === "textarea" ? (
        <textarea
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={4}
        />
      ) : field.type === "select" ? (
        <select
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select or type below</option>
          {field.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={
            field.type === "date"
              ? "month"
              : field.type === "url"
                ? "text"
                : "text"
          }
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
        />
      )}
      {field.type === "url" && value && !normalizeUrl(String(value)) && (
        <small className="error-text">Enter a valid web URL.</small>
      )}
    </label>
  );
}

export function BuilderEditor({ section }: { section: SectionKey }) {
  const { profile, update } = useProfile();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customSkill, setCustomSkill] = useState<Record<string, string>>({});
  const settings = profile.sections.find((item) => item.key === section)!;
  const moveSection = (offset: number) =>
    update((draft) => {
      const index = draft.sections.findIndex((item) => item.key === section);
      const next = index + offset;
      if (next < 0 || next >= draft.sections.length) return;
      [draft.sections[index], draft.sections[next]] = [
        draft.sections[next],
        draft.sections[index],
      ];
    });
  const mutateEntry = (
    key: ArrayKey,
    index: number,
    fn: (entry: Entry) => void,
  ) => update((draft) => fn(draft[key][index]));
  const manipulate = (
    key: ArrayKey,
    index: number,
    action: "up" | "down" | "duplicate" | "delete",
  ) =>
    update((draft) => {
      const entries = draft[key];
      if (action === "delete") entries.splice(index, 1);
      if (action === "duplicate")
        entries.splice(index + 1, 0, {
          ...entries[index],
          id: crypto.randomUUID(),
        });
      if (action === "up" && index > 0)
        [entries[index - 1], entries[index]] = [
          entries[index],
          entries[index - 1],
        ];
      if (action === "down" && index < entries.length - 1)
        [entries[index + 1], entries[index]] = [
          entries[index],
          entries[index + 1],
        ];
    });
  return (
    <div className="editor-panel">
      <div className="editor-heading">
        <div>
          <span className="eyebrow">CV BUILDER</span>
          <h1>{SECTION_LABELS[section]}</h1>
          <p>
            {guidance[section] ??
              "Add only information that is accurate and relevant to your target role."}
          </p>
        </div>
        <div className="icon-actions">
          <button
            type="button"
            title="Move section up"
            aria-label="Move section up"
            onClick={() => moveSection(-1)}
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            title="Move section down"
            aria-label="Move section down"
            onClick={() => moveSection(1)}
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            title={settings.visible ? "Hide section" : "Show section"}
            aria-label={settings.visible ? "Hide section" : "Show section"}
            onClick={() =>
              update((draft) => {
                draft.sections.find((item) => item.key === section)!.visible =
                  !settings.visible;
              })
            }
          >
            {settings.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>
      {!settings.visible && (
        <div className="notice">
          This section is hidden in the CV preview and export.
        </div>
      )}
      {section === "contact" && (
        <div className="field-grid">
          {basicsFields.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.label}</span>
              <input
                type={
                  field.type === "email"
                    ? "email"
                    : field.type === "tel"
                      ? "tel"
                      : "text"
                }
                value={profile.basics[field.key]}
                onChange={(event) =>
                  update((draft) => {
                    draft.basics[field.key] = event.target.value;
                  })
                }
              />
              {field.type === "url" &&
                profile.basics[field.key] &&
                !normalizeUrl(profile.basics[field.key]) && (
                  <small className="error-text">Enter a valid web URL.</small>
                )}
            </label>
          ))}
        </div>
      )}
      {section === "summary" && (
        <label className="field">
          <span>Professional summary</span>
          <textarea
            rows={8}
            value={profile.summary}
            onChange={(event) =>
              update((draft) => {
                draft.summary = event.target.value;
              })
            }
            placeholder="Who you are, what you do well, and where you want to go"
          />
          <small>
            {profile.summary.length} characters · A concise 2–4 lines usually
            works well.
          </small>
        </label>
      )}
      {arrayKeys.includes(section as ArrayKey) && (
        <>
          <div className="entry-list">
            {(profile[section as ArrayKey] as Entry[]).map((entry, index) => (
              <div className="entry-card" key={entry.id}>
                <div className="entry-card-head">
                  <button
                    type="button"
                    className="entry-title"
                    onClick={() =>
                      setExpanded(expanded === entry.id ? null : entry.id)
                    }
                    aria-expanded={expanded === entry.id}
                  >
                    {String(
                      Object.values(entry).find(
                        (value) =>
                          typeof value === "string" && value !== entry.id,
                      ) || `${SECTION_LABELS[section]} ${index + 1}`,
                    )}
                  </button>
                  <div className="icon-actions">
                    <button
                      type="button"
                      aria-label="Move entry up"
                      onClick={() =>
                        manipulate(section as ArrayKey, index, "up")
                      }
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Move entry down"
                      onClick={() =>
                        manipulate(section as ArrayKey, index, "down")
                      }
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Duplicate entry"
                      onClick={() =>
                        manipulate(section as ArrayKey, index, "duplicate")
                      }
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete entry"
                      onClick={() =>
                        manipulate(section as ArrayKey, index, "delete")
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {expanded === entry.id && (
                  <div className="field-grid">
                    {fields[section]?.map((field) => (
                      <FieldControl
                        key={field.key}
                        field={field}
                        value={
                          entry[field.key] ??
                          (field.type === "checkbox" ? false : "")
                        }
                        onChange={(value) =>
                          mutateEntry(section as ArrayKey, index, (draft) => {
                            draft[field.key] = value;
                          })
                        }
                      />
                    ))}
                    {section === "skills" && (
                      <label className="field">
                        <span>Custom category</span>
                        <input
                          value={customSkill[entry.id] ?? ""}
                          onChange={(event) =>
                            setCustomSkill({
                              ...customSkill,
                              [entry.id]: event.target.value,
                            })
                          }
                          onBlur={() => {
                            if (customSkill[entry.id])
                              mutateEntry("skills", index, (draft) => {
                                draft.category = customSkill[entry.id];
                              });
                          }}
                          placeholder="Type a custom category"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              const entry = createEntry();
              update((draft) => {
                draft[section as ArrayKey].push(entry);
              });
              setExpanded(entry.id);
            }}
          >
            <Plus size={16} /> Add{" "}
            {SECTION_LABELS[section].toLowerCase().replace(/s$/, "")}
          </button>
        </>
      )}
      {section === "custom" && (
        <>
          <div className="entry-list">
            {profile.custom.map((custom, index) => (
              <div className="entry-card" key={custom.id}>
                <div className="entry-card-head">
                  <strong>
                    {custom.title || `Custom section ${index + 1}`}
                  </strong>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Delete custom section"
                    onClick={() =>
                      update((draft) => {
                        draft.custom.splice(index, 1);
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <label className="field">
                  <span>Section title</span>
                  <input
                    value={custom.title}
                    onChange={(event) =>
                      update((draft) => {
                        draft.custom[index].title = event.target.value;
                      })
                    }
                    placeholder="Publications, associations, research…"
                  />
                </label>
                {custom.entries.map((entry, entryIndex) => (
                  <div className="custom-entry" key={entry.id}>
                    <div className="field-grid">
                      {[
                        { key: "title", label: "Title" },
                        { key: "subtitle", label: "Organization / detail" },
                        { key: "startDate", label: "Start date", type: "date" },
                        { key: "endDate", label: "End date", type: "date" },
                        {
                          key: "description",
                          label: "Description",
                          type: "textarea",
                        },
                      ].map((field) => (
                        <FieldControl
                          key={field.key}
                          field={field as Field}
                          value={entry[field.key] ?? ""}
                          onChange={(value) =>
                            update((draft) => {
                              draft.custom[index].entries[entryIndex][
                                field.key
                              ] = value;
                            })
                          }
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() =>
                        update((draft) => {
                          draft.custom[index].entries.splice(entryIndex, 1);
                        })
                      }
                    >
                      Remove entry
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    update((draft) => {
                      draft.custom[index].entries.push(createEntry());
                    })
                  }
                >
                  + Add entry
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              update((draft) => {
                draft.custom.push({
                  id: crypto.randomUUID(),
                  title: "",
                  entries: [createEntry()],
                });
              })
            }
          >
            <Plus size={16} /> Add custom section
          </button>
        </>
      )}
    </div>
  );
}

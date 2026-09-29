import type { CandidateProfile, Entry, SectionKey } from "../models/profile";
import { SECTION_LABELS } from "../models/profile";
import { normalizeUrl } from "../services/validation";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const str = (value: unknown) => String(value ?? "").trim();
const dates = (entry: Entry) =>
  [str(entry.startDate), str(entry.current ? "Present" : entry.endDate)]
    .filter(Boolean)
    .join(" – ");
function TextLines({ value }: { value: string }) {
  return (
    <>
      {value
        .split("\n")
        .filter(Boolean)
        .map((line, index) => (
          <p className="cv-line" key={index}>
            {line.replace(/^[-•]\s*/, "")}
          </p>
        ))}
    </>
  );
}
function EntryView({ entry, kind }: { entry: Entry; kind: SectionKey }) {
  if (kind === "skills")
    return (
      <div className="cv-inline">
        <strong>{str(entry.category) || "Skills"}:</strong> {str(entry.items)}
      </div>
    );
  if (kind === "languages")
    return (
      <div className="cv-inline">
        <strong>{str(entry.language)}</strong>
        {entry.proficiency ? `: ${str(entry.proficiency)}` : ""}
      </div>
    );
  const title =
    kind === "experience"
      ? [str(entry.position), str(entry.company)].filter(Boolean).join(" · ")
      : kind === "education"
        ? [str(entry.degree), str(entry.field)].filter(Boolean).join(" in ")
        : kind === "projects"
          ? str(entry.name)
          : kind === "certifications"
            ? str(entry.name)
            : kind === "awards"
              ? str(entry.title)
              : [str(entry.role), str(entry.organization)]
                  .filter(Boolean)
                  .join(" · ");
  const meta =
    kind === "education"
      ? [str(entry.institution), dates(entry), str(entry.location)]
      : kind === "experience"
        ? [dates(entry), str(entry.location), str(entry.employmentType)]
        : kind === "projects"
          ? [str(entry.role), dates(entry)]
          : kind === "certifications"
            ? [str(entry.issuer), str(entry.date)]
            : kind === "awards"
              ? [str(entry.organization), str(entry.date)]
              : [dates(entry), str(entry.location)];
  const description =
    kind === "projects"
      ? [str(entry.description), str(entry.achievements)]
          .filter(Boolean)
          .join("\n")
      : str(entry.description);
  const extras =
    kind === "experience"
      ? [str(entry.technologies)]
      : kind === "projects"
        ? [str(entry.technologies), str(entry.githubUrl), str(entry.demoUrl)]
        : kind === "education"
          ? [str(entry.coursework), str(entry.honors)]
          : kind === "certifications"
            ? [str(entry.credentialId), str(entry.credentialUrl)]
            : [];
  return (
    <div className="cv-entry">
      <div className="cv-entry-head">
        <strong>{title}</strong>
        <span>{meta.filter(Boolean).join(" · ")}</span>
      </div>
      {description && <TextLines value={description} />}
      {extras.filter(Boolean).map((extra, i) => (
        <p className="cv-extra" key={i}>
          {extra}
        </p>
      ))}
    </div>
  );
}
export function CvDocument({
  profile,
  measure = false,
}: {
  profile: CandidateProfile;
  measure?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [qr, setQr] = useState({ url: "", data: "" });
  const qrSource =
    profile.qr.source === "none"
      ? ""
      : profile.qr.source === "custom"
        ? profile.qr.customUrl
        : profile.basics[profile.qr.source];
  const qrUrl = normalizeUrl(qrSource);
  useEffect(() => {
    if (!profile.qr.includeInCv || !qrUrl) return;
    QRCode.toDataURL(qrUrl, { margin: 0, width: 160 })
      .then((data) => setQr({ url: qrUrl, data }))
      .catch(() => {});
  }, [profile.qr.includeInCv, qrUrl]);
  useEffect(() => {
    if (!measure || !ref.current) return;
    const observer = new ResizeObserver(() =>
      setPages(Math.max(1, Math.ceil((ref.current?.scrollHeight ?? 0) / 842))),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [measure]);
  const name = [profile.basics.firstName, profile.basics.lastName]
    .filter(Boolean)
    .join(" ");
  const links = [
    profile.basics.linkedin,
    profile.basics.github,
    profile.basics.portfolio,
    profile.basics.website,
  ]
    .map((value) => ({ value, url: normalizeUrl(value) }))
    .filter((x) => x.url);
  return (
    <div className="document-wrap">
      <article
        ref={ref}
        className={`cv-document cv-${profile.template}`}
        aria-label="CV preview"
      >
        <header className="cv-header">
          <div>
            <h1>{name || "Your name"}</h1>
            <p className="cv-headline">
              {profile.basics.headline || "Your professional headline"}
            </p>
            <p className="cv-contact">
              {[
                profile.basics.email,
                profile.basics.phone,
                [profile.basics.city, profile.basics.country]
                  .filter(Boolean)
                  .join(", "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="cv-links">
              {links.map(({ value, url }) => (
                <a href={url!} key={value} target="_blank" rel="noreferrer">
                  {value.replace(/^https?:\/\//, "")}
                </a>
              ))}
            </p>
          </div>
          {profile.qr.includeInCv && qrUrl === qr.url && qr.data && (
            <img
              className="cv-qr"
              src={qr.data}
              alt="QR code for selected link"
            />
          )}
        </header>
        {profile.sections
          .filter((section) => section.visible && section.key !== "contact")
          .map(({ key }) => {
            if (key === "summary")
              return (
                profile.summary && (
                  <section className="cv-section" key={key}>
                    <h2>Professional summary</h2>
                    <p>{profile.summary}</p>
                  </section>
                )
              );
            if (key === "custom")
              return profile.custom
                .filter((section) => section.title && section.entries.length)
                .map((section) => (
                  <section className="cv-section" key={section.id}>
                    <h2>{section.title}</h2>
                    {section.entries.map((entry) => (
                      <div className="cv-entry" key={entry.id}>
                        <div className="cv-entry-head">
                          <strong>{str(entry.title)}</strong>
                          <span>
                            {[str(entry.subtitle), dates(entry)]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        <TextLines value={str(entry.description)} />
                      </div>
                    ))}
                  </section>
                ));
            const entries = profile[
              key as Exclude<SectionKey, "contact" | "summary" | "custom">
            ] as Entry[];
            if (key === "skills" && entries?.length) {
              const general = entries.filter(
                (entry) =>
                  !str(entry.category) ||
                  str(entry.category).toLowerCase() === "skills",
              );
              const grouped = entries.filter(
                (entry) =>
                  str(entry.category) &&
                  str(entry.category).toLowerCase() !== "skills",
              );
              return (
                <section className="cv-section" key={key}>
                  <h2>{SECTION_LABELS[key]}</h2>
                  {general.length > 0 && (
                    <div className="cv-inline">
                      {general
                        .map((entry) => str(entry.items))
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                  {grouped.map((entry) => (
                    <EntryView entry={entry} kind={key} key={entry.id} />
                  ))}
                </section>
              );
            }
            return entries?.length ? (
              <section className="cv-section" key={key}>
                <h2>{SECTION_LABELS[key]}</h2>
                {entries.map((entry) => (
                  <EntryView entry={entry} kind={key} key={entry.id} />
                ))}
              </section>
            ) : null;
          })}
      </article>
      {measure && (
        <div className="page-note">
          Estimated {pages} A4 {pages === 1 ? "page" : "pages"}
          {pages > 2 && " · Consider trimming content for early-career roles."}
        </div>
      )}
    </div>
  );
}

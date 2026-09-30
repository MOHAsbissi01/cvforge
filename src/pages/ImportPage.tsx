import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, FileCheck2, UploadCloud } from "lucide-react";
import { FlowSteps } from "../components/FlowSteps";
import { PrivacyLine } from "../components/PrivacyLine";
import { useProfile } from "../context/ProfileContext";
import type { CandidateProfile } from "../models/profile";
import { parseGenericCv, parseLinkedInPdf } from "../services/import";

export function ImportPage() {
  const { replace } = useProfile();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const reviewRef = useRef<HTMLDivElement>(null);
  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setError("");
    setBusy(true);
    setDraft(null);
    try {
      const { extractFiles } = await import("../services/fileExtract");
      const extracted = await extractFiles(files, setProgress);
      if (extracted.text.trim().length < 12)
        throw new Error(
          "We couldn't find readable CV text. Try a clearer file or enter your details manually.",
        );
      setRaw(extracted.text);
      setFileName(files.map((file) => file.name).join(", "));
      const isLinkedIn =
        extracted.source === "pdf" &&
        /(?:Top Skills|linkedin\.com\/in\/)/i.test(extracted.sidebarText);
      setDraft(
        isLinkedIn
          ? parseLinkedInPdf(extracted)
          : parseGenericCv(extracted.text),
      );
      if (window.innerWidth < 760)
        window.setTimeout(
          () =>
            reviewRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          150,
        );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't read this file. Try another file or enter your details manually.",
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  const counts = draft
    ? [
        ["Experience", draft.experience.length],
        ["Projects", draft.projects.length],
        ["Education", draft.education.length],
        ["Skills", draft.skills.length],
        ["Certifications", draft.certifications.length],
        ["Languages", draft.languages.length],
      ]
    : [];
  return (
    <main className="page-shell">
      <FlowSteps current="/import" />
      <div className="page-intro">
        <span className="eyebrow">IMPORT</span>
        <h1>Start with your CV.</h1>
        <p>
          Choose a PDF, Word DOCX, or screenshot. CVForge reads it in your
          browser; you check the result before it enters your draft.
        </p>
        <PrivacyLine />
      </div>
      <div className="import-grid">
        <div className="card import-card">
          <span className="eyebrow">STEP 1</span>
          <h2>Choose your file</h2>
          <p>
            Standard CVs and LinkedIn PDFs use the same upload. For a CV spread
            across screenshots, select the images together in page order.
          </p>
          <label className="upload-zone">
            <UploadCloud size={30} />
            {busy && <span role="status">{progress || "Reading file…"}</span>}
            <strong>
              {busy ? "Processing…" : "Choose CV file or screenshots"}
            </strong>
            <span>PDF, DOCX, PNG, JPG, WebP, HEIC · up to 4 images</span>
            <input
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.heic,.heif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              multiple
              aria-label="Choose CV file or screenshots"
              disabled={busy}
              onChange={(event) => {
                void handleFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </label>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <p className="fine-print">
            Image recognition may take longer on a phone. You can always{" "}
            <Link to="/builder">start manually</Link>.
          </p>
        </div>
        <div className="card review-import" ref={reviewRef}>
          <div className="card-top">
            <span className="eyebrow">STEP 2 · REVIEW BEFORE ACCEPTING</span>
            {fileName && <span className="file-badge">{fileName}</span>}
          </div>
          {draft ? (
            <>
              <div className="notice warning">
                Imported information may contain errors. Review and edit it
                before continuing.
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>First name</span>
                  <input
                    value={draft.basics.firstName}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        basics: {
                          ...draft.basics,
                          firstName: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input
                    value={draft.basics.lastName}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        basics: {
                          ...draft.basics,
                          lastName: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    value={draft.basics.email}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        basics: { ...draft.basics, email: event.target.value },
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    value={draft.basics.phone}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        basics: { ...draft.basics, phone: event.target.value },
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Headline</span>
                  <input
                    value={draft.basics.headline}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        basics: {
                          ...draft.basics,
                          headline: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>LinkedIn</span>
                  <input
                    value={draft.basics.linkedin}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        basics: {
                          ...draft.basics,
                          linkedin: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
              <label className="field">
                <span>Professional summary</span>
                <textarea
                  rows={5}
                  value={draft.summary}
                  onChange={(event) =>
                    setDraft({ ...draft, summary: event.target.value })
                  }
                />
              </label>
              <div className="import-counts">
                {counts.map(([label, count]) => (
                  <span key={label}>
                    {label} <strong>{count}</strong>
                  </span>
                ))}
              </div>
              <details>
                <summary>
                  View extracted text <ChevronDown size={15} />
                </summary>
                <pre className="raw-text">{raw}</pre>
              </details>
              <p className="fine-print">
                After accepting, review individual entries and dates in the
                builder. Your current draft will be replaced.
              </p>
              {(!draft.basics.firstName.trim() ||
                !draft.basics.lastName.trim()) && (
                <p className="fine-print">
                  Enter your first and last name above to continue.
                </p>
              )}
              <button
                className="button button-primary"
                disabled={
                  !draft.basics.firstName.trim() ||
                  !draft.basics.lastName.trim()
                }
                onClick={() => {
                  replace(draft);
                  navigate("/builder");
                }}
              >
                Accept and review in builder <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <div className="empty-review">
              <FileCheck2 size={32} />
              <strong>Your extracted details will appear here</strong>
              <span>Nothing is added to your draft until you accept it.</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, FileCheck2, UploadCloud } from "lucide-react";
import { PrivacyLine } from "../components/PrivacyLine";
import { useProfile } from "../context/ProfileContext";
import type { CandidateProfile } from "../models/profile";
import { parseGenericCv, parseLinkedInPdf } from "../services/import";

export function ImportPage() {
  const { replace } = useProfile();
  const navigate = useNavigate();
  const [kind, setKind] = useState<"cv" | "linkedin">(
    window.location.hash.includes("linkedin") ? "linkedin" : "cv",
  );
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function handleFile(file?: File) {
    if (!file) return;
    setError("");
    setBusy(true);
    setDraft(null);
    try {
      const { extractPdfText } = await import("../services/pdfExtract");
      const extracted = await extractPdfText(file);
      if (extracted.trim().length < 50)
        throw new Error(
          "We couldn't reliably read this PDF. You can still enter your information manually.",
        );
      setRaw(extracted);
      setFileName(file.name);
      setDraft(
        kind === "linkedin"
          ? parseLinkedInPdf(extracted)
          : parseGenericCv(extracted),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't reliably read this PDF. You can still enter your information manually.",
      );
    } finally {
      setBusy(false);
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
      <div className="page-intro">
        <span className="eyebrow">IMPORT</span>
        <h1>Bring your existing CV.</h1>
        <p>
          Extract text from a PDF in your browser, then review every detail
          before it enters your draft.
        </p>
        <PrivacyLine />
      </div>
      <div className="import-grid">
        <div className="card import-card">
          <div className="segmented">
            <button
              className={kind === "cv" ? "selected" : ""}
              onClick={() => setKind("cv")}
            >
              CV PDF
            </button>
            <button
              className={kind === "linkedin" ? "selected" : ""}
              onClick={() => setKind("linkedin")}
            >
              LinkedIn PDF
            </button>
          </div>
          <h2>
            {kind === "linkedin"
              ? "Import LinkedIn profile PDF"
              : "Upload a CV PDF"}
          </h2>
          <p>
            {kind === "linkedin"
              ? "Open your LinkedIn profile, choose its save-to-PDF option, and upload the resulting file here."
              : "We’ll try to identify contact details and common CV sections from selectable PDF text."}
          </p>
          <label className="upload-zone">
            <UploadCloud size={30} />
            <strong>{busy ? "Reading PDF…" : "Choose a PDF to import"}</strong>
            <span>PDF only · up to 10 MB · processed locally</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={busy}
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <p className="fine-print">
            Scanned or image-only PDFs may not contain readable text. You can
            always <Link to="/builder">start manually</Link>.
          </p>
        </div>
        <div className="card review-import">
          <div className="card-top">
            <span className="eyebrow">REVIEW BEFORE ACCEPTING</span>
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
              <button
                className="button button-primary"
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

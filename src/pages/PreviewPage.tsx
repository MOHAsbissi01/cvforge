import { useEffect, useState } from "react";
import { Check, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { CvDocument } from "../components/CvDocument";
import { useProfile } from "../context/ProfileContext";
import { chooseTemplate, type CandidateProfile } from "../models/profile";
import { normalizeUrl } from "../services/validation";

function QrTool() {
  const { profile, update } = useProfile();
  const [image, setImage] = useState({ url: "", data: "" });
  const destination =
    profile.qr.source === "none"
      ? ""
      : profile.qr.source === "custom"
        ? profile.qr.customUrl
        : profile.basics[profile.qr.source];
  const url = normalizeUrl(destination);
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: { dark: "#182a35", light: "#ffffff" },
    })
      .then((data) => setImage({ url, data }))
      .catch(() => {});
  }, [url]);
  return (
    <div className="qr-tool">
      <div>
        <label className="field">
          <span>QR destination</span>
          <select
            value={profile.qr.source}
            onChange={(event) =>
              update((draft) => {
                draft.qr.source = event.target
                  .value as CandidateProfile["qr"]["source"];
              })
            }
          >
            <option value="none">None</option>
            <option value="linkedin">LinkedIn</option>
            <option value="github">GitHub</option>
            <option value="portfolio">Portfolio</option>
            <option value="website">Website</option>
            <option value="custom">Custom URL</option>
          </select>
        </label>
        {profile.qr.source === "custom" && (
          <label className="field">
            <span>Custom URL</span>
            <input
              value={profile.qr.customUrl}
              onChange={(event) =>
                update((draft) => {
                  draft.qr.customUrl = event.target.value;
                })
              }
              placeholder="https://example.com"
            />
          </label>
        )}
        <label className="check-row">
          <input
            type="checkbox"
            checked={profile.qr.includeInCv}
            onChange={(event) =>
              update((draft) => {
                draft.qr.includeInCv = event.target.checked;
              })
            }
          />{" "}
          Include small QR code in CV
        </label>
        <p className="fine-print">
          QR codes should complement clickable text links, not replace them.
        </p>
      </div>
      <div className="qr-output">
        {url === image.url && image.data ? (
          <>
            <img src={image.data} alt={`QR code for ${url}`} />
            <a
              className="button button-secondary"
              href={image.data}
              download="cvforge-qr.png"
            >
              <Download size={15} /> Download QR
            </a>
          </>
        ) : (
          <div className="qr-empty">
            <QrCode size={35} />
            <span>Choose a valid link to preview</span>
          </div>
        )}
      </div>
    </div>
  );
}
export function PreviewPage() {
  const { profile, update } = useProfile();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  return (
    <main className="page-shell preview-page">
      <div className="page-intro preview-intro">
        <div>
          <span className="eyebrow">FINAL PREVIEW</span>
          <h1>Ready to share.</h1>
          <p>
            Review your layout and links, then export a selectable-text A4 PDF.
          </p>
        </div>
        <button
          className="button button-primary"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            setExportError("");
            try {
              const { downloadPdf } = await import("../services/pdf");
              await downloadPdf(profile);
            } catch (error) {
              setExportError(
                error instanceof Error
                  ? error.message
                  : "PDF export failed. Please try again.",
              );
            } finally {
              setExporting(false);
            }
          }}
        >
          <Download size={16} />
          {exporting ? "Exporting…" : "Export PDF"}
        </button>
      </div>
      {exportError && (
        <div className="error-box" role="alert">
          {exportError}
        </div>
      )}
      <div className="final-layout">
        <div className="final-paper">
          <CvDocument profile={profile} measure />
        </div>
        <aside className="final-tools">
          <div className="card">
            <h2>Template</h2>
            <p>All three keep essential content in one text column.</p>
            {(
              [
                ["classic", "ATS Classic", "Traditional and restrained"],
                ["modern", "Modern Professional", "Subtle blue accent"],
                ["student", "Technical Student", "Projects and skills first"],
              ] as const
            ).map(([id, name, description]) => (
              <button
                key={id}
                className={`template-option ${profile.template === id ? "selected" : ""}`}
                onClick={() =>
                  update((draft) => {
                    chooseTemplate(draft, id);
                  })
                }
              >
                <span>
                  <strong>{name}</strong>
                  <small>{description}</small>
                </span>
                {profile.template === id && <Check size={18} />}
              </button>
            ))}
          </div>
          <div className="card">
            <h2>QR code</h2>
            <QrTool />
          </div>
        </aside>
      </div>
    </main>
  );
}

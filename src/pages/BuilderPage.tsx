import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  EyeOff,
  FolderOpen,
  Plus,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { BuilderEditor } from "../components/BuilderEditor";
import { CvDocument } from "../components/CvDocument";
import { PrivacyLine } from "../components/PrivacyLine";
import { useProfile } from "../context/ProfileContext";
import {
  blankProfile,
  chooseTemplate,
  SECTION_LABELS,
  type SectionKey,
  type TemplateId,
} from "../models/profile";
import { completion } from "../services/validation";

function Onboarding({ onClose }: { onClose: () => void }) {
  const { demo, replace } = useProfile();
  const navigate = useNavigate();
  return (
    <div className="modal-backdrop">
      <div
        className="onboarding card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <button className="close-button" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <span className="eyebrow">WELCOME TO CVFORGE</span>
        <h2 id="onboarding-title">How would you like to start?</h2>
        <p>
          Your draft saves locally as you work. Choose an option to get started.
        </p>
        <div className="onboarding-grid">
          <button
            onClick={() => {
              replace(blankProfile());
              onClose();
            }}
          >
            <span className="choice-icon">
              <Plus size={20} />
            </span>
            <strong>Start from scratch</strong>
            <small>Build one section at a time</small>
          </button>
          <button onClick={() => navigate("/import")}>
            <span className="choice-icon">
              <UploadCloud size={20} />
            </span>
            <strong>Import my CV</strong>
            <small>Review extracted PDF details</small>
          </button>
          <button onClick={() => navigate("/import?type=linkedin")}>
            <span className="choice-icon">
              <FolderOpen size={20} />
            </span>
            <strong>Import LinkedIn PDF</strong>
            <small>Use a saved profile PDF</small>
          </button>
          <button
            onClick={() => {
              demo();
              onClose();
            }}
          >
            <span className="choice-icon">
              <WandSparkles size={20} />
            </span>
            <strong>Try demo data</strong>
            <small>Explore a fictional example</small>
          </button>
        </div>
        <PrivacyLine />
      </div>
    </div>
  );
}
export function Builder() {
  const { profile, saved, hasDraft, clear, demo, update } = useProfile();
  const [section, setSection] = useState<SectionKey>("contact");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [showOnboarding, setShowOnboarding] = useState(() => !hasDraft);
  const [zoom, setZoom] = useState(() => (window.innerWidth < 760 ? 54 : 78));
  const [clearConfirm, setClearConfirm] = useState(false);
  const navigate = useNavigate();
  const percent = completion(profile);
  const ordered = profile.sections;
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("quick-section")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return (
    <main className="builder-page">
      <div className="builder-top shell-wide">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>Build your CV</h1>
          <p>Clear sections. Stronger details. A polished result.</p>
        </div>
        <div className="builder-top-right">
          <span className="saved-indicator">
            <Check size={14} />
            {saved ? "Saved locally" : "Saving…"}
          </span>
          <PrivacyLine />
        </div>
      </div>
      <div className="builder-layout shell-wide">
        <aside className="section-sidebar">
          <div className="sidebar-top">
            <div className="progress-head">
              <strong>Profile completeness</strong>
              <span>{percent}%</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>Complete the essentials before exporting.</small>
          </div>
          <label className="quick-select">
            <span>
              Jump to section <kbd>Ctrl K</kbd>
            </span>
            <select
              id="quick-section"
              value={section}
              onChange={(event) => setSection(event.target.value as SectionKey)}
            >
              {ordered.map((item) => (
                <option value={item.key} key={item.key}>
                  {SECTION_LABELS[item.key]}
                </option>
              ))}
            </select>
          </label>
          <nav className="section-nav" aria-label="CV sections">
            {ordered.map((item, index) => (
              <button
                key={item.key}
                className={`${section === item.key ? "active" : ""} ${!item.visible ? "muted" : ""}`}
                onClick={() => {
                  setSection(item.key);
                  setMobileTab("edit");
                }}
              >
                <span className="section-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{SECTION_LABELS[item.key]}</span>
                {!item.visible && <EyeOff size={14} />}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="text-button" onClick={() => demo()}>
              Load demo CV
            </button>
            <button
              className="text-button danger"
              onClick={() => setClearConfirm(true)}
            >
              Clear all data
            </button>
          </div>
        </aside>
        <div className="mobile-tabs">
          <button
            className={mobileTab === "edit" ? "active" : ""}
            onClick={() => setMobileTab("edit")}
          >
            Edit
          </button>
          <button
            className={mobileTab === "preview" ? "active" : ""}
            onClick={() => setMobileTab("preview")}
          >
            Preview
          </button>
        </div>
        <div
          className={`editor-column ${mobileTab === "preview" ? "mobile-hidden" : ""}`}
        >
          <BuilderEditor section={section} />
          <div className="editor-next">
            <button
              className="button button-secondary"
              onClick={() => {
                const index = ordered.findIndex((x) => x.key === section);
                setSection(
                  ordered[Math.min(index + 1, ordered.length - 1)].key,
                );
              }}
            >
              Next section <ArrowRight size={16} />
            </button>
            <button className="text-button" onClick={() => navigate("/review")}>
              Run quality check
            </button>
          </div>
        </div>
        <aside
          className={`preview-column ${mobileTab === "edit" ? "mobile-hidden" : ""}`}
        >
          <div className="preview-controls">
            <div>
              <strong>Live preview</strong>
              <span>A4 document</span>
            </div>
            <div className="preview-control-actions">
              <label className="zoom-control">
                Zoom{" "}
                <select
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                >
                  <option value={54}>54%</option>
                  <option value={60}>60%</option>
                  <option value={78}>78%</option>
                  <option value={90}>90%</option>
                  <option value={100}>100%</option>
                </select>
              </label>
              <Link to="/preview" className="text-button">
                Open full view
              </Link>
            </div>
          </div>
          <div className="preview-scroll">
            <div
              style={{
                width: `${(595 * zoom) / 100}px`,
                minHeight: `${(842 * zoom) / 100}px`,
                marginInline: "auto",
              }}
            >
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top left",
                  width: 595,
                }}
              >
                <CvDocument profile={profile} measure />
              </div>
            </div>
          </div>
          <div className="preview-bottom">
            <label>
              Template{" "}
              <select
                value={profile.template}
                onChange={(event) =>
                  update((draft) => {
                    chooseTemplate(draft, event.target.value as TemplateId);
                  })
                }
              >
                <option value="classic">ATS Classic</option>
                <option value="modern">Modern Professional</option>
                <option value="student">Technical Student</option>
              </select>
            </label>
          </div>
        </aside>
      </div>
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}
      {clearConfirm && (
        <div className="modal-backdrop">
          <div
            className="confirm-dialog card"
            role="alertdialog"
            aria-modal="true"
          >
            <h2>Clear your CV data?</h2>
            <p>
              This removes the local draft from this browser. You can start
              again or load demo data later.
            </p>
            <div className="dialog-actions">
              <button
                className="button button-secondary"
                onClick={() => setClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="button button-danger"
                onClick={() => {
                  clear();
                  setClearConfirm(false);
                  setShowOnboarding(true);
                }}
              >
                Clear all data
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

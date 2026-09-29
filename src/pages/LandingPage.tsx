import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useProfile } from "../context/ProfileContext";

export function Landing() {
  const { demo, hasDraft } = useProfile();
  const navigate = useNavigate();
  return (
    <main className="landing">
      <section className="hero shell">
        <div className="hero-copy">
          <div className="pill">
            <Sparkles size={14} /> A clearer path to a better CV
          </div>
          <h1>
            Build a CV recruiters can actually read<span>.</span>
          </h1>
          <p>
            Create a clean, professional CV with guided sections, a live
            preview, and a practical quality check. Export an ATS-conscious PDF
            when you’re ready.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" to="/builder">
              {hasDraft ? "Continue my CV" : "Build my CV"}{" "}
              <ArrowRight size={18} />
            </Link>
            <Link className="button button-secondary button-large" to="/import">
              Import existing CV
            </Link>
          </div>
          <div className="hero-trust">
            <span>
              <Check size={15} /> No account required
            </span>
            <span>
              <Check size={15} /> Local autosave
            </span>
            <span>
              <Check size={15} /> Private by design
            </span>
          </div>
        </div>
        <div className="hero-preview">
          <div className="preview-toolbar">
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
            <span>Live CV preview</span>
            <span className="toolbar-chip">A4 · Classic</span>
          </div>
          <div className="hero-paper">
            <div className="fake-name">ALEX MARTIN</div>
            <div className="fake-role">Data & BI Engineering Student</div>
            <div className="fake-line short" />
            <div className="fake-heading">PROFESSIONAL SUMMARY</div>
            <div className="fake-line" />
            <div className="fake-line medium" />
            <div className="fake-heading">EXPERIENCE</div>
            <div className="fake-bold" />
            <div className="fake-line" />
            <div className="fake-line medium" />
            <div className="fake-heading">PROJECTS</div>
            <div className="fake-bold" />
            <div className="fake-line" />
            <div className="fake-line short" />
          </div>
          <div className="floating-card">
            <FileCheck2 size={20} />
            <div>
              <strong>Clear structure</strong>
              <span>Designed for readability</span>
            </div>
          </div>
        </div>
      </section>
      <section className="feature-strip shell">
        <article>
          <span className="feature-icon">
            <FileText size={20} />
          </span>
          <h3>Write with guidance</h3>
          <p>
            Thoughtful prompts help you describe real work and projects clearly.
          </p>
        </article>
        <article>
          <span className="feature-icon">
            <Search size={20} />
          </span>
          <h3>Review before sending</h3>
          <p>
            See transparent checks for structure, content, and relevant job
            terms.
          </p>
        </article>
        <article>
          <span className="feature-icon">
            <ShieldCheck size={20} />
          </span>
          <h3>Keep control of your data</h3>
          <p>
            Drafts and PDF processing stay in your browser, with a clear-data
            option.
          </p>
        </article>
      </section>
      <section className="landing-bottom shell">
        <div>
          <span className="eyebrow">GET STARTED</span>
          <h2>Start with what you have.</h2>
          <p>
            Build from scratch, import a PDF, or explore a fictional demo CV.
          </p>
        </div>
        <div className="bottom-actions">
          <Link className="button button-primary" to="/builder">
            Open builder <ArrowRight size={16} />
          </Link>
          <button
            className="button button-secondary"
            onClick={() => {
              demo();
              navigate("/builder");
            }}
          >
            Try demo CV
          </button>
        </div>
      </section>
    </main>
  );
}

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const resources = [
  [
    "What does ATS-friendly mean?",
    "Use common section headings, readable text, and a clear order. Different employers use different systems, so no format guarantees an outcome.",
  ],
  [
    "How should students structure CVs?",
    "Lead with relevant education, projects, internships, and skills. Put the strongest evidence near the top.",
  ],
  [
    "Projects or experience?",
    "Both can show applied skills. Describe your own role and concrete outcomes without overstating a team result.",
  ],
  [
    "How do I write achievement bullets?",
    "Start with a clear action, explain the task, and add a real result or scale when available. Never invent numbers.",
  ],
  [
    "Common CV mistakes",
    "Avoid vague claims, long paragraphs, broken links, inconsistent dates, and unrelated personal details.",
  ],
  [
    "LinkedIn PDF import",
    "Save your LinkedIn profile as a PDF, upload it here, and carefully verify the extracted fields before accepting.",
  ],
  [
    "Why not use only a QR code?",
    "A QR code may be inconvenient or unreadable in some workflows. Keep the full clickable URL alongside it.",
  ],
  [
    "One page or multiple pages?",
    "One focused page often suits students and early-career applicants. More space is fine when the content earns it.",
  ],
];
export function ResourcesPage() {
  return (
    <main className="page-shell">
      <div className="page-intro">
        <span className="eyebrow">RESOURCES</span>
        <h1>Good CVs are clear.</h1>
        <p>
          Short, practical guidance for building a document that is easy to read
          and easy to trust.
        </p>
      </div>
      <div className="resource-grid">
        {resources.map(([title, body]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="resource-cta">
        <p>Ready to apply this to your own CV?</p>
        <Link className="button button-primary" to="/builder">
          Open builder <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}

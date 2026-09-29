import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useProfile } from "../context/ProfileContext";
import { matchJob } from "../services/match";
import { reviewProfile } from "../services/review";

export function ReviewPage() {
  const { profile } = useProfile();
  const [description, setDescription] = useState("");
  const review = useMemo(() => reviewProfile(profile), [profile]);
  const match = useMemo(
    () => matchJob(profile, description),
    [profile, description],
  );
  return (
    <main className="page-shell">
      <div className="page-intro">
        <span className="eyebrow">CV QUALITY</span>
        <h1>See what’s working.</h1>
        <p>
          A transparent check for readable structure and useful content. Use the
          suggestions that fit your situation.
        </p>
      </div>
      <div className="review-layout">
        <div className="score-card card">
          <div className="score-circle">
            <strong>{review.score}</strong>
            <span>/ 100</span>
          </div>
          <div>
            <h2>ATS readiness check</h2>
            <p>Based on visible profile fields and simple content checks.</p>
          </div>
          <div className="score-bars">
            {review.categories.map((category) => (
              <div className="score-row" key={category.label}>
                <div>
                  <span>{category.label}</span>
                  <strong>
                    {category.score}/{category.max}
                  </strong>
                </div>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${(category.score / category.max) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="fine-print">
            CVForge uses transparent formatting and content heuristics. ATS
            systems vary between employers, so this score is guidance rather
            than a guarantee of screening outcomes.
          </p>
        </div>
        <div className="feedback-column">
          {(["high", "good", "optional"] as const).map((priority) => (
            <section className="card feedback-card" key={priority}>
              <div className="feedback-heading">
                <span className={`status-dot ${priority}`} />
                <h2>
                  {priority === "high"
                    ? "High priority"
                    : priority === "good"
                      ? "Looking good"
                      : "Optional improvements"}
                </h2>
              </div>
              {review.feedback.filter((item) => item.priority === priority)
                .length ? (
                review.feedback
                  .filter((item) => item.priority === priority)
                  .map((item, index) => (
                    <div className="feedback-item" key={index}>
                      <strong>{item.message}</strong>
                      <p>{item.why}</p>
                    </div>
                  ))
              ) : (
                <p className="muted-copy">No suggestions in this group.</p>
              )}
            </section>
          ))}
        </div>
      </div>
      <section className="card match-card">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">OPTIONAL</span>
            <h2>Compare with a job description</h2>
            <p>
              Local text matching can highlight terms to consider. Only add
              skills and experience you genuinely have.
            </p>
          </div>
          <Search size={25} />
        </div>
        <label className="field">
          <span>Paste job description</span>
          <textarea
            rows={7}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Paste a job description to see matching and potentially missing terms…"
          />
        </label>
        {description.trim() && (
          <div className="match-results">
            <div className="match-overlap">
              <strong>{match.overlap}%</strong>
              <span>term overlap</span>
            </div>
            <div>
              <h3>Matched terms</h3>
              <div className="chips">
                {match.matched.length ? (
                  match.matched.map((item) => (
                    <span className="chip good" key={item.term}>
                      {item.term} <small>×{item.count}</small>
                    </span>
                  ))
                ) : (
                  <span className="muted-copy">
                    No prominent terms matched yet.
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3>Potentially missing terms</h3>
              <div className="chips">
                {match.missing.map((item) => (
                  <span className="chip" key={item.term}>
                    {item.term} <small>×{item.count}</small>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

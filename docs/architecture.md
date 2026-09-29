# Architecture notes

## Data model

`CandidateProfile` is a versioned, JSON-serializable record. It holds contact details, summary, repeatable section entries, custom sections, template choice, QR preference, and ordered visibility settings. Each repeatable entry has a stable ID. `parseProfile` rejects malformed or incompatible stored drafts and restores missing section settings.

The model is deliberately independent of PDF layout. A future portfolio module can map the same profile to site sections and themes without parsing a CV again. Accounts or cloud storage can be added behind a new persistence adapter while the browser-local adapter remains the default.

## Module boundaries

| Module | Responsibility |
| --- | --- |
| `models/profile` | Types, blank profile, fictional demo profile |
| `context/ProfileContext` | Immutable updates, local autosave, clear action |
| `services/validation` | URL and stored-data validation, completion calculation |
| `services/import` | Generic and LinkedIn-specific text mapping |
| `services/pdfExtract` | On-demand, browser-local PDF.js extraction |
| `services/review` | Explainable quality score and feedback |
| `services/match` | Deterministic local term matching |
| `services/pdf` | On-demand A4 PDF generation with selectable text |
| `components`, `pages`, and `App` | Editor, preview, page flows, and routes |

## Import boundary

Uploaded files are validated by extension, MIME type where supplied, file signature, and size before PDF.js reads them. The parser returns a tentative profile that is shown before acceptance. The user then reviews all repeatable entries in the builder. Extracted text is rendered as text, never executed or inserted as HTML.

## Review and export boundary

Quality checks operate only on the `CandidateProfile` and do not change it. Job terms are deterministic tokens, with common stop words excluded; missing terms are suggestions to investigate, not claims to add. Export generates a new PDF entirely in the browser. Both import and export libraries are split into on-demand bundles.

## Pages and deployment

The app uses hash routes for GitHub Pages compatibility and Vite's `/cvforge/` base. The deployment workflow validates the app on each PR and deploys `main` to Pages. No backend is required.

## Future Portfolio Builder

Add `features/portfolio` with a renderer and theme configuration that consume `CandidateProfile`. Keep portfolio-specific presentation settings separate from CV template settings. If cloud profiles arrive later, add explicit opt-in, versioned migration, and a persistence interface; do not silently upload existing local drafts.

import { useState } from "react";
import { HashRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import { Download, FileText, Menu } from "lucide-react";
import { PrivacyLine } from "./components/PrivacyLine";
import { ProfileProvider, useProfile } from "./context/ProfileContext";
import { Landing } from "./pages/LandingPage";
import { Builder } from "./pages/BuilderPage";
import { ImportPage } from "./pages/ImportPage";
import { ReviewPage } from "./pages/ReviewPage";
import { PreviewPage } from "./pages/PreviewPage";
import { ResourcesPage } from "./pages/ResourcesPage";

function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-mark">
        <FileText size={19} strokeWidth={2.3} />
      </span>
      <span>CVForge</span>
    </Link>
  );
}
function Header() {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  async function exportNow() {
    try {
      setExporting(true);
      const { downloadPdf } = await import("./services/pdf");
      await downloadPdf(profile);
    } catch {
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Brand />
        <button
          className="mobile-menu icon-button"
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
        >
          <Menu size={20} />
        </button>
        <nav
          className={open ? "nav-links open" : "nav-links"}
          aria-label="Main navigation"
        >
          <NavLink onClick={() => setOpen(false)} to="/builder">
            Builder
          </NavLink>
          <NavLink onClick={() => setOpen(false)} to="/review">
            ATS review
          </NavLink>
          <NavLink onClick={() => setOpen(false)} to="/resources">
            Resources
          </NavLink>
        </nav>
        <div className="nav-actions">
          <Link className="button button-ghost" to="/preview">
            Preview
          </Link>
          <button
            className="button button-primary"
            onClick={exportNow}
            disabled={exporting}
          >
            <Download size={16} /> {exporting ? "Exporting…" : "Export PDF"}
          </button>
        </div>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer className="site-footer shell">
      <span>CVForge · MIT licensed</span>
      <PrivacyLine />
    </footer>
  );
}
function AppLayout() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/builder" element={<Builder />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      <Footer />
    </>
  );
}
export default function App() {
  return (
    <ProfileProvider>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </ProfileProvider>
  );
}

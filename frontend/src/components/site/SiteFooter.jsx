import { Link } from "react-router-dom";

const FOOTER_LINKS = [
  { label: "About", to: "/about" },
  { label: "Privacy", to: "/privacy" },
  { label: "Pricing", to: "/pricing" },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/5">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:px-8">
        <p>&copy; {new Date().getFullYear()} Voice-to-Website AI</p>
        <nav aria-label="Footer" className="flex items-center gap-5">
          {FOOTER_LINKS.map((link) => (
            <Link className="transition hover:text-slate-200" key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

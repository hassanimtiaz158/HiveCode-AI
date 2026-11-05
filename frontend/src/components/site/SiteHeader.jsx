import { useEffect, useState } from "react";
import { Menu, Mic, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../store/auth";

const PUBLIC_LINKS = [
  { label: "About", to: "/about" },
  { label: "Privacy", to: "/privacy" },
  { label: "Pricing", to: "/pricing" },
];

function desktopLinkClass({ isActive }) {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition",
    isActive ? "text-white" : "text-slate-400 hover:text-white",
  ].join(" ");
}

function mobileLinkClass({ isActive }) {
  return [
    "block rounded-xl px-4 py-3 text-sm font-medium transition",
    isActive ? "bg-white/5 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
  ].join(" ");
}

export function SiteHeader() {
  const user = useAuth((state) => state.user);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-navy-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <Link
          aria-label="Voice-to-Website AI home"
          className="flex shrink-0 items-center gap-2.5"
          to="/"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
            <Mic className="h-5 w-5 text-white" />
          </span>
          <span className="text-base font-semibold text-white">Voice-to-Website AI</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((link) => (
            <NavLink className={desktopLinkClass} key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link className="btn-primary w-auto px-4 text-sm" to="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
                to="/login"
              >
                Login
              </Link>
              <Link className="btn-primary w-auto px-4 text-sm" to="/signup">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          aria-controls="site-mobile-menu"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-200 transition hover:bg-white/5 md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen ? (
        <nav
          aria-label="Mobile"
          className="border-t border-white/5 bg-navy-950/95 px-5 py-4 md:hidden"
          id="site-mobile-menu"
        >
          <div className="space-y-1">
            {PUBLIC_LINKS.map((link) => (
              <NavLink className={mobileLinkClass} key={link.to} onClick={closeMenu} to={link.to}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-4 border-t border-white/5 pt-4">
            {user ? (
              <Link
                className="btn-primary w-full text-sm"
                onClick={closeMenu}
                to="/dashboard"
              >
                Open dashboard
              </Link>
            ) : (
              <div className="grid gap-2">
                <Link
                  className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                  onClick={closeMenu}
                  to="/login"
                >
                  Login
                </Link>
                <Link className="btn-primary text-sm" onClick={closeMenu} to="/signup">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

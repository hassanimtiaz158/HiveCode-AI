import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PublicLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-navy-950 text-slate-200">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-brand-violet/20 blur-3xl" />
        <div className="absolute -right-40 top-10 h-[28rem] w-[28rem] rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="absolute left-1/3 top-[34rem] h-80 w-80 rounded-full bg-brand-cyan/10 blur-3xl" />
      </div>

      <SiteHeader />
      <main className="relative z-10 flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

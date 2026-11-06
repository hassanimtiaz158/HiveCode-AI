import { Mic } from "lucide-react";

export function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen">
      <main className="flex flex-col items-center justify-center bg-navy-950 px-5 py-10 sm:px-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient">
            <Mic className="h-5 w-5 text-white" />
          </span>
          <h1 className="text-base font-semibold text-white">HiveCode AI</h1>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

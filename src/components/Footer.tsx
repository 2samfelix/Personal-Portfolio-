import { siteConfig } from "@/lib/site-config";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-500">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs sm:flex-row">
        <p>
          &copy; {new Date().getFullYear()} {siteConfig.name}
        </p>
        <p>Finance &middot; Analytics &middot; AI</p>
      </div>
    </footer>
  );
}

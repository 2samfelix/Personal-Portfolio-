import { siteConfig } from "@/lib/site-config";
import Skyline from "@/components/Skyline";

export default function Footer() {
  return (
    <footer className="border-t border-cream/10 bg-forest-dark text-cream/60">
      {/* Decorative skyline above the footer text, never behind it. */}
      <div aria-hidden="true" className="mx-auto w-full max-w-6xl px-6 pt-8 print:hidden">
        <Skyline tone="dark" className="opacity-90" />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs sm:flex-row">
        <p>
          &copy; {new Date().getFullYear()} {siteConfig.name}
        </p>
        <p>Finance &middot; Modeling &middot; Analysis</p>
      </div>
    </footer>
  );
}

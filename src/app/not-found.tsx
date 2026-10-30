import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Page not found — Sam Felix",
  description: "This page does not exist on Sam Felix's finance and analytics portfolio.",
};

/** The site's 404: unmatched URLs and notFound() both render it, with a 404 status. */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="flex flex-1 flex-col bg-cream text-charcoal">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-4 px-6 py-24 sm:py-32">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7a5a30]">Error 404</span>
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl sm:leading-[1.05]">
            This page doesn&apos;t exist.
          </h1>
          <p className="max-w-xl text-base leading-7 text-charcoal-soft">
            The link may be out of date, or the address may have a typo. The projects are all on the home page.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/#work"
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
            >
              See the projects
            </Link>
            <Link
              href="/"
              className="rounded-full border border-forest/30 px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:border-forest hover:bg-white"
            >
              Go to the home page
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

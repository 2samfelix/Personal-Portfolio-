import { siteConfig } from "@/lib/site-config";

const links = [
  { label: siteConfig.email, href: `mailto:${siteConfig.email}` },
  { label: "LinkedIn Profile", href: siteConfig.linkedin },
  { label: "Download Resume", href: siteConfig.resumeUrl },
];

export default function Contact() {
  return (
    <section id="contact" className="bg-forest text-cream">
      <div className="mx-auto w-full max-w-6xl px-6 pb-28 pt-0 sm:pb-40 sm:pt-0">
        <div className="rounded-3xl border border-cream/15 bg-forest-dark p-8 sm:p-12">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brass-light">
                Let&apos;s Connect
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Open to analytics and finance roles.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-cream/70">
                I&apos;m looking for opportunities in financial analysis,
                FP&amp;A, or data analytics where I can put payroll,
                accounting, and modeling experience to work.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    link.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="rounded-xl border border-cream/20 bg-forest px-5 py-3 text-sm font-medium text-cream/90 transition-colors hover:border-cream/40 hover:text-cream"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

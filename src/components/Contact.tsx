import { siteConfig } from "@/lib/site-config";

const links = [
  { label: siteConfig.email, href: `mailto:${siteConfig.email}` },
  { label: "LinkedIn Profile", href: siteConfig.linkedin },
  { label: "Download Resume", href: siteConfig.resumeUrl },
];

export default function Contact() {
  return (
    <section id="contact" className="bg-forest text-cream">
      <div className="mx-auto w-full max-w-6xl px-6 pb-28 pt-4 sm:pb-40 sm:pt-8">
        <div className="grid grid-cols-1 gap-12 border-t border-cream/20 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brass-light">Let&apos;s Connect</p>
            <h2 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Open to analytics and finance roles.
            </h2>
            <p className="mt-6 max-w-[60ch] text-lg leading-8 text-cream/80">
              I&apos;m looking for opportunities in financial analysis, FP&amp;A, or data analytics where I can put payroll, accounting,
              and modeling experience to work.
            </p>
          </div>
          {/* Ruled link rows; each is at least 44px tall with a visible hover and focus state. */}
          <ul className="self-end border-b border-cream/20">
            {links.map((link) => (
              <li key={link.label} className="border-t border-cream/20">
                <a
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group flex min-h-11 items-center justify-between gap-4 rounded-sm py-5 text-lg font-semibold text-cream transition-colors hover:text-brass-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light focus-visible:ring-offset-2 focus-visible:ring-offset-forest motion-reduce:transition-none"
                >
                  <span className="min-w-0 break-words">{link.label}</span>
                  <span aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                    &rarr;
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

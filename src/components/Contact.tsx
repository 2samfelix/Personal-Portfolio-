import { siteConfig } from "@/lib/site-config";

const links = [
  { label: siteConfig.email, href: `mailto:${siteConfig.email}` },
  { label: "LinkedIn Profile", href: siteConfig.linkedin },
  { label: "Download Resume", href: siteConfig.resumeUrl },
];

export default function Contact() {
  return (
    <section id="contact" className="bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 sm:p-12">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
                Let&apos;s Connect
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Open to analytics and finance roles.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
                I&apos;m looking for opportunities in financial analysis,
                FP&amp;A, or data analytics where I can put payroll,
                accounting, and modeling experience to work — with a
                growing focus on AI-driven finance tools.
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
                  className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
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

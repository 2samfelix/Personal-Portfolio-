import { siteConfig } from "@/lib/site-config";

const links = [
  { href: "#work", label: "Work" },
  { href: "#interactive-tools", label: "Interactive Tools" },
  { href: "#philosophy", label: "Philosophy" },
  { href: "#experience", label: "Experience" },
  { href: "#expertise", label: "Expertise" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-forest/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <a href="#home" className="text-lg font-bold tracking-tight text-charcoal">
          SAM <span className="text-brass">FELIX</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-charcoal-soft sm:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-charcoal"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href={siteConfig.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
        >
          Resume
        </a>
      </div>
    </header>
  );
}

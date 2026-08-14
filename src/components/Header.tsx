import { siteConfig } from "@/lib/site-config";

const links = [
  { href: "#work", label: "Work" },
  { href: "#philosophy", label: "Philosophy" },
  { href: "#experience", label: "Experience" },
  { href: "#expertise", label: "Expertise" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <a href="#home" className="text-lg font-bold tracking-tight text-white">
          SAM <span className="text-blue-500">FELIX</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 sm:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href={siteConfig.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          Resume
        </a>
      </div>
    </header>
  );
}

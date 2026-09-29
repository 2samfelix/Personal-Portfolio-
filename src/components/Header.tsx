"use client";

import { useEffect, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Keyboard accessibility: Escape closes the mobile menu from anywhere,
  // matching the expected behavior of any open menu/dialog.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-forest/10 bg-cream/95 backdrop-blur">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <a href="#home" className="text-lg font-bold tracking-tight text-charcoal">
          SAM <span className="text-brass">FELIX</span>
        </a>
        {/* Desktop nav — unchanged, sm and up only. */}
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
        <div className="flex items-center gap-2">
          <a
            href={siteConfig.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-forest px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark"
          >
            Resume
          </a>
          {/* Mobile menu toggle — sm and below only, since the nav above
              already covers sm and up. A large (44px) tap target with a
              simple hamburger/close icon swap, no icon library needed. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-forest/20 text-charcoal transition-colors hover:bg-forest/5 sm:hidden"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="h-5 w-5" aria-hidden>
              {menuOpen ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <path d="M3 5.5h14M3 10h14M3 14.5h14" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav panel — a temporary, dismissible overlay directly
            below the header bar, not a permanent fixture: it closes on
            Escape, on choosing a link, or on toggling the button again, so
            it never blocks content for longer than the visitor wants it
            open. */}
        {menuOpen && (
          <nav
            id="mobile-nav-panel"
            className="absolute left-0 right-0 top-full z-50 border-b border-forest/10 bg-cream shadow-lg sm:hidden"
          >
            <ul className="flex flex-col px-6 py-2">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 text-base font-medium text-charcoal-soft transition-colors hover:text-charcoal"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

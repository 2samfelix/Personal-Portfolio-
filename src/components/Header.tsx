export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <a
          href="#home"
          className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50"
        >
          Sam Felix
        </a>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <a
            href="#projects"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-50"
          >
            Projects
          </a>
          <a
            href="#about"
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-50"
          >
            About
          </a>
          <a
            href="mailto:2samfelix@gmail.com"
            className="rounded-full bg-slate-900 px-4 py-1.5 text-white transition-colors hover:bg-slate-700 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}

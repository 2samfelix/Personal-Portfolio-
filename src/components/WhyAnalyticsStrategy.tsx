// "Why Analytics & Strategy?": the three short essays as ruled rows (label beside
// text from md up, stacked on phones). Static markup: no carousel, no JavaScript.
type WhyCard = {
  label: string;
  body: string;
};

const CARDS: WhyCard[] = [
  {
    label: "01 — My Experience",
    body: "Working inside a real operating business at Marketstaff showed me how much a company's decisions depend on its numbers. That carried into forecasting, scenario analysis, and valuation work of my own: a three-statement model, an IPO valuation, and an M&A analysis, each built from real public filings. Along the way, numbers stopped being an abstraction and became the clearest way to see what was actually happening in a business.",
  },
  {
    label: "02 — Why This Work",
    body: "What draws me to analytics and strategy is turning raw financial and operating data into something decision-useful — not just reporting what happened, but testing what could happen next. I like figuring out what actually drives a business, pressure-testing assumptions with scenarios and sensitivities, and using AI to accelerate research, analysis, and iteration while keeping the underlying financial judgment and validation my own.",
  },
  {
    label: "03 — Where I'm Going",
    body: "That's the kind of work I want to keep doing — using financial and operating data, modern analytical tools, and sound financial judgment to understand what matters and help make better business decisions.",
  },
];

export default function WhyAnalyticsStrategy() {
  return (
    <section id="why" className="border-t border-forest/10 bg-cream">
      <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-20">
        <h2 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
          Why Analytics &amp; Strategy?
        </h2>
        <p className="mt-5 max-w-[60ch] text-lg leading-8 text-charcoal-soft sm:text-xl sm:leading-9">
          I&apos;ve seen what happens when a business understands its own data — and when it doesn&apos;t.
        </p>
        <ol className="mt-12 border-b border-forest/20 sm:mt-16">
          {CARDS.map((card) => (
            <li key={card.label} className="grid grid-cols-1 gap-3 border-t border-forest/20 py-8 sm:py-10 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-brass-ink">{card.label}</h3>
              <p className="max-w-[65ch] text-base leading-8 text-charcoal-soft sm:text-lg sm:leading-8">{card.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

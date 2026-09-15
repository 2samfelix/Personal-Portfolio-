const tools = [
  {
    name: "Excel",
    description: "Financial modeling, forecasting, valuation, variance analysis",
  },
  {
    name: "SQL",
    description: "Querying, cleaning, and structuring relational data",
  },
  {
    name: "Power BI",
    description: "Interactive dashboards, KPI tracking, and financial reporting",
  },
  {
    name: "Python",
    description: "Data analysis, automation, and finance workflows",
  },
  {
    name: "AI / LLM Tools",
    description: "Research, workflow automation, prototyping, and analysis support",
  },
];

const gridRows = [90, 60, 75, 45];

function ExcelReelItem() {
  return (
    <div className="flex h-full flex-col justify-center p-4">
      <div className="flex gap-1.5 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-forest/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-forest/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-brass/40" />
      </div>
      <div className="flex flex-col gap-2">
        {gridRows.map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-6 shrink-0 rounded-sm bg-forest/10" />
            <div
              className="h-2.5 rounded-sm bg-forest/15"
              style={{ width: `${w}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SqlReelItem() {
  return (
    <div className="flex h-full flex-col justify-center p-4 font-mono text-[11px] leading-5 text-charcoal-soft">
      <p className="text-brass">SELECT client_id,</p>
      <p className="pl-3">SUM(revenue) AS total</p>
      <p>FROM transactions</p>
      <p>
        <span className="text-brass">GROUP BY</span> client_id
      </p>
      <p>
        <span className="text-brass">ORDER BY</span> total DESC;
      </p>
    </div>
  );
}

function DashboardReelItem() {
  return (
    <div className="flex h-full flex-col justify-center p-4">
      <div className="mb-3 h-2 w-16 rounded-sm bg-forest/15" />
      <div className="flex items-end gap-1.5">
        {[40, 65, 30, 80, 55].map((h, i) => (
          <div
            key={i}
            className="w-4 rounded-sm bg-forest/70"
            style={{ height: `${h * 0.4}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function AiReelItem() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">✨</span>
        <div className="h-2 w-20 rounded-sm bg-forest/15" />
      </div>
      <div className="flex items-center gap-1.5 pl-1">
        <span className="h-1.5 w-1.5 rounded-full bg-brass/60" />
        <div className="h-px w-6 bg-forest/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-forest/30" />
        <div className="h-px w-6 bg-forest/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-forest/30" />
      </div>
    </div>
  );
}

function PhotoReelItem() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/headshot.png"
      alt="Sam Felix"
      className="h-full w-full object-cover"
    />
  );
}

function ModelReelItem() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/project-visuals/nike.png"
      alt="Nike scenario model preview"
      className="h-full w-full object-cover object-top"
    />
  );
}

const reelItems = [
  { key: "excel", height: "h-36", node: <ExcelReelItem /> },
  { key: "sql", height: "h-40", node: <SqlReelItem /> },
  { key: "dashboard", height: "h-44", node: <DashboardReelItem /> },
  { key: "photo", height: "h-52", node: <PhotoReelItem /> },
  { key: "model", height: "h-40", node: <ModelReelItem /> },
  { key: "ai", height: "h-36", node: <AiReelItem /> },
];

function VisualReel() {
  const doubled = [...reelItems, ...reelItems];

  return (
    <div className="reel reel-mask relative mx-auto h-[440px] w-full max-w-sm overflow-hidden">
      <div className="reel-track flex flex-col">
        {doubled.map((item, i) => (
          <div
            key={`${item.key}-${i}`}
            className={`mb-4 w-full overflow-hidden rounded-2xl border border-forest/15 bg-white ${item.height}`}
          >
            {item.node}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Expertise() {
  return (
    <section id="expertise" className="border-t border-forest/10 bg-mist">
      <div className="mx-auto w-full max-w-6xl px-6 py-28 sm:py-40">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          <VisualReel />
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brass">
              Core Expertise
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              I model, query, and visualize financial data.
            </h2>
            <ul className="mt-8 flex flex-col divide-y divide-forest/10">
              {tools.map((tool) => (
                <li key={tool.name} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="text-base font-semibold text-charcoal">
                    {tool.name}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-charcoal-soft">
                    {tool.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

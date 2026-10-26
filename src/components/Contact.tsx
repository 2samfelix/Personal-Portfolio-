import { siteConfig } from "@/lib/site-config";

// An original, stylized skyline: low blocks, flat-top and stepped buildings, a
// tapering tower and a tall stepped tower with twin antennas. Drawn on a
// 2560 x 160 grid with the tall tower near the middle, so phones crop the sides
// and keep it.
const SKYLINE =
  "M0 160V142H50V160ZM58 160V146H138V160ZM138 160V146H204V160ZM208 160V146H274V160ZM274 160V146H308V160ZM316 160V146H374V160ZM374 160V130H408V160ZM416 160V118H450V160ZM450 160V124H492V160ZM492 160V130H558V160ZM566 160V142H600V160ZM600 160V118H666V160ZM666 160V134H716V160ZM716 160V146H782V160ZM786 160V118H852V160ZM852 160V130H886V160ZM886 160V146H936V160ZM936 160V146H1002V160ZM1002 160V124H1060V160ZM1068 160V134H1118V160ZM1126 160V138H1176V160ZM1176 160V124H1218V160ZM1218 160V130H1252V160ZM1256 160V134H1322V160ZM1326 160V134H1406V160ZM1410 160V146H1476V160ZM1476 160V134H1542V160ZM1542 160V142H1592V160ZM1600 160V146H1658V160ZM1658 160V130H1724V160ZM1728 160V124H1778V160ZM1782 160V134H1848V160ZM1856 160V118H1890V160ZM1890 160V134H1940V160ZM1940 160V124H1974V160ZM1978 160V130H2058V160ZM2066 160V124H2116V160ZM2124 160V138H2204V160ZM2204 160V138H2262V160ZM2262 160V146H2328V160ZM2336 160V142H2370V160ZM2374 160V124H2416V160ZM2416 160V134H2474V160ZM2482 160V142H2516V160ZM2524 160V130H2582V160ZM358 160V108H402V160ZM502 160V96H538V160ZM674 160V100H726V160ZM840 160V88H880V160ZM1636 160V92H1684V160ZM1820 160V104H1860V160ZM1994 160V96H2046V160ZM2182 160V110H2218V160ZM984 160V92H992V74H1000V64H1020V74H1028V92H1036V160ZM1108 160V70H1116V56H1144V70H1152V160ZM1182 160V84H1188V72H1212V84H1218V160ZM1396 160V78H1404V62H1412V54H1428V62H1436V78H1444V160ZM1540 160V88H1548V72H1572V88H1580V160ZM924 160V104H956V160ZM1718 160V96H1726V84H1754V96H1762V160ZM1266 160V64H1274V44H1282V30H1318V44H1326V64H1334V160ZM1288 160V6H1292V160ZM1308 160V6H1312V160ZM1458 160L1470 50H1490L1502 160ZM1478.5 50V30H1481.5V50Z";

const links = [
  { label: siteConfig.email, href: `mailto:${siteConfig.email}` },
  { label: "LinkedIn Profile", href: siteConfig.linkedin },
  { label: "Download Resume", href: siteConfig.resumeUrl },
];

export default function Contact() {
  return (
    <section id="contact" className="relative bg-forest text-cream">
      {/* Decorative skyline along the bottom edge, a shade darker than the band.
          It sits in the bottom padding behind the card, so no text overlaps it. */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 2560 160"
        preserveAspectRatio="xMidYMax slice"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] w-full fill-forest-dark/50 sm:h-[160px] print:hidden"
      >
        <path d={SKYLINE} />
      </svg>
      <div className="relative mx-auto w-full max-w-6xl px-6 pb-28 pt-0 sm:pb-40 sm:pt-0">
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

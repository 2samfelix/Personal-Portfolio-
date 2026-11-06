// A forest band between the project grid and Interactive Tools, carrying a line drawing of
// the Chicago skyline. The drawing spans the site's content width (the max-w-6xl, px-6
// container every section uses): it is cropped to its buildings, so the first building
// lines up with the left edge of the project grid and the last with its right edge.
//
// public/skyline/chicago-skyline-{900,1713}.webp is the supplied artwork cropped to the
// buildings and tree line, its lines turned cream and its white fills made transparent so
// the band shows through. Static markup; the explicit size reserves its box, so loading it
// moves nothing. Left out of print.
export default function SkylineBanner() {
  return (
    <div className="bg-forest print:hidden">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/skyline/chicago-skyline-1713.webp"
          srcSet="/skyline/chicago-skyline-900.webp 900w, /skyline/chicago-skyline-1713.webp 1713w"
          // The content width: the viewport less the side padding (24px below 640px, where
          // the root is 16px; 19.2px from 640px, where it is 12.8px), capped at 883px.
          sizes="(min-width: 640px) min(calc(100vw - 38.4px), 883px), calc(100vw - 48px)"
          alt="Line drawing of the Chicago skyline"
          width={1713}
          height={648}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}

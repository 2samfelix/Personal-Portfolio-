// A narrow forest band between the project grid and Interactive Tools, carrying a line
// drawing of the Chicago skyline. The drawing (public/skyline/chicago-skyline.webp) is the
// supplied artwork cropped to the buildings and tree line, its lines turned cream and its
// white fills made transparent so the band shows through. Static markup; the explicit
// size reserves its box, so loading it moves nothing. Left out of print.
export default function SkylineBanner() {
  return (
    <div className="overflow-hidden bg-forest print:hidden">
      <div className="mx-auto flex w-full max-w-6xl justify-center px-6 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/skyline/chicago-skyline.webp"
          alt="Line drawing of the Chicago skyline"
          width={900}
          height={338}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full max-w-[26rem]"
        />
      </div>
    </div>
  );
}

// Page metadata for link previews: title, description, canonical URL, Open Graph and Twitter
// tags from one place, so every route carries the same set. Images are the 1200 x 630 cards
// drawn from existing visuals by scripts/render-og-images.mjs (public/og).
import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const SITE_NAME = "Sam Felix — Finance & Analytics Portfolio";
export const SITE_DESCRIPTION =
  "Finance and analytics portfolio showcasing financial modeling, FP&A projects, and AI-powered finance tools.";
const OG_SIZE = { width: 1200, height: 630 };

export function pageMetadata({
  title,
  description,
  path,
  image = "/og/site.png",
  imageAlt = SITE_NAME,
}: {
  title: string;
  description: string;
  /** The page's path; null for a page with no address of its own (the 404). */
  path: string | null;
  image?: string;
  imageAlt?: string;
}): Metadata {
  const images = [{ url: image, ...OG_SIZE, alt: imageAlt }];
  return {
    title,
    description,
    // No canonical for the 404: null clears the one the root layout sets. (Next.js marks the
    // 404 noindex on its own.)
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", ...(path ? { url: path } : {}), title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export const METADATA_BASE = new URL(siteConfig.url);

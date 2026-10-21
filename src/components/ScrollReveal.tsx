"use client";

import { useEffect } from "react";

// Section headings and the cards below them on the home page. The project grid
// (#work cards) and the Experience content are deliberately left out.
const TARGETS = [
  "main > section:not(#home):not(#proof) h2",
  "#why .snap-mandatory",
  "#philosophy p",
  "#interactive-tools a",
];

// If the observer has not reported at all by then, reveal everything.
const SAFETY_MS = 3000;
// Long enough for the 400ms reveal plus the largest stagger.
const CLEAR_DELAY_MS = 800;

/**
 * Light scroll reveal: a fade plus a short upward slide (globals.css,
 * [data-reveal]), once per element. Only elements that start below the fold
 * are hidden, and only by this script, so nothing is hidden without
 * JavaScript. Skipped entirely with prefers-reduced-motion.
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const show = (el: Element) => {
      el.setAttribute("data-reveal", "shown");
      // Drop the stagger delay afterwards so it never slows the card's own hover transition.
      window.setTimeout(() => ((el as HTMLElement).style.transitionDelay = ""), CLEAR_DELAY_MS);
    };
    let observerReported = false;
    const pending = [...document.querySelectorAll(TARGETS.join(","))].filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight,
    );

    const observer = new IntersectionObserver(
      (entries) => {
        observerReported = true;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    pending.forEach((el) => {
      // Cards that share a parent come in with a short stagger.
      const siblings = [...(el.parentElement?.children ?? [])].filter((s) => pending.includes(s));
      (el as HTMLElement).style.transitionDelay = `${Math.min(siblings.indexOf(el), 4) * 60}ms`;
      el.setAttribute("data-reveal", "pending");
      observer.observe(el);
    });

    const showAll = () => pending.forEach(show);
    // An observer always reports once per element right after observe(); if it never
    // does, something is broken, so nothing is left hidden.
    const safety = window.setTimeout(() => {
      if (!observerReported) showAll();
    }, SAFETY_MS);
    window.addEventListener("beforeprint", showAll);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
      window.removeEventListener("beforeprint", showAll);
    };
  }, []);

  return null;
}

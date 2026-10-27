"use client";

import { useEffect } from "react";

// Cards on the home page, each revealed on its own: the "Why" card track, the
// "How I work" steps and the Interactive Tools cards.
const TARGETS = ["#why .snap-mandatory", "#how-i-work [data-step]", "#interactive-tools a"];

// Groups reveal their items one after another, in DOM (reading) order, when
// the group itself comes into view. WorkGrid marks its grid with
// data-reveal-group and each card with data-reveal-item.
const GROUP_STEP_MS = 120;
const GROUP_ITEM_MS = 450;
const GROUP_LIFT = "20px";

// If the observer has not reported at all by then, reveal everything.
const SAFETY_MS = 3000;
// Margin after a reveal's delay + duration before its hooks are removed.
const CLEANUP_MARGIN_MS = 80;
const SINGLE_MS = 400;

type Reveal = { el: HTMLElement; delay: number; duration: number };

/**
 * Light scroll reveal: a fade plus a short upward slide (globals.css,
 * [data-reveal]), once per element. Only elements that start below the fold
 * are hidden, and only by this script, so nothing is hidden without
 * JavaScript. Skipped entirely with prefers-reduced-motion.
 *
 * Once an element has revealed, its data-reveal attribute and inline styles
 * are removed. The [data-reveal] rules are unlayered and would otherwise
 * override an element's own Tailwind transitions (the card hover effects).
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const belowFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;
    const timers: number[] = [];

    const finish = (el: HTMLElement) => {
      el.removeAttribute("data-reveal");
      el.style.removeProperty("transition-delay");
      el.style.removeProperty("--reveal-ms");
      el.style.removeProperty("--reveal-y");
    };
    const show = ({ el, delay, duration }: Reveal) => {
      if (el.getAttribute("data-reveal") !== "pending") return;
      el.style.transitionDelay = `${delay}ms`;
      el.setAttribute("data-reveal", "shown");
      timers.push(window.setTimeout(() => finish(el), delay + duration + CLEANUP_MARGIN_MS));
    };
    const hide = (el: HTMLElement, duration: number, lift?: string) => {
      el.style.setProperty("--reveal-ms", `${duration}ms`);
      if (lift) el.style.setProperty("--reveal-y", lift);
      el.setAttribute("data-reveal", "pending");
    };

    // Single elements; cards that share a parent get a short stagger.
    const singles = [...document.querySelectorAll<HTMLElement>(TARGETS.join(","))].filter(belowFold);
    const singleReveal = new Map<Element, Reveal>();
    for (const el of singles) {
      const siblings = [...(el.parentElement?.children ?? [])].filter((s) => singles.includes(s as HTMLElement));
      singleReveal.set(el, { el, delay: Math.min(siblings.indexOf(el), 4) * 60, duration: SINGLE_MS });
      hide(el, SINGLE_MS);
    }

    // Groups: all items wait for the group, then reveal in order.
    const groupReveal = new Map<Element, Reveal[]>();
    for (const group of document.querySelectorAll<HTMLElement>("[data-reveal-group]")) {
      if (!belowFold(group)) continue;
      const items = [...group.querySelectorAll<HTMLElement>("[data-reveal-item]")];
      items.forEach((el) => hide(el, GROUP_ITEM_MS, GROUP_LIFT));
      groupReveal.set(
        group,
        items.map((el, i) => ({ el, delay: i * GROUP_STEP_MS, duration: GROUP_ITEM_MS })),
      );
    }

    let observerReported = false;
    const observer = new IntersectionObserver(
      (entries) => {
        observerReported = true;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const single = singleReveal.get(entry.target);
          if (single) show(single);
          groupReveal.get(entry.target)?.forEach(show);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    singleReveal.forEach((_, el) => observer.observe(el));
    groupReveal.forEach((_, el) => observer.observe(el));

    // Reveal everything at once, without waiting for any transition.
    const finishAll = () => {
      singleReveal.forEach(({ el }) => finish(el));
      groupReveal.forEach((items) => items.forEach(({ el }) => finish(el)));
    };
    // An observer always reports once per target right after observe(); if it
    // never does, something is broken, so nothing is left hidden.
    const safety = window.setTimeout(() => {
      if (!observerReported) finishAll();
    }, SAFETY_MS);
    window.addEventListener("beforeprint", finishAll);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("beforeprint", finishAll);
      finishAll();
    };
  }, []);

  return null;
}

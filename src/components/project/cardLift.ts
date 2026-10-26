/**
 * The clickable-card surface shared by the home page project grid and the
 * project pages' "What I Built" cards: lift + soft shadow on hover (Tailwind v4
 * emits hover: inside @media (hover: hover), so touch screens never get a stuck
 * state) and on keyboard focus. Motion uses translate only, so neighbours never
 * move; reduced-motion users get the shadow without the lift. Pair it with
 * `group` and CARD_CTA on the card's call-to-action text.
 */
export const CARD_LIFT =
  "rounded-2xl border border-forest/15 bg-white transition-[translate,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-forest/35 hover:shadow-lg hover:shadow-forest/10 focus-visible:-translate-y-1 focus-visible:border-forest/35 focus-visible:shadow-lg focus-visible:shadow-forest/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-[box-shadow,border-color] motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0";

/** The card's call to action nudges right while the card is hovered. */
export const CARD_CTA =
  "text-sm font-semibold text-forest transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0";

// Shared layout for the project pages, whose container matches the home page
// grid (max-w-6xl, 1152px). Running text keeps a readable measure inside it;
// the full width goes to visuals, tables and card grids.

/** Running text: about 70 characters per line (45rem = 720px). */
export const MEASURE = "max-w-[45rem]";

/**
 * A visual beside its explanatory text: stacked on small screens; from lg up,
 * the visual takes the remaining width and the text a 20rem column beside it.
 */
export const BESIDE = "lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8";

// Tables that stack on small screens (below md): each row becomes a block with
// its first cell, the label, on its own line and every value beneath it under
// its column name (the cell's data-label), so nothing sits off the right edge.
// From md up the table is unchanged.

/** On the table: drop its minimum width below md. */
export const STACK_TABLE = "max-md:block max-md:min-w-0";
/** On thead: hidden below md; each value cell names its column instead. */
export const STACK_HEAD = "max-md:hidden";
/** On tbody. */
export const STACK_BODY = "max-md:block";
/** On each body row: a two-column grid of label and values. */
export const STACK_ROW = "max-md:grid max-md:grid-cols-2 max-md:gap-x-4 max-md:gap-y-2 max-md:px-4 max-md:py-3";
/** On the row's label cell: a full-width line of its own. */
export const STACK_LABEL = "max-md:col-span-2 max-md:block max-md:p-0";
/** On a value cell: its column name (data-label) above the value. */
export const STACK_VALUE =
  "max-md:block max-md:p-0 max-md:text-left max-md:before:block max-md:before:text-[11px] max-md:before:font-normal max-md:before:text-charcoal-soft max-md:before:content-[attr(data-label)]";
/** On a value cell with long text: full width. */
export const STACK_WIDE = "max-md:col-span-2";

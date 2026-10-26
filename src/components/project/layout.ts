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

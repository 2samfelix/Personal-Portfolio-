// Types and helpers for the Model Preview JSON written by
// scripts/export-model-preview.py. Shared by the client grid and the
// server-rendered mobile preview card.

export type CellStyle = {
  nf?: string;
  /** Font name, when it is not the default (Arial). */
  font?: { name?: string; b?: boolean; i?: boolean; u?: boolean; sz?: number; color?: string };
  fill?: string | null;
  align?: { h?: string; v?: string; wrap?: boolean; indent?: number };
  border?: Partial<Record<"t" | "r" | "b" | "l", string>>;
};

export type SheetCell = {
  /** Row and column position in the tab (see PreviewSheet.rowIndex / colIndex). */
  r: number;
  c: number;
  /** Index into the style table; omitted for the default style (0). */
  s?: number;
  /** Formula, including the leading "=". */
  f?: string;
  /** Raw value (a formula's cached result). */
  v?: string | number | boolean;
  /** Displayed text, only when it differs from the raw value. */
  d?: string;
};

export type PreviewSheet = {
  /** Tab label: the sheet name, or a curated view's name. */
  name: string;
  /** For a view: the workbook sheet it comes from, its ranges, and a one-line caption. */
  sheet?: string;
  ranges?: string[];
  caption?: string;
  /** For a view: the real zero-based sheet row of each row position (null for the
   *  spacer between two ranges), and the real column of each column position.
   *  Absent for a whole sheet, where position and sheet row/column are the same. */
  rowIndex?: (number | null)[];
  colIndex?: number[];
  rows: number;
  cols: number;
  truncated: boolean;
  freeze: { rows: number; cols: number };
  /** Excel column widths, in characters. */
  colWidths: number[];
  /** Excel row heights, in points. */
  rowHeights: number[];
  hiddenRows: number[];
  hiddenCols: number[];
  /** [firstRow, firstCol, lastRow, lastCol], zero-based. */
  merges: number[][];
  cells: SheetCell[];
};

export type ModelPreviewDoc = {
  version: number;
  workbook: {
    file: string;
    sha256: string;
    /** For a workbook copied from another repository: where it came from. */
    source?: { repo: string; commit: string; path: string; sha256: string };
  };
  note: string;
  styles: CellStyle[];
  sheets: PreviewSheet[];
};

export const DEFAULT_FONT_PT = 10;

/** "A", "B", … "Z", "AA", … for a zero-based column index. */
export function colLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function cellAddress(r: number, c: number): string {
  return `${colLetter(c)}${r + 1}`;
}

/** The real sheet row for a row position (null for a spacer row). */
export function sheetRow(sheet: PreviewSheet, r: number): number | null {
  return sheet.rowIndex ? sheet.rowIndex[r] : r;
}

/** The real sheet column for a column position. */
export function sheetCol(sheet: PreviewSheet, c: number): number {
  return sheet.colIndex ? sheet.colIndex[c] : c;
}

/** The workbook address of the cell at a position, e.g. "B45". */
export function addressAt(sheet: PreviewSheet, r: number, c: number): string {
  return cellAddress(sheetRow(sheet, r) ?? 0, sheetCol(sheet, c));
}

const FONT_FALLBACKS: Record<string, string> = {
  // Carlito is metric-compatible with Calibri and common where Calibri is not installed.
  Calibri: '"Calibri", "Carlito", Arial, Helvetica, sans-serif',
};

/** CSS font-family for a cell; the preview's default is Arial. */
export function fontFamily(style: CellStyle): string {
  const name = style.font?.name;
  if (!name) return "Arial, Helvetica, sans-serif";
  return FONT_FALLBACKS[name] ?? `"${name}", Arial, Helvetica, sans-serif`;
}

const SHEET_REF =
  /(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_.]*))!\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/g;

/** References to other sheets in a formula, e.g. 'Post-IPO Performance'!C49 -> {sheet, ref}. */
export function crossSheetRefs(formula: string | undefined): { sheet: string; ref: string }[] {
  if (!formula) return [];
  const out: { sheet: string; ref: string }[] = [];
  for (const m of formula.matchAll(SHEET_REF)) {
    const sheet = m[1] ? m[1].replace(/''/g, "'") : m[2];
    const ref = `${m[3]}${m[4]}${m[5] ? `:${m[5]}${m[6]}` : ""}`;
    if (!out.some((x) => x.sheet === sheet && x.ref === ref)) out.push({ sheet, ref });
  }
  return out;
}

/** Excel column width (characters) to CSS pixels, as Excel does for a 7px digit. */
export function colPx(width: number): number {
  return Math.round(width * 7 + 5);
}

/** Excel row height (points) to CSS pixels. */
export function rowPx(points: number): number {
  return Math.round((points * 4) / 3);
}

/** The text the spreadsheet shows for a cell. */
export function displayText(cell: SheetCell | undefined): string {
  if (!cell) return "";
  if (cell.d !== undefined) return cell.d;
  if (cell.v === undefined || cell.v === null) return "";
  if (typeof cell.v === "boolean") return cell.v ? "TRUE" : "FALSE";
  return String(cell.v);
}

/** The raw value as plain text, for the formula bar. */
export function rawText(cell: SheetCell | undefined): string {
  if (!cell || cell.v === undefined || cell.v === null) return "";
  if (typeof cell.v === "boolean") return cell.v ? "TRUE" : "FALSE";
  return String(cell.v);
}

/** Excel's "General" alignment: numbers right, booleans centred, text left. */
export function horizontalAlign(cell: SheetCell | undefined, style: CellStyle): "left" | "center" | "right" {
  const h = style.align?.h;
  if (h === "center" || h === "centerContinuous") return "center";
  if (h === "right") return "right";
  if (h === "left" || h === "fill" || h === "justify" || h === "distributed") return "left";
  if (typeof cell?.v === "number") return "right";
  if (typeof cell?.v === "boolean") return "center";
  return "left";
}

/** Row -> column -> cell lookup. */
export function indexCells(sheet: PreviewSheet): Map<number, Map<number, SheetCell>> {
  const rows = new Map<number, Map<number, SheetCell>>();
  for (const cell of sheet.cells) {
    if (!rows.has(cell.r)) rows.set(cell.r, new Map());
    rows.get(cell.r)!.set(cell.c, cell);
  }
  return rows;
}

// --- Contrast ---------------------------------------------------------------

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The workbook's font colour, nudged toward black (or white, on a dark fill) only
 * as far as needed for a 4.5:1 contrast ratio. Colours that already pass are
 * returned unchanged.
 */
export function readableColor(color: string | undefined, background: string): string {
  const base = color ?? "#000000";
  if (contrastRatio(base, background) >= 4.5) return base;
  const target = luminance(background) > 0.18 ? [0, 0, 0] : [255, 255, 255];
  const from = channels(base);
  for (let t = 0.05; t <= 1; t += 0.05) {
    const mixed =
      "#" +
      from
        .map((v, i) => Math.round(v + (target[i] - v) * t).toString(16).padStart(2, "0"))
        .join("");
    if (contrastRatio(mixed, background) >= 4.5) return mixed;
  }
  return target[0] === 0 ? "#000000" : "#FFFFFF";
}

/**
 * How far (in px) a cell's text may run into the cells to its right, as Excel
 * lets unwrapped, left-aligned text overflow. It may only cross cells that are
 * truly empty: no value, no formula, no fill or border of their own, and not
 * part of a merged range. It stops at the first cell that is not.
 *
 * A cell in a frozen column stays put while the other columns scroll under it,
 * so whatever its overflow covered would change as the grid scrolls. Its text
 * therefore overflows only when every cell to its right is empty, and is
 * otherwise clipped at its own edge.
 */
export function spillPx(
  sheet: PreviewSheet,
  row: Map<number, SheetCell> | undefined,
  cell: SheetCell,
  style: CellStyle,
  widthOf: (c: number) => number,
  isCovered: (c: number) => boolean,
): number {
  if (style.align?.wrap || typeof cell.v !== "string" || horizontalAlign(cell, style) !== "left") return 0;
  const blocks = (c: number) => isCovered(c) || row?.has(c) === true; // any cell entry: content or its own style
  if (cell.c < sheet.freeze.cols) {
    for (let c = cell.c + 1; c < sheet.cols; c++) if (blocks(c)) return 0;
  }
  let px = 0;
  for (let c = cell.c + 1; c < sheet.cols; c++) {
    if (blocks(c)) break;
    px += widthOf(c);
  }
  return px;
}

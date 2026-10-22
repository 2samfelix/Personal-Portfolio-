"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  DEFAULT_FONT_PT,
  cellAddress,
  colLetter,
  colPx,
  displayText,
  horizontalAlign,
  indexCells,
  rawText,
  readableColor,
  rowPx,
  spillPx,
  type CellStyle,
  type ModelPreviewDoc,
  type PreviewSheet,
  type SheetCell,
} from "@/lib/modelPreview";

type Selection = { r: number; c: number };

const COL_HEADER_PX = 24;
const ROW_HEADER_PX = 44;
const ROW_HEADER_COMPACT_PX = 34;
/** On small screens the frozen label column is capped at this width, with ellipsis. */
const FROZEN_COMPACT_MAX_PX = 120;
const MIN_COMPACT_FONT_PX = 12;
const PAGE_ROWS = 10;
/** A touch that moves further than this is a scroll, not a tap. */
const TAP_SLOP_PX = 8;
/** Start loading the data when the section is this close to the viewport. */
const PRELOAD_MARGIN = "600px 0px";

// Fixed heights for the desktop panel, so it occupies the same space while loading.
const TABS_PX = 44;
const FORMULA_BAR_PX = 92;
const GRID_PX = 440;

const HEADER_BG = "#ECE8DC";
const HEADER_SELECTED_BG = "#D8B888";
const GRIDLINE = "#E2E5E1";
const SELECT_RING = "#1E3A2B";

const BORDER_WIDTH: Record<string, number> = { thin: 1, hair: 1, dotted: 1, dashed: 1, medium: 2, mediumDashed: 2, thick: 3, double: 3 };

function defaultSelection(sheet: PreviewSheet): Selection {
  return { r: Math.min(sheet.freeze.rows, sheet.rows - 1), c: Math.min(sheet.freeze.cols, sheet.cols - 1) };
}

function borderCss(spec: string | undefined, fallback: string): string {
  if (!spec) return fallback;
  const [style, color] = spec.split(" ");
  const kind = style.includes("dash") ? "dashed" : style === "dotted" ? "dotted" : style === "double" ? "double" : "solid";
  return `${BORDER_WIDTH[style] ?? 1}px ${kind} ${color}`;
}

// --- Grid -------------------------------------------------------------------

type GridProps = {
  doc: ModelPreviewDoc;
  sheet: PreviewSheet;
  selection: Selection;
  onSelect: (s: Selection) => void;
  compact: boolean;
  gridId: string;
  labelledBy: string;
};

/**
 * The sheet as a real table with role="grid": sticky column letters and row
 * numbers, the workbook's frozen rows and columns, Excel column widths and row
 * heights, and one focusable (selected) cell at a time.
 */
function SheetGrid({ doc, sheet, selection, onSelect, compact, gridId, labelledBy }: GridProps) {
  const rows = useMemo(() => indexCells(sheet), [sheet]);
  const hiddenRows = useMemo(() => new Set(sheet.hiddenRows), [sheet]);
  const hiddenCols = useMemo(() => new Set(sheet.hiddenCols), [sheet]);
  const rowHeader = compact ? ROW_HEADER_COMPACT_PX : ROW_HEADER_PX;

  const widths = useMemo(
    () =>
      sheet.colWidths.map((w, c) => {
        if (hiddenCols.has(c)) return 0;
        const px = colPx(w);
        return compact && c < sheet.freeze.cols ? Math.min(px, FROZEN_COMPACT_MAX_PX) : px;
      }),
    [sheet, compact, hiddenCols],
  );
  const heights = useMemo(() => sheet.rowHeights.map((h, r) => (hiddenRows.has(r) ? 0 : rowPx(h))), [sheet, hiddenRows]);

  // Sticky offsets for frozen columns (left) and frozen rows (top).
  const leftOf = useMemo(() => {
    const out: number[] = [];
    let x = rowHeader;
    for (let c = 0; c < sheet.cols; c++) {
      out.push(x);
      x += widths[c];
    }
    return out;
  }, [sheet, widths, rowHeader]);
  const topOf = useMemo(() => {
    const out: number[] = [];
    let y = COL_HEADER_PX;
    for (let r = 0; r < sheet.rows; r++) {
      out.push(y);
      y += heights[r];
    }
    return out;
  }, [sheet, heights]);
  const frozenW = sheet.freeze.cols ? leftOf[sheet.freeze.cols - 1] + widths[sheet.freeze.cols - 1] : rowHeader;
  const frozenH = sheet.freeze.rows ? topOf[sheet.freeze.rows - 1] + heights[sheet.freeze.rows - 1] : COL_HEADER_PX;
  const tableWidth = rowHeader + widths.reduce((a, b) => a + b, 0);

  // Merged ranges: the top-left cell spans, the others are not rendered.
  const { spans, covered } = useMemo(() => {
    const spans = new Map<string, { rowSpan: number; colSpan: number }>();
    const covered = new Set<string>();
    for (const [r1, c1, r2, c2] of sheet.merges) {
      spans.set(`${r1},${c1}`, { rowSpan: r2 - r1 + 1, colSpan: c2 - c1 + 1 });
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (r !== r1 || c !== c1) covered.add(`${r},${c}`);
    }
    return { spans, covered };
  }, [sheet]);

  const cellId = (r: number, c: number) => `${gridId}-r${r}-c${c}`;

  // Focus follows selection only for selections made in this grid.
  const pendingFocus = useRef(false);
  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    const el = document.getElementById(cellId(selection.r, selection.c));
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  const select = (s: Selection) => {
    pendingFocus.current = true;
    onSelect(s);
  };

  const step = (r: number, c: number, dr: number, dc: number): Selection => {
    let nr = r;
    let nc = c;
    do {
      nr = Math.max(0, Math.min(sheet.rows - 1, nr + dr));
      nc = Math.max(0, Math.min(sheet.cols - 1, nc + dc));
      if (nr === 0 || nr === sheet.rows - 1) dr = 0;
      if (nc === 0 || nc === sheet.cols - 1) dc = 0;
    } while ((hiddenRows.has(nr) || hiddenCols.has(nc) || covered.has(`${nr},${nc}`)) && (dr || dc));
    return { r: nr, c: nc };
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const { r, c } = selection;
    const ctrl = e.ctrlKey || e.metaKey;
    let next: Selection | null = null;
    switch (e.key) {
      case "ArrowUp": next = step(r, c, -1, 0); break;
      case "ArrowDown": next = step(r, c, 1, 0); break;
      case "ArrowLeft": next = step(r, c, 0, -1); break;
      case "ArrowRight": next = step(r, c, 0, 1); break;
      case "Home": next = ctrl ? { r: 0, c: 0 } : { r, c: 0 }; break;
      case "End": next = ctrl ? { r: sheet.rows - 1, c: sheet.cols - 1 } : { r, c: sheet.cols - 1 }; break;
      case "PageUp": next = { r: Math.max(0, r - PAGE_ROWS), c }; break;
      case "PageDown": next = { r: Math.min(sheet.rows - 1, r + PAGE_ROWS), c }; break;
    }
    if (next) {
      e.preventDefault();
      select(next);
    }
  };

  // Touch and pen select on a tap only; a gesture that moves is a scroll.
  const pointer = useRef<{ x: number; y: number; type: string } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY, type: e.pointerType };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = pointer.current;
    if (!start || start.type === "mouse") return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP_PX) return;
    const td = (e.target as HTMLElement).closest<HTMLElement>("td[data-r]");
    if (td) select({ r: Number(td.dataset.r), c: Number(td.dataset.c) });
  };
  const onCellClick = (r: number, c: number) => {
    if (pointer.current && pointer.current.type !== "mouse") return; // handled by onPointerUp
    select({ r, c });
  };

  const styleOf = (cell: SheetCell | undefined): CellStyle => doc.styles[cell?.s ?? 0] ?? {};

  return (
    <div
      className="h-full overflow-auto overscroll-contain bg-white"
      style={{ scrollPaddingTop: frozenH, scrollPaddingLeft: frozenW }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <table
        role="grid"
        aria-labelledby={labelledBy}
        aria-rowcount={sheet.rows + 1}
        aria-colcount={sheet.cols + 1}
        aria-readonly="true"
        onKeyDown={onKeyDown}
        className="table-fixed border-separate border-spacing-0 font-[Arial,Helvetica,sans-serif] text-charcoal"
        style={{ width: tableWidth }}
      >
        <colgroup>
          <col style={{ width: rowHeader }} />
          {widths.map((w, c) => (
            <col key={c} style={{ width: w, display: w ? undefined : "none" }} />
          ))}
        </colgroup>
        <thead>
          <tr aria-rowindex={1} style={{ height: COL_HEADER_PX }}>
            <th
              aria-label="Row and column headers"
              className="sticky left-0 top-0 z-40 border-b border-r p-0"
              style={{ background: HEADER_BG, borderColor: GRIDLINE }}
            />
            {widths.map((w, c) =>
              w ? (
                <th
                  key={c}
                  scope="col"
                  aria-colindex={c + 2}
                  className="sticky top-0 border-b border-r p-0 text-center text-[11px] font-semibold text-charcoal-soft"
                  style={{
                    background: c === selection.c ? HEADER_SELECTED_BG : HEADER_BG,
                    borderColor: GRIDLINE,
                    left: c < sheet.freeze.cols ? leftOf[c] : undefined,
                    zIndex: c < sheet.freeze.cols ? 38 : 35,
                  }}
                >
                  {colLetter(c)}
                </th>
              ) : null,
            )}
          </tr>
        </thead>
        <tbody>
          {heights.map((h, r) => {
            if (!h) return null;
            const row = rows.get(r);
            const frozenRow = r < sheet.freeze.rows;
            return (
              <tr key={r} aria-rowindex={r + 2} style={{ height: h }}>
                <th
                  scope="row"
                  aria-colindex={1}
                  className="sticky left-0 border-b border-r p-0 text-center text-[11px] font-semibold text-charcoal-soft"
                  style={{
                    background: r === selection.r ? HEADER_SELECTED_BG : HEADER_BG,
                    borderColor: GRIDLINE,
                    top: frozenRow ? topOf[r] : undefined,
                    zIndex: frozenRow ? 33 : 28,
                  }}
                >
                  {r + 1}
                </th>
                {widths.map((w, c) => {
                  if (!w || covered.has(`${r},${c}`)) return null;
                  const cell = row?.get(c);
                  const style = styleOf(cell);
                  const frozenCol = c < sheet.freeze.cols;
                  const sticky = frozenRow || frozenCol;
                  const selected = selection.r === r && selection.c === c;
                  const span = spans.get(`${r},${c}`);
                  const background = style.fill ?? (sticky ? "#FFFFFF" : undefined);
                  const fontPx = Math.max(((style.font?.sz ?? DEFAULT_FONT_PT) * 4) / 3, compact ? MIN_COMPACT_FONT_PX : 0);
                  const ellipsis = compact && frozenCol;
                  const wrap = Boolean(style.align?.wrap) && !ellipsis;
                  const spill = !ellipsis && cell ? spillPx(sheet, row, cell, style, (i) => widths[i]) : 0;
                  const v = style.align?.v;
                  const text = displayText(cell);
                  const cellStyle: CSSProperties = {
                    background,
                    borderRight: borderCss(style.border?.r, `1px solid ${GRIDLINE}`),
                    borderBottom: borderCss(style.border?.b, `1px solid ${GRIDLINE}`),
                    borderTop: style.border?.t ? borderCss(style.border.t, "") : undefined,
                    borderLeft: style.border?.l ? borderCss(style.border.l, "") : undefined,
                    left: frozenCol ? leftOf[c] : undefined,
                    top: frozenRow ? topOf[r] : undefined,
                    zIndex: frozenRow && frozenCol ? 30 : frozenRow ? 25 : frozenCol ? 20 : undefined,
                    boxShadow: selected ? `inset 0 0 0 2px ${SELECT_RING}` : undefined,
                  };
                  return (
                    <td
                      key={c}
                      id={cellId(r, c)}
                      role="gridcell"
                      aria-colindex={c + 2}
                      aria-selected={selected}
                      aria-label={`${cellAddress(r, c)}${text ? ` ${text}` : " empty"}`}
                      tabIndex={selected ? 0 : -1}
                      rowSpan={span?.rowSpan}
                      colSpan={span?.colSpan}
                      data-r={r}
                      data-c={c}
                      onClick={() => onCellClick(r, c)}
                      className={`${sticky ? "sticky" : "relative"} cursor-cell p-0 align-top outline-none`}
                      style={cellStyle}
                    >
                      <div
                        aria-hidden="true"
                        className="flex overflow-hidden px-1"
                        style={{
                          height: h - 1,
                          width: spill ? w + spill - 1 : undefined,
                          alignItems: v === "top" ? "flex-start" : v === "center" ? "center" : "flex-end",
                          paddingLeft: style.align?.indent ? 4 + style.align.indent * 9 : undefined,
                          fontSize: fontPx,
                          lineHeight: 1.2,
                          fontWeight: style.font?.b ? 700 : 400,
                          fontStyle: style.font?.i ? "italic" : undefined,
                          textDecoration: style.font?.u ? "underline" : undefined,
                          color: readableColor(style.font?.color, style.fill ?? "#FFFFFF"),
                        }}
                      >
                        <span
                          className="block w-full"
                          style={{
                            textAlign: horizontalAlign(cell, style),
                            whiteSpace: wrap ? "normal" : "pre",
                            overflowWrap: wrap ? "break-word" : undefined,
                            overflow: "hidden",
                            textOverflow: ellipsis ? "ellipsis" : "clip",
                          }}
                        >
                          {text}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- Tabs and formula bar ----------------------------------------------------

function SheetTabs({
  sheets,
  active,
  onChange,
  idPrefix,
  compact,
}: {
  sheets: PreviewSheet[];
  active: number;
  onChange: (i: number) => void;
  idPrefix: string;
  compact: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const next = (i + sheets.length) % sheets.length;
    onChange(next);
    refs.current[next]?.focus();
    refs.current[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  return (
    <div
      role="tablist"
      aria-label="Workbook sheets"
      className={`flex shrink-0 gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? "py-2" : "items-end pt-2"}`}
      style={compact ? undefined : { height: TABS_PX }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") move(active + 1);
        else if (e.key === "ArrowLeft") move(active - 1);
        else if (e.key === "Home") move(0);
        else if (e.key === "End") move(sheets.length - 1);
        else return;
        e.preventDefault();
      }}
    >
      {sheets.map((s, i) => (
        <button
          key={s.name}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${i}`}
          aria-selected={i === active}
          aria-controls={`${idPrefix}-panel`}
          tabIndex={i === active ? 0 : -1}
          onClick={() => onChange(i)}
          className={`shrink-0 whitespace-nowrap border text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brass ${
            compact ? "rounded-full px-3.5 py-1.5" : "rounded-t-lg border-b-0 px-4 py-2"
          } ${
            i === active
              ? "border-forest bg-forest text-cream"
              : "border-forest/20 bg-white text-charcoal hover:border-forest/40"
          }`}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}

function FormulaBar({ sheet, selection, cell, compact }: { sheet: PreviewSheet; selection: Selection; cell: SheetCell | undefined; compact: boolean }) {
  const address = cellAddress(selection.r, selection.c);
  const shown = displayText(cell);
  const raw = rawText(cell);
  const announce = `${sheet.name}, ${address}: ${shown || "empty"}${cell?.f ? `. Formula ${cell.f}` : ""}`;
  return (
    <div
      role="group"
      aria-label="Formula bar"
      className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-forest/15 bg-white px-3 py-2 text-sm ${compact ? "border-t" : "border-b"}`}
      style={compact ? undefined : { height: FORMULA_BAR_PX }}
    >
      <span className="row-span-2 self-start rounded-md border border-forest/20 bg-cream px-2 py-1 font-mono text-xs font-bold text-charcoal">
        {address}
      </span>
      <p className="flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 font-serif text-sm italic text-brass" aria-hidden="true">
          fx
        </span>
        <span className="sr-only">Formula:</span>
        <code className="min-w-0 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-charcoal [scrollbar-width:thin]">
          {cell?.f ?? <span className="font-sans text-charcoal-soft">No formula (entered value)</span>}
        </code>
      </p>
      <dl className="col-start-2 grid min-w-0 grid-cols-[auto_1fr] gap-x-2 text-xs text-charcoal-soft">
        <dt>Shows</dt>
        <dd className={`min-w-0 text-charcoal ${compact ? "max-h-[3.75rem] overflow-y-auto" : "truncate"}`} title={shown}>
          {shown || "—"}
        </dd>
        <dt>Raw value</dt>
        <dd className="min-w-0 truncate font-mono text-charcoal" title={raw}>
          {raw || "—"}
        </dd>
      </dl>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

// --- Preview ----------------------------------------------------------------

type Status = "idle" | "loading" | "ready" | "error";

/**
 * Read-only workbook preview. Desktop (md and up) shows tabs, formula bar and grid
 * in a fixed-size panel; small screens show a static preview card and open the
 * same preview in a full-screen dialog. The JSON loads when the section nears the
 * viewport (or when the dialog opens), never with the page.
 */
export default function WorkbookPreview({
  src,
  title,
  downloadUrl,
  teaser,
}: {
  src: string;
  title: string;
  downloadUrl?: string;
  teaser: ReactNode;
}) {
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [doc, setDoc] = useState<ModelPreviewDoc | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [active, setActive] = useState(0);
  const [selections, setSelections] = useState<Record<number, Selection>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const started = useRef(false);

  const load = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setStatus("loading");
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ModelPreviewDoc>;
      })
      .then((data) => {
        setDoc(data);
        setStatus("ready");
      })
      .catch(() => {
        started.current = false;
        setStatus("error");
      });
  }, [src]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      load();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [load]);

  const openDialog = () => {
    load();
    dialogRef.current?.showModal();
    document.documentElement.style.overflow = "hidden";
    setDialogOpen(true);
  };
  const onDialogClose = () => {
    document.documentElement.style.overflow = "";
    setDialogOpen(false);
    openerRef.current?.focus();
  };

  const sheet = doc?.sheets[active];
  const selection = sheet ? selections[active] ?? defaultSelection(sheet) : { r: 0, c: 0 };
  const selectedCell = useMemo(
    () => sheet?.cells.find((cell) => cell.r === selection.r && cell.c === selection.c),
    [sheet, selection.r, selection.c],
  );
  const setSelection = (s: Selection) => setSelections((prev) => ({ ...prev, [active]: s }));

  const titleId = `${uid}-title`;
  const fallback = (
    <p className="p-6 text-sm text-charcoal-soft">
      {status === "error" ? "The preview could not be loaded. " : "Loading the workbook preview… "}
      {downloadUrl && (
        <a href={downloadUrl} className="font-semibold text-forest underline-offset-2 hover:underline">
          Download the workbook instead
        </a>
      )}
    </p>
  );

  const panel = (compact: boolean, prefix: string) =>
    doc && sheet ? (
      <>
        <SheetTabs sheets={doc.sheets} active={active} onChange={setActive} idPrefix={prefix} compact={compact} />
        {!compact && <FormulaBar sheet={sheet} selection={selection} cell={selectedCell} compact={false} />}
        <div
          id={`${prefix}-panel`}
          role="tabpanel"
          aria-labelledby={`${prefix}-tab-${active}`}
          className={compact ? "min-h-0 flex-1 border-t border-forest/15" : ""}
          style={compact ? undefined : { height: GRID_PX }}
        >
          <SheetGrid
            key={`${prefix}-${active}`}
            doc={doc}
            sheet={sheet}
            selection={selection}
            onSelect={setSelection}
            compact={compact}
            gridId={`${prefix}-grid`}
            labelledBy={`${prefix}-tab-${active}`}
          />
        </div>
        {compact && <FormulaBar sheet={sheet} selection={selection} cell={selectedCell} compact />}
      </>
    ) : (
      fallback
    );

  return (
    <div ref={rootRef} className="mt-6">
      <p id={titleId} className="sr-only">
        {title}
      </p>

      {/* Desktop and tablet: the interactive preview, in a fixed-size panel. */}
      <div
        className="hidden overflow-hidden rounded-xl border border-forest/15 bg-cream md:flex md:flex-col"
        style={{ height: TABS_PX + FORMULA_BAR_PX + GRID_PX + 2 }}
        aria-busy={status !== "ready"}
      >
        {panel(false, `${uid}-desk`)}
      </div>

      {/* Small screens: a static card, and the full preview in a dialog. */}
      <div className="md:hidden">
        {teaser}
        <button
          ref={openerRef}
          type="button"
          aria-haspopup="dialog"
          onClick={openDialog}
          className="mt-3 w-full rounded-full bg-forest px-5 py-3 text-sm font-semibold text-cream transition-colors hover:bg-forest-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
        >
          Open Model Preview
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${uid}-dialog-title`}
        onClose={onDialogClose}
        className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-cream p-0 backdrop:bg-charcoal/40"
      >
        {dialogOpen && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-forest/15 px-4 py-3">
              <h2 id={`${uid}-dialog-title`} className="text-base font-bold text-charcoal">
                Model Preview
              </h2>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-full border border-forest/30 px-4 py-1.5 text-sm font-semibold text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              >
                Close
              </button>
            </div>
            {doc && sheet ? panel(true, `${uid}-dlg`) : fallback}
          </div>
        )}
      </dialog>
    </div>
  );
}

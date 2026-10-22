import {
  colLetter,
  displayText,
  horizontalAlign,
  indexCells,
  readableColor,
  type ModelPreviewDoc,
} from "@/lib/modelPreview";

const ROWS = 8;
const COLS = 3;

/**
 * Static, server-rendered preview card for small screens: the first rows and
 * columns of the first sheet, as displayed text. Text runs across the empty
 * cells to its right, as it does in Excel. Not interactive; the full preview
 * opens in a dialog.
 */
export default function ModelPreviewTeaser({ doc }: { doc: ModelPreviewDoc }) {
  const sheet = doc.sheets[0];
  const rows = indexCells(sheet);
  const cols = Math.min(COLS, sheet.cols);
  return (
    <figure className="overflow-hidden rounded-xl border border-forest/15 bg-white">
      <figcaption className="flex items-center justify-between border-b border-forest/10 bg-cream px-3 py-2 text-xs text-charcoal-soft">
        <span className="font-semibold text-charcoal">{sheet.name}</span>
        <span>
          Rows 1–{ROWS}, columns A–{colLetter(cols - 1)}
        </span>
      </figcaption>
      <table className="w-full table-fixed border-collapse font-[Arial,Helvetica,sans-serif] text-xs text-charcoal">
        <colgroup>
          <col className="w-7" />
          <col />
          <col className="w-[22%]" />
          <col className="w-[22%]" />
        </colgroup>
        <tbody>
          {Array.from({ length: Math.min(ROWS, sheet.rows) }, (_, r) => {
            const row = rows.get(r);
            const out = [];
            for (let c = 0; c < cols; c++) {
              const cell = row?.get(c);
              const style = doc.styles[cell?.s ?? 0] ?? {};
              let span = 1;
              if (cell && typeof cell.v === "string") while (c + span < cols && !row?.has(c + span)) span++;
              out.push(
                <td
                  key={c}
                  colSpan={span}
                  className="truncate border-b border-forest/10 px-1.5 py-1"
                  style={{
                    textAlign: horizontalAlign(cell, style),
                    fontWeight: style.font?.b ? 700 : undefined,
                    fontStyle: style.font?.i ? "italic" : undefined,
                    background: style.fill ?? undefined,
                    color: readableColor(style.font?.color, style.fill ?? "#FFFFFF"),
                  }}
                >
                  {displayText(cell)}
                </td>,
              );
              c += span - 1;
            }
            return (
              <tr key={r}>
                <th scope="row" className="border-b border-r border-forest/10 bg-cream text-center text-[10px] font-semibold text-charcoal-soft">
                  {r + 1}
                </th>
                {out}
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}

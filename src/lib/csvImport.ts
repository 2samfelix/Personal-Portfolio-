import { SAAS_DRIVERS, type SaaSAssumptions, type SaaSCompanyBaseline } from "@/lib/models/saas";

// Documented CSV schema for the FP&A Decision Lab's company-data import.
// Required columns establish the baseline the engine forecasts forward
// from; the optional column lets the importer infer a growth/churn/CAC
// trend from the last two rows. Column order doesn't matter, but names
// must match exactly (case-insensitive). Extra/unrecognized columns
// (including ones from an older version of this schema) are ignored, not
// rejected — only column COUNT per row must match the file's own header.
export const CSV_REQUIRED_COLUMNS = [
  "month",
  "customers",
  "mrr",
  "cash",
  "sales_marketing_spend",
] as const;

export const CSV_OPTIONAL_COLUMNS = ["churned_customers"] as const;

export type CsvRow = {
  month: number;
  customers: number;
  mrr: number;
  cash: number;
  salesMarketingSpend: number; // monthly, per row
  churnedCustomers?: number;
};

// Sourced directly from the SaaS model's own driver config (SAAS_DRIVERS)
// so a derived value can never land outside what the slider can express,
// and so a future change to a driver's bounds never needs a second edit
// here — this file has no bounds of its own.
const driverBounds = new Map(SAAS_DRIVERS.map((d) => [d.key, [d.min, d.max] as const]));

function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

export type CsvParseResult =
  | {
      ok: true;
      rows: CsvRow[];
      derivedBaseline: SaaSCompanyBaseline;
      derivedAssumptions: Partial<SaaSAssumptions>;
      warnings: string[];
    }
  | { ok: false; error: string };

/**
 * Parses and validates an uploaded company-data CSV. Rejects malformed
 * files outright (missing columns, wrong column count, non-numeric or
 * negative values in required fields) rather than silently substituting
 * zeros or defaults. On success, derives a new company baseline from the
 * last row (starting cash) plus starting customers and avg MRR per
 * customer, and — only where the optional churned_customers column and at
 * least two rows make it possible — a growth/churn/CAC trend from the last
 * two rows. Anything that can't be derived is left untouched and reported
 * as a warning, never guessed.
 */
export function parseCompanyCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { ok: false, error: "The file needs a header row and at least one data row." };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const missing = CSV_REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required column(s): ${missing.join(", ")}. Required columns: ${CSV_REQUIRED_COLUMNS.join(", ")}.`,
    };
  }

  const colIndex = (name: string) => header.indexOf(name);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    if (cells.length !== header.length) {
      return {
        ok: false,
        error: `Row ${i + 1} has ${cells.length} column(s) but the header has ${header.length}.`,
      };
    }

    const optionalNum = (name: string): number | undefined => {
      const idx = colIndex(name);
      if (idx === -1 || cells[idx] === "") return undefined;
      const v = Number(cells[idx]);
      return Number.isNaN(v) ? undefined : v;
    };

    const requiredNum = (name: string): number | null => {
      const idx = colIndex(name);
      const raw = cells[idx];
      if (raw === "" || raw === undefined) return null;
      const v = Number(raw);
      return Number.isNaN(v) ? null : v;
    };

    const month = requiredNum("month");
    const customers = requiredNum("customers");
    const mrr = requiredNum("mrr");
    const cash = requiredNum("cash");
    const salesMarketingSpend = requiredNum("sales_marketing_spend");

    if (
      month === null ||
      customers === null ||
      mrr === null ||
      cash === null ||
      salesMarketingSpend === null
    ) {
      return {
        ok: false,
        error: `Row ${i + 1} is missing a value, or has a non-numeric value, in a required column.`,
      };
    }
    if (customers < 0 || mrr < 0 || cash < 0 || salesMarketingSpend < 0) {
      return {
        ok: false,
        error: `Row ${i + 1} has a negative value in a column that must be zero or greater.`,
      };
    }

    rows.push({
      month,
      customers,
      mrr,
      cash,
      salesMarketingSpend,
      churnedCustomers: optionalNum("churned_customers"),
    });
  }

  const last = rows[rows.length - 1];
  const derivedBaseline: SaaSCompanyBaseline = {
    name: "Imported Company",
    startingCash: last.cash,
  };

  const warnings: string[] = [];
  const derivedAssumptions: Partial<SaaSAssumptions> = {
    startingCustomers: Math.round(clamp(last.customers, driverBounds.get("startingCustomers")!)),
    avgMrrPerCustomer: clamp(
      last.customers === 0 ? 0 : last.mrr / last.customers,
      driverBounds.get("avgMrrPerCustomer")!
    ),
  };

  if (rows.length < 2) {
    warnings.push(
      "Only one data row was provided — growth, churn, and CAC could not be derived from a trend; the current sliders were kept."
    );
  } else {
    const prev = rows[rows.length - 2];

    if (prev.customers > 0 && last.churnedCustomers !== undefined) {
      const churnRate = clamp(
        last.churnedCustomers / prev.customers,
        driverBounds.get("monthlyChurnRate")!
      );
      const impliedNewCustomers = last.customers - prev.customers + last.churnedCustomers;
      const growthRate = clamp(
        impliedNewCustomers / prev.customers,
        driverBounds.get("monthlyGrowthRate")!
      );
      derivedAssumptions.monthlyChurnRate = churnRate;
      derivedAssumptions.monthlyGrowthRate = growthRate;

      if (impliedNewCustomers > 0) {
        derivedAssumptions.cac = clamp(
          last.salesMarketingSpend / impliedNewCustomers,
          driverBounds.get("cac")!
        );
      } else {
        warnings.push(
          "Implied new customers for the last row was zero or negative — CAC could not be derived from spend; the current CAC slider was kept."
        );
      }
    } else {
      warnings.push(
        "No churned_customers value on the last row — growth, churn, and CAC were not derived; the current sliders were kept."
      );
    }
  }

  return { ok: true, rows, derivedBaseline, derivedAssumptions, warnings };
}

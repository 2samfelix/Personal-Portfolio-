import type { SaaSAssumptions, SaaSCompanyBaseline } from "@/lib/models/saas";

// Documented CSV schema for the FP&A Decision Lab's company-data import.
// Required columns establish the baseline the engine forecasts forward
// from; optional columns let the importer infer starting assumptions from
// the trend between the last two rows. Column order doesn't matter, but
// names must match exactly (case-insensitive).
export const CSV_REQUIRED_COLUMNS = [
  "month",
  "customers",
  "mrr",
  "cash",
  "headcount",
  "sales_marketing_spend",
] as const;

export const CSV_OPTIONAL_COLUMNS = [
  "churned_customers",
  "expansion_mrr",
  "contraction_mrr",
  "new_mrr",
] as const;

export type CsvRow = {
  month: number;
  customers: number;
  mrr: number;
  cash: number;
  headcount: number;
  salesMarketingSpend: number; // monthly, per row
  churnedCustomers?: number;
  expansionMrr?: number;
  contractionMrr?: number;
  newMrr?: number;
};

// Matches the min/max on the Drivers sliders in FpaDecisionLab.tsx — kept
// here so a derived value never lands outside what the slider can express.
const ASSUMPTION_BOUNDS = {
  monthlyGrowthRate: [0, 0.15] as const,
  monthlyChurnRate: [0, 0.06] as const,
  monthlyExpansionRate: [0, 0.05] as const,
  monthlyContractionRate: [0, 0.05] as const,
  headcount: [15, 50] as const,
  annualSalesMarketing: [300_000, 1_500_000] as const,
};

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
 * last row and — only where the optional columns and at least two rows
 * make it possible — a starting point for the growth/churn/expansion/
 * contraction sliders from the trend between the last two rows. Anything
 * that can't be derived is left untouched and reported as a warning, never
 * guessed.
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
    const headcount = requiredNum("headcount");
    const salesMarketingSpend = requiredNum("sales_marketing_spend");

    if (
      month === null ||
      customers === null ||
      mrr === null ||
      cash === null ||
      headcount === null ||
      salesMarketingSpend === null
    ) {
      return {
        ok: false,
        error: `Row ${i + 1} is missing a value, or has a non-numeric value, in a required column.`,
      };
    }
    if (customers < 0 || mrr < 0 || cash < 0 || headcount < 0 || salesMarketingSpend < 0) {
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
      headcount,
      salesMarketingSpend,
      churnedCustomers: optionalNum("churned_customers"),
      expansionMrr: optionalNum("expansion_mrr"),
      contractionMrr: optionalNum("contraction_mrr"),
      newMrr: optionalNum("new_mrr"),
    });
  }

  const last = rows[rows.length - 1];
  const derivedBaseline: SaaSCompanyBaseline = {
    name: "Imported Company",
    startingARR: last.mrr * 12,
    startingCustomers: last.customers,
    annualArpu: last.customers === 0 ? 0 : (last.mrr * 12) / last.customers,
    startingCash: last.cash,
  };

  const warnings: string[] = [];
  const derivedAssumptions: Partial<SaaSAssumptions> = {
    headcount: Math.round(clamp(last.headcount, ASSUMPTION_BOUNDS.headcount)),
    annualSalesMarketing: clamp(
      last.salesMarketingSpend * 12,
      ASSUMPTION_BOUNDS.annualSalesMarketing
    ),
  };

  if (rows.length < 2) {
    warnings.push(
      "Only one data row was provided — growth, churn, expansion, and contraction rates could not be derived from a trend; the currently selected preset's rates were kept."
    );
  } else {
    const prev = rows[rows.length - 2];

    if (prev.customers > 0 && last.churnedCustomers !== undefined) {
      const churnRate = clamp(
        last.churnedCustomers / prev.customers,
        ASSUMPTION_BOUNDS.monthlyChurnRate
      );
      const impliedNewCustomers = last.customers - prev.customers + last.churnedCustomers;
      const growthRate = clamp(
        impliedNewCustomers / prev.customers,
        ASSUMPTION_BOUNDS.monthlyGrowthRate
      );
      derivedAssumptions.monthlyChurnRate = churnRate;
      derivedAssumptions.monthlyGrowthRate = growthRate;
    } else {
      warnings.push(
        "No churned_customers value on the last row — growth and churn rates were not derived; the currently selected preset's rates were kept."
      );
    }

    if (
      prev.mrr > 0 &&
      last.expansionMrr !== undefined &&
      last.contractionMrr !== undefined
    ) {
      derivedAssumptions.monthlyExpansionRate = clamp(
        last.expansionMrr / prev.mrr,
        ASSUMPTION_BOUNDS.monthlyExpansionRate
      );
      derivedAssumptions.monthlyContractionRate = clamp(
        last.contractionMrr / prev.mrr,
        ASSUMPTION_BOUNDS.monthlyContractionRate
      );
    } else {
      warnings.push(
        "No expansion_mrr/contraction_mrr values on the last row — expansion and contraction rates were not derived; the currently selected preset's rates were kept."
      );
    }
  }

  return { ok: true, rows, derivedBaseline, derivedAssumptions, warnings };
}

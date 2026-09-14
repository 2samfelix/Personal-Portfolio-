export type SimulatorInputs = {
  price: number;
  volume: number;
  cogsPct: number;
  opex: number;
};

export const defaultSimulatorInputs: SimulatorInputs = {
  price: 42,
  volume: 250000,
  cogsPct: 0.58,
  opex: 3200000,
};

export type EBITDABreakdown = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  ebitda: number;
};

/**
 * COGS is unit-driven, not price-driven. When `baseCogsDollars` is supplied
 * (used only for a Price flex), COGS is held at that fixed dollar amount
 * instead of being recalculated as cogsPct * the flexed revenue.
 */
export function calcEBITDA(
  inputs: SimulatorInputs,
  baseCogsDollars?: number
): EBITDABreakdown {
  const revenue = inputs.price * inputs.volume;
  const cogs = baseCogsDollars ?? inputs.cogsPct * revenue;
  const grossProfit = revenue - cogs;
  const ebitda = grossProfit - inputs.opex;
  return { revenue, cogs, grossProfit, ebitda };
}

export type DriverKey = "price" | "volume" | "cogsPct" | "opex";

export const driverLabels: Record<DriverKey, string> = {
  price: "Price",
  volume: "Volume",
  cogsPct: "COGS % of Revenue",
  opex: "Operating Expenses",
};

export type TornadoRow = {
  key: DriverKey;
  label: string;
  downEbitda: number;
  upEbitda: number;
  downDelta: number;
  upDelta: number;
  range: number;
};

const DRIVER_KEYS: DriverKey[] = ["price", "volume", "cogsPct", "opex"];

export function runTornadoAnalysis(
  base: SimulatorInputs,
  flexPct = 0.05
): { baseline: EBITDABreakdown; rows: TornadoRow[] } {
  const baseline = calcEBITDA(base);
  const baseCogsDollars = baseline.cogs;

  const rows: TornadoRow[] = DRIVER_KEYS.map((key) => {
    const upInputs: SimulatorInputs = { ...base, [key]: base[key] * (1 + flexPct) };
    const downInputs: SimulatorInputs = { ...base, [key]: base[key] * (1 - flexPct) };

    // Only the Price scenario needs COGS pinned to its base-Volume dollar
    // amount — Volume, COGS%, and OpEx flexes all recompute normally.
    const pinnedCogs = key === "price" ? baseCogsDollars : undefined;

    const up = calcEBITDA(upInputs, pinnedCogs);
    const down = calcEBITDA(downInputs, pinnedCogs);

    const upDelta = up.ebitda - baseline.ebitda;
    const downDelta = down.ebitda - baseline.ebitda;

    return {
      key,
      label: driverLabels[key],
      upEbitda: up.ebitda,
      downEbitda: down.ebitda,
      upDelta,
      downDelta,
      range: Math.abs(upDelta - downDelta),
    };
  }).sort((a, b) => b.range - a.range);

  return { baseline, rows };
}

export { formatCurrency, formatCurrencyCompact, formatSignedCompact } from "@/lib/format";

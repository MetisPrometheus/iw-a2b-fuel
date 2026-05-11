"use client";

import { useEffect, useState } from "react";
import type { CostBreakdown, FxRates } from "@/lib/types";
import { convertAmount, formatCurrency, formatDistance, formatDuration, formatNumber } from "@/lib/calc";

type Props = {
  cost: CostBreakdown;
  fxRates: FxRates | null;
  firstCurrency?: string;
  lastCurrency?: string;
};

export default function ResultCard({ cost, fxRates, firstCurrency, lastCurrency }: Props) {
  const multiCurrency = cost.byCurrency.length > 1;
  const multiCountry = cost.byCountry.length > 1;

  const choices = uniqueDefined([firstCurrency, lastCurrency]);
  const defaultChoice = firstCurrency ?? cost.byCurrency[0]?.currency ?? "USD";
  const [displayCurrency, setDisplayCurrency] = useState<string>(defaultChoice);
  useEffect(() => {
    if (!choices.includes(displayCurrency)) setDisplayCurrency(defaultChoice);
  }, [defaultChoice, choices.join(",")]);

  let combined: { amount: number; missing: string[] } | null = null;
  if (multiCurrency && fxRates) {
    let total = 0;
    const missing: string[] = [];
    for (const c of cost.byCurrency) {
      const converted = convertAmount(c.total, c.currency, displayCurrency, fxRates.rates);
      if (converted == null) missing.push(c.currency);
      else total += converted;
    }
    combined = { amount: total, missing };
  }

  return (
    <div className="surface rounded-xl p-5 space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Estimated cost</span>
          {multiCurrency && choices.length > 1 && (
            <div className="flex gap-0.5 rounded-md bg-[var(--surface-2)] p-0.5 text-[11px]">
              {choices.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDisplayCurrency(c)}
                  className={`px-2 py-0.5 rounded ${displayCurrency === c ? "bg-[var(--surface)] text-[var(--fg)]" : "text-[var(--fg-muted)]"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {combined ? (
          <>
            <div className="text-4xl font-semibold mt-1">
              {formatCurrency(combined.amount, displayCurrency)}
            </div>
            <div className="mt-2 text-xs text-[var(--fg-muted)]">
              Combined from {cost.byCurrency.map((c) => formatCurrency(c.total, c.currency)).join(" + ")} at today&apos;s FX
              {combined.missing.length > 0 && (
                <> · couldn&apos;t convert {combined.missing.join(", ")}, those are excluded</>
              )}
            </div>
          </>
        ) : (
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {cost.byCurrency.map((c) => (
              <div key={c.currency} className="text-4xl font-semibold">
                {formatCurrency(c.total, c.currency)}
              </div>
            ))}
          </div>
        )}

        {multiCurrency && !fxRates && (
          <div className="mt-2 text-xs text-[var(--fg-muted)]">
            Live FX rates couldn&apos;t load — showing each currency separately.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <Stat label="Distance" value={formatDistance(cost.totalDistanceKm)} />
        <Stat label="Duration" value={formatDuration(cost.totalDurationMin)} />
        <Stat
          label={cost.unitsLabel === "kWh" ? "Energy" : "Fuel"}
          value={`${formatNumber(cost.totalUnitsUsed)} ${cost.unitsLabel}`}
        />
      </div>

      {multiCountry && (
        <div className="rounded-lg border divider divide-y divider">
          {cost.byCountry.map((c) => (
            <div key={c.countryCode} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-[var(--fg-muted)]">
                <span className="text-[var(--fg)] font-medium mr-2">{c.countryCode}</span>
                {formatDistance(c.distanceKm)}
              </span>
              <span>
                {formatCurrency(c.cost, c.currency)}
                <span className="text-[var(--fg-muted)] text-xs ml-2">@ {formatNumber(c.unitPrice, 3)} {c.currency}/{cost.unitsLabel}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t divider text-xs text-[var(--fg-muted)] leading-relaxed">
        Using <span className="text-[var(--fg)]">{formatNumber(cost.consumption, 1)} {cost.consumptionUnit}</span>{" "}
        and country-average prices as of {cost.priceAsOf}. Prices and consumption are editable.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function uniqueDefined<T>(arr: Array<T | undefined>): T[] {
  const out: T[] = [];
  for (const v of arr) {
    if (v != null && !out.includes(v)) out.push(v);
  }
  return out;
}

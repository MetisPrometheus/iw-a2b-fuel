"use client";

import type { CostBreakdown } from "@/lib/types";
import { formatCurrency, formatDistance, formatDuration, formatNumber } from "@/lib/calc";

export default function ResultCard({ cost }: { cost: CostBreakdown }) {
  const multiCurrency = cost.byCurrency.length > 1;
  const multiCountry = cost.byCountry.length > 1;
  return (
    <div className="surface rounded-xl p-5 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Estimated cost</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {cost.byCurrency.map((c) => (
            <div key={c.currency} className="text-4xl font-semibold">
              {formatCurrency(c.total, c.currency)}
            </div>
          ))}
        </div>
        {multiCurrency && (
          <div className="mt-2 text-xs text-[var(--fg-muted)]">
            Trip crosses {cost.byCurrency.length} currencies — totals are kept separate (no exchange rate applied).
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

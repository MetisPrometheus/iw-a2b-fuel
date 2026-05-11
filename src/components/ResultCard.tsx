"use client";

import type { CostBreakdown } from "@/lib/types";
import { formatCurrency, formatDistance, formatDuration, formatNumber } from "@/lib/calc";

export default function ResultCard({ cost }: { cost: CostBreakdown }) {
  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">Estimated cost</div>
        <div className="text-4xl font-semibold mt-1">
          {formatCurrency(cost.totalCost, cost.currency)}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Distance" value={formatDistance(cost.totalDistanceKm)} />
        <Stat label="Duration" value={formatDuration(cost.totalDurationMin)} />
        <Stat
          label={cost.unitsLabel === "kWh" ? "Energy" : "Fuel"}
          value={`${formatNumber(cost.unitsUsed)} ${cost.unitsLabel}`}
        />
        <Stat
          label="Unit price"
          value={`${formatNumber(cost.unitPrice, 3)} ${cost.currency}/${cost.unitsLabel}`}
        />
      </div>
      <div className="pt-2 border-t border-[var(--border)] text-xs text-[var(--fg-muted)] leading-relaxed">
        Using <span className="text-[var(--fg)]">{formatNumber(cost.consumption, 1)} {cost.consumptionUnit}</span>{" "}
        and country average for{" "}
        <span className="text-[var(--fg)]">{cost.priceCountry}</span> as of {cost.priceAsOf}. Prices and consumption are editable.
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

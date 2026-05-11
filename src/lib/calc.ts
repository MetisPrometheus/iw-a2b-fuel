import type { CostBreakdown, CurrencyTotal, FuelType, LegCost, PriceInfo, RouteResult, Stop } from "./types";
import { unitPriceFor, unitsLabel } from "./prices";

export function computeCost(
  route: RouteResult,
  vehicle: { fuelType: FuelType; consumption: number },
  stops: Stop[],
  pricesByCountry: Record<string, PriceInfo>,
  unitPriceOverrideByCountry: Record<string, number> = {},
): CostBreakdown {
  const legs: LegCost[] = route.legs.map((leg, i) => {
    const startStop = stops[i];
    const cc = startStop?.countryCode ?? "??";
    const prices = pricesByCountry[cc];
    const fallbackPrice = Object.values(pricesByCountry)[0];
    const effectivePrices = prices ?? fallbackPrice;
    const override = unitPriceOverrideByCountry[cc];
    const baseUnitPrice = effectivePrices ? unitPriceFor(effectivePrices, vehicle.fuelType) : 0;
    const unitPrice = override && override > 0 ? override : baseUnitPrice;
    const unitsUsed = (leg.distanceKm * vehicle.consumption) / 100;
    return {
      legIndex: i,
      countryCode: cc,
      currency: effectivePrices?.currency ?? "USD",
      distanceKm: leg.distanceKm,
      durationMin: leg.durationMin,
      unitsUsed,
      unitPrice,
      cost: unitsUsed * unitPrice,
    };
  });

  const byCurrencyMap = new Map<string, CurrencyTotal>();
  for (const leg of legs) {
    const entry = byCurrencyMap.get(leg.currency) ?? {
      currency: leg.currency,
      total: 0,
      distanceKm: 0,
      countries: [],
    };
    entry.total += leg.cost;
    entry.distanceKm += leg.distanceKm;
    if (!entry.countries.includes(leg.countryCode)) entry.countries.push(leg.countryCode);
    byCurrencyMap.set(leg.currency, entry);
  }

  const totalUnitsUsed = legs.reduce((s, l) => s + l.unitsUsed, 0);
  const priceAsOf = Object.values(pricesByCountry)[0]?.asOf ?? "";

  return {
    totalDistanceKm: route.totalDistanceKm,
    totalDurationMin: route.totalDurationMin,
    consumption: vehicle.consumption,
    consumptionUnit: vehicle.fuelType === "electric" ? "kWh/100km" : "L/100km",
    totalUnitsUsed,
    unitsLabel: unitsLabel(vehicle.fuelType),
    legs,
    byCurrency: Array.from(byCurrencyMap.values()),
    priceAsOf,
  };
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatNumber(n: number, digits = 2): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
}

export function fuelEmoji(t: FuelType): string {
  if (t === "electric") return "⚡";
  if (t === "diesel") return "🛢️";
  if (t === "hybrid") return "🍃";
  return "⛽";
}

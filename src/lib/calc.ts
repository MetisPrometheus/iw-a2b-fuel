import type {
  CostBreakdown,
  CountryCost,
  CountryShare,
  CurrencyTotal,
  FuelType,
  PriceInfo,
  RouteResult,
} from "./types";
import { unitPriceFor, unitsLabel } from "./prices";

export function computeCost(
  route: RouteResult,
  vehicle: { fuelType: FuelType; consumption: number },
  pricesByCountry: Record<string, PriceInfo>,
  unitPriceOverrideByCountry: Record<string, number> = {},
  fallbackCountryCode?: string,
): CostBreakdown {
  const shares: CountryShare[] =
    route.countryShares && route.countryShares.length > 0
      ? route.countryShares
      : [{ countryCode: fallbackCountryCode ?? "??", distanceKm: route.totalDistanceKm }];

  const byCountry: CountryCost[] = shares.map((share) => {
    const prices = pricesByCountry[share.countryCode] ?? Object.values(pricesByCountry)[0];
    const override = unitPriceOverrideByCountry[share.countryCode];
    const baseUnitPrice = prices ? unitPriceFor(prices, vehicle.fuelType) : 0;
    const unitPrice = override && override > 0 ? override : baseUnitPrice;
    const unitsUsed = (share.distanceKm * vehicle.consumption) / 100;
    return {
      countryCode: share.countryCode,
      currency: prices?.currency ?? "USD",
      distanceKm: share.distanceKm,
      unitsUsed,
      unitPrice,
      cost: unitsUsed * unitPrice,
    };
  });

  const byCurrencyMap = new Map<string, CurrencyTotal>();
  for (const c of byCountry) {
    const entry = byCurrencyMap.get(c.currency) ?? {
      currency: c.currency,
      total: 0,
      distanceKm: 0,
      countries: [],
    };
    entry.total += c.cost;
    entry.distanceKm += c.distanceKm;
    if (!entry.countries.includes(c.countryCode)) entry.countries.push(c.countryCode);
    byCurrencyMap.set(c.currency, entry);
  }

  const priceAsOf = Object.values(pricesByCountry)[0]?.asOf ?? "";

  return {
    totalDistanceKm: route.totalDistanceKm,
    totalDurationMin: route.totalDurationMin,
    consumption: vehicle.consumption,
    consumptionUnit: vehicle.fuelType === "electric" ? "kWh/100km" : "L/100km",
    totalUnitsUsed: byCountry.reduce((s, c) => s + c.unitsUsed, 0),
    unitsLabel: unitsLabel(vehicle.fuelType),
    byCountry,
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

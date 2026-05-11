import type { CostBreakdown, FuelType, PriceInfo, RouteResult, Vehicle } from "./types";
import { unitPriceFor, unitsLabel } from "./prices";

export function computeCost(
  route: RouteResult,
  vehicle: { fuelType: FuelType; consumption: number },
  prices: PriceInfo,
  unitPriceOverride?: number,
): CostBreakdown {
  const unitPrice = unitPriceOverride ?? unitPriceFor(prices, vehicle.fuelType);
  const unitsUsed = (route.totalDistanceKm * vehicle.consumption) / 100;
  const totalCost = unitsUsed * unitPrice;
  return {
    totalDistanceKm: route.totalDistanceKm,
    totalDurationMin: route.totalDurationMin,
    consumption: vehicle.consumption,
    consumptionUnit: vehicle.fuelType === "electric" ? "kWh/100km" : "L/100km",
    unitsUsed,
    unitsLabel: unitsLabel(vehicle.fuelType),
    unitPrice,
    totalCost,
    currency: prices.currency,
    priceCountry: prices.countryCode,
    priceSource: prices.source,
    priceAsOf: prices.asOf,
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

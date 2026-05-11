import type { FuelType, PriceInfo } from "./types";

type PriceEntry = {
  currency: string;
  petrol?: number;
  diesel?: number;
  electricity?: number;
};

const PRICES: Record<string, PriceEntry> = {
  NO: { currency: "NOK", petrol: 22.5, diesel: 20.9, electricity: 1.4 },
  SE: { currency: "SEK", petrol: 18.1, diesel: 19.2, electricity: 1.6 },
  DK: { currency: "DKK", petrol: 14.5, diesel: 13.4, electricity: 2.5 },
  FI: { currency: "EUR", petrol: 1.92, diesel: 1.74, electricity: 0.16 },
  IS: { currency: "ISK", petrol: 322, diesel: 320, electricity: 19.5 },
  DE: { currency: "EUR", petrol: 1.78, diesel: 1.66, electricity: 0.37 },
  FR: { currency: "EUR", petrol: 1.84, diesel: 1.72, electricity: 0.27 },
  NL: { currency: "EUR", petrol: 2.12, diesel: 1.73, electricity: 0.34 },
  BE: { currency: "EUR", petrol: 1.79, diesel: 1.78, electricity: 0.42 },
  ES: { currency: "EUR", petrol: 1.58, diesel: 1.49, electricity: 0.18 },
  IT: { currency: "EUR", petrol: 1.84, diesel: 1.72, electricity: 0.31 },
  PT: { currency: "EUR", petrol: 1.78, diesel: 1.64, electricity: 0.23 },
  AT: { currency: "EUR", petrol: 1.62, diesel: 1.54, electricity: 0.28 },
  CH: { currency: "CHF", petrol: 1.83, diesel: 1.92, electricity: 0.27 },
  PL: { currency: "PLN", petrol: 6.4, diesel: 6.6, electricity: 0.78 },
  CZ: { currency: "CZK", petrol: 38.5, diesel: 38.0, electricity: 6.5 },
  GB: { currency: "GBP", petrol: 1.41, diesel: 1.48, electricity: 0.28 },
  IE: { currency: "EUR", petrol: 1.78, diesel: 1.74, electricity: 0.33 },
  US: { currency: "USD", petrol: 0.85, diesel: 1.0, electricity: 0.17 },
  CA: { currency: "CAD", petrol: 1.55, diesel: 1.62, electricity: 0.13 },
  MX: { currency: "MXN", petrol: 23.6, diesel: 25.7, electricity: 1.8 },
  JP: { currency: "JPY", petrol: 175, diesel: 154, electricity: 31 },
  KR: { currency: "KRW", petrol: 1660, diesel: 1500, electricity: 165 },
  CN: { currency: "CNY", petrol: 7.9, diesel: 7.5, electricity: 0.6 },
  IN: { currency: "INR", petrol: 105, diesel: 92, electricity: 8.5 },
  AU: { currency: "AUD", petrol: 1.92, diesel: 1.96, electricity: 0.33 },
  NZ: { currency: "NZD", petrol: 2.55, diesel: 1.92, electricity: 0.33 },
  BR: { currency: "BRL", petrol: 6.05, diesel: 6.2, electricity: 0.78 },
  ZA: { currency: "ZAR", petrol: 22.3, diesel: 21.5, electricity: 2.6 },
  AE: { currency: "AED", petrol: 3.0, diesel: 3.5, electricity: 0.3 },
  TR: { currency: "TRY", petrol: 48, diesel: 49, electricity: 2.7 },
};

const FALLBACK: PriceEntry = { currency: "USD", petrol: 1.3, diesel: 1.35, electricity: 0.2 };

const SNAPSHOT_DATE = "2026-04";
const SOURCE = "A2B Fuel baseline snapshot (2026-04). Override anytime — these are country averages.";

export function getPrices(countryCode: string | undefined): PriceInfo {
  const cc = (countryCode || "").toUpperCase();
  const entry = PRICES[cc] ?? FALLBACK;
  return {
    countryCode: PRICES[cc] ? cc : "??",
    currency: entry.currency,
    petrolPerLitre: entry.petrol,
    dieselPerLitre: entry.diesel,
    electricityPerKwh: entry.electricity,
    asOf: SNAPSHOT_DATE,
    source: SOURCE,
  };
}

export function unitPriceFor(prices: PriceInfo, fuelType: FuelType): number {
  switch (fuelType) {
    case "petrol":
    case "hybrid":
      return prices.petrolPerLitre ?? 0;
    case "diesel":
      return prices.dieselPerLitre ?? 0;
    case "electric":
      return prices.electricityPerKwh ?? 0;
  }
}

export function unitsLabel(fuelType: FuelType): "L" | "kWh" {
  return fuelType === "electric" ? "kWh" : "L";
}

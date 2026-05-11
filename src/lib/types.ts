export type FuelType = "petrol" | "diesel" | "electric" | "hybrid";

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd?: number;
  fuelType: FuelType;
  consumption: number;
};

export type Stop = {
  id: string;
  label: string;
  lng: number;
  lat: number;
  countryCode?: string;
};

export type RouteLeg = {
  distanceKm: number;
  durationMin: number;
};

export type CountryShare = {
  countryCode: string;
  distanceKm: number;
};

export type RouteResult = {
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDurationMin: number;
  geometry: GeoJSON.LineString;
  countryShares: CountryShare[];
};

export type PriceInfo = {
  countryCode: string;
  currency: string;
  petrolPerLitre?: number;
  dieselPerLitre?: number;
  electricityPerKwh?: number;
  asOf: string;
  source: string;
};

export type CountryCost = {
  countryCode: string;
  currency: string;
  distanceKm: number;
  unitsUsed: number;
  unitPrice: number;
  cost: number;
};

export type CurrencyTotal = {
  currency: string;
  total: number;
  distanceKm: number;
  countries: string[];
};

export type CostBreakdown = {
  totalDistanceKm: number;
  totalDurationMin: number;
  consumption: number;
  consumptionUnit: "L/100km" | "kWh/100km";
  totalUnitsUsed: number;
  unitsLabel: "L" | "kWh";
  byCountry: CountryCost[];
  byCurrency: CurrencyTotal[];
  priceAsOf: string;
};

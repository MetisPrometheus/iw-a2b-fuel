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

export type RouteResult = {
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDurationMin: number;
  geometry: GeoJSON.LineString;
  originCountry?: string;
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

export type CostBreakdown = {
  totalDistanceKm: number;
  totalDurationMin: number;
  consumption: number;
  consumptionUnit: "L/100km" | "kWh/100km";
  unitsUsed: number;
  unitsLabel: "L" | "kWh";
  unitPrice: number;
  totalCost: number;
  currency: string;
  priceCountry: string;
  priceSource: string;
  priceAsOf: string;
};

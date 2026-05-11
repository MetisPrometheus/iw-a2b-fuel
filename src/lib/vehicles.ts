import type { Vehicle } from "./types";

export const VEHICLES: Vehicle[] = [
  { id: "vw-golf-8-tsi", make: "Volkswagen", model: "Golf 8 1.5 TSI", yearStart: 2020, fuelType: "petrol", consumption: 6.2 },
  { id: "vw-golf-8-tdi", make: "Volkswagen", model: "Golf 8 2.0 TDI", yearStart: 2020, fuelType: "diesel", consumption: 4.5 },
  { id: "vw-passat-tdi", make: "Volkswagen", model: "Passat 2.0 TDI", yearStart: 2014, fuelType: "diesel", consumption: 5.2 },
  { id: "vw-id4", make: "Volkswagen", model: "ID.4", yearStart: 2021, fuelType: "electric", consumption: 17.5 },
  { id: "tesla-m3", make: "Tesla", model: "Model 3 Long Range", yearStart: 2019, fuelType: "electric", consumption: 15.0 },
  { id: "tesla-my", make: "Tesla", model: "Model Y Long Range", yearStart: 2020, fuelType: "electric", consumption: 16.5 },
  { id: "tesla-ms", make: "Tesla", model: "Model S", yearStart: 2017, fuelType: "electric", consumption: 18.5 },
  { id: "tesla-mx", make: "Tesla", model: "Model X", yearStart: 2017, fuelType: "electric", consumption: 21.0 },
  { id: "toyota-rav4-hybrid", make: "Toyota", model: "RAV4 Hybrid", yearStart: 2019, fuelType: "hybrid", consumption: 5.8 },
  { id: "toyota-corolla-hybrid", make: "Toyota", model: "Corolla Hybrid", yearStart: 2019, fuelType: "hybrid", consumption: 4.7 },
  { id: "toyota-yaris", make: "Toyota", model: "Yaris 1.5", yearStart: 2020, fuelType: "petrol", consumption: 5.5 },
  { id: "honda-civic", make: "Honda", model: "Civic 1.5T", yearStart: 2016, fuelType: "petrol", consumption: 6.7 },
  { id: "honda-cr-v-hybrid", make: "Honda", model: "CR-V Hybrid", yearStart: 2019, fuelType: "hybrid", consumption: 6.5 },
  { id: "ford-focus", make: "Ford", model: "Focus 1.0 EcoBoost", yearStart: 2018, fuelType: "petrol", consumption: 6.0 },
  { id: "ford-f150", make: "Ford", model: "F-150 (V6)", yearStart: 2018, fuelType: "petrol", consumption: 12.5 },
  { id: "ford-mach-e", make: "Ford", model: "Mustang Mach-E", yearStart: 2021, fuelType: "electric", consumption: 18.0 },
  { id: "bmw-3", make: "BMW", model: "320i", yearStart: 2019, fuelType: "petrol", consumption: 6.5 },
  { id: "bmw-3d", make: "BMW", model: "320d", yearStart: 2019, fuelType: "diesel", consumption: 4.9 },
  { id: "bmw-i4", make: "BMW", model: "i4 eDrive40", yearStart: 2022, fuelType: "electric", consumption: 17.0 },
  { id: "bmw-ix", make: "BMW", model: "iX xDrive40", yearStart: 2022, fuelType: "electric", consumption: 20.5 },
  { id: "mb-c220d", make: "Mercedes-Benz", model: "C 220 d", yearStart: 2018, fuelType: "diesel", consumption: 5.0 },
  { id: "mb-eqe", make: "Mercedes-Benz", model: "EQE 350", yearStart: 2022, fuelType: "electric", consumption: 18.5 },
  { id: "audi-a4-tdi", make: "Audi", model: "A4 2.0 TDI", yearStart: 2016, fuelType: "diesel", consumption: 5.0 },
  { id: "audi-q4-etron", make: "Audi", model: "Q4 e-tron", yearStart: 2021, fuelType: "electric", consumption: 18.0 },
  { id: "volvo-xc60-d", make: "Volvo", model: "XC60 B4 Diesel", yearStart: 2017, fuelType: "diesel", consumption: 5.7 },
  { id: "volvo-xc40-recharge", make: "Volvo", model: "XC40 Recharge", yearStart: 2020, fuelType: "electric", consumption: 19.5 },
  { id: "polestar-2", make: "Polestar", model: "2 Long Range", yearStart: 2020, fuelType: "electric", consumption: 17.5 },
  { id: "skoda-octavia-tdi", make: "Škoda", model: "Octavia 2.0 TDI", yearStart: 2016, fuelType: "diesel", consumption: 4.7 },
  { id: "skoda-enyaq", make: "Škoda", model: "Enyaq iV 80", yearStart: 2021, fuelType: "electric", consumption: 17.5 },
  { id: "hyundai-ioniq5", make: "Hyundai", model: "Ioniq 5", yearStart: 2021, fuelType: "electric", consumption: 17.5 },
  { id: "kia-ev6", make: "Kia", model: "EV6", yearStart: 2021, fuelType: "electric", consumption: 17.0 },
  { id: "nissan-leaf", make: "Nissan", model: "Leaf 40 kWh", yearStart: 2018, fuelType: "electric", consumption: 17.0 },
  { id: "mazda-cx5", make: "Mazda", model: "CX-5 2.5", yearStart: 2017, fuelType: "petrol", consumption: 7.5 },
  { id: "renault-zoe", make: "Renault", model: "Zoe ZE50", yearStart: 2019, fuelType: "electric", consumption: 16.5 },
  { id: "peugeot-208", make: "Peugeot", model: "208 PureTech", yearStart: 2019, fuelType: "petrol", consumption: 5.4 },
  { id: "porsche-taycan", make: "Porsche", model: "Taycan 4S", yearStart: 2020, fuelType: "electric", consumption: 22.0 },
];

export function searchVehicles(query: string, limit = 20): Vehicle[] {
  const q = query.trim().toLowerCase();
  if (!q) return VEHICLES.slice(0, limit);
  const tokens = q.split(/\s+/).filter(Boolean);
  return VEHICLES.filter((v) => {
    const hay = `${v.make} ${v.model} ${v.yearStart}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  }).slice(0, limit);
}

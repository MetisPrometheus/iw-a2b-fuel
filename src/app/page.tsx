"use client";

import { useEffect, useMemo, useState } from "react";
import AddressInput from "@/components/AddressInput";
import VehiclePicker from "@/components/VehiclePicker";
import RouteMap from "@/components/RouteMap";
import ResultCard from "@/components/ResultCard";
import type { CostBreakdown, FuelType, PriceInfo, RouteResult, Stop, Vehicle } from "@/lib/types";
import { computeCost, fuelEmoji, formatNumber } from "@/lib/calc";
import { unitPriceFor } from "@/lib/prices";

const PUBLIC_MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function makeStop(): Stop {
  return { id: crypto.randomUUID(), label: "", lng: 0, lat: 0 };
}

export default function Page() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [consumptionOverride, setConsumptionOverride] = useState<string>("");
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customFuel, setCustomFuel] = useState<FuelType>("petrol");
  const [customConsumption, setCustomConsumption] = useState("");

  const customVehicle: Vehicle | null = useMemo(() => {
    const c = parseFloat(customConsumption);
    if (!customMode || Number.isNaN(c) || c <= 0) return null;
    return {
      id: "custom",
      make: "Custom",
      model: customName.trim() || "Vehicle",
      yearStart: 0,
      fuelType: customFuel,
      consumption: c,
    };
  }, [customMode, customName, customFuel, customConsumption]);

  const activeVehicle = customMode ? customVehicle : vehicle;
  const [stops, setStops] = useState<Stop[]>([makeStop(), makeStop()]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [pricesByCountry, setPricesByCountry] = useState<Record<string, PriceInfo>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveConsumption = useMemo(() => {
    if (customMode) return activeVehicle?.consumption ?? 0;
    const override = parseFloat(consumptionOverride);
    if (!Number.isNaN(override) && override > 0) return override;
    return activeVehicle?.consumption ?? 0;
  }, [customMode, consumptionOverride, activeVehicle?.consumption]);

  const fuelType = activeVehicle?.fuelType ?? "petrol";
  const placedStops = stops.filter((s) => s.lng !== 0 || s.lat !== 0);

  const tripCountries = useMemo(() => {
    const out: string[] = [];
    for (const s of placedStops) {
      if (s.countryCode && !out.includes(s.countryCode)) out.push(s.countryCode);
    }
    return out;
  }, [placedStops.map((s) => s.countryCode).join(",")]);

  useEffect(() => {
    if (tripCountries.length === 0) return;
    let cancel = false;
    const missing = tripCountries.filter((cc) => !pricesByCountry[cc]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map((cc) => fetch(`/api/prices?country=${cc}`).then((r) => r.json()).then((p: PriceInfo) => [cc, p] as const)),
    )
      .then((entries) => {
        if (cancel) return;
        setPricesByCountry((prev) => {
          const next = { ...prev };
          for (const [cc, p] of entries) next[cc] = p;
          return next;
        });
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [tripCountries.join(","), pricesByCountry]);

  const overrideMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const [cc, raw] of Object.entries(priceOverrides)) {
      const n = parseFloat(raw);
      if (!Number.isNaN(n) && n > 0) m[cc] = n;
    }
    return m;
  }, [priceOverrides]);

  const cost: CostBreakdown | null = useMemo(() => {
    if (!route || !activeVehicle || effectiveConsumption <= 0) return null;
    if (tripCountries.length === 0) return null;
    if (tripCountries.some((cc) => !pricesByCountry[cc])) return null;
    return computeCost(
      route,
      { fuelType, consumption: effectiveConsumption },
      placedStops,
      pricesByCountry,
      overrideMap,
    );
  }, [route, activeVehicle, effectiveConsumption, fuelType, pricesByCountry, overrideMap, tripCountries, placedStops]);

  function addStop() {
    setStops((s) => [...s.slice(0, -1), makeStop(), s[s.length - 1]]);
  }
  function removeStop(id: string) {
    setStops((s) => (s.length <= 2 ? s : s.filter((x) => x.id !== id)));
  }
  function updateStop(id: string, value: Stop | null) {
    setStops((s) => s.map((x) => (x.id === id ? { ...(value ?? makeStop()), id } : x)));
  }
  function swap() {
    if (stops.length !== 2) return;
    setStops(([a, b]) => [
      { ...b, id: a.id },
      { ...a, id: b.id },
    ]);
  }

  async function calculate() {
    setError(null);
    const placed = stops.filter((s) => s.lng !== 0 || s.lat !== 0);
    if (placed.length < 2) {
      setError("Pick at least an origin and destination.");
      return;
    }
    if (!activeVehicle) {
      setError(customMode
        ? "Set fuel type and consumption for your custom vehicle."
        : "Pick a vehicle from the list, or switch to Custom.");
      return;
    }
    if (effectiveConsumption <= 0) {
      setError("Consumption must be greater than 0.");
      return;
    }
    setCalculating(true);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stops: placed.map(({ lng, lat }) => ({ lng, lat })) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      const data = (await res.json()) as RouteResult;
      setRoute(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCalculating(false);
    }
  }

  const proximity = placedStops[0]
    ? { lng: placedStops[0].lng, lat: placedStops[0].lat }
    : undefined;

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-white font-bold text-sm">A→B</div>
            <div>
              <div className="font-semibold tracking-tight">A2B Fuel</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">drive cost estimator</div>
            </div>
          </div>
          <a
            className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)]"
            href="https://github.com/MetisPrometheus/iw-a2b-fuel"
            target="_blank" rel="noreferrer"
          >GitHub →</a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-8 grid lg:grid-cols-5 gap-6">
        <section className="lg:col-span-2 space-y-5">
          <Card title="Vehicle" subtitle="What's drinking the fuel?">
            <div className="space-y-3">
              <div className="flex gap-1 rounded-lg bg-[var(--surface-2)] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${!customMode ? "bg-[var(--surface)] text-[var(--fg)]" : "text-[var(--fg-muted)]"}`}
                >From list</button>
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${customMode ? "bg-[var(--surface)] text-[var(--fg)]" : "text-[var(--fg-muted)]"}`}
                >Custom (anything)</button>
              </div>

              {!customMode && (
                <>
                  <VehiclePicker vehicle={vehicle} onChange={(v) => { setVehicle(v); setConsumptionOverride(""); }} />
                  {vehicle && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-[var(--fg-muted)]">{fuelEmoji(vehicle.fuelType)} {vehicle.fuelType}</span>
                      <span className="text-[var(--fg-muted)]">•</span>
                      <label className="text-[var(--fg-muted)]">Consumption</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        className="no-spin w-20 rounded-md px-2 py-1 text-sm"
                        placeholder={String(vehicle.consumption)}
                        value={consumptionOverride}
                        onChange={(e) => setConsumptionOverride(e.target.value)}
                      />
                      <span className="text-[var(--fg-muted)] text-xs">
                        {vehicle.fuelType === "electric" ? "kWh/100km" : "L/100km"}
                      </span>
                    </div>
                  )}
                  {!vehicle && (
                    <p className="text-xs text-[var(--fg-muted)]">
                      Can&apos;t find it? Switch to <button type="button" onClick={() => setCustomMode(true)} className="underline hover:text-[var(--fg)]">Custom</button> — works for motorcycles, RVs, anything.
                    </p>
                  )}
                </>
              )}

              {customMode && (
                <div className="space-y-2.5">
                  <input
                    type="text"
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    placeholder="Vehicle name (e.g. Ninja 300, Camper Van)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-1">Fuel type</label>
                      <select
                        className="w-full rounded-lg px-3 py-2.5 text-sm"
                        value={customFuel}
                        onChange={(e) => setCustomFuel(e.target.value as FuelType)}
                      >
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="electric">Electric</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-1">
                        Consumption ({customFuel === "electric" ? "kWh" : "L"}/100km)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        className="no-spin w-full rounded-lg px-3 py-2.5 text-sm"
                        placeholder={customFuel === "electric" ? "17.5" : customFuel === "diesel" ? "5.0" : "6.0"}
                        value={customConsumption}
                        onChange={(e) => setCustomConsumption(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)]">
                    {fuelEmoji(customFuel)} Typical: motorbike 3–6 L/100km · small car 5–7 · SUV 8–11 · EV 15–22 kWh/100km
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Route" subtitle="Where are you driving?">
            <div className="space-y-2">
              {stops.map((s, i) => {
                const isFirst = i === 0;
                const isLast = i === stops.length - 1;
                const label = isFirst ? "From" : isLast ? "To" : `Stop ${i}`;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="w-10 shrink-0 text-[10px] uppercase tracking-widest text-[var(--fg-muted)]">{label}</div>
                    <div className="flex-1">
                      <AddressInput
                        placeholder={isFirst ? "Origin" : isLast ? "Destination" : "Stop"}
                        value={s.lng || s.lat ? s : null}
                        onChange={(v) => updateStop(s.id, v)}
                        proximity={proximity}
                      />
                    </div>
                    {!isFirst && !isLast && (
                      <button
                        type="button"
                        onClick={() => removeStop(s.id)}
                        className="text-xs px-2 py-1 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]"
                        aria-label="Remove stop"
                      >−</button>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={addStop}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-2)]"
                >+ Add stop</button>
                <button
                  type="button"
                  onClick={swap}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                  disabled={stops.length !== 2}
                >↕ Swap</button>
              </div>
            </div>
          </Card>

          {activeVehicle && tripCountries.length > 0 && (
            <Card
              title="Prices"
              subtitle={
                tripCountries.length === 1
                  ? `Country average for ${tripCountries[0]} — editable`
                  : `Cross-country trip — one price per country, all editable`
              }
            >
              <div className="space-y-2">
                {tripCountries.map((cc) => {
                  const p = pricesByCountry[cc];
                  if (!p) {
                    return (
                      <div key={cc} className="text-xs text-[var(--fg-muted)]">Loading {cc}…</div>
                    );
                  }
                  const base = unitPriceFor(p, fuelType);
                  const unit = fuelType === "electric" ? "kWh" : "L";
                  const label = fuelType === "electric" ? "Electricity" : fuelType === "diesel" ? "Diesel" : "Petrol";
                  return (
                    <div key={cc} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] w-8">{cc}</span>
                        <span className="text-[var(--fg-muted)] text-xs">{label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="no-spin w-24 rounded-md px-2 py-1 text-sm text-right"
                          placeholder={formatNumber(base, 3)}
                          value={priceOverrides[cc] ?? ""}
                          onChange={(e) =>
                            setPriceOverrides((prev) => ({ ...prev, [cc]: e.target.value }))
                          }
                        />
                        <span className="text-[var(--fg-muted)] text-xs w-14">{p.currency}/{unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <button
            type="button"
            onClick={calculate}
            disabled={calculating}
            className="btn-primary w-full rounded-lg py-3 font-medium text-sm tracking-wide shadow-lg hover:shadow-xl transition-shadow"
          >
            {calculating ? "Calculating…" : "Calculate drive cost"}
          </button>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </section>

        <section className="lg:col-span-3 space-y-5">
          <div className="aspect-[16/9] lg:aspect-auto lg:h-72">
            <RouteMap stops={stops} geometry={route?.geometry} mapboxToken={PUBLIC_MAPBOX_TOKEN} />
          </div>
          {cost ? (
            <ResultCard cost={cost} />
          ) : (
            <div className="surface rounded-xl p-5 text-sm text-[var(--fg-muted)]">
              Pick a vehicle, your route, and hit calculate. We&apos;ll estimate using country-average fuel prices — you can override anything.
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-[var(--border)] mt-auto">
        <div className="max-w-6xl mx-auto px-5 py-4 text-xs text-[var(--fg-muted)] flex items-center justify-between">
          <span>Estimates only. Tolls not included.</span>
          <span>Routing by Mapbox</span>
        </div>
      </footer>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="surface rounded-xl p-4">
      <div className="mb-3">
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-xs text-[var(--fg-muted)] mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

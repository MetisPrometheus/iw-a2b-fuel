"use client";

import { useEffect, useMemo, useState } from "react";
import AddressInput from "@/components/AddressInput";
import VehiclePicker from "@/components/VehiclePicker";
import RouteMap from "@/components/RouteMap";
import ResultCard from "@/components/ResultCard";
import type { CostBreakdown, FxRates, PriceInfo, RouteResult, Stop, Vehicle } from "@/lib/types";
import { computeCost, fuelEmoji, formatNumber } from "@/lib/calc";
import { unitPriceFor } from "@/lib/prices";

const PUBLIC_MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function makeStop(): Stop {
  return { id: crypto.randomUUID(), label: "", lng: 0, lat: 0 };
}

export default function Page() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [consumptionOverride, setConsumptionOverride] = useState<string>("");
  const [stops, setStops] = useState<Stop[]>([makeStop(), makeStop()]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [pricesByCountry, setPricesByCountry] = useState<Record<string, PriceInfo>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [fxRates, setFxRates] = useState<FxRates | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveConsumption = useMemo(() => {
    const override = parseFloat(consumptionOverride);
    if (!Number.isNaN(override) && override > 0) return override;
    return vehicle?.consumption ?? 0;
  }, [consumptionOverride, vehicle?.consumption]);

  useEffect(() => {
    let cancel = false;
    fetch("/api/fx")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancel && d?.rates) setFxRates(d);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  const fuelType = vehicle?.fuelType ?? "petrol";
  const placedStops = stops.filter((s) => s.lng !== 0 || s.lat !== 0);

  const stopCountries = useMemo(() => {
    const out: string[] = [];
    for (const s of placedStops) {
      if (s.countryCode && !out.includes(s.countryCode)) out.push(s.countryCode);
    }
    return out;
  }, [placedStops.map((s) => s.countryCode).join(",")]);

  const transitCountries = useMemo(() => {
    if (!route?.countryShares?.length) return [];
    return route.countryShares.map((c) => c.countryCode);
  }, [route]);

  const allCountries = useMemo(() => {
    const set = new Set<string>([...stopCountries, ...transitCountries]);
    return Array.from(set);
  }, [stopCountries, transitCountries]);

  useEffect(() => {
    if (allCountries.length === 0) return;
    const missing = allCountries.filter((cc) => !pricesByCountry[cc]);
    if (missing.length === 0) return;
    let cancel = false;
    Promise.all(
      missing.map((cc) =>
        fetch(`/api/prices?country=${cc}`).then((r) => r.json()).then((p: PriceInfo) => [cc, p] as const),
      ),
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
  }, [allCountries.join(","), pricesByCountry]);

  const overrideMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const [cc, raw] of Object.entries(priceOverrides)) {
      const n = parseFloat(raw);
      if (!Number.isNaN(n) && n > 0) m[cc] = n;
    }
    return m;
  }, [priceOverrides]);

  const cost: CostBreakdown | null = useMemo(() => {
    if (!route || !vehicle || effectiveConsumption <= 0) return null;
    if (allCountries.length === 0) return null;
    if (allCountries.some((cc) => !pricesByCountry[cc])) return null;
    return computeCost(
      route,
      { fuelType, consumption: effectiveConsumption },
      pricesByCountry,
      overrideMap,
      stopCountries[0],
    );
  }, [route, vehicle, effectiveConsumption, fuelType, pricesByCountry, overrideMap, allCountries, stopCountries]);

  const priceCardCountries = transitCountries.length > 0 ? transitCountries : stopCountries;

  const firstCurrency = stopCountries[0] ? pricesByCountry[stopCountries[0]]?.currency : undefined;
  const lastCurrency = stopCountries.length > 1
    ? pricesByCountry[stopCountries[stopCountries.length - 1]]?.currency
    : undefined;

  function addStop() {
    setStops((s) => [...s.slice(0, -1), makeStop(), s[s.length - 1]]);
  }
  function removeStop(id: string) {
    setStops((s) => (s.length <= 2 ? s : s.filter((x) => x.id !== id)));
  }
  function updateStop(id: string, value: Stop | null) {
    setStops((s) => s.map((x) => (x.id === id ? { ...(value ?? makeStop()), id } : x)));
    setRoute(null);
  }
  function swap() {
    if (stops.length !== 2) return;
    setStops(([a, b]) => [{ ...b, id: a.id }, { ...a, id: b.id }]);
    setRoute(null);
  }

  async function calculate() {
    setError(null);
    const placed = stops.filter((s) => s.lng !== 0 || s.lat !== 0);
    if (placed.length < 2) {
      setError("Pick at least an origin and destination.");
      return;
    }
    if (!vehicle) {
      setError("Pick a vehicle from the list.");
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

  const proximity = placedStops[0] ? { lng: placedStops[0].lng, lat: placedStops[0].lat } : undefined;

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b divider">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)] text-[#fff8f3] flex items-center justify-center font-bold text-sm shadow-sm">A→B</div>
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
          <Card title="Vehicle" subtitle="Pick one from the list — edit the consumption if you know your real-world figure.">
            <div className="space-y-3">
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
                  Can&apos;t find yours? Pick a similar model — you can adjust the consumption number after.
                </p>
              )}
            </div>
          </Card>

          <Card title="Route" subtitle="Origin, destination, plus any stops in between.">
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
                  className="text-xs px-2.5 py-1.5 rounded-md border divider hover:bg-[var(--surface-2)]"
                >+ Add stop</button>
                <button
                  type="button"
                  onClick={swap}
                  className="text-xs px-2.5 py-1.5 rounded-md border divider hover:bg-[var(--surface-2)] disabled:opacity-40"
                  disabled={stops.length !== 2}
                >↕ Swap</button>
              </div>
            </div>
          </Card>

          {vehicle && priceCardCountries.length > 0 && (
            <Card
              title="Prices"
              subtitle={
                priceCardCountries.length === 1
                  ? `Country average for ${priceCardCountries[0]} — editable`
                  : transitCountries.length > 0
                    ? `Crossing ${priceCardCountries.length} countries — one price per country, all editable`
                    : `${priceCardCountries.length} countries — full list after you calculate`
              }
            >
              <div className="space-y-2">
                {priceCardCountries.map((cc) => {
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
            className="btn-primary w-full rounded-lg py-3 font-medium text-sm tracking-wide shadow-md hover:shadow-lg transition-shadow"
          >
            {calculating ? "Calculating…" : "Calculate drive cost"}
          </button>

          {error && (
            <div className="text-sm text-[#9a3b30] bg-[#fbe6e2] border border-[#e9bdb5] rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </section>

        <section className="lg:col-span-3 space-y-5">
          <div className="aspect-[900/520]">
            <RouteMap stops={stops} geometry={route?.geometry} mapboxToken={PUBLIC_MAPBOX_TOKEN} />
          </div>
          {cost ? (
            <ResultCard
              cost={cost}
              fxRates={fxRates}
              firstCurrency={firstCurrency}
              lastCurrency={lastCurrency}
            />
          ) : (
            <div className="surface rounded-xl p-5 text-sm text-[var(--fg-muted)]">
              Pick a vehicle, your route, and hit calculate. We&apos;ll estimate using country-average fuel prices — you can override anything.
            </div>
          )}
        </section>
      </main>

      <footer className="border-t divider mt-auto">
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchVehicles } from "@/lib/vehicles";
import type { Vehicle } from "@/lib/types";

type Props = {
  vehicle: Vehicle | null;
  onChange: (v: Vehicle | null) => void;
};

export default function VehiclePicker({ vehicle, onChange }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const results = useMemo(() => searchVehicles(text, 30), [text]);
  const display = vehicle ? `${vehicle.make} ${vehicle.model}` : text;

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        className="w-full rounded-lg px-3 py-2.5 text-sm"
        placeholder="Search make or model…"
        value={display}
        onChange={(e) => {
          if (vehicle) onChange(null);
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg dropdown-panel overflow-hidden max-h-72 overflow-y-auto">
          {results.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                onChange(v);
                setText("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] flex items-center justify-between gap-2"
            >
              <span className="truncate">
                <span className="text-[var(--fg-muted)]">{v.make}</span> {v.model}
              </span>
              <span className="text-xs text-[var(--fg-muted)] shrink-0">
                {v.fuelType === "electric" ? `${v.consumption} kWh/100km` : `${v.consumption} L/100km`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

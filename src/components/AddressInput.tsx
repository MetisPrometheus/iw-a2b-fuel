"use client";

import { useEffect, useRef, useState } from "react";
import type { Stop } from "@/lib/types";

type Suggestion = {
  id: string;
  label: string;
  lng: number;
  lat: number;
  countryCode?: string;
};

type Props = {
  placeholder: string;
  value: Stop | null;
  onChange: (s: Stop | null) => void;
  proximity?: { lng: number; lat: number };
};

export default function AddressInput({ placeholder, value, onChange, proximity }: Props) {
  const [text, setText] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setText(value?.label ?? "");
  }, [value?.id]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!text || text === value?.label) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: text });
        if (proximity) params.set("proximity", `${proximity.lng},${proximity.lat}`);
        const res = await fetch(`/api/geocode?${params.toString()}`, { signal: ac.signal });
        if (!res.ok) throw new Error("geocode failed");
        const data = await res.json();
        setSuggestions(data.features ?? []);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [text, value?.label, proximity?.lng, proximity?.lat]);

  function pick(s: Suggestion) {
    onChange({ id: s.id, label: s.label, lng: s.lng, lat: s.lat, countryCode: s.countryCode });
    setText(s.label);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setText("");
    setSuggestions([]);
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="w-full rounded-lg px-3 py-2.5 text-sm"
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          autoComplete="off"
        />
        {(text || value) && (
          <button
            type="button"
            onClick={clear}
            className="text-xs px-2 py-1 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]"
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>
      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg dropdown-panel overflow-hidden">
          {loading && <div className="px-3 py-2 text-xs text-[var(--fg-muted)]">Searching…</div>}
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] flex items-center justify-between gap-2"
            >
              <span className="truncate">{s.label}</span>
              {s.countryCode && <span className="text-xs text-[var(--fg-muted)] shrink-0">{s.countryCode}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

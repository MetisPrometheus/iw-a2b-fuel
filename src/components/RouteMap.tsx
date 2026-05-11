"use client";

import type { Stop } from "@/lib/types";

type Props = {
  stops: Stop[];
  geometry?: GeoJSON.LineString;
  mapboxToken?: string;
};

function encodeGeometry(geom: GeoJSON.LineString): string {
  const path = `path-4+7c5cff-0.85(${encodeURIComponent(JSON.stringify(geom))})`;
  return path;
}

export default function RouteMap({ stops, geometry, mapboxToken }: Props) {
  if (!mapboxToken) {
    return (
      <div className="surface rounded-xl h-full min-h-72 flex items-center justify-center text-center p-6">
        <p className="text-sm text-[var(--fg-muted)]">
          Add <code className="text-[var(--fg)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to show map previews.
        </p>
      </div>
    );
  }

  const placed = stops.filter((s) => s.lng && s.lat);
  if (placed.length === 0 && !geometry) {
    return (
      <div className="surface rounded-xl h-full min-h-72 flex items-center justify-center text-center p-6">
        <p className="text-sm text-[var(--fg-muted)]">Map preview will appear once you pick a route.</p>
      </div>
    );
  }

  const overlays: string[] = [];
  if (geometry) overlays.push(encodeGeometry(geometry));
  placed.forEach((s, i) => {
    const marker = i === 0 ? "pin-l-a+22d3ee" : i === placed.length - 1 ? "pin-l-b+7c5cff" : `pin-s-${i + 1}+8a8a93`;
    overlays.push(`${marker}(${s.lng},${s.lat})`);
  });

  const auto = "auto";
  const url = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${overlays.join(",")}/${auto}/900x520@2x?access_token=${mapboxToken}&padding=60`;

  return (
    <div className="surface rounded-xl overflow-hidden h-full min-h-72">
      <img src={url} alt="Route preview" className="w-full h-full object-cover" />
    </div>
  );
}

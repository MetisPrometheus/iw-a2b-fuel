"use client";

import { encodePolyline, downsampleCoords } from "@/lib/polyline";
import type { Stop } from "@/lib/types";

type Props = {
  stops: Stop[];
  geometry?: GeoJSON.LineString;
  mapboxToken?: string;
};

const PATH_COLOR = "c97064";
const ORIGIN_PIN = "pin-l-a+6b8e7a";
const DEST_PIN = "pin-l-b+c97064";
const MID_PIN_PREFIX = "pin-s";

export default function RouteMap({ stops, geometry, mapboxToken }: Props) {
  if (!mapboxToken) {
    return (
      <div className="surface rounded-xl h-full min-h-72 flex items-center justify-center text-center p-6">
        <p className="text-sm text-[var(--fg-muted)]">
          Add <code className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to show map previews.
        </p>
      </div>
    );
  }

  const placed = stops.filter((s) => s.lng !== 0 || s.lat !== 0);
  if (placed.length === 0 && !geometry) {
    return (
      <div className="surface rounded-xl h-full min-h-72 flex items-center justify-center text-center p-6">
        <p className="text-sm text-[var(--fg-muted)]">Map preview appears once you pick a route.</p>
      </div>
    );
  }

  const overlays: string[] = [];
  if (geometry) {
    const coords = downsampleCoords(geometry.coordinates as Array<[number, number]>, 180);
    const encoded = encodePolyline(coords);
    overlays.push(`path-5+${PATH_COLOR}-0.9(${encodeURIComponent(encoded)})`);
  }
  placed.forEach((s, i) => {
    let marker: string;
    if (i === 0) marker = `${ORIGIN_PIN}(${s.lng},${s.lat})`;
    else if (i === placed.length - 1) marker = `${DEST_PIN}(${s.lng},${s.lat})`;
    else marker = `${MID_PIN_PREFIX}-${i + 1}+7a6f5e(${s.lng},${s.lat})`;
    overlays.push(marker);
  });

  const url = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${overlays.join(",")}/auto/900x520@2x?access_token=${mapboxToken}&padding=60`;

  return (
    <div className="surface rounded-xl overflow-hidden h-full min-h-72">
      <img src={url} alt="Route preview" className="w-full h-full object-cover" />
    </div>
  );
}

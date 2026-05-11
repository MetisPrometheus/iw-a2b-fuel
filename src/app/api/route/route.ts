import { NextResponse } from "next/server";

export const runtime = "edge";

type Body = {
  stops: Array<{ lng: number; lat: number }>;
};

const SAMPLE_TARGET = 16;

function sampleEvenly<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = (arr.length - 1) / (n - 1);
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

async function reverseCountry(lng: number, lat: number, token: string): Promise<string | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=country&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const cc = data.features?.[0]?.properties?.short_code as string | undefined;
    return cc ? cc.toUpperCase() : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Server missing MAPBOX_TOKEN. Add it in Vercel project settings." },
      { status: 500 },
    );
  }

  const body = (await req.json()) as Body;
  if (!body?.stops || body.stops.length < 2) {
    return NextResponse.json({ error: "Need at least 2 stops" }, { status: 400 });
  }
  if (body.stops.length > 25) {
    return NextResponse.json({ error: "Max 25 stops" }, { status: 400 });
  }

  const coords = body.stops.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Mapbox directions failed: ${text}` }, { status: res.status });
  }
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return NextResponse.json({ error: "No route found" }, { status: 404 });

  const legs = (route.legs ?? []).map((l: { distance: number; duration: number }) => ({
    distanceKm: l.distance / 1000,
    durationMin: l.duration / 60,
  }));

  const geometry: GeoJSON.LineString = route.geometry;
  const totalDistanceKm = route.distance / 1000;

  const samples = sampleEvenly(geometry.coordinates as Array<[number, number]>, SAMPLE_TARGET);
  const sampleCountries = await Promise.all(
    samples.map(([lng, lat]) => reverseCountry(lng, lat, token)),
  );

  const counts = new Map<string, number>();
  for (const cc of sampleCountries) {
    if (!cc) continue;
    counts.set(cc, (counts.get(cc) ?? 0) + 1);
  }
  const totalCounted = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const countryShares =
    totalCounted > 0
      ? Array.from(counts.entries())
          .map(([countryCode, n]) => ({
            countryCode,
            distanceKm: (n / totalCounted) * totalDistanceKm,
          }))
          .sort((a, b) => b.distanceKm - a.distanceKm)
      : [];

  return NextResponse.json({
    legs,
    totalDistanceKm,
    totalDurationMin: route.duration / 60,
    geometry,
    countryShares,
  });
}

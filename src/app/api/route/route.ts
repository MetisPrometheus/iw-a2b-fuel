import { NextResponse } from "next/server";

export const runtime = "edge";

type Body = {
  stops: Array<{ lng: number; lat: number }>;
};

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

  return NextResponse.json({
    legs,
    totalDistanceKm: route.distance / 1000,
    totalDurationMin: route.duration / 60,
    geometry: route.geometry,
  });
}

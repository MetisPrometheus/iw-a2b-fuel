import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const proximity = searchParams.get("proximity");
  if (!q) return NextResponse.json({ features: [] });

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Server missing MAPBOX_TOKEN. Add it in Vercel project settings." },
      { status: 500 },
    );
  }

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "5");
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("types", "place,locality,address,poi,postcode,region");
  if (proximity) url.searchParams.set("proximity", proximity);

  const res = await fetch(url.toString());
  if (!res.ok) {
    return NextResponse.json({ error: "Geocoding failed" }, { status: res.status });
  }
  const data = await res.json();
  const features = (data.features ?? []).map((f: { id: string; place_name: string; center: [number, number]; context?: Array<{ id: string; short_code?: string }> }) => {
    const countryCtx = f.context?.find((c) => c.id.startsWith("country."));
    const cc = countryCtx?.short_code?.toUpperCase();
    return {
      id: f.id,
      label: f.place_name,
      lng: f.center[0],
      lat: f.center[1],
      countryCode: cc,
    };
  });
  return NextResponse.json({ features });
}

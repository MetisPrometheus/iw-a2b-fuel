import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "FX fetch failed" }, { status: 502 });
  }
  const data = (await res.json()) as {
    result: string;
    rates: Record<string, number>;
    time_last_update_utc: string;
  };
  if (data.result !== "success") {
    return NextResponse.json({ error: "FX upstream not success" }, { status: 502 });
  }
  return NextResponse.json({
    base: "USD",
    rates: data.rates,
    asOf: data.time_last_update_utc,
  });
}

import { NextResponse } from "next/server";
import { getPrices } from "@/lib/prices";
import { convertEurTo, fetchEuropePrices, fetchUsdRates } from "@/lib/livePrices";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cc = (searchParams.get("country") ?? "").toUpperCase();
  const baseline = getPrices(cc);

  const [live, usdRates] = await Promise.all([fetchEuropePrices(), fetchUsdRates()]);
  const liveEntry = live?.prices[cc];

  if (liveEntry && usdRates) {
    const petrolLocal = liveEntry.petrolEur != null
      ? convertEurTo(baseline.currency, liveEntry.petrolEur, usdRates)
      : null;
    const dieselLocal = liveEntry.dieselEur != null
      ? convertEurTo(baseline.currency, liveEntry.dieselEur, usdRates)
      : null;

    return NextResponse.json({
      ...baseline,
      petrolPerLitre: petrolLocal ?? baseline.petrolPerLitre,
      dieselPerLitre: dieselLocal ?? baseline.dieselPerLitre,
      asOf: live!.fetchedAt,
      source: `Live: autotraveler.ru (refreshed weekly). Electricity falls back to baseline.`,
    });
  }

  return NextResponse.json(baseline);
}

import { NextResponse } from "next/server";
import { getPrices } from "@/lib/prices";
import { convertEurTo, fetchEuropePrices, fetchUsdRates } from "@/lib/livePrices";
import { fetchEuBulletin } from "@/lib/sources/euBulletin";
import { fetchSsbNorway } from "@/lib/sources/ssbNorway";
import { fetchEiaUs } from "@/lib/sources/eiaUs";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cc = (searchParams.get("country") ?? "").toUpperCase();
  const baseline = getPrices(cc);

  if (cc === "NO") {
    const ssb = await fetchSsbNorway();
    if (ssb) {
      return NextResponse.json({
        ...baseline,
        petrolPerLitre: ssb.petrolNok,
        dieselPerLitre: ssb.dieselNok,
        asOf: ssb.period,
        source: ssb.source,
      });
    }
  }

  if (cc === "US") {
    const eia = await fetchEiaUs();
    if (eia) {
      return NextResponse.json({
        ...baseline,
        petrolPerLitre: eia.petrolUsdPerLitre,
        dieselPerLitre: eia.dieselUsdPerLitre,
        asOf: eia.weekEnding,
        source: eia.source,
      });
    }
  }

  const [euBulletin, usdRates] = await Promise.all([fetchEuBulletin(), fetchUsdRates()]);
  const euEntry = euBulletin?.prices[cc];
  if (euEntry && usdRates) {
    const petrolLocal = convertEurTo(baseline.currency, euEntry.petrolEur, usdRates);
    const dieselLocal = convertEurTo(baseline.currency, euEntry.dieselEur, usdRates);
    if (petrolLocal != null && dieselLocal != null) {
      return NextResponse.json({
        ...baseline,
        petrolPerLitre: petrolLocal,
        dieselPerLitre: dieselLocal,
        asOf: euBulletin!.weekStart,
        source: euBulletin!.source,
      });
    }
  }

  const at = await fetchEuropePrices();
  const atEntry = at?.prices[cc];
  if (atEntry && usdRates) {
    const petrolLocal = atEntry.petrolEur != null
      ? convertEurTo(baseline.currency, atEntry.petrolEur, usdRates)
      : null;
    const dieselLocal = atEntry.dieselEur != null
      ? convertEurTo(baseline.currency, atEntry.dieselEur, usdRates)
      : null;
    if (petrolLocal != null || dieselLocal != null) {
      return NextResponse.json({
        ...baseline,
        petrolPerLitre: petrolLocal ?? baseline.petrolPerLitre,
        dieselPerLitre: dieselLocal ?? baseline.dieselPerLitre,
        asOf: at!.fetchedAt,
        source: "Live: autotraveler.ru (bi-weekly). Electricity falls back to baseline.",
      });
    }
  }

  return NextResponse.json(baseline);
}

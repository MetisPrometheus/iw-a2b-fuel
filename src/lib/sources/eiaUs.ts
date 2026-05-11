const EIA_URL = "https://api.eia.gov/v2/petroleum/pri/gnd/data/";
const GALLONS_PER_LITRE = 3.785411784;

export type EiaUsPrices = {
  petrolUsdPerLitre: number;
  dieselUsdPerLitre: number;
  weekEnding: string;
  source: string;
};

async function fetchSeries(productCode: string): Promise<{ value: number; period: string } | null> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) return null;
  const url = new URL(EIA_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", "weekly");
  url.searchParams.append("data[0]", "value");
  url.searchParams.append("facets[product][]", productCode);
  url.searchParams.append("facets[duoarea][]", "NUS");
  url.searchParams.append("sort[0][column]", "period");
  url.searchParams.append("sort[0][direction]", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", "1");
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 604800 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      response?: { data?: Array<{ value: number; period: string }> };
    };
    const row = data.response?.data?.[0];
    if (!row || !Number.isFinite(row.value)) return null;
    return { value: row.value, period: row.period };
  } catch {
    return null;
  }
}

export async function fetchEiaUs(): Promise<EiaUsPrices | null> {
  const [petrol, diesel] = await Promise.all([
    fetchSeries("EPMR"),
    fetchSeries("EPD2D"),
  ]);
  if (!petrol || !diesel) return null;
  return {
    petrolUsdPerLitre: petrol.value / GALLONS_PER_LITRE,
    dieselUsdPerLitre: diesel.value / GALLONS_PER_LITRE,
    weekEnding: petrol.period,
    source: "EIA (US Energy Information Administration) Gasoline & Diesel Retail Prices",
  };
}

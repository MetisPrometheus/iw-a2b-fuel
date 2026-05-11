const EIA_BASE = "https://api.eia.gov/v2/petroleum/pri/gnd/data/";
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
  const url =
    `${EIA_BASE}?api_key=${encodeURIComponent(apiKey)}` +
    `&frequency=weekly` +
    `&data[0]=value` +
    `&facets[product][]=${productCode}` +
    `&facets[duoarea][]=NUS` +
    `&sort[0][column]=period&sort[0][direction]=desc` +
    `&offset=0&length=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      response?: { data?: Array<{ value: number | string; period: string }> };
    };
    const row = data.response?.data?.[0];
    if (!row) return null;
    const num = typeof row.value === "string" ? parseFloat(row.value) : row.value;
    if (!Number.isFinite(num)) return null;
    return { value: num, period: row.period };
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

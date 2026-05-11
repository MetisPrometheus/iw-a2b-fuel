const SSB_URL = "https://data.ssb.no/api/v0/en/table/09654/";

export type SsbNorwayPrices = {
  petrolNok: number;
  dieselNok: number;
  period: string;
  source: string;
};

export async function fetchSsbNorway(): Promise<SsbNorwayPrices | null> {
  try {
    const body = JSON.stringify({
      query: [
        { code: "PetroleumProd", selection: { filter: "item", values: ["031", "035"] } },
        { code: "Tid", selection: { filter: "top", values: ["1"] } },
      ],
      response: { format: "json-stat2" },
    });
    const res = await fetch(SSB_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      next: { revalidate: 604800 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      value: number[];
      dimension: {
        PetroleumProd: { category: { index: Record<string, number> } };
        Tid: { category: { index: Record<string, number> } };
      };
    };
    const productIdx = data.dimension.PetroleumProd.category.index;
    const period = Object.keys(data.dimension.Tid.category.index)[0];
    const petrol = data.value[productIdx["031"]];
    const diesel = data.value[productIdx["035"]];
    if (!Number.isFinite(petrol) || !Number.isFinite(diesel)) return null;
    return {
      petrolNok: petrol,
      dieselNok: diesel,
      period: period.replace("M", "-"),
      source: "SSB (Statistics Norway) table 09654",
    };
  } catch {
    return null;
  }
}

const COUNTRY_TO_CC: Record<string, string> = {
  Austria: "AT", Albania: "AL", Andorra: "AD", Armenia: "AM", Azerbaijan: "AZ",
  Belarus: "BY", Belgium: "BE", "Bosnia and Herzegovina": "BA", Bulgaria: "BG",
  Croatia: "HR", Cyprus: "CY", Czechia: "CZ", "Czech Republic": "CZ",
  Denmark: "DK", Estonia: "EE", Finland: "FI", France: "FR",
  Georgia: "GE", Germany: "DE", "Great Britain": "GB", Greece: "GR",
  Hungary: "HU", Iceland: "IS", Ireland: "IE", Italy: "IT", Kazakhstan: "KZ",
  Kosovo: "XK", Latvia: "LV", Liechtenstein: "LI", Lithuania: "LT",
  Luxembourg: "LU", Macedonia: "MK", "North Macedonia": "MK", Malta: "MT",
  Moldova: "MD", Monaco: "MC", Montenegro: "ME", Netherlands: "NL",
  Norway: "NO", Poland: "PL", Portugal: "PT", Romania: "RO", Russia: "RU",
  "San Marino": "SM", Serbia: "RS", Slovakia: "SK", Slovenia: "SI",
  Spain: "ES", Sweden: "SE", Switzerland: "CH", Turkey: "TR", Türkiye: "TR",
  Ukraine: "UA", "United Kingdom": "GB", UK: "GB",
};

export type LivePriceEntry = {
  petrolEur?: number;
  dieselEur?: number;
};

export type LivePriceTable = {
  prices: Record<string, LivePriceEntry>;
  fetchedAt: string;
  sourceUrl: string;
};

const SOURCE_URL = "https://autotraveler.ru/en/spravka/fuel-price-in-europe.html";

export async function fetchEuropePrices(): Promise<LivePriceTable | null> {
  try {
    const res = await fetch(SOURCE_URL, {
      next: { revalidate: 604800 },
      headers: { "user-agent": "Mozilla/5.0 (compatible; a2bfuel/1.0; +https://a2bfuel.com)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const prices: Record<string, LivePriceEntry> = {};
    const rowRe = /<tr class="text-nowrap">([\s\S]*?)<\/tr>/g;
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const priceRe = /€\s*([\d.]+)/;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(html)) !== null) {
      const rowHtml = m[1];
      const cells: string[] = [];
      let c: RegExpExecArray | null;
      while ((c = cellRe.exec(rowHtml)) !== null) {
        cells.push(c[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
      }
      if (cells.length < 5) continue;
      const country = cells[1].trim();
      const cc = COUNTRY_TO_CC[country];
      if (!cc) continue;
      const petrolMatch = cells[2].match(priceRe);
      const dieselMatch = cells[4].match(priceRe);
      const petrolEur = petrolMatch ? parseFloat(petrolMatch[1]) : undefined;
      const dieselEur = dieselMatch ? parseFloat(dieselMatch[1]) : undefined;
      if (petrolEur || dieselEur) {
        prices[cc] = { petrolEur, dieselEur };
      }
    }
    if (Object.keys(prices).length === 0) return null;
    return {
      prices,
      fetchedAt: new Date().toISOString().slice(0, 10),
      sourceUrl: SOURCE_URL,
    };
  } catch {
    return null;
  }
}

export async function fetchUsdRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string; rates: Record<string, number> };
    if (data.result !== "success") return null;
    return data.rates;
  } catch {
    return null;
  }
}

export function convertEurTo(targetCurrency: string, amountEur: number, usdRates: Record<string, number>): number | null {
  const eurInUsd = usdRates.EUR;
  const targetInUsd = usdRates[targetCurrency];
  if (!eurInUsd || !targetInUsd) return null;
  return amountEur * (targetInUsd / eurInUsd);
}

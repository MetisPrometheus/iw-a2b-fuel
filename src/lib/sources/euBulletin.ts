import { unzipSync } from "fflate";

const COUNTRY_TO_CC: Record<string, string> = {
  Austria: "AT", Belgium: "BE", Bulgaria: "BG", Croatia: "HR", Cyprus: "CY",
  Czechia: "CZ", Denmark: "DK", Estonia: "EE", Finland: "FI", France: "FR",
  Germany: "DE", Greece: "GR", Hungary: "HU", Ireland: "IE", Italy: "IT",
  Latvia: "LV", Lithuania: "LT", Luxembourg: "LU", Malta: "MT",
  Netherlands: "NL", Poland: "PL", Portugal: "PT", Romania: "RO",
  Slovakia: "SK", Slovenia: "SI", Spain: "ES", Sweden: "SE",
};

const XLSX_URL =
  "https://energy.ec.europa.eu/document/download/264c2d0f-f161-4ea3-a777-78faae59bea0_en?filename=Weekly%20Oil%20Bulletin%20Weekly%20prices%20with%20Taxes%20-%202024-02-19.xlsx";

export type EuBulletinPrices = {
  prices: Record<string, { petrolEur: number; dieselEur: number }>;
  weekStart: string;
  source: string;
};

export async function fetchEuBulletin(): Promise<EuBulletinPrices | null> {
  try {
    const res = await fetch(XLSX_URL, {
      next: { revalidate: 604800 },
      headers: { "user-agent": "Mozilla/5.0 (compatible; a2bfuel/1.0; +https://a2bfuel.com)" },
    });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const unzipped = unzipSync(buf, {
      filter: (file) =>
        file.name === "xl/worksheets/sheet1.xml" || file.name === "xl/sharedStrings.xml",
    });
    const sheet = decodeUtf8(unzipped["xl/worksheets/sheet1.xml"]);
    const sharedRaw = decodeUtf8(unzipped["xl/sharedStrings.xml"]);
    if (!sheet || !sharedRaw) return null;

    const strings = parseSharedStrings(sharedRaw);
    const rows = parseRows(sheet, strings);

    const weekSerial = parseFloat(rows[1]?.A ?? "0");
    const weekStart = serialToDate(weekSerial);

    const prices: Record<string, { petrolEur: number; dieselEur: number }> = {};
    for (let r = 2; r < rows.length; r++) {
      const row = rows[r];
      const country = row.A;
      if (!country) continue;
      const cc = COUNTRY_TO_CC[country.trim()];
      if (!cc) continue;
      const petrol1000 = parseFloat(row.B ?? "");
      const diesel1000 = parseFloat(row.C ?? "");
      if (!Number.isFinite(petrol1000) || !Number.isFinite(diesel1000)) continue;
      prices[cc] = {
        petrolEur: petrol1000 / 1000,
        dieselEur: diesel1000 / 1000,
      };
    }

    if (Object.keys(prices).length === 0) return null;
    return {
      prices,
      weekStart,
      source: "EU Weekly Oil Bulletin (with taxes)",
    };
  } catch {
    return null;
  }
}

function decodeUtf8(bytes: Uint8Array | undefined): string | null {
  if (!bytes) return null;
  return new TextDecoder("utf-8").decode(bytes);
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const body = m[1];
    let text = "";
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t: RegExpExecArray | null;
    while ((t = tRe.exec(body)) !== null) text += decodeXml(t[1]);
    out.push(text);
  }
  return out;
}

type Row = Record<string, string>;

function parseRows(sheetXml: string, shared: string[]): Row[] {
  const rows: Row[] = [];
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(sheetXml)) !== null) {
    const rowNum = parseInt(m[1], 10);
    const body = m[2];
    const row: Row = {};
    const cellRe = /<c[^>]*r="([A-Z]+)(\d+)"(?:[^>]*t="(\w+)")?[^>]*>(?:<v>([\s\S]*?)<\/v>)?<\/c>/g;
    let c: RegExpExecArray | null;
    while ((c = cellRe.exec(body)) !== null) {
      const col = c[1];
      const t = c[3];
      const v = c[4] ?? "";
      if (t === "s") {
        const idx = parseInt(v, 10);
        row[col] = shared[idx] ?? "";
      } else {
        row[col] = v;
      }
    }
    rows[rowNum - 1] = row;
  }
  return rows;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function serialToDate(serial: number): string {
  if (!Number.isFinite(serial) || serial <= 0) return "";
  const ms = (serial - 25569) * 86400 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

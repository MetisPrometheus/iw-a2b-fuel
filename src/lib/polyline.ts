export function encodePolyline(coords: Array<[number, number]>, precision = 5): string {
  const factor = Math.pow(10, precision);
  let result = "";
  let prevLat = 0;
  let prevLng = 0;
  for (const [lng, lat] of coords) {
    const latN = Math.round(lat * factor);
    const lngN = Math.round(lng * factor);
    result += encodeSignedNumber(latN - prevLat);
    result += encodeSignedNumber(lngN - prevLng);
    prevLat = latN;
    prevLng = lngN;
  }
  return result;
}

function encodeSignedNumber(num: number): string {
  let sgn_num = num << 1;
  if (num < 0) sgn_num = ~sgn_num;
  let result = "";
  while (sgn_num >= 0x20) {
    result += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
    sgn_num >>>= 5;
  }
  result += String.fromCharCode(sgn_num + 63);
  return result;
}

export function downsampleCoords<T>(coords: T[], maxPoints: number): T[] {
  if (coords.length <= maxPoints) return coords;
  const step = (coords.length - 1) / (maxPoints - 1);
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(coords[Math.round(i * step)]);
  }
  return out;
}

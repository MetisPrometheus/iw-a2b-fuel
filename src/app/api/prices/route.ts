import { NextResponse } from "next/server";
import { getPrices } from "@/lib/prices";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cc = searchParams.get("country") ?? undefined;
  return NextResponse.json(getPrices(cc));
}

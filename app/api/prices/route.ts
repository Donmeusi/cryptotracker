import { NextResponse } from "next/server";
import { fetchLivePrices } from "@/lib/livePrices";

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const prices = await fetchLivePrices();
    return NextResponse.json(prices);
  } catch (error) {
    console.error("API /prices failed:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

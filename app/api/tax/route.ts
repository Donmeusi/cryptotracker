import { NextRequest, NextResponse } from "next/server";
import { generateMockTrades } from "@/lib/mock/data";
import { calculateTaxes } from "@/lib/tax/taxCalculator";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || "2024";
    const methodStr = searchParams.get("method") || "FIFO";

    // Validate method
    if (!["FIFO", "LIFO", "HIFO"].includes(methodStr)) {
      return NextResponse.json({ error: "Invalid method parameter" }, { status: 400 });
    }

    const method = methodStr as "FIFO" | "LIFO" | "HIFO";

    // Currently we use the deterministic mock trades.
    // In Phase 13/14, this will be: await db.trade.findMany({ where: { userId } })
    const trades = generateMockTrades();

    // The tax calculator processes ALL historical trades and spits out ONLY the events for the requested year.
    const result = calculateTaxes(trades, year, method);

    // Simulate small latency to show loading state
    await new Promise((resolve) => setTimeout(resolve, 600));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tax calculation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

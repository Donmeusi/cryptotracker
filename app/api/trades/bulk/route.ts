import { NextResponse } from "next/server";
import { TradeType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getOrCreatePortfolio,
  InsufficientHoldingError,
  normalizeSymbol,
  rebuildHolding,
  resolveExchange,
  upsertAsset,
} from "@/lib/portfolio";

export const dynamic = "force-dynamic";

const MAX_TRADES = 500;
const AMOUNT_EPSILON = 1e-9;

type ParsedRow = {
  asset?: unknown;
  type?: unknown;
  amount?: unknown;
  price?: unknown;
  fee?: unknown;
  feeCurrency?: unknown;
  exchange?: unknown;
  notes?: unknown;
  executedAt?: unknown;
};

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseTradeType(value: unknown): TradeType | null {
  if (typeof value !== "string") return null;
  return (Object.values(TradeType) as string[]).includes(value)
    ? (value as TradeType)
    : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Übernimmt geprüfte Trades aus dem PDF-Import. Die Übernahme ist idempotent:
 * identische Trades (Asset, Typ, Menge, Kurs, Zeitpunkt) werden übersprungen,
 * damit ein erneuter Import die Position nicht doppelt erhöht.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { trades?: unknown };
    if (!Array.isArray(body.trades) || body.trades.length === 0) {
      return NextResponse.json(
        { error: "Keine Trades übergeben." },
        { status: 400 }
      );
    }
    if (body.trades.length > MAX_TRADES) {
      return NextResponse.json(
        { error: `Höchstens ${MAX_TRADES} Trades pro Import.` },
        { status: 400 }
      );
    }

    const rows = body.trades as ParsedRow[];
    const skipped: { index: number; reason: string }[] = [];
    const valid: {
      index: number;
      symbol: string;
      type: TradeType;
      amount: number;
      price: number;
      fee: number;
      feeCurrency: string;
      exchange: string | null;
      notes: string | null;
      executedAt: Date;
    }[] = [];

    rows.forEach((row, index) => {
      const symbol = typeof row.asset === "string" ? normalizeSymbol(row.asset) : "";
      const type = parseTradeType(row.type);
      const amount = parseNumber(row.amount);
      const price = parseNumber(row.price);
      const executedAt = parseDate(row.executedAt);
      const fee = row.fee === undefined ? 0 : parseNumber(row.fee);

      if (!symbol) {
        skipped.push({ index, reason: "Asset fehlt." });
        return;
      }
      if (!type) {
        skipped.push({ index, reason: "Unbekannter Transaktions-Typ." });
        return;
      }
      if (amount === null || amount <= 0) {
        skipped.push({ index, reason: "Ungültige Menge." });
        return;
      }
      if (price === null || price < 0) {
        skipped.push({ index, reason: "Ungültiger Kurs." });
        return;
      }
      if (fee === null || fee < 0) {
        skipped.push({ index, reason: "Ungültige Gebühr." });
        return;
      }
      if (!executedAt) {
        skipped.push({ index, reason: "Ungültiges Datum." });
        return;
      }

      valid.push({
        index,
        symbol,
        type,
        amount,
        price,
        fee,
        feeCurrency:
          typeof row.feeCurrency === "string" && row.feeCurrency.trim()
            ? row.feeCurrency.trim().toUpperCase()
            : "EUR",
        exchange:
          typeof row.exchange === "string" && row.exchange.trim()
            ? row.exchange.trim()
            : null,
        notes:
          typeof row.notes === "string" && row.notes.trim()
            ? row.notes.trim()
            : null,
        executedAt,
      });
    });

    if (valid.length === 0) {
      return NextResponse.json(
        { created: 0, skipped, error: "Kein Trade konnte übernommen werden." },
        { status: 400 }
      );
    }

    const portfolio = await getOrCreatePortfolio(session.user.id);
    if (!portfolio) {
      return NextResponse.json(
        { error: "Sitzung ungültig – bitte neu anmelden." },
        { status: 401 }
      );
    }

    const created = await db.$transaction(async (tx) => {
      const affectedAssets = new Map<string, string>();
      let count = 0;

      for (const row of valid) {
        const asset = await upsertAsset(tx, { symbol: row.symbol });
        const exchange = await resolveExchange(tx, row.exchange);

        const duplicates = await tx.trade.findMany({
          where: {
            portfolioId: portfolio.id,
            assetId: asset.id,
            type: row.type,
            executedAt: row.executedAt,
          },
          select: { amount: true, price: true },
        });

        const isDuplicate = duplicates.some(
          (existing) =>
            Math.abs(existing.amount - row.amount) <= AMOUNT_EPSILON &&
            Math.abs(existing.price - row.price) <= AMOUNT_EPSILON
        );

        if (isDuplicate) {
          skipped.push({
            index: row.index,
            reason: "Bereits vorhanden – übersprungen.",
          });
          continue;
        }

        await tx.trade.create({
          data: {
            portfolioId: portfolio.id,
            assetId: asset.id,
            exchangeId: exchange?.id ?? null,
            type: row.type,
            amount: row.amount,
            price: row.price,
            fee: row.fee,
            feeCurrency: row.feeCurrency,
            notes: row.notes,
            executedAt: row.executedAt,
          },
        });

        affectedAssets.set(asset.id, row.symbol);
        count += 1;
      }

      for (const [assetId, symbol] of affectedAssets) {
        await rebuildHolding(tx, portfolio.id, assetId, symbol);
      }

      return count;
    });

    return NextResponse.json(
      { created, skipped },
      { status: created > 0 ? 201 : 200 }
    );
  } catch (error) {
    if (error instanceof InsufficientHoldingError) {
      return NextResponse.json(
        {
          error:
            "Ein importierter Verkauf übersteigt den Bestand. Bitte Import prüfen.",
        },
        { status: 409 }
      );
    }
    console.error("Trade-Import fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Import konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}

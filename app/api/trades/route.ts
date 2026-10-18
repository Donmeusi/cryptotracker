import { NextResponse } from "next/server";
import { AssetType, Prisma, TradeType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getOrCreatePortfolio,
  InsufficientHoldingError,
  normalizeSymbol,
  rebuildHolding,
  resolveExchange,
  toHoldingDto,
  toTradeDto,
  upsertAsset,
  isKnownPrismaError,
} from "@/lib/portfolio";

export const dynamic = "force-dynamic";

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

// ─── GET: Trades laden ───────────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const typeParam = url.searchParams.get("type");
    const symbolParam = url.searchParams.get("symbol");
    const limitParam = Number(url.searchParams.get("limit") ?? 500);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 1000)
      : 500;

    const type = typeParam ? parseTradeType(typeParam) : null;
    if (typeParam && !type) {
      return NextResponse.json(
        { error: "Unbekannter Transaktions-Typ." },
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

    const where: Prisma.TradeWhereInput = { portfolioId: portfolio.id };
    if (type) where.type = type;
    if (symbolParam) {
      where.asset = { symbol: normalizeSymbol(symbolParam) };
    }

    const trades = await db.trade.findMany({
      where,
      include: { asset: true, exchange: true },
      orderBy: { executedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ trades: trades.map((trade) => toTradeDto(trade)) });
  } catch (error) {
    console.error("Trades GET fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Trades konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

// ─── POST: Trade erfassen und Position fortschreiben ─────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const symbol = typeof body.symbol === "string" ? normalizeSymbol(body.symbol) : "";
    if (!symbol) {
      return NextResponse.json({ error: "Symbol ist erforderlich." }, { status: 400 });
    }

    const type = parseTradeType(body.type);
    if (!type) {
      return NextResponse.json(
        { error: "Unbekannter Transaktions-Typ." },
        { status: 400 }
      );
    }

    const amount = parseNumber(body.amount);
    if (amount === null || amount <= 0) {
      return NextResponse.json(
        { error: "Bitte eine gültige Menge eingeben." },
        { status: 400 }
      );
    }

    const price = parseNumber(body.price);
    if (price === null || price < 0) {
      return NextResponse.json(
        { error: "Bitte einen gültigen Kurs eingeben." },
        { status: 400 }
      );
    }

    const fee = body.fee === undefined ? 0 : parseNumber(body.fee);
    if (fee === null || fee < 0) {
      return NextResponse.json(
        { error: "Bitte eine gültige Gebühr eingeben." },
        { status: 400 }
      );
    }

    const executedAt = parseDate(body.executedAt);
    if (!executedAt) {
      return NextResponse.json(
        { error: "Bitte ein gültiges Datum angeben." },
        { status: 400 }
      );
    }

    const assetType =
      typeof body.assetType === "string" &&
      (Object.values(AssetType) as string[]).includes(body.assetType)
        ? (body.assetType as AssetType)
        : null;

    const portfolio = await getOrCreatePortfolio(session.user.id);
    if (!portfolio) {
      return NextResponse.json(
        { error: "Sitzung ungültig – bitte neu anmelden." },
        { status: 401 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const asset = await upsertAsset(tx, {
        symbol,
        name: typeof body.name === "string" ? body.name : null,
        type: assetType,
      });
      const exchange = await resolveExchange(
        tx,
        typeof body.exchange === "string" ? body.exchange : null
      );

      const trade = await tx.trade.create({
        data: {
          portfolioId: portfolio.id,
          assetId: asset.id,
          exchangeId: exchange?.id ?? null,
          type,
          amount,
          price,
          fee: fee ?? 0,
          feeCurrency:
            typeof body.feeCurrency === "string" && body.feeCurrency.trim()
              ? body.feeCurrency.trim().toUpperCase()
              : "EUR",
          notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
          executedAt,
        },
        include: { asset: true, exchange: true },
      });

      const holding = await rebuildHolding(tx, portfolio.id, asset.id, symbol);

      return { trade, holding };
    });

    return NextResponse.json(
      {
        trade: toTradeDto(result.trade),
        holding: result.holding
          ? toHoldingDto({ ...result.holding, asset: result.trade.asset })
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InsufficientHoldingError) {
      return NextResponse.json(
        { error: "Bestand reicht für diesen Verkauf nicht aus." },
        { status: 409 }
      );
    }
    console.error("Trades POST fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Trade konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}

// ─── PATCH: Trade bearbeiten, Position neu berechnen ────────────────────────

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "Trade fehlt." }, { status: 400 });
    }

    const portfolio = await getOrCreatePortfolio(session.user.id);
    if (!portfolio) {
      return NextResponse.json(
        { error: "Sitzung ungültig – bitte neu anmelden." },
        { status: 401 }
      );
    }

    const trade = await db.trade.findFirst({
      where: { id, portfolioId: portfolio.id },
      include: { asset: true },
    });
    if (!trade) {
      return NextResponse.json({ error: "Trade nicht gefunden." }, { status: 404 });
    }

    const data: Prisma.TradeUncheckedUpdateInput = {};

    if (body.type !== undefined) {
      const type = parseTradeType(body.type);
      if (!type) {
        return NextResponse.json(
          { error: "Unbekannter Transaktions-Typ." },
          { status: 400 }
        );
      }
      data.type = type;
    }

    if (body.amount !== undefined) {
      const amount = parseNumber(body.amount);
      if (amount === null || amount <= 0) {
        return NextResponse.json(
          { error: "Bitte eine gültige Menge eingeben." },
          { status: 400 }
        );
      }
      data.amount = amount;
    }

    if (body.price !== undefined) {
      const price = parseNumber(body.price);
      if (price === null || price < 0) {
        return NextResponse.json(
          { error: "Bitte einen gültigen Kurs eingeben." },
          { status: 400 }
        );
      }
      data.price = price;
    }

    if (body.fee !== undefined) {
      const fee = parseNumber(body.fee);
      if (fee === null || fee < 0) {
        return NextResponse.json(
          { error: "Bitte eine gültige Gebühr eingeben." },
          { status: 400 }
        );
      }
      data.fee = fee;
    }

    if (body.executedAt !== undefined) {
      const executedAt = parseDate(body.executedAt);
      if (!executedAt) {
        return NextResponse.json(
          { error: "Bitte ein gültiges Datum angeben." },
          { status: 400 }
        );
      }
      data.executedAt = executedAt;
    }

    if (body.feeCurrency !== undefined) {
      if (typeof body.feeCurrency !== "string") {
        return NextResponse.json(
          { error: "Ungültige Gebührenwährung." },
          { status: 400 }
        );
      }
      data.feeCurrency = body.feeCurrency.trim().toUpperCase() || "EUR";
    }

    if (body.notes !== undefined) {
      if (body.notes !== null && typeof body.notes !== "string") {
        return NextResponse.json({ error: "Ungültige Notiz." }, { status: 400 });
      }
      const notes = typeof body.notes === "string" ? body.notes.trim() : "";
      data.notes = notes || null;
    }

    let exchangeName: string | null | undefined;
    if (body.exchange !== undefined) {
      if (body.exchange !== null && typeof body.exchange !== "string") {
        return NextResponse.json(
          { error: "Ungültige Börse." },
          { status: 400 }
        );
      }
      exchangeName =
        typeof body.exchange === "string" ? body.exchange.trim() : "";
    }

    if (
      Object.keys(data).length === 0 &&
      exchangeName === undefined
    ) {
      return NextResponse.json(
        { error: "Keine Änderungen übergeben." },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      let exchangeId = trade.exchangeId;
      if (exchangeName !== undefined) {
        const exchange = await resolveExchange(tx, exchangeName);
        exchangeId = exchange?.id ?? null;
      }

      await tx.trade.update({
        where: { id: trade.id },
        data: { ...data, exchangeId },
      });
      await rebuildHolding(tx, portfolio.id, trade.assetId, trade.asset.symbol);
    });

    const updated = await db.trade.findUnique({
      where: { id: trade.id },
      include: { asset: true, exchange: true },
    });

    return NextResponse.json({
      success: true,
      trade: updated ? toTradeDto(updated) : null,
    });
  } catch (error) {
    if (error instanceof InsufficientHoldingError) {
      return NextResponse.json(
        { error: "Bestand reicht für diesen Verkauf nicht aus." },
        { status: 409 }
      );
    }
    if (isKnownPrismaError(error, "P2025")) {
      return NextResponse.json({ error: "Trade nicht gefunden." }, { status: 404 });
    }
    console.error("Trades PATCH fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Trade konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}

// ─── DELETE: Trade löschen, Position neu berechnen ──────────────────────────

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id ist erforderlich." }, { status: 400 });
    }

    const portfolio = await getOrCreatePortfolio(session.user.id);
    if (!portfolio) {
      return NextResponse.json(
        { error: "Sitzung ungültig – bitte neu anmelden." },
        { status: 401 }
      );
    }
    const trade = await db.trade.findFirst({
      where: { id, portfolioId: portfolio.id },
      include: { asset: true },
    });

    if (!trade) {
      return NextResponse.json({ error: "Trade nicht gefunden." }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.trade.delete({ where: { id: trade.id } });
      await rebuildHolding(tx, portfolio.id, trade.assetId, trade.asset.symbol);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isKnownPrismaError(error, "P2025")) {
      return NextResponse.json({ error: "Trade nicht gefunden." }, { status: 404 });
    }
    console.error("Trades DELETE fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Trade konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}

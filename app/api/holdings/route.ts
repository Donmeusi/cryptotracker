import { NextResponse } from "next/server";
import { AssetType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getOrCreatePortfolio,
  isKnownPrismaError,
  normalizeSymbol,
  toHoldingDto,
  upsertAsset,
  type HoldingDto,
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

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseAssetType(value: unknown): AssetType | null {
  if (typeof value !== "string") return null;
  return (Object.values(AssetType) as string[]).includes(value)
    ? (value as AssetType)
    : null;
}

async function loadHolding(id: string, portfolioId: string) {
  return db.holding.findFirst({
    where: { id, portfolioId },
    include: { asset: true },
  });
}

// ─── GET: Positionen laden ───────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const portfolio = await getOrCreatePortfolio(session.user.id);
    if (!portfolio) {
      return NextResponse.json(
        { error: "Sitzung ungültig – bitte neu anmelden." },
        { status: 401 }
      );
    }
    const holdings = await db.holding.findMany({
      where: { portfolioId: portfolio.id },
      include: { asset: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      holdings: holdings.map((holding) => toHoldingDto(holding)),
    });
  } catch (error) {
    console.error("Holdings GET fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Positionen konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

// ─── POST: Position direkt anlegen (ohne Trade) ──────────────────────────────

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

    const amount = parseNumber(body.amount);
    if (amount === null || amount <= 0) {
      return NextResponse.json(
        { error: "Bitte eine gültige Menge eingeben." },
        { status: 400 }
      );
    }

    const avgBuyPrice = parseNumber(body.avgBuyPrice);
    if (avgBuyPrice === null || avgBuyPrice < 0) {
      return NextResponse.json(
        { error: "Bitte einen gültigen Kaufkurs eingeben." },
        { status: 400 }
      );
    }

    const buyDate = parseDate(body.buyDate);
    if (buyDate === undefined) {
      return NextResponse.json({ error: "Ungültiges Kaufdatum." }, { status: 400 });
    }

    const type = parseAssetType(body.type);
    if (body.type !== undefined && !type) {
      return NextResponse.json(
        { error: "Unbekannte Asset-Kategorie." },
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
    const asset = await upsertAsset(db, {
      symbol,
      name: typeof body.name === "string" ? body.name : null,
      type,
    });

    const existing = await db.holding.findUnique({
      where: { portfolioId_assetId: { portfolioId: portfolio.id, assetId: asset.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Diese Position existiert bereits – bitte bearbeiten." },
        { status: 409 }
      );
    }

    const holding = await db.holding.create({
      data: {
        portfolioId: portfolio.id,
        assetId: asset.id,
        amount,
        avgBuyPrice,
        buyDate: buyDate ?? null,
      },
      include: { asset: true },
    });

    return NextResponse.json({ holding: toHoldingDto(holding) }, { status: 201 });
  } catch (error) {
    console.error("Holdings POST fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Position konnte nicht angelegt werden." },
      { status: 500 }
    );
  }
}

// ─── PATCH: Position bearbeiten ──────────────────────────────────────────────

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "Position fehlt." }, { status: 400 });
    }

    const portfolio = await getOrCreatePortfolio(session.user.id);
    if (!portfolio) {
      return NextResponse.json(
        { error: "Sitzung ungültig – bitte neu anmelden." },
        { status: 401 }
      );
    }
    const existing = await loadHolding(id, portfolio.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Position nicht gefunden." },
        { status: 404 }
      );
    }

    const data: {
      amount?: number;
      avgBuyPrice?: number;
      buyDate?: Date | null;
      currentPrice?: number;
    } = {};

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

    if (body.avgBuyPrice !== undefined) {
      const avgBuyPrice = parseNumber(body.avgBuyPrice);
      if (avgBuyPrice === null || avgBuyPrice < 0) {
        return NextResponse.json(
          { error: "Bitte einen gültigen Kaufkurs eingeben." },
          { status: 400 }
        );
      }
      data.avgBuyPrice = avgBuyPrice;
    }

    if (body.buyDate !== undefined) {
      const buyDate = parseDate(body.buyDate);
      if (buyDate === undefined) {
        return NextResponse.json(
          { error: "Ungültiges Kaufdatum." },
          { status: 400 }
        );
      }
      data.buyDate = buyDate;
    }

    if (body.currentPrice !== undefined) {
      const currentPrice = parseNumber(body.currentPrice);
      if (currentPrice === null || currentPrice < 0) {
        return NextResponse.json(
          { error: "Ungültiger Kurs." },
          { status: 400 }
        );
      }
      data.currentPrice = currentPrice;
    }

    // Die Asset-Kategorie gehört zum (globalen) Asset, nicht zur Position.
    const assetType =
      body.type === undefined ? undefined : parseAssetType(body.type);
    if (body.type !== undefined && !assetType) {
      return NextResponse.json(
        { error: "Unbekannte Asset-Kategorie." },
        { status: 400 }
      );
    }

    if (Object.keys(data).length === 0 && !assetType) {
      return NextResponse.json(
        { error: "Keine Änderungen übergeben." },
        { status: 400 }
      );
    }

    const holding = await db.$transaction(async (tx) => {
      if (assetType) {
        await tx.asset.update({
          where: { id: existing.assetId },
          data: { type: assetType },
        });
      }
      return tx.holding.update({
        where: { id: existing.id },
        data,
        include: { asset: true },
      });
    });

    return NextResponse.json({ holding: toHoldingDto(holding) });
  } catch (error) {
    console.error("Holdings PATCH fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Position konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}

// ─── DELETE: Position löschen ────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const symbol = url.searchParams.get("symbol");

    if (!id && !symbol) {
      return NextResponse.json(
        { error: "id oder symbol ist erforderlich." },
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

    let holdingId = id ?? "";
    if (!holdingId && symbol) {
      const asset = await db.asset.findUnique({
        where: { symbol: normalizeSymbol(symbol) },
      });
      if (!asset) {
        return NextResponse.json(
          { error: "Position nicht gefunden." },
          { status: 404 }
        );
      }
      const holding = await db.holding.findUnique({
        where: {
          portfolioId_assetId: { portfolioId: portfolio.id, assetId: asset.id },
        },
      });
      if (!holding) {
        return NextResponse.json(
          { error: "Position nicht gefunden." },
          { status: 404 }
        );
      }
      holdingId = holding.id;
    }

    const result = await db.holding.deleteMany({
      where: { id: holdingId, portfolioId: portfolio.id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Position nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isKnownPrismaError(error, "P2025")) {
      return NextResponse.json(
        { error: "Position nicht gefunden." },
        { status: 404 }
      );
    }
    console.error("Holdings DELETE fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Position konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}

export type { HoldingDto };

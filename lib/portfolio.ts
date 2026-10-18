import {
  AssetType,
  ExchangeType,
  Prisma,
  PrismaClient,
  TradeType,
} from "@prisma/client";
import { db } from "@/lib/db";
import { lookupAsset } from "@/lib/assetCatalog";

// Gemeinsame Server-Helfer für Portfolio, Assets und die Verrechnung von
// Trades auf Positionen. Alle Funktionen erwarten, dass die Benutzer-ID
// bereits geprüft wurde; die Zugehörigkeit wird über die portfolioId
// sichergestellt.

type DbClient = Prisma.TransactionClient | PrismaClient;

export const DEFAULT_PORTFOLIO_NAME = "Mein Portfolio";
const AMOUNT_EPSILON = 1e-9;

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Ein Portfolio pro Benutzer. Registrierte Benutzer bekommen es bei der
 * Anmeldung; OIDC-Konten, die der Prisma-Adapter anlegt, erhalten es hier
 * beim ersten Zugriff.
 */
export async function getOrCreatePortfolio(userId: string) {
  // Ein JWT kann auf einen gelöschten Benutzer zeigen (z. B. nach dem Löschen
  // des Kontos bei noch gültiger Sitzung). Ohne diese Prüfung scheitert das
  // Anlegen des Portfolios an der Fremdschlüssel-Bedingung und die Seite
  // antwortet mit 500.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return null;

  const existing = await db.portfolio.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return db.portfolio.create({
    data: {
      userId,
      name: DEFAULT_PORTFOLIO_NAME,
      description: "Standard-Portfolio",
    },
  });
}

export async function findPortfolio(userId: string) {
  return db.portfolio.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export type AssetInput = {
  symbol: string;
  name?: string | null;
  type?: AssetType | null;
  coingeckoId?: string | null;
  logoUrl?: string | null;
};

/**
 * Assets sind ein globaler Katalog (symbol ist unique). Beim Erfassen einer
 * Position legen wir fehlende Einträge an und ergänzen bekannte Stammdaten,
 * ohne vorhandene Werte zu überschreiben.
 */
export async function upsertAsset(client: DbClient, input: AssetInput) {
  const symbol = normalizeSymbol(input.symbol);
  const meta = lookupAsset(symbol);

  const name = input.name?.trim() || meta?.name || symbol;
  const type = input.type ?? meta?.type ?? AssetType.CRYPTO;
  const coingeckoId = input.coingeckoId ?? meta?.coingeckoId ?? null;
  const logoUrl = input.logoUrl ?? meta?.logoUrl ?? null;

  return client.asset.upsert({
    where: { symbol },
    update: {
      ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(coingeckoId ? { coingeckoId } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    },
    create: { symbol, name, type, coingeckoId, logoUrl },
  });
}

// ─── Positionen aus Trades berechnen ────────────────────────────────────────

export class InsufficientHoldingError extends Error {
  constructor(
    public readonly symbol: string,
    public readonly available: number,
    public readonly requested: number
  ) {
    super(
      `Bestand von ${symbol} reicht nicht: vorhanden ${available}, benötigt ${requested}.`
    );
    this.name = "InsufficientHoldingError";
  }
}

type TradeLike = {
  type: TradeType;
  amount: number;
  price: number;
  executedAt: Date;
};

export type HoldingComputation = {
  amount: number;
  avgBuyPrice: number;
  buyDate: Date | null;
};

/**
 * Leitet Bestand, Einstandspreis und frühesten Zugang allein aus der
 * Trade-Historie ab (chronologisch aufsteigend).
 *
 * - BUY: Menge addieren, Einstandspreis gewichtet mitteln.
 * - TRANSFER_IN / STAKING_REWARD / AIRDROP / MINING: Menge addieren, Kosten-
 *   basis unverändert (fehlt eine Position, dient der Kurs als Startwert).
 * - SELL / TRANSFER_OUT: Menge abziehen; reicht der Bestand nicht, wird
 *   InsufficientHoldingError geworfen.
 * - Gebühren beeinflussen den Einstandspreis nicht; sie stehen im Trade und
 *   fließen in die Steuerberechnung ein.
 */
export function computeHolding(
  trades: TradeLike[],
  symbol = ""
): HoldingComputation | null {
  let amount = 0;
  let avgBuyPrice = 0;
  let buyDate: Date | null = null;

  const sorted = [...trades].sort(
    (a, b) => a.executedAt.getTime() - b.executedAt.getTime()
  );

  for (const trade of sorted) {
    const quantity = Math.abs(trade.amount);

    if (
      trade.type === TradeType.SELL ||
      trade.type === TradeType.TRANSFER_OUT
    ) {
      if (quantity > amount + AMOUNT_EPSILON) {
        throw new InsufficientHoldingError(symbol, amount, quantity);
      }
      amount -= quantity;
      if (amount <= AMOUNT_EPSILON) {
        amount = 0;
        avgBuyPrice = 0;
        buyDate = null;
      }
      continue;
    }

    if (quantity <= AMOUNT_EPSILON) continue;

    if (trade.type === TradeType.BUY) {
      const nextAmount = amount + quantity;
      avgBuyPrice =
        nextAmount > 0
          ? (amount * avgBuyPrice + quantity * trade.price) / nextAmount
          : trade.price;
      amount = nextAmount;
    } else {
      if (amount <= AMOUNT_EPSILON) avgBuyPrice = trade.price;
      amount += quantity;
    }

    if (!buyDate || trade.executedAt < buyDate) buyDate = trade.executedAt;
  }

  if (amount <= AMOUNT_EPSILON) return null;
  return { amount, avgBuyPrice, buyDate };
}

/**
 * Baut die Position eines Assets aus seinen Trades neu auf. Gibt es keine
 * Trades (mehr), wird die Position entfernt. Manuell gepflegte Positionen
 * ohne Trades bleiben unberührt, weil diese Funktion nur nach Trade-Änderungen
 * aufgerufen wird.
 */
export async function rebuildHolding(
  client: DbClient,
  portfolioId: string,
  assetId: string,
  symbol = ""
) {
  const trades = await client.trade.findMany({
    where: { portfolioId, assetId },
    orderBy: { executedAt: "asc" },
    select: { type: true, amount: true, price: true, executedAt: true },
  });

  const computed = computeHolding(trades, symbol);

  if (!computed) {
    await client.holding.deleteMany({ where: { portfolioId, assetId } });
    return null;
  }

  return client.holding.upsert({
    where: { portfolioId_assetId: { portfolioId, assetId } },
    update: {
      amount: computed.amount,
      avgBuyPrice: computed.avgBuyPrice,
      buyDate: computed.buyDate,
    },
    create: {
      portfolioId,
      assetId,
      amount: computed.amount,
      avgBuyPrice: computed.avgBuyPrice,
      buyDate: computed.buyDate,
    },
  });
}

/** Börsen sind ein globaler Katalog ohne Benutzerbezug. */
export async function resolveExchange(client: DbClient, name?: string | null) {
  const clean = name?.trim();
  if (!clean) return null;

  const existing = await client.exchange.findFirst({ where: { name: clean } });
  if (existing) return existing;

  return client.exchange.create({
    data: {
      name: clean,
      displayName: clean,
      type: ExchangeType.CEX,
      isMock: false,
    },
  });
}

// ─── Antwortformen für die Oberfläche ────────────────────────────────────────

export type HoldingDto = {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  coingeckoId: string | null;
  logoUrl: string | null;
  amount: number;
  avgBuyPrice: number;
  buyDate: string | null;
  currentPrice: number;
};

export function toHoldingDto(holding: {
  id: string;
  amount: number;
  avgBuyPrice: number;
  buyDate: Date | null;
  currentPrice: number;
  asset: {
    symbol: string;
    name: string;
    type: AssetType;
    coingeckoId: string | null;
    logoUrl: string | null;
  };
}): HoldingDto {
  return {
    id: holding.id,
    symbol: holding.asset.symbol,
    name: holding.asset.name,
    type: holding.asset.type,
    coingeckoId: holding.asset.coingeckoId,
    logoUrl: holding.asset.logoUrl,
    amount: holding.amount,
    avgBuyPrice: holding.avgBuyPrice,
    buyDate: holding.buyDate ? holding.buyDate.toISOString() : null,
    currentPrice: holding.currentPrice,
  };
}

export type TradeDto = {
  id: string;
  symbol: string;
  name: string;
  type: TradeType;
  exchange: string | null;
  amount: number;
  price: number;
  fee: number;
  feeCurrency: string;
  notes: string | null;
  executedAt: string;
};

export function toTradeDto(trade: {
  id: string;
  type: TradeType;
  amount: number;
  price: number;
  fee: number;
  feeCurrency: string;
  notes: string | null;
  executedAt: Date;
  asset: { symbol: string; name: string };
  exchange: { name: string; displayName: string } | null;
}): TradeDto {
  return {
    id: trade.id,
    symbol: trade.asset.symbol,
    name: trade.asset.name,
    type: trade.type,
    exchange: trade.exchange?.displayName || trade.exchange?.name || null,
    amount: trade.amount,
    price: trade.price,
    fee: trade.fee,
    feeCurrency: trade.feeCurrency,
    notes: trade.notes,
    executedAt: trade.executedAt.toISOString(),
  };
}

export function isKnownPrismaError(
  error: unknown,
  code: string
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

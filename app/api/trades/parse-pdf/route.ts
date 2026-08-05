import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export interface ParsedTrade {
  id: string;
  asset: string;
  type: "BUY" | "SELL" | "TRANSFER_IN" | "TRANSFER_OUT" | "STAKING_REWARD";
  amount: number;
  price: number;
  fee: number;
  feeCurrency: string;
  exchange: string;
  executedAt: string; // ISO string
  notes: string;
  confidence: number; // 0..100
}

const SUPPORTED_ASSETS = [
  "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "AVAX", "MATIC", "LINK", 
  "UNI", "ATOM", "NEAR", "SUI", "PEPE", "SHIB", "LTC", "BCH", "TRX", "XLM", "ICP"
];

const KNOWN_EXCHANGES = [
  "Trade Republic", "Bitpanda", "Coinbase", "Binance", "Kraken", 
  "BSDEX", "Bison", "KuCoin", "Bybit", "Bitvavo", "OKX"
];

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format. Es muss eine PDF-Datei hochgeladen werden." },
      { status: 400 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei hochgeladen" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Nur PDF-Dateien werden unterstützt (.pdf)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // PDF Text extrahieren
    let pdfData: { text?: string; numpages?: number } = {};
    try {
      pdfData = await pdfParse(buffer);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : "PDF beschädigt oder nicht lesbar";
      return NextResponse.json(
        { error: `Die PDF-Datei konnte nicht gelesen werden (${msg}). Bitte prüfe, ob die Datei geschützt ist.` },
        { status: 400 }
      );
    }

    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json({
        error: "Aus der PDF-Datei konnte kein lesbarer Text extrahiert werden. Bitte prüfe, ob es sich um einen reinen Bild-Scan ohne Text-Layer handelt."
      }, { status: 400 });
    }

    const parsedTrades = parsePdfTextToTrades(text, file.name);

    return NextResponse.json({
      success: true,
      filename: file.name,
      pageCount: pdfData.numpages || 1,
      trades: parsedTrades,
      rawTextSnippet: text.slice(0, 500)
    });
  } catch (error: unknown) {
    console.error("PDF Parsing Error:", error);
    const errMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({
      error: `Fehler beim Verarbeiten der PDF-Datei: ${errMsg}`
    }, { status: 400 });
  }
}

function parsePdfTextToTrades(text: string, filename: string): ParsedTrade[] {
  const trades: ParsedTrade[] = [];
  const cleanText = text.replace(/\s+/g, " ");

  // 1. Erkennung der Börse / Broker
  let detectedExchange = "Unbekannt";
  for (const ex of KNOWN_EXCHANGES) {
    if (new RegExp(ex, "i").test(cleanText)) {
      detectedExchange = ex;
      break;
    }
  }
  if (detectedExchange === "Unbekannt") {
    if (/trade\s*republic/i.test(filename) || /republic/i.test(cleanText)) detectedExchange = "Trade Republic";
    else if (/bitpanda/i.test(filename) || /bitpanda/i.test(cleanText)) detectedExchange = "Bitpanda";
    else if (/coinbase/i.test(filename)) detectedExchange = "Coinbase";
    else if (/binance/i.test(filename)) detectedExchange = "Binance";
    else if (/kraken/i.test(filename)) detectedExchange = "Kraken";
  }

  // 2. Erkennung des Handels-Typs (Kauf vs. Verkauf)
  let tradeType: "BUY" | "SELL" = "BUY";
  if (/\b(verkauf|verkauft|sell|sold|ausgang|abhebung)\b/i.test(cleanText)) {
    tradeType = "SELL";
  } else if (/\b(kauf|gekauft|buy|bought|eingang|einzahlung)\b/i.test(cleanText)) {
    tradeType = "BUY";
  }

  // 3. Erkennung des Assets
  let detectedAsset = "BTC"; // Default fallback
  for (const asset of SUPPORTED_ASSETS) {
    const symbolRegex = new RegExp(`\\b${asset}\\b`, "i");
    if (symbolRegex.test(cleanText)) {
      detectedAsset = asset;
      break;
    }
  }

  // 4. Erkennung von Datum und Uhrzeit
  let executedAt = new Date().toISOString().slice(0, 16);
  // Matches DD.MM.YYYY HH:MM or DD.MM.YYYY
  const dateMatch = cleanText.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (dateMatch) {
    const [_, day, month, year, hour = "12", minute = "00"] = dateMatch;
    executedAt = `${year}-${month}-${day}T${hour}:${minute}`;
  } else {
    // Matches YYYY-MM-DD
    const isoMatch = cleanText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      executedAt = `${isoMatch[0]}T12:00`;
    }
  }

  // 5. Erkennung der Menge (Amount)
  let amount = 0;
  // Matches decimal numbers like 0,05000000 or 1.250,50 or 0.00543
  const amountMatches = cleanText.match(/(?:stk\.|menge|anzahl|amount|quantity|volumen)?[:\s]*(\d+[\.,]\d{2,8})\b/gi);
  if (amountMatches) {
    for (const raw of amountMatches) {
      const numStr = raw.replace(/[^\d,\.]/g, "").replace(",", ".");
      const val = parseFloat(numStr);
      if (val > 0 && val < 1000000) {
        amount = val;
        break;
      }
    }
  }

  // 6. Erkennung des Preises / Kurses
  let price = 0;
  // Matches e.g. "Kurs: 85.000,00 EUR" or "Preis 3.200,50" or "85000 EUR"
  const priceMatch = cleanText.match(/(?:kurs|preis|price|rate|betrag|wert)[:\s]*([\d\.\,]+)\s*(?:eur|usd|€|\$)?/i);
  if (priceMatch && priceMatch[1]) {
    const numStr = priceMatch[1].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(numStr);
    if (val > 0) price = val;
  }

  // 7. Erkennung der Gebühr (Fee)
  let fee = 0;
  const feeMatch = cleanText.match(/(?:gebühr|fee|fremdspesen|kosten)[:\s]*([\d\.\,]+)\s*(?:eur|usd|€|\$)?/i);
  if (feeMatch && feeMatch[1]) {
    const numStr = feeMatch[1].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(numStr);
    if (val >= 0 && val < 1000) fee = val;
  }

  // Vertrauens-Score berechnen
  let confidence = 50;
  if (detectedExchange !== "Unbekannt") confidence += 15;
  if (amount > 0) confidence += 20;
  if (price > 0) confidence += 15;

  trades.push({
    id: `pdf-${Date.now()}-1`,
    asset: detectedAsset,
    type: tradeType,
    amount: amount || 1,
    price: price || 100,
    fee: fee,
    feeCurrency: "EUR",
    exchange: detectedExchange === "Unbekannt" ? "Binance" : detectedExchange,
    executedAt: executedAt,
    notes: `Importiert aus PDF Beleg (${filename})`,
    confidence: Math.min(confidence, 100)
  });

  return trades;
}

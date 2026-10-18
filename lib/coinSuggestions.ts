// Vorschlagsliste für die Symbol-Eingabe im Trade-Formular.
// Bewusst client-safe (kein Prisma-Import): Hier stehen nur Symbol und Name,
// die Stammdaten inkl. Logo und CoinGecko-ID liegen in lib/assetCatalog.ts.

export type CoinSuggestion = {
  symbol: string;
  name: string;
};

export const COIN_SUGGESTIONS: CoinSuggestion[] = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "TRX", name: "TRON" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "LTC", name: "Litecoin" },
  { symbol: "SHIB", name: "Shiba Inu" },
  { symbol: "TON", name: "Toncoin" },
  { symbol: "ATOM", name: "Cosmos" },
  { symbol: "XLM", name: "Stellar" },
  { symbol: "ALGO", name: "Algorand" },
  { symbol: "NEAR", name: "NEAR Protocol" },
  { symbol: "FIL", name: "Filecoin" },
  { symbol: "ICP", name: "Internet Computer" },
  { symbol: "UNI", name: "Uniswap" },
  { symbol: "AAVE", name: "Aave" },
];

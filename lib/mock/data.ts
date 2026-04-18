// Mock-Daten für Krypto-Assets
export const MOCK_ASSETS = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    type: "CRYPTO",
    coingeckoId: "bitcoin",
    logoUrl: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    price: 87234.5,
    priceChange24h: 2.3,
    marketCap: 1724000000000,
    volume24h: 42000000000,
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    type: "CRYPTO",
    coingeckoId: "ethereum",
    logoUrl: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    price: 1615.2,
    priceChange24h: -1.1,
    marketCap: 194000000000,
    volume24h: 18500000000,
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    type: "CRYPTO",
    coingeckoId: "solana",
    logoUrl: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    price: 128.7,
    priceChange24h: 4.8,
    marketCap: 55000000000,
    volume24h: 3200000000,
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    type: "CRYPTO",
    coingeckoId: "cardano",
    logoUrl: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    price: 0.587,
    priceChange24h: -0.8,
    marketCap: 20700000000,
    volume24h: 450000000,
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
    type: "CRYPTO",
    coingeckoId: "polkadot",
    logoUrl: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
    price: 4.12,
    priceChange24h: 1.5,
    marketCap: 6200000000,
    volume24h: 180000000,
  },
  {
    id: "chainlink",
    symbol: "LINK",
    name: "Chainlink",
    type: "CRYPTO",
    coingeckoId: "chainlink",
    logoUrl: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    price: 11.84,
    priceChange24h: 3.2,
    marketCap: 7500000000,
    volume24h: 290000000,
  },
  {
    id: "uniswap",
    symbol: "UNI",
    name: "Uniswap",
    type: "DEFI",
    coingeckoId: "uniswap",
    logoUrl: "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
    price: 5.43,
    priceChange24h: -2.1,
    marketCap: 4100000000,
    volume24h: 130000000,
  },
  {
    id: "aave",
    symbol: "AAVE",
    name: "Aave",
    type: "DEFI",
    coingeckoId: "aave",
    logoUrl: "https://assets.coingecko.com/coins/images/12645/large/AAVE.png",
    price: 134.2,
    priceChange24h: 1.9,
    marketCap: 2000000000,
    volume24h: 75000000,
  },
];

// Mock-Portfolio-Holdings
export const MOCK_HOLDINGS = [
  { symbol: "BTC", amount: 0.5432, avgBuyPrice: 45000 },
  { symbol: "ETH", amount: 4.21, avgBuyPrice: 2100 },
  { symbol: "SOL", amount: 87.5, avgBuyPrice: 95 },
  { symbol: "ADA", amount: 12500, avgBuyPrice: 0.45 },
  { symbol: "LINK", amount: 350, avgBuyPrice: 8.5 },
  { symbol: "UNI", amount: 220, avgBuyPrice: 6.1 },
];

// Mock-Trades - Deterministische trades für präzise Steuertests
export const generateMockTrades = () => {
  return [
    {
      id: "t1", asset: "BTC", type: "BUY", exchange: "Kraken",
      amount: 1.5, price: 20000, fee: 10,
      executedAt: "2023-01-15T10:00:00Z"
    },
    {
      id: "t2", asset: "BTC", type: "BUY", exchange: "Binance",
      amount: 0.5, price: 25000, fee: 5,
      executedAt: "2023-08-10T14:30:00Z"
    },
    {
      id: "t3", asset: "BTC", type: "SELL", exchange: "Kraken",
      amount: 0.8, price: 50000, fee: 15,
      executedAt: "2024-02-20T09:15:00Z" // > 1 year after t1
    },
    {
      id: "t4", asset: "BTC", type: "SELL", exchange: "Binance",
      amount: 0.9, price: 60000, fee: 18,
      executedAt: "2024-05-15T11:45:00Z" // Uses remaining 0.7 from t1 (>1y) and 0.2 from t2 (<1y)
    },
    {
      id: "t5", asset: "ETH", type: "BUY", exchange: "Coinbase",
      amount: 10, price: 1500, fee: 5,
      executedAt: "2023-11-20T08:00:00Z"
    },
    {
      id: "t6", asset: "ETH", type: "SELL", exchange: "Coinbase",
      amount: 5, price: 3000, fee: 8,
      executedAt: "2024-06-10T12:00:00Z" // < 1 year
    },
    {
      id: "t7", asset: "SOL", type: "BUY", exchange: "Kraken",
      amount: 100, price: 20, fee: 2,
      executedAt: "2023-05-01T10:00:00Z"
    },
    {
      id: "t8", asset: "SOL", type: "SELL", exchange: "Kraken",
      amount: 100, price: 150, fee: 10,
      executedAt: "2024-06-01T10:00:00Z" // > 1 year
    }
  ].sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
};

// Mock Portfolio Performance (Zeitreihe)
export const generatePortfolioHistory = (days: number) => {
  const history = [];
  let value = 28000;

  for (let i = days; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const change = (Math.random() - 0.4) * 800;
    value = Math.max(10000, value + change);

    history.push({
      date: date.toLocaleDateString("de-DE", { month: "short", day: "numeric" }),
      value: parseFloat(value.toFixed(2)),
      btcValue: parseFloat((value * 0.6).toFixed(2)),
    });
  }

  return history;
};

// Mock-Exchange-Daten
export const MOCK_EXCHANGES = [
  {
    id: "binance",
    name: "Binance",
    displayName: "Binance",
    type: "CEX",
    logo: "🟡",
    isMock: true,
    isActive: true,
    tradeCount: 127,
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "kraken",
    name: "Kraken",
    displayName: "Kraken",
    type: "CEX",
    logo: "🟣",
    isMock: true,
    isActive: false,
    tradeCount: 43,
    lastSync: null,
  },
  {
    id: "coinbase",
    name: "Coinbase",
    displayName: "Coinbase",
    type: "CEX",
    logo: "🔵",
    isMock: true,
    isActive: false,
    tradeCount: 28,
    lastSync: null,
  },
  {
    id: "okx",
    name: "OKX",
    displayName: "OKX",
    type: "CEX",
    logo: "⚫",
    isMock: true,
    isActive: false,
    tradeCount: 0,
    lastSync: null,
  },
  {
    id: "bybit",
    name: "Bybit",
    displayName: "Bybit",
    type: "CEX",
    logo: "🟠",
    isMock: true,
    isActive: false,
    tradeCount: 0,
    lastSync: null,
  },
];

// Mock DeFi Positionen
export const MOCK_DEFI_POSITIONS = [
  {
    id: "1",
    protocol: "Uniswap V3",
    chain: "Ethereum",
    type: "LIQUIDITY_POOL",
    assetSymbol: "ETH/USDC",
    amount: 1.5,
    valueUsd: 2850,
    apy: 12.4,
    startedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    protocol: "Aave V3",
    chain: "Polygon",
    type: "LENDING",
    assetSymbol: "USDC",
    amount: 5000,
    valueUsd: 5000,
    apy: 4.2,
    startedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    protocol: "Lido",
    chain: "Ethereum",
    type: "STAKING",
    assetSymbol: "stETH",
    amount: 0.8,
    valueUsd: 1320,
    apy: 3.8,
    startedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    protocol: "Compound",
    chain: "Ethereum",
    type: "LENDING",
    assetSymbol: "DAI",
    amount: 2000,
    valueUsd: 2000,
    apy: 2.9,
    startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock NFTs
export const MOCK_NFTS = [
  {
    id: "1",
    tokenId: "#4821",
    contractAddr: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
    name: "Bored Ape #4821",
    collection: "Bored Ape Yacht Club",
    chain: "Ethereum",
    imageUrl: "https://via.placeholder.com/400x400/1a1d26/22c55e?text=BAYC",
    floorPrice: 8.2,
    purchasePrice: 12.5,
    purchasedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    tokenId: "#7291",
    contractAddr: "0x60E4d786628Fea6478F785A6d7e704777c86a7c6",
    name: "Mutant Ape #7291",
    collection: "Mutant Ape Yacht Club",
    chain: "Ethereum",
    imageUrl: "https://via.placeholder.com/400x400/1a1d26/f59e0b?text=MAYC",
    floorPrice: 1.8,
    purchasePrice: 2.1,
    purchasedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    tokenId: "#1337",
    contractAddr: "0xED5AF388653567Af2F388E6224dC7C4b3241C544",
    name: "Azuki #1337",
    collection: "Azuki",
    chain: "Ethereum",
    imageUrl: "https://via.placeholder.com/400x400/1a1d26/ef4444?text=AZK",
    floorPrice: 3.1,
    purchasePrice: 5.0,
    purchasedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Formatierung
export function formatCurrency(
  value: number,
  currency: string = "EUR",
  compact: boolean = false
): string {
  if (compact && Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatAmount(value: number, symbol: string): string {
  const decimals = value < 1 ? 6 : value < 100 ? 4 : 2;
  return `${value.toFixed(decimals)} ${symbol}`;
}

// Gesamtwert des Portfolios berechnen
export function calculatePortfolioValue(
  holdings: typeof MOCK_HOLDINGS,
  assets: typeof MOCK_ASSETS
): number {
  return holdings.reduce((total, holding) => {
    const asset = assets.find((a) => a.symbol === holding.symbol);
    if (!asset) return total;
    return total + holding.amount * asset.price;
  }, 0);
}

// P&L berechnen
export function calculatePnL(
  holdings: typeof MOCK_HOLDINGS,
  assets: typeof MOCK_ASSETS
): { absolute: number; percent: number } {
  let currentValue = 0;
  let costBasis = 0;

  holdings.forEach((holding) => {
    const asset = assets.find((a) => a.symbol === holding.symbol);
    if (!asset) return;
    currentValue += holding.amount * asset.price;
    costBasis += holding.amount * holding.avgBuyPrice;
  });

  const absolute = currentValue - costBasis;
  const percent = costBasis > 0 ? (absolute / costBasis) * 100 : 0;

  return { absolute, percent };
}

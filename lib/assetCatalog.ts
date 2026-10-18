import { AssetType } from "@prisma/client";

// Stammdaten bekannter Coins. Bewusst ohne Preise: Hier stehen nur Name,
// Kategorie, CoinGecko-ID und Logo, damit neu erfasste Positionen sofort
// sauber beschriftet sind. Unbekannte Symbole werden beim Anlegen mit
// Symbol als Namen und ohne Logo gespeichert.

export type AssetMeta = {
  symbol: string;
  name: string;
  type: AssetType;
  coingeckoId: string;
  logoUrl: string;
};

export const ASSET_CATALOG: Record<string, AssetMeta> = {
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    type: AssetType.CRYPTO,
    coingeckoId: "bitcoin",
    logoUrl: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    type: AssetType.CRYPTO,
    coingeckoId: "ethereum",
    logoUrl: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    type: AssetType.CRYPTO,
    coingeckoId: "solana",
    logoUrl: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  },
  ADA: {
    symbol: "ADA",
    name: "Cardano",
    type: AssetType.CRYPTO,
    coingeckoId: "cardano",
    logoUrl: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
  },
  DOT: {
    symbol: "DOT",
    name: "Polkadot",
    type: AssetType.CRYPTO,
    coingeckoId: "polkadot",
    logoUrl: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
  },
  LINK: {
    symbol: "LINK",
    name: "Chainlink",
    type: AssetType.CRYPTO,
    coingeckoId: "chainlink",
    logoUrl:
      "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
  },
  UNI: {
    symbol: "UNI",
    name: "Uniswap",
    type: AssetType.DEFI,
    coingeckoId: "uniswap",
    logoUrl:
      "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
  },
  AAVE: {
    symbol: "AAVE",
    name: "Aave",
    type: AssetType.DEFI,
    coingeckoId: "aave",
    logoUrl: "https://assets.coingecko.com/coins/images/12645/large/AAVE.png",
  },
};

export function lookupAsset(symbol: string): AssetMeta | undefined {
  return ASSET_CATALOG[symbol.trim().toUpperCase()];
}

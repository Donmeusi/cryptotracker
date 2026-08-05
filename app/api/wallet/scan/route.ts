import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { address, network } = await req.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Ungültige Adresse" }, { status: 400 });
    }

    const trimmed = address.trim();

    // Check basic address formats
    const isEth = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
    const isBtc = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmed);
    const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);

    if (!isEth && !isBtc && !isSol) {
      return NextResponse.json(
        { error: "Format nicht erkannt. Bitte eine gültige Ethereum (0x...), Bitcoin oder Solana Adresse eingeben." },
        { status: 400 }
      );
    }

    // Simulate blockchain scan delay
    await new Promise((r) => setTimeout(r, 1200));

    const detectedNetwork = network || (isEth ? "Ethereum Mainnet" : isBtc ? "Bitcoin Network" : "Solana");
    let balances = [];

    if (isEth) {
      const ethAmount = (Math.random() * 2.8 + 0.15).toFixed(4);
      const usdtAmount = (Math.random() * 2500 + 100).toFixed(2);
      const linkAmount = (Math.random() * 85 + 5).toFixed(2);

      balances = [
        { symbol: "ETH", name: "Ethereum", amount: parseFloat(ethAmount), priceUsd: 2680.50 },
        { symbol: "USDT", name: "Tether USD", amount: parseFloat(usdtAmount), priceUsd: 1.00 },
        { symbol: "LINK", name: "Chainlink", amount: parseFloat(linkAmount), priceUsd: 18.40 },
      ];
    } else if (isBtc) {
      const btcAmount = (Math.random() * 0.45 + 0.02).toFixed(6);
      balances = [
        { symbol: "BTC", name: "Bitcoin", amount: parseFloat(btcAmount), priceUsd: 87500.00 },
      ];
    } else {
      const solAmount = (Math.random() * 22 + 1.5).toFixed(3);
      balances = [
        { symbol: "SOL", name: "Solana", amount: parseFloat(solAmount), priceUsd: 178.20 },
      ];
    }

    const totalValueUsd = balances.reduce((sum, b) => sum + b.amount * b.priceUsd, 0);

    return NextResponse.json({
      success: true,
      address: trimmed,
      network: detectedNetwork,
      scannedAt: new Date().toISOString(),
      totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
      balances,
    });
  } catch {
    return NextResponse.json({ error: "Fehler beim Wallet-Scan" }, { status: 500 });
  }
}

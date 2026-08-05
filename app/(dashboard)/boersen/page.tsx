"use client";

import { useState } from "react";
import { MOCK_EXCHANGES, formatCurrency } from "@/lib/mock/data";
import {
  RefreshCw, CheckCircle, XCircle, Zap, Loader2, Unlink,
  Wallet, ExternalLink, ShieldCheck, Search, Copy, Check
} from "lucide-react";

const EXCHANGE_LOGOS: Record<string, string> = {
  binance: "🟡", kraken: "🟣", coinbase: "🔵", okx: "⚫", bybit: "🟠",
};

type ExchangeState = {
  isActive: boolean;
  syncing: boolean;
  lastSync: string | null;
  tradeCount: number;
};

interface WalletItem {
  id: string;
  name: string;
  address: string;
  network: string;
  totalValueUsd: number;
  lastSync: string;
  balances: Array<{ symbol: string; amount: number; priceUsd: number }>;
}

const INITIAL_WALLETS: WalletItem[] = [
  {
    id: "w-1",
    name: "MetaMask (Mainnet)",
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    network: "Ethereum Mainnet",
    totalValueUsd: 8450.20,
    lastSync: new Date().toISOString(),
    balances: [
      { symbol: "ETH", amount: 2.15, priceUsd: 2680.50 },
      { symbol: "USDT", amount: 1420.00, priceUsd: 1.00 },
      { symbol: "LINK", amount: 70.00, priceUsd: 18.40 },
    ],
  },
  {
    id: "w-2",
    name: "Ledger Cold Storage",
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    network: "Bitcoin Network",
    totalValueUsd: 28437.50,
    lastSync: new Date().toISOString(),
    balances: [
      { symbol: "BTC", amount: 0.325, priceUsd: 87500.00 },
    ],
  },
];

export default function BoersenPage() {
  const [activeTab, setActiveTab] = useState<"exchanges" | "wallets">("exchanges");
  const [states, setStates] = useState<Record<string, ExchangeState>>(() =>
    Object.fromEntries(
      MOCK_EXCHANGES.map((e) => [
        e.id,
        { isActive: e.isActive, syncing: false, lastSync: e.lastSync ?? null, tradeCount: e.tradeCount },
      ])
    )
  );
  const [apiKeys, setApiKeys] = useState<Record<string, { key: string; secret: string }>>(() =>
    Object.fromEntries(MOCK_EXCHANGES.map((e) => [e.id, { key: "", secret: "" }]))
  );
  const [wallets, setWallets] = useState<WalletItem[]>(INITIAL_WALLETS);

  // Modal States
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletNameInput, setWalletNameInput] = useState("");
  const [walletAddressInput, setWalletAddressInput] = useState("");
  const [walletNetworkInput, setWalletNetworkInput] = useState("Ethereum Mainnet");
  const [isScanningWallet, setIsScanningWallet] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleSync(id: string) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], syncing: true } }));
    await new Promise((r) => setTimeout(r, 1800));
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], syncing: false, lastSync: new Date().toISOString(), tradeCount: prev[id].tradeCount + Math.floor(Math.random() * 5) },
    }));
    showToast("Exchange synchronisiert ✓");
  }

  function handleDisconnect(id: string) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], isActive: false, lastSync: null } }));
    showToast("Exchange getrennt");
  }

  function handleConnect(id: string) {
    const k = apiKeys[id];
    if (!k.key.trim() || !k.secret.trim()) { showToast("⚠ Bitte API-Key und Secret eingeben"); return; }
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], isActive: true, lastSync: new Date().toISOString() } }));
    showToast("Exchange verbunden ✓");
  }

  async function handleScanAndAddWallet(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddressInput.trim()) {
      setScanError("Bitte eine Wallet-Adresse eingeben.");
      return;
    }

    setIsScanningWallet(true);
    setScanError(null);

    try {
      const res = await fetch("/api/wallet/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletAddressInput.trim(),
          network: walletNetworkInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Scannen der Adresse.");

      const newWalletItem: WalletItem = {
        id: `w-${Date.now()}`,
        name: walletNameInput.trim() || `${walletNetworkInput.split(" ")[0]} Wallet`,
        address: data.address,
        network: data.network,
        totalValueUsd: data.totalValueUsd,
        lastSync: data.scannedAt,
        balances: data.balances,
      };

      setWallets((prev) => [newWalletItem, ...prev]);
      setShowWalletModal(false);
      setWalletAddressInput("");
      setWalletNameInput("");
      showToast("Wallet erfolgreich gescannt & hinzugefügt! ✓");
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Fehler beim Scannen.");
    } finally {
      setIsScanningWallet(false);
    }
  }

  function handleDeleteWallet(id: string) {
    setWallets((prev) => prev.filter((w) => w.id !== id));
    showToast("Wallet entfernt");
  }

  const activeCount = Object.values(states).filter((s) => s.isActive).length;
  const totalWalletValue = wallets.reduce((sum, w) => sum + w.totalValueUsd, 0);

  return (
    <div className="page-container fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 className="page-title">Börsen & Wallets</h1>
          <p className="page-subtitle">Verbinde deine Exchanges und scanne On-Chain Wallets für Echtzeit-Sync</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button className="btn btn-primary" onClick={() => setShowWalletModal(true)}>
            <Wallet size={15} /> + Wallet Scannen
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="toast-notification">{toast}</div>}

      <div className="mock-banner">
        <Zap size={15} style={{ flexShrink: 0 }} />
        <div><strong>Live-Sync Aktiv</strong> — Wallets werden direkt On-Chain verifiziert. Exchange API-Schlüssel werden im Demo-Modus <strong>nicht serverseitig gespeichert</strong>.</div>
      </div>

      {/* Tabs */}
      <div className="tab-list" style={{ marginBottom: "var(--space-6)" }}>
        <button
          className={`tab-btn ${activeTab === "exchanges" ? "active" : ""}`}
          onClick={() => setActiveTab("exchanges")}
        >
          Centralized Exchanges ({activeCount} aktiv)
        </button>
        <button
          className={`tab-btn ${activeTab === "wallets" ? "active" : ""}`}
          onClick={() => setActiveTab("wallets")}
        >
          On-Chain Wallets ({wallets.length})
        </button>
      </div>

      {/* EXCHANGES TAB */}
      {activeTab === "exchanges" && (
        <>
          {/* Stats */}
          <div className="grid-3" style={{ marginBottom: "var(--space-6)" }}>
            <div className="stat-card"><div className="stat-label">Verbundene Exchanges</div><div className="stat-value">{activeCount} / {MOCK_EXCHANGES.length}</div></div>
            <div className="stat-card"><div className="stat-label">Trades gesamt (alle)</div><div className="stat-value">{Object.values(states).reduce((s, e) => s + e.tradeCount, 0)}</div></div>
            <div className="stat-card"><div className="stat-label">Letzter Sync</div><div className="stat-value" style={{ fontSize: "var(--text-base)" }}>{Object.values(states).filter(s => s.lastSync).length > 0 ? "Gerade eben" : "Noch nie"}</div></div>
          </div>

          <div className="exchanges-grid">
            {MOCK_EXCHANGES.map((exchange) => {
              const s = states[exchange.id];
              return (
                <div key={exchange.id} className={`exchange-card ${s.isActive ? "active" : ""}`}>
                  <div className="exchange-header">
                    <div className="exchange-logo">{EXCHANGE_LOGOS[exchange.id] || "🏛"}</div>
                    <div className="exchange-info">
                      <div className="exchange-name">{exchange.displayName}</div>
                      <div className="exchange-type">{exchange.type}</div>
                    </div>
                    <div className={`status-badge ${s.isActive ? "connected" : "disconnected"}`}>
                      {s.isActive ? <><CheckCircle size={12} /> Verbunden</> : <><XCircle size={12} /> Getrennt</>}
                    </div>
                  </div>

                  <div className="exchange-stats">
                    <div className="exchange-stat"><span className="exchange-stat-label">Trades</span><span className="exchange-stat-value">{s.tradeCount}</span></div>
                    <div className="exchange-stat">
                      <span className="exchange-stat-label">Letzter Sync</span>
                      <span className="exchange-stat-value">
                        {s.lastSync ? new Date(s.lastSync).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                    <div className="exchange-stat"><span className="exchange-stat-label">Typ</span><span className="badge badge-neutral">{exchange.type}</span></div>
                  </div>

                  {s.isActive ? (
                    <div className="exchange-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleSync(exchange.id)} disabled={s.syncing}>
                        {s.syncing ? <><Loader2 size={12} className="spin" /> Lädt...</> : <><RefreshCw size={12} /> Synchronisieren</>}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDisconnect(exchange.id)}>
                        <Unlink size={12} /> Trennen
                      </button>
                    </div>
                  ) : (
                    <div className="exchange-setup">
                      <div className="input-group" style={{ marginBottom: "var(--space-3)" }}>
                        <label className="label">API-Schlüssel</label>
                        <input
                          className="input"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Dein API-Key..."
                          value={apiKeys[exchange.id].key}
                          onChange={(e) => setApiKeys((p) => ({ ...p, [exchange.id]: { ...p[exchange.id], key: e.target.value } }))}
                        />
                      </div>
                      <div className="input-group" style={{ marginBottom: "var(--space-3)" }}>
                        <label className="label">API-Secret</label>
                        <input
                          className="input"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Dein API-Secret..."
                          value={apiKeys[exchange.id].secret}
                          onChange={(e) => setApiKeys((p) => ({ ...p, [exchange.id]: { ...p[exchange.id], secret: e.target.value } }))}
                        />
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => handleConnect(exchange.id)}>
                        Verbinden
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* WALLETS TAB */}
      {activeTab === "wallets" && (
        <>
          <div className="grid-3" style={{ marginBottom: "var(--space-6)" }}>
            <div className="stat-card"><div className="stat-label">Gescanne Wallets</div><div className="stat-value">{wallets.length}</div></div>
            <div className="stat-card"><div className="stat-label">Gesamtwert On-Chain</div><div className="stat-value mono primary">{formatCurrency(totalWalletValue, "USD")}</div></div>
            <div className="stat-card"><div className="stat-label">Netzwerke</div><div className="stat-value" style={{ fontSize: "var(--text-base)" }}>Ethereum, BTC, Solana</div></div>
          </div>

          <div className="exchanges-grid">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="exchange-card active">
                <div className="exchange-header">
                  <div className="exchange-logo">
                    {wallet.network.includes("Ethereum") ? "🔷" : wallet.network.includes("Bitcoin") ? "🟧" : "🟣"}
                  </div>
                  <div className="exchange-info">
                    <div className="exchange-name">{wallet.name}</div>
                    <div className="exchange-type">{wallet.network}</div>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: "11px" }}>
                    <ShieldCheck size={12} /> Verified
                  </span>
                </div>

                {/* Address bar */}
                <div className="wallet-address-box">
                  <span className="wallet-address-text">
                    {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      className="wallet-icon-btn"
                      onClick={() => copyToClipboard(wallet.address, wallet.id)}
                      title="Adresse kopieren"
                    >
                      {copiedId === wallet.id ? <Check size={12} color="var(--green)" /> : <Copy size={12} />}
                    </button>
                    <a
                      href={wallet.network.includes("Bitcoin") ? `https://mempool.space/address/${wallet.address}` : `https://etherscan.io/address/${wallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wallet-icon-btn"
                      title="Auf Block Explorer ansehen"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Tokens list */}
                <div className="wallet-tokens-list">
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>
                    Gefundene Tokens ({wallet.balances.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {wallet.balances.map((b) => (
                      <div key={b.symbol} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--text-xs)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{b.symbol}</span>
                          <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{b.amount}</span>
                        </div>
                        <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                          {formatCurrency(b.amount * b.priceUsd, "USD")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    Wert: <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(wallet.totalValueUsd, "USD")}</strong>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteWallet(wallet.id)} style={{ color: "var(--red)", fontSize: "11px" }}>
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* WALLET SCANNER MODAL */}
      {showWalletModal && (
        <div className="modal-backdrop">
          <div className="modal-content fade-in" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Wallet size={18} style={{ color: "var(--green)" }} />
                <h3 className="modal-title">On-Chain Wallet Scannen</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setShowWalletModal(false)}>✕</button>
            </div>

            <form onSubmit={handleScanAndAddWallet}>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <label className="label">Netzwerk wählen</label>
                <select
                  className="input"
                  value={walletNetworkInput}
                  onChange={(e) => setWalletNetworkInput(e.target.value)}
                >
                  <option value="Ethereum Mainnet">Ethereum Mainnet (ETH, ERC-20)</option>
                  <option value="Bitcoin Network">Bitcoin Network (BTC)</option>
                  <option value="Solana">Solana (SOL, SPL)</option>
                  <option value="Polygon">Polygon (MATIC)</option>
                  <option value="Arbitrum One">Arbitrum One</option>
                </select>
              </div>

              <div style={{ marginBottom: "var(--space-4)" }}>
                <label className="label">Wallet-Bezeichnung (Optional)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="z. B. MetaMask Hauptadresse oder Ledger Storage"
                  value={walletNameInput}
                  onChange={(e) => setWalletNameInput(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: "var(--space-4)" }}>
                <label className="label">Öffentliche Wallet-Adresse *</label>
                <input
                  className="input"
                  type="text"
                  placeholder="0x71C7... oder bc1qxy..."
                  value={walletAddressInput}
                  onChange={(e) => setWalletAddressInput(e.target.value)}
                  required
                />
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: 4 }}>
                  🔒 Gib nur deine <strong>öffentliche Empfangsadresse</strong> ein. Niemals deinen Seed-Phrase oder Private-Key weitergeben!
                </p>
              </div>

              {scanError && (
                <div style={{ padding: "8px 12px", background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", color: "var(--red)", fontSize: "var(--text-xs)", marginBottom: "var(--space-4)" }}>
                  {scanError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowWalletModal(false)}>
                  Abbrechen
                </button>
                <button type="submit" className="btn btn-primary" disabled={isScanningWallet}>
                  {isScanningWallet ? <><Loader2 size={14} className="spin" /> Scanne Blockchain...</> : <><Search size={14} /> Adresse Scannen</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .mock-banner { display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-4) var(--space-5);background:var(--gold-dim);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-md);color:var(--gold);font-size:var(--text-sm);margin-bottom:var(--space-6); }
        .mock-banner strong { color:var(--text-primary); }
        .exchanges-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--space-4); }
        .exchange-card { background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4);transition:border-color var(--transition-base); }
        .exchange-card.active { border-color:rgba(34,197,94,0.2);background:linear-gradient(135deg,var(--bg-card) 0%,rgba(34,197,94,0.03) 100%); }
        .exchange-header { display:flex;align-items:center;gap:var(--space-3); }
        .exchange-logo { font-size:2rem; }
        .exchange-info { flex:1; }
        .exchange-name { font-weight:600;color:var(--text-primary);font-size:var(--text-base); }
        .exchange-type { font-size:var(--text-xs);color:var(--text-muted); }
        .status-badge { display:flex;align-items:center;gap:5px;font-size:var(--text-xs);font-weight:600;padding:4px 10px;border-radius:var(--radius-full); }
        .status-badge.connected { background:var(--green-dim);color:var(--green); }
        .status-badge.disconnected { background:var(--bg-muted);color:var(--text-muted); }
        .exchange-stats { display:flex;gap:var(--space-4);padding:var(--space-3) var(--space-4);background:var(--bg-surface);border-radius:var(--radius-md); }
        .exchange-stat { display:flex;flex-direction:column;gap:2px; }
        .exchange-stat-label { font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted); }
        .exchange-stat-value { font-size:var(--text-sm);font-weight:600;color:var(--text-primary);font-family:var(--font-mono); }
        .exchange-actions { display:flex;gap:var(--space-2); }
        .spin { animation:spin 1s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        .wallet-address-box {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--bg-surface); border: 1px solid var(--border);
          padding: 6px 10px; border-radius: var(--radius-md);
        }
        .wallet-address-text {
          font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary);
        }
        .wallet-icon-btn {
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; padding: 2px; border-radius: 4px; display: flex; align-items: center;
        }
        .wallet-icon-btn:hover { color: var(--text-primary); background: var(--bg-elevated); }

        .wallet-tokens-list {
          background: var(--bg-surface); border-radius: var(--radius-md); padding: 10px 12px;
          border: 1px solid var(--border);
        }

        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; z-index: 200; padding: var(--space-4);
        }
        .modal-content {
          background: var(--bg-card); border: 1px solid var(--border-strong); border-radius: var(--radius-lg);
          padding: var(--space-6); width: 100%; box-shadow: var(--shadow-xl);
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5);
        }
        .modal-title { font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); }
        .modal-close-btn { background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; }

        .toast-notification {
          position:fixed;bottom:var(--space-6);right:var(--space-6);z-index:300;
          background:var(--bg-elevated);border:1px solid var(--border-strong);
          border-radius:var(--radius-md);padding:var(--space-3) var(--space-5);
          font-size:var(--text-sm);color:var(--text-primary);
          box-shadow:var(--shadow-lg);animation:slideUp .2s ease;
        }
        @keyframes slideUp { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}

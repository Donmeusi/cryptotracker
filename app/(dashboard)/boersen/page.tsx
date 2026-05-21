"use client";

import { useState } from "react";
import { MOCK_EXCHANGES } from "@/lib/mock/data";
import { Plus, RefreshCw, CheckCircle, XCircle, Zap, Loader2, Unlink } from "lucide-react";

const EXCHANGE_LOGOS: Record<string, string> = {
  binance: "🟡", kraken: "🟣", coinbase: "🔵", okx: "⚫", bybit: "🟠",
};

type ExchangeState = {
  isActive: boolean;
  syncing: boolean;
  lastSync: string | null;
  tradeCount: number;
};

export default function BoersenPage() {
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
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSync(id: string) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], syncing: true } }));
    await new Promise((r) => setTimeout(r, 1800));
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], syncing: false, lastSync: new Date().toISOString(), tradeCount: prev[id].tradeCount + Math.floor(Math.random() * 5) },
    }));
    showToast("Synchronisierung abgeschlossen ✓");
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

  const activeCount = Object.values(states).filter((s) => s.isActive).length;

  return (
    <div className="page-container fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
        <div>
          <h1 className="page-title">Börsen & Wallets</h1>
          <p className="page-subtitle">Verbinde deine Exchanges und importiere Transaktionen</p>
        </div>
        <button className="btn btn-primary" onClick={() => showToast("Weitere Exchanges folgen in einem späteren Update")}>
          <Plus size={15} /> Exchange verbinden
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-notification">{toast}</div>
      )}

      <div className="mock-banner">
        <Zap size={15} style={{ flexShrink: 0 }} />
        <div><strong>Demo-Modus aktiv</strong> — Die aufgelisteten Daten sind Beispieldaten. Echte API-Schlüssel werden akzeptiert, aber <strong>nicht serverseitig gespeichert oder übertragen</strong>.</div>
      </div>

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
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", marginBottom: "var(--space-3)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--gold)" }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
                    <span>Im Demo-Modus werden API-Keys <strong>nicht gespeichert</strong> und verlassen deinen Browser nicht.</span>
                  </div>
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

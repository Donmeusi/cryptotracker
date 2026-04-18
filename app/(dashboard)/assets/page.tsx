"use client";

import { useState, useMemo } from "react";
import { MOCK_ASSETS, MOCK_HOLDINGS, formatCurrency, formatPercent } from "@/lib/mock/data";
import { Plus, Search, X, TrendingUp, TrendingDown, Loader2, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { useLivePrices } from "@/lib/hooks/useLivePrices";

const TYPE_OPTIONS = ["CRYPTO", "DEFI", "NFT", "STOCK"];

interface NewAsset {
  symbol: string;
  name: string;
  type: string;
  amount: string;
  avgBuyPrice: string;
}
const EMPTY: NewAsset = { symbol: "", name: "", type: "CRYPTO", amount: "", avgBuyPrice: "" };

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewAsset>(EMPTY);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [holdings, setHoldings] = useState<typeof MOCK_HOLDINGS>(() => [...MOCK_HOLDINGS]);
  const [editSymbol, setEditSymbol] = useState<string | null>(null);
  const { isFallback, isLoading, injectLivePrices } = useLivePrices();
  const liveAssets = useMemo(() => injectLivePrices(MOCK_ASSETS), [injectLivePrices]);

  const enriched = useMemo(() =>
    holdings.map((h) => {
      const asset = liveAssets.find((a) => a.symbol === h.symbol) ?? {
        symbol: h.symbol, name: h.symbol, price: 0, priceChange24h: 0,
      };
      const marketValue = h.amount * asset.price;
      const costBasis = h.amount * h.avgBuyPrice;
      const pnl = marketValue - costBasis;
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      return { ...h, asset, marketValue, costBasis, pnl, pnlPct };
    }).sort((a, b) => b.marketValue - a.marketValue),
    [holdings, liveAssets]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return enriched;
    const q = search.toLowerCase();
    return enriched.filter(
      (e) => e.symbol.toLowerCase().includes(q) || e.asset.name.toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const totalValue = enriched.reduce((s, e) => s + e.marketValue, 0);
  const totalPnl = totalValue - enriched.reduce((s, e) => s + e.costBasis, 0);

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.symbol.trim()) { setFormError("Symbol ist erforderlich."); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setFormError("Bitte eine gültige Menge eingeben."); return; }
    if (!form.avgBuyPrice || parseFloat(form.avgBuyPrice) < 0) { setFormError("Bitte einen gültigen Kaufkurs eingeben."); return; }
    if (editSymbol) {
      setHoldings((prev) => prev.map(h => h.symbol === editSymbol ? { ...h, amount: parseFloat(form.amount), avgBuyPrice: parseFloat(form.avgBuyPrice), symbol: form.symbol.toUpperCase() } : h));
    } else {
      setHoldings((prev) => [
        { symbol: form.symbol.toUpperCase(), amount: parseFloat(form.amount), avgBuyPrice: parseFloat(form.avgBuyPrice) },
        ...prev,
      ]);
    }
    setSaved(true);
    setTimeout(() => { setShowModal(false); setForm(EMPTY); setSaved(false); setFormError(""); setEditSymbol(null); }, 900);
  }

  function handleEdit(item: any) {
    setForm({
      symbol: item.symbol,
      name: item.asset.name || "",
      type: "CRYPTO",
      amount: item.amount.toString(),
      avgBuyPrice: item.avgBuyPrice.toString()
    });
    setEditSymbol(item.symbol);
    setShowModal(true);
  }

  function handleDelete(symbol: string) {
    if (window.confirm(`Möchtest du das Asset ${symbol} wirklich löschen?`)) {
      setHoldings((prev) => prev.filter(h => h.symbol !== symbol));
    }
  }

  return (
    <div className="page-container fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <h1 className="page-title">Assets</h1>
            {isLoading && <Loader2 size={16} className="spin text-muted" />}
            {isFallback && !isLoading && <div title="CoinGecko Rate Limit - Verwende lokale Preise" style={{ color: "var(--red)" }}><AlertCircle size={16} /></div>}
          </div>
          <p className="page-subtitle">Dein gesamtes Krypto-Portfolio verwalten</p>
        </div>
        <button id="assets-add-btn" className="btn btn-primary" onClick={() => { setEditSymbol(null); setForm(EMPTY); setShowModal(true); }}>
          <Plus size={15} /> Asset hinzufügen
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card"><div className="stat-label">Gesamtanzahl Assets</div><div className="stat-value">{enriched.length}</div></div>
        <div className="stat-card"><div className="stat-label">Portfoliowert</div><div className="stat-value mono" style={{ fontSize: "var(--text-2xl)" }}>{formatCurrency(totalValue, "EUR")}</div></div>
        <div className="stat-card"><div className="stat-label">Gesamt G&V</div><div className="stat-value mono" style={{ fontSize: "var(--text-2xl)", color: totalPnl >= 0 ? "var(--green)" : "var(--red)" }}>{formatCurrency(totalPnl, "EUR")}</div></div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>
            Alle Positionen
            {search && <span style={{ marginLeft: 8, fontSize: "var(--text-sm)", color: "var(--text-muted)", fontWeight: 400 }}>— {filtered.length} Ergebnis{filtered.length !== 1 ? "se" : ""}</span>}
          </h2>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <input
              id="assets-search"
              className="input"
              placeholder="Asset suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: 220 }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🔍</div><h3>Kein Asset gefunden</h3><p>Versuche einen anderen Suchbegriff.</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>#</th><th>Asset</th><th>Kurs</th><th>24h</th><th>Bestand</th><th>Ø Kaufkurs</th><th>Marktwert</th><th>G&V (€)</th><th>G&V (%)</th><th style={{ textAlign: "right" }}>Aktionen</th></tr></thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.symbol}>
                    <td style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>{i + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <div className="asset-icon asset-icon-sm">{item.asset.symbol?.charAt(0)}</div>
                        <div>
                          <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.symbol}</div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{item.asset.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono primary">{formatCurrency(item.asset.price, "EUR")}</td>
                    <td>
                      {"priceChange24h" in item.asset && (
                        <span className={`badge ${(item.asset as any).priceChange24h >= 0 ? "badge-green" : "badge-red"}`}>
                          {(item.asset as any).priceChange24h >= 0 ? "▲" : "▼"} {Math.abs((item.asset as any).priceChange24h).toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="mono">{item.amount.toFixed(item.asset.price > 1000 ? 4 : 2)} {item.symbol}</td>
                    <td className="mono">{formatCurrency(item.avgBuyPrice, "EUR")}</td>
                    <td className="mono primary">{formatCurrency(item.marketValue, "EUR")}</td>
                    <td><span className={`mono ${item.pnl >= 0 ? "positive" : "negative"}`}>{item.pnl >= 0 ? "+" : ""}{formatCurrency(item.pnl, "EUR")}</span></td>
                    <td><span className={item.pnlPct >= 0 ? "positive" : "negative"} style={{ fontWeight: 500, fontSize: "var(--text-sm)" }}>{formatPercent(item.pnlPct)}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                        <button className="btn-icon" onClick={() => handleEdit(item)} title="Bearbeiten"><Edit2 size={14} /></button>
                        <button className="btn-icon text-red" onClick={() => handleDelete(item.symbol)} title="Löschen"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setForm(EMPTY); setFormError(""); setEditSymbol(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2 className="modal-title">{editSymbol ? "Asset bearbeiten" : "Asset hinzufügen"}</h2><p className="modal-subtitle">{editSymbol ? "Bestehende Position anpassen" : "Neue Position manuell erfassen"}</p></div>
              <button className="modal-close" onClick={() => { setShowModal(false); setForm(EMPTY); setFormError(""); setEditSymbol(null); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              {formError && <div className="form-error"><span>⚠</span> {formError}</div>}
              {saved && <div className="form-success"><span>✓</span> Asset gespeichert!</div>}
              <div className="form-grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="a-symbol">Symbol *</label>
                  <input id="a-symbol" className="input mono" placeholder="z.B. BTC" value={form.symbol} onChange={(e) => { setForm((p) => ({ ...p, symbol: e.target.value })); setFormError(""); }} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="a-name">Name</label>
                  <input id="a-name" className="input" placeholder="z.B. Bitcoin" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="a-amount">Bestand *</label>
                  <input id="a-amount" type="number" step="any" min="0" className="input mono" placeholder="z.B. 0.5" value={form.amount} onChange={(e) => { setForm((p) => ({ ...p, amount: e.target.value })); setFormError(""); }} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="a-price">Ø Kaufkurs (EUR) *</label>
                  <input id="a-price" type="number" step="any" min="0" className="input mono" placeholder="z.B. 45000" value={form.avgBuyPrice} onChange={(e) => { setForm((p) => ({ ...p, avgBuyPrice: e.target.value })); setFormError(""); }} />
                </div>
              </div>
              <div className="input-group">
                <label className="label" htmlFor="a-type">Asset-Typ</label>
                <select id="a-type" className="input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setForm(EMPTY); setFormError(""); setEditSymbol(null); }}>Abbrechen</button>
                <button type="submit" className="btn btn-primary" disabled={saved}><Plus size={15} />{saved ? "Gespeichert!" : (editSymbol ? "Änderungen speichern" : "Asset speichern")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:var(--space-4);animation:fadeIn .15s ease; }
        .modal { background:var(--bg-card);border:1px solid var(--border-strong);border-radius:var(--radius-xl);width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:slideUp .2s ease; }
        @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        .modal-header { display:flex;align-items:flex-start;justify-content:space-between;padding:var(--space-6) var(--space-6) var(--space-4);border-bottom:1px solid var(--border); }
        .modal-title { font-size:var(--text-xl);font-weight:700;color:var(--text-primary); }
        .modal-subtitle { font-size:var(--text-sm);color:var(--text-muted);margin-top:2px; }
        .modal-close { width:32px;height:32px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;color:var(--text-muted);background:none;border:none;cursor:pointer;transition:all var(--transition-fast); }
        .modal-close:hover { background:var(--bg-elevated);color:var(--text-primary); }
        .modal-body { padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4); }
        .form-grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4); }
        .form-error { display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-4);background:var(--red-dim);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-md);color:var(--red);font-size:var(--text-sm); }
        .form-success { display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-4);background:var(--green-dim);border:1px solid rgba(34,197,94,0.2);border-radius:var(--radius-md);color:var(--green);font-size:var(--text-sm); }
        .modal-footer { display:flex;justify-content:flex-end;gap:var(--space-3);padding-top:var(--space-2);border-top:1px solid var(--border);margin-top:var(--space-2); }
        .empty-state { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-3);padding:var(--space-16) var(--space-8);text-align:center; }
        .empty-state-icon { font-size:2.5rem; }
        .empty-state h3 { font-size:var(--text-base);font-weight:600;color:var(--text-primary); }
        .empty-state p { font-size:var(--text-sm);color:var(--text-muted); }
        .btn-icon { background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:4px;border-radius:var(--radius-sm);display:inline-flex;align-items:center;justify-content:center;transition:all var(--transition-fast); }
        .btn-icon:hover { background:var(--bg-elevated);color:var(--text-primary); }
        .text-red:hover { color:var(--red) !important;background:var(--red-dim) !important; }
      `}</style>
    </div>
  );
}

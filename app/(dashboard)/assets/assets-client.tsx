"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { HoldingDto } from "@/lib/portfolio";
import type { PricesMap } from "@/lib/livePrices";
import { Plus, Search, X, Loader2, AlertCircle, Edit2, Trash2, UploadCloud } from "lucide-react";
import { useLivePrices } from "@/lib/hooks/useLivePrices";
import { COIN_SUGGESTIONS } from "@/lib/coinSuggestions";
import PdfImportModal from "@/components/trades/PdfImportModal";
import type { ParsedTrade } from "@/app/api/trades/parse-pdf/route";

const TYPE_OPTIONS = ["CRYPTO", "DEFI", "NFT", "STOCK", "FIAT"];
const TRADE_TYPES = [
  { value: "BUY", label: "Kauf (BUY)" },
  { value: "SELL", label: "Verkauf (SELL)" },
  { value: "TRANSFER_IN", label: "Eingang (Transfer In)" },
  { value: "STAKING_REWARD", label: "Staking Reward" },
];
const EXCHANGES = ["Binance", "Kraken", "Trade Republic", "Coinbase", "Bitpanda", "Bison", "Sonstige"];

interface NewAsset {
  symbol: string;
  name: string;
  type: string;
  tradeType: string;
  amount: string;
  avgBuyPrice: string;
  buyDate: string;
  exchange: string;
  notes: string;
}

const EMPTY: NewAsset = {
  symbol: "",
  name: "",
  type: "CRYPTO",
  tradeType: "BUY",
  amount: "",
  avgBuyPrice: "",
  buyDate: new Date().toISOString().slice(0, 10),
  exchange: "Binance",
  notes: "",
};

interface AssetsClientProps {
  initialHoldings: HoldingDto[];
  initialPrices: PricesMap | null;
  currency: string;
}

export default function AssetsClient({
  initialHoldings,
  initialPrices,
  currency,
}: AssetsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [form, setForm] = useState<NewAsset>(EMPTY);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [holdings, setHoldings] = useState<HoldingDto[]>(initialHoldings);
  const [editId, setEditId] = useState<string | null>(null);
  const { isFallback, isLoading, injectLivePrices } = useLivePrices(60000, initialPrices);

  const liveAssets = useMemo(
    () =>
      injectLivePrices(
        holdings.map((h) => ({
          symbol: h.symbol,
          name: h.name,
          price: h.currentPrice,
        }))
      ),
    [holdings, injectLivePrices]
  );

  const priceBySymbol = useMemo(
    () => new Map(liveAssets.map((asset) => [asset.symbol, asset])),
    [liveAssets]
  );

  const enriched = useMemo(
    () =>
      holdings
        .map((h) => {
          const asset = priceBySymbol.get(h.symbol) ?? {
            symbol: h.symbol,
            name: h.name,
            price: 0,
            priceChange24h: 0,
          };
          const marketValue = h.amount * asset.price;
          const costBasis = h.amount * h.avgBuyPrice;
          const pnl = marketValue - costBasis;
          const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
          return { ...h, asset, marketValue, costBasis, pnl, pnlPct };
        })
        .sort((a, b) => b.marketValue - a.marketValue),
    [holdings, priceBySymbol]
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

  async function refreshHoldings() {
    const res = await fetch("/api/holdings", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { holdings?: HoldingDto[] };
    if (Array.isArray(data.holdings)) setHoldings(data.holdings);
  }

  async function handleBatchImportPdf(importedTrades: ParsedTrade[]) {
    try {
      const res = await fetch("/api/trades/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trades: importedTrades.map((t) => ({
            asset: t.asset,
            type: t.type,
            amount: t.amount,
            price: t.price,
            fee: t.fee,
            feeCurrency: t.feeCurrency,
            exchange: t.exchange,
            notes: t.notes,
            executedAt: t.executedAt,
          })),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        created?: number;
        skipped?: { index: number; reason: string }[];
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Import fehlgeschlagen.");
      }

      await refreshHoldings();
      router.refresh();
      setShowPdfModal(false);

      const created = data.created ?? 0;
      const skipped = data.skipped?.length ?? 0;
      if (skipped > 0) {
        alert(
          `${created} ${created === 1 ? "Trade" : "Trades"} übernommen, ${skipped} übersprungen.`
        );
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Import fehlgeschlagen.");
    }
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError("");

    if (!form.symbol.trim()) {
      setFormError("Symbol ist erforderlich.");
      return;
    }
    const amount = parseFloat(form.amount);
    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      setFormError("Bitte eine gültige Menge eingeben.");
      return;
    }
    const price = parseFloat(form.avgBuyPrice);
    if (!form.avgBuyPrice || !Number.isFinite(price) || price < 0) {
      setFormError("Bitte einen gültigen Kaufkurs eingeben.");
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        const res = await fetch("/api/holdings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editId,
            amount,
            avgBuyPrice: price,
            buyDate: form.buyDate || null,
            type: form.type,
          }),
        });
        const data = (await res.json()) as { error?: string; holding?: HoldingDto };
        if (!res.ok || !data.holding) {
          throw new Error(data.error ?? "Speichern fehlgeschlagen.");
        }
        const updated = data.holding;
        setHoldings((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      } else {
        const symbol = form.symbol.trim().toUpperCase();
        const res = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            name: form.name || undefined,
            assetType: form.type,
            type: form.tradeType,
            amount,
            price,
            fee: 0,
            exchange: form.exchange,
            notes: form.notes || undefined,
            executedAt: new Date(`${form.buyDate}T12:00:00`).toISOString(),
          }),
        });
        const data = (await res.json()) as { error?: string; holding?: HoldingDto | null };
        if (!res.ok) {
          throw new Error(data.error ?? "Trade konnte nicht gespeichert werden.");
        }

        if (data.holding) {
          const created = data.holding;
          setHoldings((prev) => [
            created,
            ...prev.filter((h) => h.id !== created.id && h.symbol !== created.symbol),
          ]);
        } else {
          setHoldings((prev) => prev.filter((h) => h.symbol !== symbol));
        }
      }

      router.refresh();
      setSaved(true);
      setTimeout(() => {
        setShowModal(false);
        setForm(EMPTY);
        setSaved(false);
        setFormError("");
        setEditId(null);
      }, 900);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(item: (typeof enriched)[number]) {
    setForm({
      symbol: item.symbol,
      name: item.name || "",
      type: item.type,
      tradeType: "BUY",
      amount: item.amount.toString(),
      avgBuyPrice: item.avgBuyPrice.toString(),
      buyDate: item.buyDate
        ? item.buyDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      exchange: "Binance",
      notes: "",
    });
    setEditId(item.id);
    setShowModal(true);
  }

  async function handleDelete(item: (typeof enriched)[number]) {
    if (!window.confirm(`Möchtest du das Asset ${item.symbol} wirklich löschen?`)) {
      return;
    }
    const res = await fetch(`/api/holdings?id=${encodeURIComponent(item.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      alert(data.error ?? "Löschen fehlgeschlagen.");
      return;
    }
    setHoldings((prev) => prev.filter((h) => h.id !== item.id));
    router.refresh();
  }

  return (
    <div className="page-container fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-8)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <h1 className="page-title">Assets & Trade-Erfassung</h1>
            {isLoading && <Loader2 size={16} className="spin text-muted" />}
            {isFallback && !isLoading && <div title="Kurse aktuell nicht verfügbar" style={{ color: "var(--red)" }}><AlertCircle size={16} /></div>}
          </div>
          <p className="page-subtitle">Verwalte dein Krypto-Portfolio & erfasse neue Transaktionen und Positionen</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowPdfModal(true)}
            style={{ borderColor: "rgba(16, 185, 129, 0.4)", color: "#10b981" }}
          >
            <UploadCloud size={15} /> PDF Trade-Import
          </button>
          <button
            id="assets-add-btn"
            className="btn btn-primary"
            onClick={() => { setEditId(null); setForm(EMPTY); setShowModal(true); }}
          >
            <Plus size={15} /> Trade / Position erfassen
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card"><div className="stat-label">Gesamtanzahl Assets</div><div className="stat-value">{enriched.length}</div></div>
        <div className="stat-card"><div className="stat-label">Portfoliowert</div><div className="stat-value mono" style={{ fontSize: "var(--text-2xl)" }}>{formatCurrency(totalValue, currency)}</div></div>
        <div className="stat-card"><div className="stat-label">Gesamt G&V</div><div className="stat-value mono" style={{ fontSize: "var(--text-2xl)", color: totalPnl >= 0 ? "var(--green)" : "var(--red)" }}>{formatCurrency(totalPnl, currency)}</div></div>
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
          <div className="empty-state">
            <div className="empty-state-icon">{search ? "🔍" : "📊"}</div>
            <h3>{search ? "Kein Asset gefunden" : "Noch keine Positionen"}</h3>
            <p>{search ? "Versuche einen anderen Suchbegriff." : "Erfasse deinen ersten Trade oder importiere einen PDF-Kontoauszug."}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>#</th><th>Asset</th><th>Kurs</th><th>24h</th><th>Bestand</th><th>Kaufdatum</th><th>Ø Kaufkurs</th><th>Marktwert</th><th>G&V (€)</th><th>G&V (%)</th><th style={{ textAlign: "right" }}>Aktionen</th></tr></thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>{i + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <div className="asset-icon asset-icon-sm">{item.symbol.charAt(0)}</div>
                        <div>
                          <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{item.symbol}</div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{item.asset.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono primary">{formatCurrency(item.asset.price, currency)}</td>
                    <td>
                      <span className={`badge ${item.asset.priceChange24h >= 0 ? "badge-green" : "badge-red"}`}>
                        {item.asset.priceChange24h >= 0 ? "▲" : "▼"} {Math.abs(item.asset.priceChange24h).toFixed(2)}%
                      </span>
                    </td>
                    <td className="mono">{item.amount.toFixed(item.asset.price > 1000 ? 4 : 2)} {item.symbol}</td>
                    <td className="mono" style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                      {item.buyDate ? new Date(item.buyDate).toLocaleDateString("de-DE") : "—"}
                    </td>
                    <td className="mono">{formatCurrency(item.avgBuyPrice, currency)}</td>
                    <td className="mono primary">{formatCurrency(item.marketValue, currency)}</td>
                    <td><span className={`mono ${item.pnl >= 0 ? "positive" : "negative"}`}>{item.pnl >= 0 ? "+" : ""}{formatCurrency(item.pnl, currency)}</span></td>
                    <td><span className={item.pnlPct >= 0 ? "positive" : "negative"} style={{ fontWeight: 500, fontSize: "var(--text-sm)" }}>{formatPercent(item.pnlPct)}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                        <button className="btn-icon" onClick={() => handleEdit(item)} title="Bearbeiten"><Edit2 size={14} /></button>
                        <button className="btn-icon text-red" onClick={() => handleDelete(item)} title="Löschen"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Import Modal */}
      <PdfImportModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        onImportTrades={handleBatchImportPdf}
      />

      {/* Trade / Asset Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setForm(EMPTY); setFormError(""); setEditId(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{editId ? "Position bearbeiten" : "Trade / Position erfassen"}</h2>
                <p className="modal-subtitle">{editId ? "Bestehende Position anpassen (Trades bleiben unverändert)" : "Neue Krypto-Transaktion oder Position manuell erfassen"}</p>
              </div>
              <button className="modal-close" onClick={() => { setShowModal(false); setForm(EMPTY); setFormError(""); setEditId(null); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              {formError && <div className="form-error"><span>⚠</span> {formError}</div>}
              {saved && <div className="form-success"><span>✓</span> Position erfolgreich gespeichert!</div>}

              <div className="form-grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="a-symbol">Symbol / Asset *</label>
                  <input
                    id="a-symbol"
                    className="input mono"
                    placeholder="z.B. BTC"
                    list="coin-suggestions"
                    autoComplete="off"
                    value={form.symbol}
                    disabled={!!editId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((p) => {
                        const match = COIN_SUGGESTIONS.find(
                          (coin) => coin.symbol === value.trim().toUpperCase()
                        );
                        // Name nur ergänzen, wenn noch keiner eingetragen ist.
                        const name = !p.name.trim() && match ? match.name : p.name;
                        return { ...p, symbol: value, name };
                      });
                      setFormError("");
                    }}
                  />
                  <datalist id="coin-suggestions">
                    {COIN_SUGGESTIONS.map((coin) => (
                      <option key={coin.symbol} value={coin.symbol}>
                        {coin.name}
                      </option>
                    ))}
                  </datalist>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    Vorschläge erscheinen beim Tippen; andere Symbole sind weiterhin möglich.
                  </span>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="a-name">Name</label>
                  <input id="a-name" className="input" placeholder="z.B. Bitcoin" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                {!editId && (
                  <div className="input-group">
                    <label className="label" htmlFor="a-trade-type">Transaktions-Typ</label>
                    <select id="a-trade-type" className="input" value={form.tradeType} onChange={(e) => setForm((p) => ({ ...p, tradeType: e.target.value }))}>
                      {TRADE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                )}
                <div className="input-group">
                  <label className="label" htmlFor="a-amount">Menge / Bestand *</label>
                  <input id="a-amount" type="number" step="any" min="0" className="input mono" placeholder="z.B. 0.5" value={form.amount} onChange={(e) => { setForm((p) => ({ ...p, amount: e.target.value })); setFormError(""); }} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="a-price">Kaufkurs / Preis ({currency}) *</label>
                  <input id="a-price" type="number" step="any" min="0" className="input mono" placeholder="z.B. 45000" value={form.avgBuyPrice} onChange={(e) => { setForm((p) => ({ ...p, avgBuyPrice: e.target.value })); setFormError(""); }} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="a-date">Kaufdatum / Datum *</label>
                  <input id="a-date" type="date" className="input mono" value={form.buyDate} onChange={(e) => setForm((p) => ({ ...p, buyDate: e.target.value }))} />
                </div>
              </div>

              <div className="form-grid-2">
                {!editId && (
                  <div className="input-group">
                    <label className="label" htmlFor="a-exchange">Börse / Handelsplatz</label>
                    <select id="a-exchange" className="input" value={form.exchange} onChange={(e) => setForm((p) => ({ ...p, exchange: e.target.value }))}>
                      {EXCHANGES.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                    </select>
                  </div>
                )}
                <div className="input-group">
                  <label className="label" htmlFor="a-type">Asset-Kategorie</label>
                  <select id="a-type" className="input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                    {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {editId && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: 0 }}>
                  Transaktions-Typ und Börse gehören zum Trade und lassen sich hier
                  nicht ändern. Die Asset-Kategorie gilt für alle Positionen dieses Assets.
                </p>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setForm(EMPTY); setFormError(""); setEditId(null); }}>Abbrechen</button>
                <button type="submit" className="btn btn-primary" disabled={saved || saving}><Plus size={15} />{saved ? "Gespeichert!" : saving ? "Speichert..." : (editId ? "Änderungen speichern" : "Position speichern")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:var(--space-4);animation:fadeIn .15s ease; }
        .modal { background:var(--bg-card);border:1px solid var(--border-strong);border-radius:var(--radius-xl);width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:slideUp .2s ease; }
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

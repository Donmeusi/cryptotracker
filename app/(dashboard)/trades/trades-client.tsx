"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, FileText, Trash2, Edit2, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { TradeDto } from "@/lib/portfolio";

const TYPE_LABELS: Record<string, string> = {
  BUY: "Kauf",
  SELL: "Verkauf",
  TRANSFER_IN: "Eingang",
  TRANSFER_OUT: "Ausgang",
  STAKING_REWARD: "Staking",
  AIRDROP: "Airdrop",
  MINING: "Mining",
};

const TYPE_COLORS: Record<string, string> = {
  BUY: "badge-green",
  SELL: "badge-red",
  TRANSFER_IN: "badge-blue",
  TRANSFER_OUT: "badge-gold",
  STAKING_REWARD: "badge-teal",
  AIRDROP: "badge-teal",
  MINING: "badge-teal",
};

const EDIT_TYPE_OPTIONS = [
  { value: "BUY", label: "Kauf (BUY)" },
  { value: "SELL", label: "Verkauf (SELL)" },
  { value: "TRANSFER_IN", label: "Eingang (TRANSFER_IN)" },
  { value: "TRANSFER_OUT", label: "Ausgang (TRANSFER_OUT)" },
  { value: "STAKING_REWARD", label: "Staking Reward" },
  { value: "AIRDROP", label: "Airdrop" },
  { value: "MINING", label: "Mining" },
];

const EXCHANGE_SUGGESTIONS = [
  "Binance",
  "Kraken",
  "Coinbase",
  "Bitpanda",
  "Bison",
  "Trade Republic",
  "Sonstige",
];

const FILTER_MAP: Record<string, string[]> = {
  "Alle": [],
  "Kauf": ["BUY"],
  "Verkauf": ["SELL"],
  "Staking": ["STAKING_REWARD", "AIRDROP", "MINING"],
  "Transfer": ["TRANSFER_IN", "TRANSFER_OUT"],
};

interface TradesClientProps {
  initialTrades: TradeDto[];
  currency: string;
}

export default function TradesClient({
  initialTrades,
  currency,
}: TradesClientProps) {
  const router = useRouter();
  const [trades, setTrades] = useState<TradeDto[]>(initialTrades);
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [exchangeFilter, setExchangeFilter] = useState("Alle Börsen");
  const [csvExporting, setCsvExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [editTrade, setEditTrade] = useState<TradeDto | null>(null);
  const [editForm, setEditForm] = useState({
    type: "BUY",
    amount: "",
    price: "",
    fee: "",
    exchange: "",
    executedAt: "",
    notes: "",
  });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const exchanges = useMemo(() => {
    const names = new Set<string>();
    for (const trade of trades) {
      if (trade.exchange) names.add(trade.exchange);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "de"));
  }, [trades]);

  const filteredTrades = useMemo(() => {
    let result = trades;
    const types = FILTER_MAP[activeFilter];
    if (types && types.length > 0) {
      result = result.filter((t) => types.includes(t.type));
    }
    if (exchangeFilter !== "Alle Börsen") {
      result = result.filter((t) => t.exchange === exchangeFilter);
    }
    return result;
  }, [trades, activeFilter, exchangeFilter]);

  const total = filteredTrades.reduce((s, t) => s + t.amount * t.price, 0);
  const buys = filteredTrades.filter((t) => t.type === "BUY").length;
  const sells = filteredTrades.filter((t) => t.type === "SELL").length;

  async function handleDelete(trade: TradeDto) {
    const label = `${TYPE_LABELS[trade.type] ?? trade.type} ${trade.symbol} vom ${new Date(trade.executedAt).toLocaleDateString("de-DE")}`;
    if (
      !window.confirm(
        `Trade ${label} wirklich löschen? Die Position wird aus den verbleibenden Trades neu berechnet.`
      )
    ) {
      return;
    }

    const res = await fetch(`/api/trades?id=${encodeURIComponent(trade.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      alert(data.error ?? "Trade konnte nicht gelöscht werden.");
      return;
    }

    setTrades((prev) => prev.filter((t) => t.id !== trade.id));
    router.refresh();
  }

  function openEdit(trade: TradeDto) {
    setEditTrade(trade);
    setEditForm({
      type: trade.type,
      amount: String(trade.amount),
      price: String(trade.price),
      fee: String(trade.fee),
      exchange: trade.exchange ?? "",
      executedAt: trade.executedAt.slice(0, 10),
      notes: trade.notes ?? "",
    });
    setEditError("");
  }

  async function handleEditSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editTrade) return;
    setEditError("");
    setSavingEdit(true);

    try {
      const res = await fetch("/api/trades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTrade.id,
          type: editForm.type,
          amount: editForm.amount,
          price: editForm.price,
          fee: editForm.fee || 0,
          exchange: editForm.exchange,
          notes: editForm.notes,
          executedAt: new Date(`${editForm.executedAt}T12:00:00`).toISOString(),
        }),
      });
      const data = (await res.json()) as { error?: string; trade?: TradeDto };
      if (!res.ok || !data.trade) {
        throw new Error(data.error ?? "Trade konnte nicht gespeichert werden.");
      }

      const updated = data.trade;
      setTrades((prev) =>
        prev
          .map((t) => (t.id === updated.id ? updated : t))
          .sort(
            (a, b) =>
              new Date(b.executedAt).getTime() -
              new Date(a.executedAt).getTime()
          )
      );
      setEditTrade(null);
      router.refresh();
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCSVExport() {
    setCsvExporting(true);
    const { downloadCSV } = await import("@/lib/exportUtils");
    downloadCSV(
      filteredTrades.map((t) => ({
        Datum: new Date(t.executedAt).toLocaleDateString("de-DE"),
        Uhrzeit: new Date(t.executedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        Typ: TYPE_LABELS[t.type] || t.type,
        Asset: t.symbol,
        Menge: t.amount.toFixed(6),
        Kurs_EUR: t.price.toFixed(2),
        Summe_EUR: (t.amount * t.price).toFixed(2),
        Gebühr_EUR: t.fee.toFixed(2),
        Börse: t.exchange ?? "",
      })),
      `CryptoTracker_Trades_${new Date().toISOString().slice(0, 10)}.csv`
    );
    setTimeout(() => setCsvExporting(false), 800);
  }

  async function handlePDFExport() {
    setPdfExporting(true);
    const { generateTradesPDF } = await import("@/lib/exportUtils");
    await generateTradesPDF({
      trades: filteredTrades.map((t) => ({
        executedAt: t.executedAt,
        type: t.type,
        asset: t.symbol,
        amount: t.amount,
        price: t.price,
        fee: t.fee,
        exchange: t.exchange ?? "—",
      })),
    });
    setPdfExporting(false);
  }

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-8)" }}>
        <div>
          <h1 className="page-title">Trade-Verlauf & Berichte</h1>
          <p className="page-subtitle">Transaktions-Bericht & Auswertungsübersicht (Erfassung unter &apos;Assets&apos;)</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button
            className="btn btn-secondary"
            id="trades-csv-export"
            onClick={handleCSVExport}
            disabled={csvExporting}
          >
            {csvExporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            CSV Export
          </button>
          <button
            className="btn btn-secondary"
            id="trades-pdf-export"
            onClick={handlePDFExport}
            disabled={pdfExporting}
          >
            {pdfExporting ? <Loader2 size={15} className="spin" /> : <FileText size={15} />}
            PDF Export
          </button>
        </div>
      </div>

      {/* Untermenü / Kategorien-Navigation */}
      <div
        className="sub-menu-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-5)",
          background: "var(--bg-surface)",
          padding: "var(--space-2) var(--space-3)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {Object.keys(FILTER_MAP).map((f) => {
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                className={`nav-tab-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-sm)",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--green)" : "var(--text-secondary)",
                  background: isActive ? "var(--green-dim)" : "transparent",
                  border: isActive ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <select
            className="input"
            style={{ width: "auto", fontSize: "var(--text-sm)", padding: "6px 12px" }}
            value={exchangeFilter}
            onChange={(e) => setExchangeFilter(e.target.value)}
          >
            <option>Alle Börsen</option>
            {exchanges.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats-Zeile */}
      <div className="grid-3" style={{ marginBottom: "var(--space-5)" }}>
        <div className="stat-card">
          <div className="stat-label">Trades gesamt</div>
          <div className="stat-value">{filteredTrades.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Käufe / Verkäufe</div>
          <div className="stat-value" style={{ fontSize: "var(--text-2xl)" }}>
            <span className="positive">{buys}</span>
            <span style={{ color: "var(--text-muted)", margin: "0 8px" }}>/</span>
            <span className="negative">{sells}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gesamtvolumen (gefiltert)</div>
          <div className="stat-value mono" style={{ fontSize: "var(--text-2xl)" }}>
            {formatCurrency(total, currency, true)}
          </div>
        </div>
      </div>

      {/* Tabelle */}
      <div className="card">
        {filteredTrades.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>Keine Transaktionen in dieser Kategorie</h3>
            <p>Passe den Filter an. Sämtliche Portfolio-Bewegungen werden unter dem Menüpunkt Assets erfasst.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Typ</th>
                  <th>Asset</th>
                  <th>Menge</th>
                  <th>Kurs</th>
                  <th>Summe</th>
                  <th>Gebühr</th>
                  <th>Börse</th>
                  <th style={{ textAlign: "right" }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => {
                  const lineTotal = trade.amount * trade.price;
                  return (
                    <tr key={trade.id}>
                      <td>
                        <div style={{ color: "var(--text-primary)", fontSize: "var(--text-sm)" }}>
                          {new Date(trade.executedAt).toLocaleDateString("de-DE")}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                          {new Date(trade.executedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${TYPE_COLORS[trade.type] || "badge-neutral"}`}>
                          {TYPE_LABELS[trade.type] || trade.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <div className="asset-icon asset-icon-sm">{trade.symbol.charAt(0)}</div>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{trade.symbol}</span>
                        </div>
                      </td>
                      <td className="mono">{trade.amount.toFixed(6)}</td>
                      <td className="mono">{formatCurrency(trade.price, currency)}</td>
                      <td className="mono primary">{formatCurrency(lineTotal, currency)}</td>
                      <td className="mono" style={{ color: "var(--text-muted)" }}>
                        {formatCurrency(trade.fee, currency)}
                      </td>
                      <td>
                        <span className="badge badge-neutral">{trade.exchange ?? "—"}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                          <button
                            className="btn-icon"
                            onClick={() => openEdit(trade)}
                            title="Trade bearbeiten"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn-icon text-red"
                            onClick={() => handleDelete(trade)}
                            title="Trade löschen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editTrade && (
        <div
          className="modal-overlay"
          onClick={() => {
            setEditTrade(null);
            setEditError("");
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Trade bearbeiten</h2>
                <p className="modal-subtitle">
                  {editTrade.symbol} – die Position wird nach dem Speichern neu berechnet
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setEditTrade(null);
                  setEditError("");
                }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-body">
              {editError && <div className="form-error"><span>⚠</span> {editError}</div>}

              <div className="form-grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="t-symbol">Asset</label>
                  <input id="t-symbol" className="input mono" value={editTrade.symbol} disabled />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="t-type">Transaktions-Typ</label>
                  <select id="t-type" className="input" value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}>
                    {EDIT_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="t-amount">Menge *</label>
                  <input id="t-amount" type="number" step="any" min="0" className="input mono" value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="t-price">Kurs ({currency}) *</label>
                  <input id="t-price" type="number" step="any" min="0" className="input mono" value={editForm.price} onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="t-fee">Gebühr ({currency})</label>
                  <input id="t-fee" type="number" step="any" min="0" className="input mono" value={editForm.fee} onChange={(e) => setEditForm((p) => ({ ...p, fee: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="t-date">Datum *</label>
                  <input id="t-date" type="date" className="input mono" value={editForm.executedAt} onChange={(e) => setEditForm((p) => ({ ...p, executedAt: e.target.value }))} />
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="t-exchange">Börse / Handelsplatz</label>
                <input
                  id="t-exchange"
                  className="input"
                  list="exchange-suggestions"
                  autoComplete="off"
                  value={editForm.exchange}
                  onChange={(e) => setEditForm((p) => ({ ...p, exchange: e.target.value }))}
                />
                <datalist id="exchange-suggestions">
                  {EXCHANGE_SUGGESTIONS.map((name) => <option key={name} value={name} />)}
                </datalist>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="t-notes">Notiz</label>
                <input id="t-notes" className="input" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setEditTrade(null); setEditError(""); }}>Abbrechen</button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? "Speichert..." : "Änderungen speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay { position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:var(--space-4);animation:fadeIn .15s ease; }
        .modal { background:var(--bg-card);border:1px solid var(--border-strong);border-radius:var(--radius-xl);width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg); }
        .modal-header { display:flex;align-items:flex-start;justify-content:space-between;padding:var(--space-6) var(--space-6) var(--space-4);border-bottom:1px solid var(--border); }
        .modal-title { font-size:var(--text-xl);font-weight:700;color:var(--text-primary); }
        .modal-subtitle { font-size:var(--text-sm);color:var(--text-muted);margin-top:2px; }
        .modal-close { width:32px;height:32px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;color:var(--text-muted);background:none;border:none;cursor:pointer; }
        .modal-close:hover { background:var(--bg-elevated);color:var(--text-primary); }
        .modal-body { padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4); }
        .form-grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4); }
        .form-error { display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-4);background:var(--red-dim);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-md);color:var(--red);font-size:var(--text-sm); }
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

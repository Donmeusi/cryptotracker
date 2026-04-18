"use client";

import { useState, useMemo } from "react";
import {
  generateMockTrades, formatCurrency, MOCK_ASSETS,
} from "@/lib/mock/data";
import {
  Plus, Download, X, CheckCircle,
  AlertCircle, Loader2, FileText, Edit2, Trash2
} from "lucide-react";
import { downloadCSV, generateTradesPDF } from "@/lib/exportUtils";

const TYPE_LABELS: Record<string, string> = {
  BUY: "Kauf", SELL: "Verkauf", TRANSFER_IN: "Eingang",
  TRANSFER_OUT: "Ausgang", STAKING_REWARD: "Staking", AIRDROP: "Airdrop",
};
const TYPE_COLORS: Record<string, string> = {
  BUY: "badge-green", SELL: "badge-red", TRANSFER_IN: "badge-blue",
  TRANSFER_OUT: "badge-gold", STAKING_REWARD: "badge-teal", AIRDROP: "badge-teal",
};
const FILTER_MAP: Record<string, string[]> = {
  "Alle": [],
  "Kauf": ["BUY"],
  "Verkauf": ["SELL"],
  "Transfer": ["TRANSFER_IN", "TRANSFER_OUT"],
  "Staking": ["STAKING_REWARD", "AIRDROP"],
};

type Trade = ReturnType<typeof generateMockTrades>[number];

interface NewTrade {
  asset: string;
  type: string;
  amount: string;
  price: string;
  fee: string;
  exchange: string;
  executedAt: string;
  notes: string;
}

const EMPTY_FORM: NewTrade = {
  asset: "BTC",
  type: "BUY",
  amount: "",
  price: "",
  fee: "0",
  exchange: "Binance",
  executedAt: new Date().toISOString().slice(0, 16),
  notes: "",
};

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>(() => generateMockTrades().slice(0, 30));
  const [editId, setEditId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [exchangeFilter, setExchangeFilter] = useState("Alle Börsen");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewTrade>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");

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

  function handleFormChange(field: keyof NewTrade, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  }

  function validateForm(): string {
    if (!form.asset) return "Bitte ein Asset auswählen.";
    if (!form.amount || parseFloat(form.amount) <= 0) return "Bitte eine gültige Menge eingeben.";
    if (!form.price || parseFloat(form.price) <= 0) return "Bitte einen gültigen Kurs eingeben.";
    if (!form.executedAt) return "Bitte ein Datum angeben.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const error = validateForm();
    if (error) { setFormError(error); return; }

    setSaving(true);
    // Simulate async save (replace with real API call later)
    await new Promise((r) => setTimeout(r, 600));

    const newTrade: Trade = {
      id: editId || `manual-${Date.now()}`,
      asset: form.asset,
      type: form.type,
      exchange: form.exchange,
      amount: parseFloat(form.amount),
      price: parseFloat(form.price),
      fee: parseFloat(form.fee) || 0,
      executedAt: new Date(form.executedAt).toISOString(),
    };

    if (editId) {
      setTrades((prev) => prev.map(t => t.id === editId ? newTrade : t));
    } else {
      setTrades((prev) => [newTrade, ...prev]);
    }
    setSaveStatus("success");
    setSaving(false);

    setTimeout(() => {
      setShowModal(false);
      setForm(EMPTY_FORM);
      setSaveStatus("idle");
      setEditId(null);
    }, 1000);
  }

  function handleClose() {
    if (saving) return;
    setShowModal(false);
    setForm(EMPTY_FORM);
    setFormError("");
    setSaveStatus("idle");
    setEditId(null);
  }

  function handleEdit(trade: Trade) {
    setForm({
      asset: trade.asset,
      type: trade.type,
      amount: trade.amount.toString(),
      price: trade.price.toString(),
      fee: trade.fee.toString(),
      exchange: trade.exchange,
      executedAt: new Date(trade.executedAt).toISOString().slice(0, 16),
      notes: ""
    });
    setEditId(trade.id);
    setShowModal(true);
  }

  function handleDelete(id: string) {
    if (window.confirm("Möchtest du diesen Trade wirklich löschen?")) {
      setTrades((prev) => prev.filter(t => t.id !== id));
    }
  }

  const total = filteredTrades.reduce((s, t) => s + t.amount * t.price, 0);
  const buys = filteredTrades.filter((t) => t.type === "BUY").length;
  const sells = filteredTrades.filter((t) => t.type === "SELL").length;
  const [csvExporting, setCsvExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  async function handleCSVExport() {
    setCsvExporting(true);
    const { downloadCSV } = await import("@/lib/exportUtils");
    downloadCSV(
      filteredTrades.map((t) => ({
        Datum: new Date(t.executedAt).toLocaleDateString("de-DE"),
        Uhrzeit: new Date(t.executedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        Typ: TYPE_LABELS[t.type] || t.type,
        Asset: t.asset,
        Menge: t.amount.toFixed(6),
        Kurs_EUR: t.price.toFixed(2),
        Summe_EUR: (t.amount * t.price).toFixed(2),
        Gebühr_EUR: t.fee.toFixed(2),
        Börse: t.exchange,
      })),
      `CryptoTracker_Trades_${new Date().toISOString().slice(0, 10)}.csv`
    );
    setTimeout(() => setCsvExporting(false), 800);
  }

  async function handlePDFExport() {
    setPdfExporting(true);
    const { generateTradesPDF } = await import("@/lib/exportUtils");
    await generateTradesPDF({ trades: filteredTrades });
    setPdfExporting(false);
  }

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-8)" }}>
        <div>
          <h1 className="page-title">Trade-Verlauf</h1>
          <p className="page-subtitle">Alle deine Transaktionen im Überblick</p>
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
          <button
            className="btn btn-primary"
            id="trades-add-manual"
            onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowModal(true); }}
          >
            <Plus size={15} />
            Trade manuell erfassen
          </button>
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
            {formatCurrency(total, "EUR", true)}
          </div>
        </div>
      </div>

      {/* Filter-Leiste */}
      <div className="filter-bar">
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {Object.keys(FILTER_MAP).map((f) => (
            <button
              key={f}
              className={`filter-btn ${activeFilter === f ? "active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <select
            className="input"
            style={{ width: "auto", fontSize: "var(--text-sm)" }}
            value={exchangeFilter}
            onChange={(e) => setExchangeFilter(e.target.value)}
          >
            <option>Alle Börsen</option>
            <option>Binance</option>
            <option>Kraken</option>
            <option>Coinbase</option>
          </select>
        </div>
      </div>

      {/* Tabelle */}
      <div className="card">
        {filteredTrades.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>Keine Trades gefunden</h3>
            <p>Passe die Filter an oder erfasse deinen ersten Trade manuell.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={15} /> Trade erfassen
            </button>
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
                  const total = trade.amount * trade.price;
                  const isManual = trade.id.startsWith("manual-");
                  return (
                    <tr key={trade.id} className={isManual ? "row-highlight" : ""}>
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
                          <div className="asset-icon asset-icon-sm">{trade.asset.charAt(0)}</div>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{trade.asset}</span>
                          {isManual && (
                            <span className="badge badge-gold" style={{ fontSize: "9px", padding: "1px 5px" }}>
                              Manuell
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="mono">{trade.amount.toFixed(6)}</td>
                      <td className="mono">{formatCurrency(trade.price, "EUR")}</td>
                      <td className="mono primary">{formatCurrency(total, "EUR")}</td>
                      <td className="mono" style={{ color: "var(--text-muted)" }}>
                        {formatCurrency(trade.fee, "EUR")}
                      </td>
                      <td>
                        <span className="badge badge-neutral">{trade.exchange}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                          <button className="btn-icon" onClick={() => handleEdit(trade)} title="Bearbeiten"><Edit2 size={14} /></button>
                          <button className="btn-icon text-red" onClick={() => handleDelete(trade.id)} title="Löschen"><Trash2 size={14} /></button>
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

      {/* ─── Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={handleClose}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="modal-title">{editId ? "Trade bearbeiten" : "Trade manuell erfassen"}</h2>
                <p className="modal-subtitle">{editId ? "Bestehende Transaktion anpassen" : "Füge eine Transaktion manuell hinzu"}</p>
              </div>
              <button className="modal-close" onClick={handleClose} aria-label="Schließen">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="modal-body">
              {formError && (
                <div className="form-error">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}

              {saveStatus === "success" && (
                <div className="form-success">
                  <CheckCircle size={14} />
                  Trade erfolgreich gespeichert!
                </div>
              )}

              <div className="form-grid-2">
                {/* Asset */}
                <div className="input-group">
                  <label className="label" htmlFor="t-asset">Asset *</label>
                  <select
                    id="t-asset"
                    className="input"
                    value={form.asset}
                    onChange={(e) => handleFormChange("asset", e.target.value)}
                  >
                    {MOCK_ASSETS.map((a) => (
                      <option key={a.symbol} value={a.symbol}>
                        {a.symbol} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Typ */}
                <div className="input-group">
                  <label className="label" htmlFor="t-type">Transaktionstyp *</label>
                  <select
                    id="t-type"
                    className="input"
                    value={form.type}
                    onChange={(e) => handleFormChange("type", e.target.value)}
                  >
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Menge */}
                <div className="input-group">
                  <label className="label" htmlFor="t-amount">Menge *</label>
                  <input
                    id="t-amount"
                    type="number"
                    step="any"
                    min="0"
                    className="input mono"
                    placeholder="z.B. 0.05"
                    value={form.amount}
                    onChange={(e) => handleFormChange("amount", e.target.value)}
                  />
                </div>

                {/* Kurs */}
                <div className="input-group">
                  <label className="label" htmlFor="t-price">Kurs (EUR) *</label>
                  <input
                    id="t-price"
                    type="number"
                    step="any"
                    min="0"
                    className="input mono"
                    placeholder="z.B. 87000"
                    value={form.price}
                    onChange={(e) => handleFormChange("price", e.target.value)}
                  />
                </div>

                {/* Gebühr */}
                <div className="input-group">
                  <label className="label" htmlFor="t-fee">Handelsgebühr (EUR)</label>
                  <input
                    id="t-fee"
                    type="number"
                    step="any"
                    min="0"
                    className="input mono"
                    placeholder="z.B. 1.50"
                    value={form.fee}
                    onChange={(e) => handleFormChange("fee", e.target.value)}
                  />
                </div>

                {/* Börse */}
                <div className="input-group">
                  <label className="label" htmlFor="t-exchange">Börse</label>
                  <select
                    id="t-exchange"
                    className="input"
                    value={form.exchange}
                    onChange={(e) => handleFormChange("exchange", e.target.value)}
                  >
                    {["Binance", "Kraken", "Coinbase", "OKX", "Bybit", "Manuell"].map((ex) => (
                      <option key={ex} value={ex}>{ex}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Datum */}
              <div className="input-group">
                <label className="label" htmlFor="t-date">Datum & Uhrzeit *</label>
                <input
                  id="t-date"
                  type="datetime-local"
                  className="input"
                  value={form.executedAt}
                  onChange={(e) => handleFormChange("executedAt", e.target.value)}
                />
              </div>

              {/* Notizen */}
              <div className="input-group">
                <label className="label" htmlFor="t-notes">Notizen (optional)</label>
                <textarea
                  id="t-notes"
                  className="input"
                  rows={2}
                  placeholder="Eigene Anmerkungen zum Trade..."
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  style={{ resize: "vertical", minHeight: 60 }}
                />
              </div>

              {/* Vorschau */}
              {form.amount && form.price && (
                <div className="trade-preview">
                  <div className="trade-preview-row">
                    <span>Gesamtsumme</span>
                    <span className="mono" style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                      {formatCurrency(parseFloat(form.amount) * parseFloat(form.price), "EUR")}
                    </span>
                  </div>
                  <div className="trade-preview-row">
                    <span>Zzgl. Gebühr</span>
                    <span className="mono">{formatCurrency(parseFloat(form.fee) || 0, "EUR")}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="trades-modal-submit"
                  disabled={saving || saveStatus === "success"}
                >
                  {saving ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      Wird gespeichert...
                    </>
                  ) : saveStatus === "success" ? (
                    <>
                      <CheckCircle size={15} />
                      Gespeichert!
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      {editId ? "Änderungen speichern" : "Trade speichern"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .filter-bar {
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-4);
        }
        .filter-btn {
          padding: 6px var(--space-3); border-radius: var(--radius-md);
          font-size: var(--text-sm); font-weight: 500;
          color: var(--text-muted); background: var(--bg-surface);
          border: 1px solid var(--border);
          cursor: pointer; transition: all var(--transition-fast);
          font-family: var(--font-sans);
        }
        .filter-btn:hover { color: var(--text-primary); border-color: var(--border-strong); }
        .filter-btn.active {
          background: var(--bg-card); color: var(--text-primary);
          border-color: var(--border-strong);
        }
        .row-highlight td { background: rgba(245, 158, 11, 0.04); }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: var(--space-4);
          animation: fadeIn 0.15s ease;
        }
        .modal {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-xl);
          width: 100%; max-width: 540px;
          max-height: 90vh; overflow-y: auto;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: var(--space-6) var(--space-6) var(--space-4);
          border-bottom: 1px solid var(--border);
        }
        .modal-title { font-size: var(--text-xl); font-weight: 700; color: var(--text-primary); }
        .modal-subtitle { font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px; }
        .modal-close {
          width: 32px; height: 32px; border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted); background: none; border: none;
          cursor: pointer; transition: all var(--transition-fast);
          flex-shrink: 0; margin-top: -4px;
        }
        .modal-close:hover { background: var(--bg-elevated); color: var(--text-primary); }
        .modal-body {
          padding: var(--space-6);
          display: flex; flex-direction: column; gap: var(--space-4);
        }
        .form-grid-2 {
          display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);
        }
        .form-error {
          display: flex; align-items: center; gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--red-dim); border: 1px solid rgba(239,68,68,0.2);
          border-radius: var(--radius-md); color: var(--red); font-size: var(--text-sm);
        }
        .form-success {
          display: flex; align-items: center; gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--green-dim); border: 1px solid rgba(34,197,94,0.2);
          border-radius: var(--radius-md); color: var(--green); font-size: var(--text-sm);
        }
        .trade-preview {
          padding: var(--space-4); background: var(--bg-surface);
          border-radius: var(--radius-md); border: 1px solid var(--border);
          display: flex; flex-direction: column; gap: var(--space-2);
        }
        .trade-preview-row {
          display: flex; justify-content: space-between;
          font-size: var(--text-sm); color: var(--text-secondary);
        }
        .modal-footer {
          display: flex; justify-content: flex-end; gap: var(--space-3);
          padding-top: var(--space-2);
          border-top: 1px solid var(--border);
          margin-top: var(--space-2);
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        select.input, textarea.input { cursor: pointer; }
        input[type="datetime-local"].input { color-scheme: dark; }
        .btn-icon { background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:4px;border-radius:var(--radius-sm);display:inline-flex;align-items:center;justify-content:center;transition:all var(--transition-fast); }
        .btn-icon:hover { background:var(--bg-elevated);color:var(--text-primary); }
        .text-red:hover { color:var(--red) !important;background:var(--red-dim) !important; }
        @media (max-width: 600px) {
          .form-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { generateMockTrades, formatCurrency } from "@/lib/mock/data";
import { Download, Loader2, FileText } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  BUY: "Kauf",
  SELL: "Verkauf",
  TRANSFER_IN: "Eingang",
  TRANSFER_OUT: "Ausgang",
  STAKING_REWARD: "Staking",
  AIRDROP: "Airdrop",
};

const TYPE_COLORS: Record<string, string> = {
  BUY: "badge-green",
  SELL: "badge-red",
  TRANSFER_IN: "badge-blue",
  TRANSFER_OUT: "badge-gold",
  STAKING_REWARD: "badge-teal",
  AIRDROP: "badge-teal",
};

const FILTER_MAP: Record<string, string[]> = {
  "Alle": [],
  "Kauf": ["BUY"],
  "Verkauf": ["SELL"],
  "Staking": ["STAKING_REWARD", "AIRDROP"],
  "Transfer": ["TRANSFER_IN", "TRANSFER_OUT"],
};

type Trade = ReturnType<typeof generateMockTrades>[number];

export default function TradesPage() {
  const [trades] = useState<Trade[]>(() => generateMockTrades().slice(0, 30));
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [exchangeFilter, setExchangeFilter] = useState("Alle Börsen");
  const [csvExporting, setCsvExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

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
            <option>Binance</option>
            <option>Kraken</option>
            <option>Coinbase</option>
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
            {formatCurrency(total, "EUR", true)}
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
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => {
                  const total = trade.amount * trade.price;
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
                          <div className="asset-icon asset-icon-sm">{trade.asset.charAt(0)}</div>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{trade.asset}</span>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .empty-state { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-3);padding:var(--space-16) var(--space-8);text-align:center; }
        .empty-state-icon { font-size:2.5rem; }
        .empty-state h3 { font-size:var(--text-base);font-weight:600;color:var(--text-primary); }
        .empty-state p { font-size:var(--text-sm);color:var(--text-muted); }
      `}</style>
    </div>
  );
}

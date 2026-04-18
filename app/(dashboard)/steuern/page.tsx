"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/mock/data";
import { FileText, Download, Calculator, Info, Loader2 } from "lucide-react";
import { downloadCSV, generateTaxPDF } from "@/lib/exportUtils";
import { TaxEvent, TaxSummary, TaxResult } from "@/lib/tax/taxCalculator";

export default function SteuernPage() {
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedMethod, setSelectedMethod] = useState<"FIFO" | "LIFO" | "HIFO">("FIFO");
  const [exporting, setExporting] = useState<"idle" | "csv" | "pdf">("idle");
  const [taxData, setTaxData] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/tax?year=${selectedYear}&method=${selectedMethod}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setTaxData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load tax data", err);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedYear, selectedMethod]);

  const events = taxData?.events || [];
  const { totalGains = 0, totalLosses = 0, taxableIncome = 0, estimatedTax = 0 } = taxData?.summary || {};

  function handleCSV() {
    setExporting("csv");
    downloadCSV(
      events.map((e) => ({
        Asset: e.asset,
        Kaufdatum: new Date(e.buyDate).toLocaleDateString("de-DE"),
        Verkaufsdatum: new Date(e.sellDate).toLocaleDateString("de-DE"),
        Haltedauer_Tage: e.holdingDays,
        Einstandspreis_EUR: e.costBasis.toFixed(2),
        Erlöse_EUR: e.proceeds.toFixed(2),
        "G&V_EUR": e.gainLoss.toFixed(2),
        Typ: e.type === "LONG_TERM" ? "Langfristig" : "Kurzfristig",
        Methode: selectedMethod,
        Steuerjahr: selectedYear,
      })),
      `CryptoTracker_Steuerbericht_${selectedYear}.csv`
    );
    setTimeout(() => setExporting("idle"), 1000);
  }

  async function handlePDF() {
    setExporting("pdf");
    await generateTaxPDF({
      year: selectedYear,
      method: selectedMethod,
      events,
      summary: { totalGains, totalLosses, taxableIncome, estimatedTax },
    });
    setExporting("idle");
  }

  return (
    <div className="page-container fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-8)" }}>
        <div>
          <h1 className="page-title">Steuerberichte</h1>
          <p className="page-subtitle">G&V-Analyse und Steuerdokumentation</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <button
            className="btn btn-secondary"
            onClick={handleCSV}
            disabled={exporting !== "idle"}
          >
            {exporting === "csv" ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            CSV exportieren
          </button>
          <button
            className="btn btn-primary"
            onClick={handlePDF}
            disabled={exporting !== "idle"}
          >
            {exporting === "pdf" ? <Loader2 size={15} className="spin" /> : <FileText size={15} />}
            PDF-Report
          </button>
        </div>
      </div>

      {/* Steuerfilter */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {/* Jahr-Tabs */}
        <div className="tab-list">
          {["2024", "2023", "2022"].map((year) => (
            <button
              key={year}
              className={`tab-btn ${selectedYear === year ? "active" : ""}`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Methode */}
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {(["FIFO", "LIFO", "HIFO"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMethod(m)}
              style={{
                padding: "4px 14px", borderRadius: "var(--radius-md)",
                fontSize: "var(--text-xs)", fontWeight: 700,
                border: `1px solid ${selectedMethod === m ? "var(--green)" : "var(--border)"}`,
                background: selectedMethod === m ? "var(--green-dim)" : "none",
                color: selectedMethod === m ? "var(--green)" : "var(--text-muted)",
                cursor: "pointer", fontFamily: "var(--font-mono)",
                transition: "all var(--transition-fast)",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          <Info size={12} />
          <span>{selectedMethod}-Methode aktiv · Steuerjahr {selectedYear}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card"><div className="stat-label">Realisierte Gewinne</div><div className="stat-value mono positive" style={{ fontSize: "var(--text-2xl)" }}>{formatCurrency(totalGains, "EUR")}</div></div>
        <div className="stat-card"><div className="stat-label">Realisierte Verluste</div><div className="stat-value mono negative" style={{ fontSize: "var(--text-2xl)" }}>-{formatCurrency(totalLosses, "EUR")}</div></div>
        <div className="stat-card"><div className="stat-label">Netto steuerpflichtig</div><div className="stat-value mono" style={{ fontSize: "var(--text-2xl)", color: taxableIncome > 0 ? "var(--gold)" : "var(--green)" }}>{formatCurrency(taxableIncome, "EUR")}</div></div>
        <div className="stat-card" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
          <div className="stat-label"><Calculator size={12} style={{ display: "inline", marginRight: 4 }} />Gesch. Steuer (DE)</div>
          <div className="stat-value mono" style={{ fontSize: "var(--text-2xl)", color: "var(--gold)" }}>{formatCurrency(estimatedTax, "EUR")}</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>~25% Abgeltungssteuer</div>
        </div>
      </div>

      {/* Tabelle */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>
            Veräußerungsgeschäfte {selectedYear}
          </h2>
          <span className="badge badge-gold">{events.length} Transaktionen &middot; {selectedMethod}</span>
        </div>

        {events.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📭</div><h3>Keine Daten für {selectedYear}</h3><p>Für dieses Steuerjahr liegen keine Veräußerungsgeschäfte vor.</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Asset</th><th>Kaufdatum</th><th>Verkaufsdatum</th><th>Haltedauer</th><th>Einstandspreis</th><th>Erlöse</th><th>G&V</th><th>Typ</th></tr>
              </thead>
              <tbody>
                {events.map((event, i) => (
                  <tr key={`${event.asset}-${event.buyDate}-${event.sellDate}-${i}`}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <div className="asset-icon asset-icon-sm">{event.asset.charAt(0)}</div>
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{event.asset}</span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: "var(--text-xs)" }}>{new Date(event.buyDate).toLocaleDateString("de-DE")}</td>
                    <td className="mono" style={{ fontSize: "var(--text-xs)" }}>{new Date(event.sellDate).toLocaleDateString("de-DE")}</td>
                    <td><span className={`badge ${event.holdingDays >= 365 ? "badge-green" : "badge-gold"}`}>{event.holdingDays} Tage</span></td>
                    <td className="mono">{formatCurrency(event.costBasis, "EUR")}</td>
                    <td className="mono primary">{formatCurrency(event.proceeds, "EUR")}</td>
                    <td><span className={`mono ${event.gainLoss >= 0 ? "positive" : "negative"}`} style={{ fontWeight: 600 }}>{event.gainLoss >= 0 ? "+" : ""}{formatCurrency(event.gainLoss, "EUR")}</span></td>
                    <td><span className={`badge ${event.type === "LONG_TERM" ? "badge-green" : "badge-blue"}`}>{event.type === "LONG_TERM" ? "Langfristig" : "Kurzfristig"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="tax-disclaimer">
          <Info size={13} />
          <span>Diese Berechnung dient nur als Orientierung. Bitte konsultiere einen Steuerberater. Freigrenze: 1.000 € (ab 2024).</span>
        </div>
      </div>

      <style>{`
        .grid-4 { display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4); }
        .tax-disclaimer { display:flex;align-items:flex-start;gap:var(--space-2);padding:var(--space-4);margin-top:var(--space-5);background:var(--bg-muted);border-radius:var(--radius-md);font-size:var(--text-xs);color:var(--text-secondary);border:1px solid var(--border); }
        .tax-disclaimer svg { flex-shrink:0;margin-top:1px;color:var(--text-muted); }
        .empty-state { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-3);padding:var(--space-16) var(--space-8);text-align:center; }
        .empty-state-icon { font-size:2.5rem; }
        .empty-state h3 { font-size:var(--text-base);font-weight:600;color:var(--text-primary); }
        .empty-state p { font-size:var(--text-sm);color:var(--text-muted); }
        @media (max-width:900px) { .grid-4 { grid-template-columns:1fr 1fr; } }
        @media (max-width:600px) { .grid-4 { grid-template-columns:1fr; } }
        .spin { animation:spin 1s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}

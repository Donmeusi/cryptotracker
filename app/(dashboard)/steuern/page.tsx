"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/mock/data";
import { FileText, Download, Calculator, Info, Loader2 } from "lucide-react";
import { downloadCSV, generateTaxPDF } from "@/lib/exportUtils";
import { TaxResult, TaxEvent } from "@/lib/tax/taxCalculator";

const METHOD_DETAILS: Record<
  "FIFO" | "LIFO" | "HIFO",
  { title: string; subtitle: string; desc: string; taxTip: string }
> = {
  FIFO: {
    title: "First In, First Out",
    subtitle: "Zuerst gekauft = Zuerst verkauft",
    desc: "Die ältesten erworbenen Krypto-Tranchen werden als Erstes veräußert.",
    taxTip: "🇩🇪 In Deutschland der Standard gem. § 23 EStG. Optimal, um nach 365 Tagen Haltedauer die Steuerfreiheit zu erreichen.",
  },
  LIFO: {
    title: "Last In, First Out",
    subtitle: "Zuletzt gekauft = Zuerst verkauft",
    desc: "Die neusten erworbenen Krypto-Tranchen werden als Erstes veräußert.",
    taxTip: "📉 Nützlich bei fallenden Kursen, um jüngst teuer gekaufte Coins rasch mit Verlust zu verrechnen.",
  },
  HIFO: {
    title: "Highest In, First Out",
    subtitle: "Höchster Kaufpreis = Zuerst verkauft",
    desc: "Die Tranchen mit den höchsten Anschaffungskosten werden als Erstes veräußert.",
    taxTip: "⚡ Minimiert den steuerbaren Gewinn bzw. maximiert Verlustverrechnungen, da die teuersten Anschaffungen zuerst genutzt werden.",
  },
};

export default function SteuernPage() {
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedMethod, setSelectedMethod] = useState<"FIFO" | "LIFO" | "HIFO">("FIFO");
  const [exporting, setExporting] = useState<"idle" | "csv" | "pdf">("idle");
  const [taxData, setTaxData] = useState<TaxResult | null>(null);
  const [_loading, setLoading] = useState(true);

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
      events.map((e: TaxEvent) => ({
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
          {(["FIFO", "LIFO", "HIFO"] as const).map((m) => {
            const details = METHOD_DETAILS[m];
            return (
              <div key={m} className="method-tooltip-wrap">
                <button
                  onClick={() => setSelectedMethod(m)}
                  className={`method-btn ${selectedMethod === m ? "active" : ""}`}
                >
                  {m}
                </button>
                <div className="method-tooltip-card fade-in">
                  <div className="tooltip-header">
                    <span className="tooltip-title">{details.title}</span>
                    <span className="tooltip-badge">{m}</span>
                  </div>
                  <div className="tooltip-subtitle">{details.subtitle}</div>
                  <p className="tooltip-desc">{details.desc}</p>
                  <div className="tooltip-tip">{details.taxTip}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          <Info size={12} />
          <span>{selectedMethod}-Methode aktiv &middot; Steuerjahr {selectedYear}</span>
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
                {events.map((event: TaxEvent, i: number) => (
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
        .method-tooltip-wrap { position: relative; display: inline-block; }
        .method-btn {
          padding: 4px 14px; borderRadius: var(--radius-md);
          font-size: var(--text-xs); font-weight: 700;
          border: 1px solid var(--border);
          background: none; color: var(--text-muted);
          cursor: pointer; font-family: var(--font-mono);
          transition: all var(--transition-fast);
        }
        .method-btn:hover, .method-btn.active {
          border-color: var(--green);
          background: var(--green-dim);
          color: var(--green);
        }
        .method-tooltip-card {
          position: absolute;
          top: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%) translateY(6px);
          width: 270px;
          padding: var(--space-3) var(--space-4);
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-lg);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 50;
          text-align: left;
        }
        .method-tooltip-wrap:hover .method-tooltip-card {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }
        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }
        .tooltip-title {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--text-primary);
        }
        .tooltip-badge {
          font-size: 10px;
          font-family: var(--font-mono);
          font-weight: 700;
          padding: 1px 6px;
          background: var(--green-dim);
          color: var(--green);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(16,185,129,0.2);
        }
        .tooltip-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: var(--green);
          margin-bottom: var(--space-2);
        }
        .tooltip-desc {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: var(--space-2);
        }
        .tooltip-tip {
          font-size: 10px;
          color: var(--text-muted);
          background: var(--bg-muted);
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          border-left: 2px solid var(--green);
          line-height: 1.35;
        }
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

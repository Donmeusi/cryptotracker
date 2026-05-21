/**
 * Export Utilities — CSV, JSON, PDF (browser-native, no external libraries)
 *
 * PDF-Strategie: HTML in neuem Tab öffnen + window.print()
 * Der Browser übernimmt die PDF-Generierung nativ — keine Bibliotheks-Probleme.
 *
 * CSV/JSON-Strategie: data: URI mit echtem Download-Attribut
 */

// ─── CSV ───────────────────────────────────────────────────────────────────

export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;

  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  // Semicolon-separated for Excel DE; UTF-8 BOM for Excel encoding
  const content = [
    "\uFEFF" + keys.join(";"),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(";")),
  ].join("\r\n");

  _dataURIDownload("data:text/csv;charset=utf-8," + encodeURIComponent(content), filename);
}

// ─── JSON ──────────────────────────────────────────────────────────────────

export function downloadJSON(data: unknown, filename: string) {
  const content = JSON.stringify(data, null, 2);
  _dataURIDownload(
    "data:application/json;charset=utf-8," + encodeURIComponent(content),
    filename
  );
}

// ─── PDF (browser-native via window.print) ─────────────────────────────────

export function generateTaxPDF(params: {
  year: string;
  method: string;
  userName?: string;
  events: Array<{
    asset: string; buyDate: string; sellDate: string;
    holdingDays: number; costBasis: number; proceeds: number;
    gainLoss: number; type: string;
  }>;
  summary: {
    totalGains: number; totalLosses: number;
    taxableIncome: number; estimatedTax: number;
  };
}): Promise<void> {
  const { year, method, events, summary } = params;
  const now = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  const rows = events.map((e) => {
    const isPos = e.gainLoss >= 0;
    const isLong = e.holdingDays >= 365;
    return `
      <tr>
        <td>${fmtDate(e.buyDate)}</td>
        <td>${fmtDate(e.sellDate)}</td>
        <td><strong>${e.asset}</strong></td>
        <td><span class="badge ${isLong ? "badge-green" : "badge-gold"}">${e.holdingDays} Tage</span></td>
        <td class="mono">${fmt(e.costBasis)}</td>
        <td class="mono primary">${fmt(e.proceeds)}</td>
        <td class="mono ${isPos ? "pos" : "neg"}" style="font-weight:700">${isPos ? "+" : ""}${fmt(e.gainLoss)}</td>
        <td><span class="badge ${isLong ? "badge-green" : "badge-blue"}">${isLong ? "Langfristig" : "Kurzfristig"}</span></td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>CryptoTracker Steuerbericht ${year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Segoe UI', Arial, sans-serif;
      background: #080a0f;
      color: #e0e0e8;
      padding: 32px;
      font-size: 12px;
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 20px; border-bottom: 2px solid #22c55e; margin-bottom: 24px;
    }
    .logo { font-size: 22px; font-weight: 800; color: #22c55e; letter-spacing: -0.03em; }
    .logo-sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
    .report-title { font-size: 16px; font-weight: 700; color: #f0f0f5; text-align: right; }
    .report-meta { font-size: 10px; color: #6b7280; margin-top: 4px; text-align: right; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .card {
      background: #0e121b;
      border: 1px solid #1e2740;
      border-radius: 8px;
      padding: 14px;
    }
    .card-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 8px; }
    .card-value { font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; }
    .card-value.pos { color: #22c55e; }
    .card-value.neg { color: #ef4444; }
    .card-value.gold { color: #f59e0b; }
    .section-title {
      font-size: 13px; font-weight: 700; color: #f0f0f5;
      margin-bottom: 12px; padding-bottom: 8px;
      border-bottom: 1px solid #1e2740;
    }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th {
      text-align: left; padding: 8px 10px;
      font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em;
      color: #6b7280; background: #050709; border-bottom: 1px solid #1e2740;
    }
    td { padding: 9px 10px; border-bottom: 1px solid #0f1620; vertical-align: middle; }
    tr:nth-child(even) td { background: #0a0d14; }
    .mono { font-family: 'Courier New', monospace; }
    .primary { color: #f0f0f5; font-weight: 600; }
    .pos { color: #22c55e; }
    .neg { color: #ef4444; }
    .badge {
      display: inline-block; padding: 2px 8px;
      border-radius: 100px; font-size: 10px; font-weight: 600;
    }
    .badge-green { background: rgba(34,197,94,.15); color: #22c55e; }
    .badge-gold { background: rgba(245,158,11,.15); color: #f59e0b; }
    .badge-blue { background: rgba(59,130,246,.15); color: #60a5fa; }
    .disclaimer {
      margin-top: 20px; padding: 12px 16px;
      background: #0e121b; border: 1px solid #1e2740; border-radius: 6px;
      color: #6b7280; font-size: 10px; line-height: 1.5;
    }
    .footer {
      margin-top: 20px; padding-top: 12px; border-top: 1px solid #1e2740;
      display: flex; justify-content: space-between;
      font-size: 9px; color: #4b5563;
    }
    @media print {
      body { background: white !important; color: #111 !important; padding: 20px; }
      .header { border-bottom-color: #22c55e !important; }
      .logo { color: #16a34a !important; }
      .card { background: #f9fafb !important; border-color: #e5e7eb !important; }
      .card-label { color: #6b7280 !important; }
      .card-value.gold { color: #d97706 !important; }
      th { background: #f3f4f6 !important; color: #374151 !important; }
      td { border-bottom-color: #e5e7eb !important; }
      tr:nth-child(even) td { background: #f9fafb !important; }
      .pos { color: #16a34a !important; }
      .neg { color: #dc2626 !important; }
      .badge-green { background: #dcfce7 !important; color: #16a34a !important; }
      .badge-gold { background: #fef3c7 !important; color: #d97706 !important; }
      .badge-blue { background: #dbeafe !important; color: #2563eb !important; }
      .disclaimer { background: #f9fafb !important; border-color: #e5e7eb !important; }
      .footer { color: #9ca3af !important; border-top-color: #e5e7eb !important; }
      .primary { color: #111 !important; }
      .report-title { color: #111 !important; }
      .section-title { color: #111 !important; border-color: #e5e7eb !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">CryptoTracker</div>
      <div class="logo-sub">Portfolio &amp; Steuer-Management</div>
    </div>
    <div>
      <div class="report-title">Steuerbericht ${year} &mdash; ${method}-Methode</div>
      <div class="report-meta">Erstellt: ${now}${params.userName ? " &bull; Nutzer: " + params.userName : ""}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-label">Realisierte Gewinne</div>
      <div class="card-value pos">${fmt(summary.totalGains)}</div>
    </div>
    <div class="card">
      <div class="card-label">Realisierte Verluste</div>
      <div class="card-value neg">-${fmt(summary.totalLosses)}</div>
    </div>
    <div class="card">
      <div class="card-label">Netto steuerpflichtig</div>
      <div class="card-value gold">${fmt(summary.taxableIncome)}</div>
    </div>
    <div class="card">
      <div class="card-label">Gesch. Steuer (25%)</div>
      <div class="card-value gold">${fmt(summary.estimatedTax)}</div>
    </div>
  </div>

  <div class="section-title">Veräußerungsgeschäfte ${year} &mdash; ${events.length} Transaktionen</div>
  <table>
    <thead>
      <tr><th>Kaufdatum</th><th>Verkaufsdatum</th><th>Asset</th><th>Haltedauer</th><th>Einstandspreis</th><th>Erlöse</th><th>G&amp;V</th><th>Typ</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="disclaimer">
    ℹ️ Diese Berechnung dient nur der Orientierung und ersetzt keine steuerliche Beratung.
    Freigrenze für private Veräußerungsgewinne (DE): 1.000 € (ab 2024).
    Berechnungsmethode: <strong>${method}</strong>.
  </div>

  <div class="footer">
    <span>CryptoTracker &mdash; Automatisch generiert</span>
    <span>${method}-Methode &bull; Steuerjahr ${year} &bull; ${now}</span>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  return new Promise((resolve) => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "width=1024,height=768");
    if (!w) {
      // Fallback if popup blocked: download as HTML
      _dataURIDownload(
        "data:text/html;charset=utf-8," + encodeURIComponent(html),
        `CryptoTracker_Steuerbericht_${year}.html`
      );
      URL.revokeObjectURL(url);
      resolve();
      return;
    }
    // Resolve after print dialog opens; then release object URL
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve();
    }, 3000);
  });
}

export function generateTradesPDF(params: {
  trades: Array<{
    executedAt: string; type: string; asset: string;
    amount: number; price: number; fee: number; exchange: string;
  }>;
  userName?: string;
}): Promise<void> {
  const now = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
    BUY:           { label: "Kauf",        cls: "pos" },
    SELL:          { label: "Verkauf",     cls: "neg" },
    TRANSFER_IN:   { label: "Eingang",     cls: "blue" },
    TRANSFER_OUT:  { label: "Ausgang",     cls: "gold" },
    STAKING_REWARD:{ label: "Staking",     cls: "blue" },
    AIRDROP:       { label: "Airdrop",     cls: "blue" },
  };

  const rows = params.trades.map((t) => {
    const d = new Date(t.executedAt);
    const typ = TYPE_LABELS[t.type] ?? { label: t.type, cls: "" };
    const summe = t.amount * t.price;
    return `
      <tr>
        <td>${d.toLocaleDateString("de-DE")}</td>
        <td class="mono" style="color:#6b7280;font-size:10px">${d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</td>
        <td><span class="badge badge-${typ.cls}">${typ.label}</span></td>
        <td><strong>${t.asset}</strong></td>
        <td class="mono">${t.amount.toFixed(6)}</td>
        <td class="mono">${fmtNum(t.price)} €</td>
        <td class="mono primary">${fmtNum(summe)} €</td>
        <td class="mono" style="color:#6b7280">${fmtNum(t.fee)} €</td>
        <td>${t.exchange}</td>
      </tr>`;
  }).join("");

  const totalVol = params.trades.reduce((s, t) => s + t.amount * t.price, 0);

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>CryptoTracker Trade-Verlauf</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background: #080a0f; color: #e0e0e8; padding: 28px; font-size: 11px; }
    .header { display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #22c55e;margin-bottom:20px; }
    .logo { font-size:20px;font-weight:800;color:#22c55e;letter-spacing:-0.03em; }
    .logo-sub { font-size:10px;color:#6b7280;margin-top:3px; }
    .report-title { font-size:14px;font-weight:700;color:#f0f0f5;text-align:right; }
    .report-meta { font-size:10px;color:#6b7280;margin-top:4px;text-align:right; }
    .stats { display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px; }
    .stat { background:#0e121b;border:1px solid #1e2740;border-radius:7px;padding:12px; }
    .stat-label { font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:6px; }
    .stat-value { font-size:16px;font-weight:700;font-family:'Courier New',monospace;color:#f0f0f5; }
    table { width:100%;border-collapse:collapse;font-size:10px; }
    th { text-align:left;padding:7px 8px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;background:#050709;border-bottom:1px solid #1e2740; }
    td { padding:7px 8px;border-bottom:1px solid #0f1620;vertical-align:middle; }
    tr:nth-child(even) td { background:#0a0d14; }
    .mono { font-family:'Courier New',monospace; }
    .primary { color:#f0f0f5;font-weight:600; }
    .pos { color:#22c55e; }
    .neg { color:#ef4444; }
    .blue { color:#60a5fa; }
    .gold { color:#f59e0b; }
    .badge { display:inline-block;padding:2px 7px;border-radius:100px;font-size:9px;font-weight:700; }
    .badge-pos { background:rgba(34,197,94,.15);color:#22c55e; }
    .badge-neg { background:rgba(239,68,68,.15);color:#ef4444; }
    .badge-blue { background:rgba(59,130,246,.15);color:#60a5fa; }
    .badge-gold { background:rgba(245,158,11,.15);color:#f59e0b; }
    .footer { margin-top:16px;padding-top:10px;border-top:1px solid #1e2740;display:flex;justify-content:space-between;font-size:9px;color:#4b5563; }
    @media print {
      body { background:white!important;color:#111!important; }
      .header { border-bottom-color:#22c55e!important; }
      .logo { color:#16a34a!important; }
      .stat { background:#f9fafb!important;border-color:#e5e7eb!important; }
      th { background:#f3f4f6!important;color:#374151!important; }
      td { border-bottom-color:#e5e7eb!important; }
      tr:nth-child(even) td { background:#f9fafb!important; }
      .report-title { color:#111!important; }
      .primary { color:#111!important; }
      .stat-value { color:#111!important; }
      .badge-pos { background:#dcfce7!important;color:#16a34a!important; }
      .badge-neg { background:#fee2e2!important;color:#dc2626!important; }
      .badge-blue { background:#dbeafe!important;color:#2563eb!important; }
      .badge-gold { background:#fef3c7!important;color:#d97706!important; }
      .footer { color:#9ca3af!important;border-top-color:#e5e7eb!important; }
      .pos { color:#16a34a!important; }
      .neg { color:#dc2626!important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">CryptoTracker</div>
      <div class="logo-sub">Trade-Verlauf Export</div>
    </div>
    <div>
      <div class="report-title">Trade-Verlauf &mdash; ${params.trades.length} Transaktionen</div>
      <div class="report-meta">Erstellt: ${now}${params.userName ? " &bull; " + params.userName : ""}</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Trades Gesamt</div><div class="stat-value">${params.trades.length}</div></div>
    <div class="stat"><div class="stat-label">Käufe / Verkäufe</div><div class="stat-value">${params.trades.filter(t=>t.type==="BUY").length} / ${params.trades.filter(t=>t.type==="SELL").length}</div></div>
    <div class="stat"><div class="stat-label">Gesamtvolumen</div><div class="stat-value">${fmtNum(totalVol)} €</div></div>
  </div>
  <table>
    <thead><tr><th>Datum</th><th>Zeit</th><th>Typ</th><th>Asset</th><th>Menge</th><th>Kurs</th><th>Summe</th><th>Gebühr</th><th>Börse</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>CryptoTracker &mdash; Demo-Daten</span>
    <span>${now} &bull; ${params.trades.length} Transaktionen &bull; Volumen: ${fmtNum(totalVol)} €</span>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  return new Promise((resolve) => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "width=1100,height=768");
    if (!w) {
      _dataURIDownload(
        "data:text/html;charset=utf-8," + encodeURIComponent(html),
        `CryptoTracker_Trades_${new Date().toISOString().slice(0, 10)}.html`
      );
      URL.revokeObjectURL(url);
      resolve();
      return;
    }
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve();
    }, 3000);
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
}

function fmtNum(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("de-DE");
}

function _dataURIDownload(dataUri: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUri;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

"use client";

import { useState } from "react";
import {
  UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2,
  X, Plus, Trash2, ShieldCheck, Sparkles
} from "lucide-react";
import { ParsedTrade } from "@/app/api/trades/parse-pdf/route";

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTrades: (trades: ParsedTrade[]) => void;
}

const SUPPORTED_ASSETS = [
  "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "AVAX", "MATIC", "LINK", 
  "UNI", "ATOM", "NEAR", "SUI", "PEPE", "SHIB", "LTC", "BCH", "TRX"
];

const KNOWN_EXCHANGES = [
  "Binance", "Trade Republic", "Bitpanda", "Coinbase", "Kraken", 
  "BSDEX", "Bison", "KuCoin", "Bybit", "Bitvavo", "OKX"
];

export default function PdfImportModal({ isOpen, onClose, onImportTrades }: PdfImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState("");

  if (!isOpen) return null;

  async function handleFileUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Bitte wähle eine gültige PDF-Datei aus.");
      return;
    }

    setError("");
    setLoading(true);
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/trades/parse-pdf", {
        method: "POST",
        body: formData,
      });

      let data: { trades?: ParsedTrade[]; error?: string } = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        throw new Error(`Server-Fehler (${res.status}): ${textResponse.slice(0, 150)}`);
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || "Fehler beim Lesen der PDF-Datei.");
      }

      if (data.trades && data.trades.length > 0) {
        setParsedTrades(data.trades);
      } else {
        setError("Aus der PDF-Datei konnten keine eindeutigen Trades extrahiert werden. Du kannst manuell Daten hinzufügen.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler beim Hochladen der PDF-Datei.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }

  function handleTradeChange<K extends keyof ParsedTrade>(index: number, field: K, value: ParsedTrade[K]) {
    setParsedTrades((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function handleAddTradeRow() {
    const newTrade: ParsedTrade = {
      id: `manual-pdf-${Date.now()}`,
      asset: "BTC",
      type: "BUY",
      amount: 1,
      price: 100,
      fee: 0,
      feeCurrency: "EUR",
      exchange: "Binance",
      executedAt: new Date().toISOString().slice(0, 16),
      notes: "Manuell hinzugefügt",
      confidence: 100,
    };
    setParsedTrades((prev) => [...prev, newTrade]);
  }

  function handleRemoveTradeRow(index: number) {
    setParsedTrades((prev) => prev.filter((_, i) => i !== index));
  }

  function handleConfirmImport() {
    if (parsedTrades.length === 0) {
      setError("Keine Trades zum Importieren ausgewählt.");
      return;
    }
    onImportTrades(parsedTrades);
    handleReset();
    onClose();
  }

  function handleReset() {
    setParsedTrades([]);
    setUploadedFileName("");
    setError("");
    setLoading(false);
  }

  return (
    <div className="pdf-modal-backdrop fade-in" onClick={onClose}>
      <div className="pdf-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="pdf-modal-header">
          <div className="pdf-modal-title-wrap">
            <div className="pdf-modal-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="pdf-modal-title">Trade-Erfassung per PDF-Import</h2>
              <p className="pdf-modal-sub">
                Lade Abrechnungen oder Kaufbelege (Trade Republic, Bitpanda, Coinbase, Binance u.v.m.) hoch.
              </p>
            </div>
          </div>
          <button className="pdf-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pdf-modal-body">
          {error && (
            <div className="pdf-modal-alert alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {parsedTrades.length === 0 ? (
            /* Upload Zone */
            <div
              className={`pdf-dropzone ${isDragging ? "dropzone-active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {loading ? (
                <div className="pdf-loading-wrap">
                  <Loader2 size={36} className="spin text-green" />
                  <p className="pdf-loading-text">PDF-Datei wird analysiert...</p>
                  <span className="pdf-loading-sub">{uploadedFileName}</span>
                </div>
              ) : (
                <>
                  <div className="pdf-drop-icon">
                    <UploadCloud size={32} />
                  </div>
                  <h3 className="pdf-drop-title">PDF-Beleg hier hineinziehen</h3>
                  <p className="pdf-drop-sub">oder klicke, um eine Datei auszuwählen</p>
                  <label className="btn btn-primary" style={{ marginTop: "16px", cursor: "pointer" }}>
                    <FileText size={16} /> PDF auswählen
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                      }}
                    />
                  </label>
                  <div className="pdf-supported-badges">
                    <span className="badge-pill">Trade Republic</span>
                    <span className="badge-pill">Bitpanda</span>
                    <span className="badge-pill">Coinbase</span>
                    <span className="badge-pill">Binance</span>
                    <span className="badge-pill">BSDEX</span>
                    <span className="badge-pill">Kraken</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Preview & Edit Table */
            <div className="pdf-preview-container">
              <div className="pdf-preview-header">
                <div className="pdf-preview-info">
                  <CheckCircle2 size={18} className="text-green" />
                  <span>
                    <strong>{parsedTrades.length} Trade(s)</strong> in <code>{uploadedFileName}</code> erkannt:
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddTradeRow}
                >
                  <Plus size={14} /> Zeile hinzufügen
                </button>
              </div>

              <div className="table-responsive" style={{ maxHeight: "320px", overflowY: "auto" }}>
                <table className="pdf-preview-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Typ</th>
                      <th>Menge</th>
                      <th>Kurs (€)</th>
                      <th>Gebühr (€)</th>
                      <th>Börse</th>
                      <th>Datum</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTrades.map((t, idx) => (
                      <tr key={t.id || idx}>
                        <td>
                          <select
                            className="input input-sm"
                            value={t.asset}
                            onChange={(e) => handleTradeChange(idx, "asset", e.target.value)}
                          >
                            {SUPPORTED_ASSETS.map((symbol) => (
                              <option key={symbol} value={symbol}>{symbol}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="input input-sm"
                            value={t.type}
                            onChange={(e) => handleTradeChange(idx, "type", e.target.value as ParsedTrade["type"])}
                          >
                            <option value="BUY">Kauf</option>
                            <option value="SELL">Verkauf</option>
                            <option value="TRANSFER_IN">Eingang</option>
                            <option value="TRANSFER_OUT">Ausgang</option>
                            <option value="STAKING_REWARD">Staking</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="input input-sm"
                            style={{ width: "110px" }}
                            value={t.amount}
                            onChange={(e) => handleTradeChange(idx, "amount", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="input input-sm"
                            style={{ width: "110px" }}
                            value={t.price}
                            onChange={(e) => handleTradeChange(idx, "price", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="input input-sm"
                            style={{ width: "70px" }}
                            value={t.fee}
                            onChange={(e) => handleTradeChange(idx, "fee", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <select
                            className="input input-sm"
                            value={t.exchange}
                            onChange={(e) => handleTradeChange(idx, "exchange", e.target.value)}
                          >
                            {KNOWN_EXCHANGES.map((ex) => (
                              <option key={ex} value={ex}>{ex}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="datetime-local"
                            className="input input-sm"
                            value={t.executedAt}
                            onChange={(e) => handleTradeChange(idx, "executedAt", e.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-icon text-red"
                            onClick={() => handleRemoveTradeRow(idx)}
                            title="Zeile entfernen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pdf-modal-footer">
          {parsedTrades.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
            >
              Andere PDF hochladen
            </button>
          )}
          <div style={{ flexGrow: 1 }} />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          {parsedTrades.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmImport}
            >
              <ShieldCheck size={16} /> {parsedTrades.length} Trade(s) importieren
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .pdf-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .pdf-modal-card {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-xl, 16px);
          max-width: 860px;
          width: 100%;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .pdf-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }
        .pdf-modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pdf-modal-icon {
          width: 40px; height: 40px;
          background: var(--green-dim);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          color: var(--green);
          display: flex; align-items: center; justify-content: center;
        }
        .pdf-modal-title {
          font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0;
        }
        .pdf-modal-sub {
          font-size: 0.82rem; color: var(--text-secondary); margin: 2px 0 0 0;
        }
        .pdf-modal-close {
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; padding: 6px; border-radius: 6px; transition: background 0.2s;
        }
        .pdf-modal-close:hover { background: var(--bg-elevated); color: var(--text-primary); }
        
        .pdf-modal-body { padding: 24px; }
        
        .pdf-modal-alert {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 16px;
        }
        .alert-error {
          background: var(--red-dim); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--red);
        }
        
        .pdf-dropzone {
          border: 2px dashed var(--border-strong);
          border-radius: 14px;
          padding: 40px 20px;
          text-align: center;
          background: var(--bg-surface);
          transition: all 0.2s ease;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .dropzone-active {
          border-color: var(--green);
          background: var(--green-dim);
        }
        .pdf-drop-icon {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: var(--bg-elevated);
          display: flex; align-items: center; justify-content: center;
          color: var(--green);
          margin-bottom: 14px;
        }
        .pdf-drop-title { font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin: 0; }
        .pdf-drop-sub { font-size: 0.85rem; color: var(--text-secondary); margin: 4px 0 0 0; }
        
        .pdf-supported-badges {
          display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 20px;
        }
        .badge-pill {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-size: 0.72rem;
          padding: 3px 10px;
          border-radius: 20px;
        }

        .pdf-loading-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px;
        }
        .pdf-loading-text { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; margin: 0; }
        .pdf-loading-sub { font-size: 0.8rem; color: var(--text-secondary); }
        
        .pdf-preview-container {
          display: flex; flex-direction: column; gap: 14px;
        }
        .pdf-preview-header {
          display: flex; align-items: center; justify-content: space-between;
        }
        .pdf-preview-info {
          display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-primary);
        }
        
        .pdf-preview-table {
          width: 100%; border-collapse: collapse; font-size: 0.82rem;
        }
        .pdf-preview-table th {
          text-align: left; padding: 8px 10px; background: var(--bg-surface);
          color: var(--text-secondary); font-weight: 600; border-bottom: 1px solid var(--border-strong);
        }
        .pdf-preview-table td {
          padding: 6px 8px; border-bottom: 1px solid var(--border);
          color: var(--text-primary);
        }
        .pdf-preview-table select.input,
        .pdf-preview-table input.input {
          background-color: var(--bg-input) !important;
          border: 1.5px solid var(--border-strong) !important;
          color: var(--text-primary) !important;
          padding: 6px 10px !important;
          border-radius: 6px !important;
          font-size: 0.82rem !important;
        }
        .pdf-preview-table select.input:hover,
        .pdf-preview-table input.input:hover {
          border-color: var(--green) !important;
        }
        .pdf-preview-table select.input:focus,
        .pdf-preview-table input.input:focus {
          border-color: var(--green) !important;
          box-shadow: 0 0 0 2px var(--green-dim) !important;
        }
        .pdf-preview-table select option {
          background-color: var(--bg-card);
          color: var(--text-primary);
        }
        
        .pdf-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          background: var(--bg-surface);
          display: flex; align-items: center; gap: 10px;
        }
        
        .hidden { display: none; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .text-green { color: var(--green); }
        .text-red { color: var(--red); }
        .btn-icon { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; color: var(--text-secondary); }
        .btn-icon:hover { background: var(--bg-elevated); color: var(--text-primary); }
      `}</style>
    </div>
  );
}

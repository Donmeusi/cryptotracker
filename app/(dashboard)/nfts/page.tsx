"use client";

import { useState } from "react";
import { MOCK_NFTS } from "@/lib/mock/data";
import { Image as ImageIcon, TrendingUp, TrendingDown, Plus, X, CheckCircle, Edit2, Trash2 } from "lucide-react";

interface NewNFT {
  name: string; collection: string; tokenId: string; purchasePrice: string; floorPrice: string;
}
const EMPTY_NFT: NewNFT = { name: "", collection: "", tokenId: "", purchasePrice: "", floorPrice: "" };

export default function NFTsPage() {
  const [nfts, setNfts] = useState<typeof MOCK_NFTS>(() => [...MOCK_NFTS]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewNFT>(EMPTY_NFT);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  const totalFloorValue = nfts.reduce((s, n) => s + n.floorPrice, 0);
  const totalCostBasis = nfts.reduce((s, n) => s + n.purchasePrice, 0);
  const totalPnl = totalFloorValue - totalCostBasis;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name ist erforderlich."); return; }
    if (!form.collection.trim()) { setFormError("Collection ist erforderlich."); return; }
    if (editId) {
      setNfts((prev) => prev.map(n => n.id === editId ? {
        ...n,
        name: form.name,
        collection: form.collection,
        tokenId: form.tokenId || "#0000",
        floorPrice: parseFloat(form.floorPrice) || 0,
        purchasePrice: parseFloat(form.purchasePrice)
      } : n));
    } else {
      setNfts((prev) => [{
        id: `manual-${Date.now()}`, tokenId: form.tokenId || "#0000",
        contractAddr: "0x0000000000000000000000000000000000000000",
        name: form.name, collection: form.collection, chain: "Ethereum",
        imageUrl: "", floorPrice: parseFloat(form.floorPrice) || 0,
        purchasePrice: parseFloat(form.purchasePrice),
        purchasedAt: new Date().toISOString(),
      }, ...prev]);
    }
    setSaved(true);
    setTimeout(() => { setShowModal(false); setForm(EMPTY_NFT); setSaved(false); setFormError(""); setEditId(null); }, 900);
  }

  function handleEdit(nft: typeof MOCK_NFTS[number]) {
    setForm({
      name: nft.name,
      collection: nft.collection,
      tokenId: nft.tokenId || "",
      purchasePrice: nft.purchasePrice.toString(),
      floorPrice: nft.floorPrice.toString()
    });
    setEditId(nft.id);
    setShowModal(true);
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Möchtest du das NFT '${name}' wirklich löschen?`)) {
      setNfts((prev) => prev.filter(n => n.id !== id));
    }
  }

  return (
    <div className="page-container fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-8)" }}>
        <div><h1 className="page-title">NFT-Sammlung</h1><p className="page-subtitle">Deine Non-Fungible Tokens im Überblick</p></div>
        <button id="nft-add-btn" className="btn btn-secondary" onClick={() => { setEditId(null); setForm(EMPTY_NFT); setShowModal(true); }}>
          <Plus size={15} /> NFT hinzufügen
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card"><div className="stat-label">NFTs insgesamt</div><div className="stat-value">{nfts.length}</div></div>
        <div className="stat-card"><div className="stat-label">Floor-Wert (ETH gesamt)</div><div className="stat-value mono" style={{ fontSize: "var(--text-2xl)" }}>{totalFloorValue.toFixed(2)} ETH</div></div>
        <div className="stat-card"><div className="stat-label">Unrealisierter G&V</div><div className="stat-value mono" style={{ fontSize: "var(--text-2xl)", color: totalPnl >= 0 ? "var(--green)" : "var(--red)" }}>{totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)} ETH</div></div>
      </div>

      <div className="nft-grid">
        {nfts.map((nft) => {
          const pnl = nft.floorPrice - nft.purchasePrice;
          const pnlPct = nft.purchasePrice > 0 ? (pnl / nft.purchasePrice) * 100 : 0;
          const isPositive = pnl >= 0;
          const daysSince = nft.purchasedAt ? Math.floor((Date.now() - new Date(nft.purchasedAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
          const isManual = nft.id.startsWith("manual-");
          return (
            <div key={nft.id} className="nft-card">
              <div className="nft-image">
                <div className="nft-image-placeholder"><ImageIcon size={32} style={{ color: "var(--text-muted)", opacity: 0.3 }} /></div>
                <div className="nft-chain-badge">ETH</div>
                <div className="nft-actions">
                  <button className="btn-icon" onClick={() => handleEdit(nft)} title="Bearbeiten"><Edit2 size={14} /></button>
                  <button className="btn-icon text-red" onClick={() => handleDelete(nft.id, nft.name)} title="Löschen"><Trash2 size={14} /></button>
                </div>
                {isManual && <div className="nft-manual-badge">Manuell</div>}
              </div>
              <div className="nft-info">
                <div className="nft-collection">{nft.collection}</div>
                <div className="nft-name">{nft.name}</div>
                <div className="nft-token-id">{nft.tokenId}</div>
                <div className="nft-prices">
                  <div className="nft-price-row"><span className="nft-price-label">Kaufpreis</span><span className="nft-price-value mono">{nft.purchasePrice} ETH</span></div>
                  <div className="nft-price-row"><span className="nft-price-label">Floor-Preis</span><span className="nft-price-value mono">{nft.floorPrice} ETH</span></div>
                </div>
                <div className={`nft-pnl ${isPositive ? "positive" : "negative"}`}>
                  {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  <span className="mono">{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ETH</span>
                  <span>({pnlPct.toFixed(1)}%)</span>
                </div>
                {daysSince !== null && <div className="nft-held">Gehalten: {daysSince} Tage</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setForm(EMPTY_NFT); setFormError(""); setEditId(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div><h2 className="modal-title">{editId ? "NFT bearbeiten" : "NFT hinzufügen"}</h2><p className="modal-subtitle">{editId ? "Bestehendes NFT anpassen" : "NFT manuell zur Sammlung hinzufügen"}</p></div>
              <button className="modal-close" onClick={() => { setShowModal(false); setForm(EMPTY_NFT); setFormError(""); setEditId(null); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              {formError && <div className="form-error">⚠ {formError}</div>}
              {saved && <div className="form-success"><CheckCircle size={14} /> NFT gespeichert!</div>}
              <div className="form-grid-2">
                <div className="input-group">
                  <label className="label" htmlFor="nft-name">Name *</label>
                  <input id="nft-name" className="input" placeholder="z.B. Bored Ape #1234" value={form.name} onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setFormError(""); }} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="nft-collection">Collection *</label>
                  <input id="nft-collection" className="input" placeholder="z.B. BAYC" value={form.collection} onChange={(e) => { setForm((p) => ({ ...p, collection: e.target.value })); setFormError(""); }} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="nft-token">Token-ID</label>
                  <input id="nft-token" className="input mono" placeholder="#0000" value={form.tokenId} onChange={(e) => setForm((p) => ({ ...p, tokenId: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="nft-purchase">Kaufpreis (ETH) *</label>
                  <input id="nft-purchase" type="number" step="any" min="0" className="input mono" placeholder="z.B. 2.5" value={form.purchasePrice} onChange={(e) => { setForm((p) => ({ ...p, purchasePrice: e.target.value })); setFormError(""); }} />
                </div>
              </div>
              <div className="input-group">
                <label className="label" htmlFor="nft-floor">Floor-Preis (ETH)</label>
                <input id="nft-floor" type="number" step="any" min="0" className="input mono" placeholder="z.B. 3.1" value={form.floorPrice} onChange={(e) => setForm((p) => ({ ...p, floorPrice: e.target.value }))} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setForm(EMPTY_NFT); setFormError(""); setEditId(null); }}>Abbrechen</button>
                <button type="submit" className="btn btn-primary" disabled={saved}><Plus size={15} />{saved ? "Gespeichert!" : (editId ? "Änderungen speichern" : "NFT speichern")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .nft-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--space-4); }
        .nft-card { background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;transition:border-color var(--transition-base),transform var(--transition-base); }
        .nft-card:hover { border-color:var(--border-strong);transform:translateY(-2px); }
        .nft-image { height:200px;background:var(--bg-muted);position:relative;display:flex;align-items:center;justify-content:center; }
        .nft-image-placeholder { display:flex;align-items:center;justify-content:center;width:100%;height:100%; }
        .nft-chain-badge { position:absolute;top:var(--space-3);right:var(--space-3);background:rgba(8,10,15,.8);border:1px solid var(--border-strong);border-radius:var(--radius-full);padding:3px 10px;font-size:var(--text-xs);font-weight:700;color:var(--text-primary); }
        .nft-actions { position:absolute;top:var(--space-2);left:var(--space-2);display:flex;gap:4px;opacity:0;transition:opacity var(--transition-fast);background:rgba(8,10,15,0.7);padding:4px;border-radius:var(--radius-md);backdrop-filter:blur(4px); }
        .nft-card:hover .nft-actions { opacity:1; }
        .btn-icon { background:none;border:none;color:var(--text-primary);cursor:pointer;padding:4px;border-radius:var(--radius-sm);display:inline-flex;align-items:center;justify-content:center;transition:all var(--transition-fast); }
        .btn-icon:hover { background:var(--bg-elevated);color:var(--text-inverse); }
        .text-red:hover { color:var(--red) !important;background:var(--red-dim) !important; }
        .nft-manual-badge { position:absolute;bottom:var(--space-3);right:var(--space-3);background:rgba(245,158,11,.2);border:1px solid rgba(245,158,11,.3);border-radius:var(--radius-full);padding:3px 10px;font-size:var(--text-xs);font-weight:700;color:var(--gold); }
        .nft-info { padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-2); }
        .nft-collection { font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em; }
        .nft-name { font-size:var(--text-base);font-weight:700;color:var(--text-primary); }
        .nft-token-id { font-size:var(--text-xs);color:var(--text-secondary);font-family:var(--font-mono); }
        .nft-prices { padding:var(--space-3);background:var(--bg-surface);border-radius:var(--radius-md);display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-2); }
        .nft-price-row { display:flex;justify-content:space-between;align-items:center; }
        .nft-price-label { font-size:var(--text-xs);color:var(--text-muted); }
        .nft-price-value { font-size:var(--text-sm);font-weight:600;color:var(--text-primary); }
        .nft-pnl { display:flex;align-items:center;gap:var(--space-2);font-weight:600;font-size:var(--text-sm); }
        .nft-held { font-size:var(--text-xs);color:var(--text-muted); }
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
      `}</style>
    </div>
  );
}

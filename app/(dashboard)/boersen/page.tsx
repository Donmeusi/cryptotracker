"use client";

import { ShieldCheck } from "lucide-react";

export default function BoersenPage() {
  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Börsen & Wallets</h1>
        <p className="page-subtitle">API-Anbindung und On-Chain-Bestände</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-16) var(--space-8)", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--bg-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            <ShieldCheck size={28} />
          </div>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>
            Noch keine Börsen oder Wallets verbunden
          </h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 540 }}>
            Die Börsen-Anbindung ist noch nicht implementiert: API-Schlüssel
            werden nicht gespeichert, und der Wallet-Scan liefert bisher keine
            echten Chain-Daten. Deshalb zeigt diese Seite bewusst keine
            Beispielbestände. Deine Positionen pflegst du bis dahin unter
            &apos;Assets&apos;.
          </p>
        </div>
      </div>
    </div>
  );
}

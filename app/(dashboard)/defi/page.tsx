"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers, Settings } from "lucide-react";

export default function DeFiPage() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(localStorage.getItem("ct-module-defi") !== "false");
  }, []);

  if (!enabled) {
    return (
      <div className="page-container fade-in">
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12) var(--space-6)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--bg-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", margin: "0 auto var(--space-4)" }}>
            <Layers size={28} />
          </div>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
            DeFi-Modul ist deaktiviert
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", maxWidth: 460, margin: "0 auto var(--space-6)" }}>
            Dieses Modul wurde in deinen Einstellungen ausgeblendet. Du kannst es unter <strong>Einstellungen &rarr; Module & Funktionen</strong> jederzeit wieder aktivieren.
          </p>
          <Link href="/einstellungen" className="btn btn-primary" style={{ display: "inline-flex" }}>
            <Settings size={15} /> Zu den Einstellungen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">DeFi-Positionen</h1>
        <p className="page-subtitle">Protokolle, Yields und Liquiditätspositionen</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-16) var(--space-8)", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem" }}>🌱</div>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>
            Noch keine DeFi-Positionen
          </h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 520 }}>
            Dieses Modul ist noch nicht an eine Datenquelle angebunden. Deine
            Spot-Positionen pflegst du unter &apos;Assets&apos;; sie fließen dort
            in Wert und G&amp;V ein.
          </p>
        </div>
      </div>
    </div>
  );
}

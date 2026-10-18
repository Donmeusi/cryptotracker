"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Image as ImageIcon, Settings } from "lucide-react";

export default function NFTsPage() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(localStorage.getItem("ct-module-nfts") !== "false");
  }, []);

  if (!enabled) {
    return (
      <div className="page-container fade-in">
        <div className="card" style={{ textAlign: "center", padding: "var(--space-12) var(--space-6)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--bg-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", margin: "0 auto var(--space-4)" }}>
            <ImageIcon size={28} />
          </div>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
            NFT-Modul ist deaktiviert
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
        <h1 className="page-title">NFT-Sammlung</h1>
        <p className="page-subtitle">Deine Non-Fungible Tokens im Überblick</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-16) var(--space-8)", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem" }}>🖼️</div>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>
            Noch keine NFTs
          </h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 520 }}>
            Die NFT-Verwaltung ist noch nicht mit der Datenbank verbunden.
            Bis dahin werden hier keine Einträge gespeichert – statt einer
            Scheinliste bleibt die Ansicht leer.
          </p>
        </div>
      </div>
    </div>
  );
}

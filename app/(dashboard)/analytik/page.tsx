import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytik" };

export default function AnalytikPage() {
  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytik</h1>
        <p className="page-subtitle">Performance-Analyse und detaillierte Statistiken</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-16) var(--space-8)", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem" }}>📈</div>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>
            Noch keine Verlaufsdaten
          </h3>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 520 }}>
            Die Analytik braucht eine Kurshistorie, die die App bisher nicht
            aufzeichnet. Trades und Positionen findest du unter
            &apos;Assets&apos;, Berichte unter &apos;Trades&apos;.
          </p>
        </div>
      </div>
    </div>
  );
}

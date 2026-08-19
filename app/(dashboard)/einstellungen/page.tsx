"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User, Shield, Database, Bell, Palette, ChevronRight,
  CheckCircle, Download, LayoutGrid, Layers, Image as ImageIcon,
  CloudDownload, GitBranch,
} from "lucide-react";
import { downloadCSV, downloadJSON } from "@/lib/exportUtils";
import { MOCK_HOLDINGS, MOCK_ASSETS, generateMockTrades, MOCK_DEFI_POSITIONS, MOCK_NFTS } from "@/lib/mock/data";

const WAEHRUNGEN = [
  { code: "EUR", name: "Euro (€)" },
  { code: "USD", name: "US-Dollar ($)" },
  { code: "CHF", name: "Schweizer Franken (CHF)" },
  { code: "GBP", name: "Britisches Pfund (£)" },
  { code: "JPY", name: "Japanischer Yen (¥)" },
];

type Tab = "profil" | "sicherheit" | "erscheinungsbild" | "module" | "benachrichtigungen" | "datenbank" | "system";

const NAV_ITEMS: { id: Tab; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: "profil", icon: User, label: "Profil" },
  { id: "sicherheit", icon: Shield, label: "Sicherheit" },
  { id: "erscheinungsbild", icon: Palette, label: "Erscheinungsbild" },
  { id: "module", icon: LayoutGrid, label: "Module & Funktionen" },
  { id: "benachrichtigungen", icon: Bell, label: "Benachrichtigungen" },
  { id: "datenbank", icon: Database, label: "Datenbank & Export" },
  { id: "system", icon: CloudDownload, label: "System & Updates" },
];

// ─── Theme definitions ────────────────────────────────────────────────────────
const THEMES = [
  {
    id: "dark",
    label: "Dunkel",
    previewBg: "#080a0f",
    vars: {
      "--bg-base": "#080a0f",
      "--bg-surface": "#0d1117",
      "--bg-card": "#111827",
      "--bg-elevated": "#1a2235",
      "--bg-input": "#0f172a",
      "--text-primary": "#f1f5f9",
      "--text-secondary": "#94a3b8",
      "--text-muted": "#64748b",
      "--border": "rgba(255,255,255,0.07)",
      "--border-strong": "rgba(255,255,255,0.22)",
    },
  },
  {
    id: "midnight",
    label: "Midnight Blue",
    previewBg: "#050711",
    vars: {
      "--bg-base": "#050711",
      "--bg-surface": "#080d1a",
      "--bg-card": "#0e1628",
      "--bg-elevated": "#162035",
      "--bg-input": "#0b1326",
      "--text-primary": "#e2e8f0",
      "--text-secondary": "#7c93b5",
      "--text-muted": "#4a5d7a",
      "--border": "rgba(100,149,237,0.08)",
      "--border-strong": "rgba(100,149,237,0.25)",
    },
  },
  {
    id: "light",
    label: "Hell",
    previewBg: "#f8fafc",
    vars: {
      "--bg-base": "#f1f5f9",
      "--bg-surface": "#ffffff",
      "--bg-card": "#ffffff",
      "--bg-elevated": "#e2e8f0",
      "--bg-input": "#ffffff",
      "--text-primary": "#0f172a",
      "--text-secondary": "#334155",
      "--text-muted": "#64748b",
      "--border": "#cbd5e1",
      "--border-strong": "#94a3b8",
    },
  },
  {
    id: "forest",
    label: "Forest",
    previewBg: "#0a1a0e",
    vars: {
      "--bg-base": "#0a1a0e",
      "--bg-surface": "#0f2214",
      "--bg-card": "#162b1b",
      "--bg-elevated": "#1e3a25",
      "--bg-input": "#0d2113",
      "--text-primary": "#dcfce7",
      "--text-secondary": "#86efac",
      "--text-muted": "#4ade80",
      "--border": "rgba(34,197,94,0.10)",
      "--border-strong": "rgba(34,197,94,0.20)",
    },
  },
] as const;

type ThemeId = typeof THEMES[number]["id"];

const ACCENT_COLORS = [
  { id: "green", label: "Grün", color: "#22c55e" },
  { id: "blue", label: "Blau", color: "#3b82f6" },
  { id: "teal", label: "Teal", color: "#14b8a6" },
  { id: "orange", label: "Orange", color: "#f59e0b" },
  { id: "pink", label: "Pink", color: "#ec4899" },
];

function applyTheme(themeId: ThemeId, accentColor: string) {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
  root.style.colorScheme = themeId === "light" ? "light" : "dark";
  root.style.setProperty("--green", accentColor);
  root.style.setProperty("--green-dim", accentColor + "22");
  localStorage.setItem("ct-theme", themeId);
  localStorage.setItem("ct-accent", accentColor);
}

function AppearancePanel() {
  const [activeTheme, setActiveTheme] = useState<ThemeId>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ct-theme") as ThemeId) || "dark";
    }
    return "dark";
  });
  const [accent, setAccent] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ct-accent") || "#22c55e";
    }
    return "#22c55e";
  });
  const [fontSize, setFontSize] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ct-fontsize") || "normal";
    }
    return "normal";
  });
  const [animations, setAnimations] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ct-animations") !== "false";
    }
    return true;
  });
  const [saved, setSaved] = useState(false);

  // Bug fix: Restore persisted theme on every mount (survives hard-reload)
  // useEffect runs after hydration, so document access is safe.
  useState(() => {
    if (typeof window === "undefined") return;
    const storedTheme = (localStorage.getItem("ct-theme") as ThemeId) || "dark";
    const storedAccent = localStorage.getItem("ct-accent") || "#22c55e";
    const storedFontSize = localStorage.getItem("ct-fontsize") || "normal";
    const storedAnimations = localStorage.getItem("ct-animations") !== "false";

    // Re-apply CSS variables so they take effect immediately after navigation
    applyTheme(storedTheme, storedAccent);

    const fontMap: Record<string, string> = { small: "13px", normal: "14px", large: "16px" };
    document.documentElement.style.setProperty("--base-font-size", fontMap[storedFontSize] || "14px");

    if (!storedAnimations) {
      document.documentElement.style.setProperty("--transition-base", "0s");
      document.documentElement.style.setProperty("--transition-fast", "0s");
    }
  });


  function handleThemeChange(themeId: ThemeId) {
    setActiveTheme(themeId);
    applyTheme(themeId, accent);
  }

  function handleAccentChange(color: string) {
    setAccent(color);
    applyTheme(activeTheme, color);
  }

  function handleFontSize(size: string) {
    setFontSize(size);
    const root = document.documentElement;
    const map: Record<string, string> = { small: "13px", normal: "14px", large: "16px" };
    root.style.setProperty("--base-font-size", map[size] || "14px");
    localStorage.setItem("ct-fontsize", size);
  }

  function handleAnimations(val: boolean) {
    setAnimations(val);
    document.documentElement.style.setProperty(
      "--transition-base", val ? "0.25s ease" : "0s"
    );
    document.documentElement.style.setProperty(
      "--transition-fast", val ? "0.15s ease" : "0s"
    );
    localStorage.setItem("ct-animations", String(val));
  }

  function handleSave() {
    applyTheme(activeTheme, accent);
    handleFontSize(fontSize);
    handleAnimations(animations);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="card fade-in">
      <h2 className="settings-section-title">Erscheinungsbild</h2>
      <div className="settings-form">

        {/* Theme selector */}
        <div className="input-group">
          <label className="label">Farbschema</label>
          <div className="theme-grid">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-option ${activeTheme === t.id ? "active" : ""}`}
                onClick={() => handleThemeChange(t.id)}
                type="button"
              >
                <div className="theme-preview" style={{ background: t.previewBg }}>
                  <div className="theme-preview-bar" style={{ background: t.id === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)" }} />
                  <div className="theme-preview-content" style={{ background: t.id === "light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)" }} />
                  <div className="theme-preview-accent" style={{ background: accent }} />
                </div>
                <span style={{ flex: 1, textAlign: "left" }}>{t.label}</span>
                {activeTheme === t.id && <CheckCircle size={14} style={{ color: accent, flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="input-group">
          <label className="label">Akzentfarbe</label>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {ACCENT_COLORS.map((a) => (
              <button
                key={a.id}
                type="button"
                title={a.label}
                onClick={() => handleAccentChange(a.color)}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: a.color, border: accent === a.color
                    ? `3px solid var(--text-primary)`
                    : "3px solid transparent",
                  cursor: "pointer",
                  boxShadow: accent === a.color ? `0 0 0 2px ${a.color}44` : "none",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* Font size */}
        <div className="input-group">
          <label className="label">Schriftgröße</label>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {[
              { id: "small", label: "Klein" },
              { id: "normal", label: "Normal" },
              { id: "large", label: "Groß" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleFontSize(s.id)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  border: `1.5px solid ${fontSize === s.id ? accent : "var(--border-strong)"}`,
                  background: fontSize === s.id ? accent + "22" : "none",
                  color: fontSize === s.id ? accent : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Animations toggle */}
        <div className="input-group">
          <label className="label">Animationen</label>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4)", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>Übergänge & Animationen</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>Deaktiviere für bessere Performance</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={animations} onChange={(e) => handleAnimations(e.target.checked)} />
              <span className="toggle-track"><span className="toggle-thumb" /></span>
            </label>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button className="btn btn-primary" type="button" onClick={handleSave}>
            Speichern
          </button>
          {saved && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: accent, fontSize: "var(--text-sm)", fontWeight: 500, animation: "fadeIn 0.2s ease" }}>
              <CheckCircle size={14} /> Gespeichert & angewendet
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ModulePanel() {
  const [showDefi, setShowDefi] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ct-module-defi") !== "false";
    }
    return true;
  });
  const [showNfts, setShowNfts] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ct-module-nfts") !== "false";
    }
    return true;
  });
  const [saved, setSaved] = useState(false);

  function handleToggle(module: "defi" | "nfts", val: boolean) {
    if (module === "defi") {
      setShowDefi(val);
      localStorage.setItem("ct-module-defi", String(val));
    } else {
      setShowNfts(val);
      localStorage.setItem("ct-module-nfts", String(val));
    }
    window.dispatchEvent(new Event("ct-modules-changed"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card fade-in">
      <h2 className="settings-section-title">Module & Funktionen</h2>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
        Aktiviere oder deaktiviere einzelne Funktionsbereiche. Deaktivierte Module werden in der Seitenleiste ausgeblendet.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {/* DeFi Modul */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--space-4) var(--space-5)", background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)", border: "1px solid var(--border)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "var(--radius-md)",
              background: showDefi ? "var(--green-dim)" : "var(--bg-muted)",
              border: `1px solid ${showDefi ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: showDefi ? "var(--green)" : "var(--text-muted)",
              transition: "all var(--transition-fast)"
            }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text-primary)" }}>DeFi-Bereich</span>
                <span className={`badge ${showDefi ? "badge-green" : "badge-gold"}`} style={{ fontSize: "10px" }}>
                  {showDefi ? "Aktiv" : "Deaktiviert"}
                </span>
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                Anzeige von Staking-Positionen, Liquidity Pools & Lending (`/defi`)
              </div>
            </div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showDefi}
              onChange={(e) => handleToggle("defi", e.target.checked)}
            />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
          </label>
        </div>

        {/* NFT Modul */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "var(--space-4) var(--space-5)", background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)", border: "1px solid var(--border)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "var(--radius-md)",
              background: showNfts ? "var(--green-dim)" : "var(--bg-muted)",
              border: `1px solid ${showNfts ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: showNfts ? "var(--green)" : "var(--text-muted)",
              transition: "all var(--transition-fast)"
            }}>
              <ImageIcon size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text-primary)" }}>NFT-Bereich</span>
                <span className={`badge ${showNfts ? "badge-green" : "badge-gold"}`} style={{ fontSize: "10px" }}>
                  {showNfts ? "Aktiv" : "Deaktiviert"}
                </span>
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                Verwaltung von NFT-Kollektionen & Floor-Preisen (`/nfts`)
              </div>
            </div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showNfts}
              onChange={(e) => handleToggle("nfts", e.target.checked)}
            />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
          </label>
        </div>
      </div>

      {saved && (
        <div style={{ marginTop: "var(--space-5)", display: "flex", alignItems: "center", gap: 6, color: "var(--green)", fontSize: "var(--text-sm)", fontWeight: 500 }}>
          <CheckCircle size={14} /> Einstellungen übernommen – Seitenleiste aktualisiert
        </div>
      )}
    </div>
  );
}

type NotificationSettings = {
  priceAlerts: boolean;
  portfolioSummary: boolean;
  tradeConfirm: boolean;
  security: boolean;
  taxReminder: boolean;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
};

function NotificationsPanel({ userEmail }: { userEmail?: string }) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});

  useEffect(() => {
    fetch("/api/notifications/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setSettings({
            priceAlerts: data.priceAlerts ?? true,
            portfolioSummary: data.portfolioSummary ?? true,
            tradeConfirm: data.tradeConfirm ?? false,
            security: data.security ?? true,
            taxReminder: data.taxReminder ?? false,
            smtpHost: data.smtpHost ?? "",
            smtpPort: data.smtpPort ?? "",
            smtpUser: data.smtpUser ?? "",
            smtpPass: data.smtpPass ?? "",
            smtpFrom: data.smtpFrom ?? "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail(apiType: string, id: string) {
    setTestStatus((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: apiType }),
      });
      if (res.ok) {
        setTestStatus((prev) => ({ ...prev, [id]: "success" }));
      } else {
        setTestStatus((prev) => ({ ...prev, [id]: "error" }));
      }
    } catch {
      setTestStatus((prev) => ({ ...prev, [id]: "error" }));
    }
    setTimeout(() => {
      setTestStatus((prev) => ({ ...prev, [id]: "idle" }));
    }, 3000);
  }

  const items = [
    { id: "priceAlerts", apiType: "price-alert", label: "Preisalarme", desc: "Benachrichtigung bei großen Kursbewegungen" },
    { id: "portfolioSummary", apiType: "portfolio-summary", label: "Portfolio-Zusammenfassung", desc: "Tägliche Übersicht um 20:00 Uhr" },
    { id: "tradeConfirm", apiType: "trade-confirm", label: "Trade-Bestätigungen", desc: "Bei jedem Import neuer Trades" },
    { id: "security", apiType: "security", label: "Sicherheitsmeldungen", desc: "Neue Anmeldungen und Passwortänderungen" },
    { id: "taxReminder", apiType: "tax-reminder", label: "Steuer-Erinnerungen", desc: "Halbjährliche Steuerpflicht-Hinweise" },
  ];

  if (loading) {
    return (
      <div className="card fade-in" style={{ opacity: 0.5 }}>
        <h2 className="settings-section-title">Benachrichtigungen laden...</h2>
      </div>
    );
  }

  return (
    <div className="card fade-in">
      <h2 className="settings-section-title">Benachrichtigungen</h2>
      {userEmail && (
        <div style={{ marginBottom: "var(--space-5)", padding: "var(--space-3) var(--space-4)", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
          E-Mails werden gesendet an: <strong style={{ color: "var(--text-primary)" }}>{userEmail}</strong>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        {items.map((n) => {
          const val = settings ? settings[n.id as keyof NotificationSettings] : false;
          const status = testStatus[n.id] || "idle";

          return (
            <div key={n.id} className="notification-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                  {n.label}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                  {n.desc}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                {val && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: "4px 8px", fontSize: "11px", minWidth: 90 }}
                    onClick={() => sendTestEmail(n.apiType, n.id)}
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? "Sendet..." : status === "success" ? "Gesendet!" : status === "error" ? "Fehler" : "Test senden"}
                  </button>
                )}
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => {
                      if (settings) {
                        setSettings({ ...settings, [n.id]: e.target.checked });
                      }
                    }}
                  />
                  <span className="toggle-track">
                    <span className="toggle-thumb" />
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <h3 style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>SMTP-Server konfigurieren</h3>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
          Hinterlege hier deine eigenen E-Mail-Zugangsdaten (z. B. Gmail App-Passwort), damit Notification-Mails direkt für dich über deinen Server gesendet werden können.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <div className="input-group">
            <label className="label">SMTP Host</label>
            <input
              type="text"
              className="input"
              placeholder="z.B. smtp.gmail.com"
              value={settings?.smtpHost || ""}
              onChange={(e) => settings && setSettings({ ...settings, smtpHost: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label className="label">SMTP Port</label>
            <input
              type="text"
              className="input"
              placeholder="z.B. 587"
              value={settings?.smtpPort || ""}
              onChange={(e) => settings && setSettings({ ...settings, smtpPort: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <div className="input-group">
            <label className="label">SMTP Benutzer (E-Mail)</label>
            <input
              type="text"
              className="input"
              value={settings?.smtpUser || ""}
              onChange={(e) => settings && setSettings({ ...settings, smtpUser: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label className="label">SMTP Passwort (App-Passwort)</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={settings?.smtpPass || ""}
              onChange={(e) => settings && setSettings({ ...settings, smtpPass: e.target.value })}
            />
          </div>
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Absender E-Mail</label>
          <input
            type="text"
            className="input"
            placeholder="CryptoTracker <deine-email@gmail.com>"
            value={settings?.smtpFrom || ""}
            onChange={(e) => settings && setSettings({ ...settings, smtpFrom: e.target.value })}
          />
        </div>
      </div>

      <div style={{ marginTop: "var(--space-6)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Wird gespeichert..." : "Speichern"}
        </button>
        {saved && (
          <span className="save-feedback success">
            <CheckCircle size={14} /> Gespeichert
          </span>
        )}
      </div>
    </div>
  );
}

type OidcFormState = {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string;
  clientName: string;
  hasSecret?: boolean;
};

function OidcSettingsPanel() {
  const [form, setForm] = useState<OidcFormState>({
    enabled: false,
    issuer: "",
    clientId: "",
    clientSecret: "",
    clientName: "Single Sign-On",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/auth/oidc-config")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setForm({
            enabled: Boolean(data.enabled),
            issuer: data.issuer || "",
            clientId: data.clientId || "",
            clientSecret: "",
            clientName: data.clientName || "Pocket-ID / SSO",
            hasSecret: Boolean(data.hasSecret),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/oidc-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Lade OIDC Einstellungen...</div>;
  }

  return (
    <div style={{ marginTop: "var(--space-2)" }}>
      <h2 className="settings-section-title">
        Single Sign-On (OIDC / Pocket-ID / Keycloak / Authentik)
      </h2>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
        Konfiguriere deinen eigenen OpenID Connect Provider direkt über die UI.
      </p>

      {/* Enable toggle */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-4)", background: "var(--bg-surface)",
        borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: "var(--space-4)"
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
            OIDC / SSO Login aktivieren
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
            Zeigt den SSO-Login Button auf der Anmeldeseite an
          </div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <span className="toggle-track"><span className="toggle-thumb" /></span>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div className="input-group">
          <label className="label">Anzeige-Name auf Login-Button</label>
          <input
            type="text"
            className="input"
            placeholder="z.B. Pocket-ID oder Keycloak"
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label className="label">OIDC Issuer URL (Server-Adresse)</label>
          <input
            type="text"
            className="input"
            placeholder="http://localhost:8080 oder https://auth.deine-domain.de"
            value={form.issuer}
            onChange={(e) => setForm({ ...form, issuer: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <div className="input-group">
          <label className="label">Client ID</label>
          <input
            type="text"
            className="input"
            placeholder="z.B. cryptotracker"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label className="label">
            Client Secret {form.hasSecret && <span style={{ color: "var(--green)", fontSize: "11px" }}>(bereits hinterlegt)</span>}
          </label>
          <input
            type="password"
            className="input"
            placeholder={form.hasSecret ? "•••••••• (unverändert lassen)" : "Geheimes Secret"}
            value={form.clientSecret}
            onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
          />
        </div>
      </div>

      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", background: "var(--bg-surface)", padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: "var(--space-4)" }}>
        <div><strong>Wichtig – Redirect-URI im OIDC Provider eintragen:</strong></div>
        <code className="code" style={{ marginTop: 4, display: "inline-block" }}>http://localhost:3000/api/auth/callback/oidc</code>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Wird gespeichert..." : "OIDC Einstellungen speichern"}
        </button>
        {saved && (
          <span className="save-feedback success">
            <CheckCircle size={14} /> OIDC Konfiguration gespeichert & aktiv
          </span>
        )}
      </div>
    </div>
  );
}

function SystemUpdatePanel() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/Donmeusi/cryptotracker.git");
  const [currentBranch, setCurrentBranch] = useState("main");
  const [targetBranch, setTargetBranch] = useState("main");
  const [localCommit, setLocalCommit] = useState("v0.3.0");
  const [remoteCommit, setRemoteCommit] = useState("v0.3.0");
  const [updatesAvailable, setUpdatesAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const fetchVersionInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/update");
      const data = await res.json();
      if (!data.error) {
        setCurrentBranch(data.currentBranch || "main");
        setTargetBranch(data.currentBranch || "main");
        setLocalCommit(data.localCommit || "v0.3.0");
        setRemoteCommit(data.remoteCommit || "v0.3.0");
        setRepoUrl(data.repoUrl || "https://github.com/Donmeusi/cryptotracker.git");
        setUpdatesAvailable(Boolean(data.updatesAvailable));
      }
    } catch (e) {
      console.error("Error fetching version info", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersionInfo();
  }, []);

  const handleSaveRepoUrl = () => {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const handleDoUpdate = async () => {
    if (!confirm(`Möchtest du das Update / den Kanal-Wechsel auf '${targetBranch}' jetzt wirklich durchführen?`)) {
      return;
    }
    setUpdating(true);
    setLogs(["Update wird initialisiert..."]);
    try {
      const res = await fetch("/api/system/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetBranch, repoUrl }),
      });
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
      if (data.success) {
        setCurrentBranch(data.currentBranch);
        setLocalCommit(data.updatedCommit);
        setUpdatesAvailable(false);
      }
    } catch (e: any) {
      setLogs((prev) => [...prev, `Fehler beim Ausführen: ${e?.message || e}`]);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="settings-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GitBranch size={18} style={{ color: "#F1502F" }} /> Repository-Konfiguration
        </h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
          Quell-URL für automatische System-Updates. Standard: <code className="code">https://github.com/Donmeusi/cryptotracker.git</code>
        </p>

        <div className="input-group">
          <label className="label">Git Repository URL</label>
          <input
            type="text"
            className="input"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/Donmeusi/cryptotracker.git"
          />
        </div>

        <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <button className="btn btn-secondary" onClick={handleSaveRepoUrl}>
            URL speichern
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setRepoUrl("https://github.com/Donmeusi/cryptotracker.git")}
          >
            Standard wiederherstellen
          </button>
          {saveStatus === "saved" && (
            <span className="save-feedback success">
              <CheckCircle size={14} /> URL gespeichert
            </span>
          )}
        </div>
      </div>

      <div className="divider" />

      <div style={{ marginTop: "var(--space-4)" }}>
        <h2 className="settings-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CloudDownload size={18} style={{ color: "var(--green)" }} /> Versionsprüfung & Update-Kanal
        </h2>

        {/* Version info card */}
        <div
          style={{
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            padding: "var(--space-4)",
            marginBottom: "var(--space-4)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)" }}>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Installierte Version (Lokal):</span>
              <div style={{ marginTop: 4 }}>
                <code className="code" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {loading ? "Wird geladen..." : localCommit}
                </code>
              </div>
            </div>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Neueste Version (Remote):</span>
              <div style={{ marginTop: 4 }}>
                <code className="code" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {loading ? "Wird geladen..." : remoteCommit}
                </code>
              </div>
            </div>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Aktueller Kanal:</span>
              <div style={{ marginTop: 4 }}>
                <span className={`badge ${currentBranch === "main" ? "badge-green" : "badge-orange"}`}>
                  {currentBranch.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Channel select */}
        <div className="input-group" style={{ marginBottom: "var(--space-4)" }}>
          <label className="label">Update-Kanal (Branch) wählen</label>
          <select
            className="input"
            style={{ maxWidth: "320px" }}
            value={targetBranch}
            onChange={(e) => setTargetBranch(e.target.value)}
          >
            <option value="main">Stable (main)</option>
            <option value="beta">Beta (beta)</option>
          </select>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 6 }}>
            Aktueller Kanal: <strong>{currentBranch}</strong>. Wenn du den Kanal wechselst, wird das System beim Update automatisch auf den gewählten Zweig umgestellt.
          </p>
        </div>

        {/* Status indicator */}
        {updatesAvailable ? (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "var(--radius-md)",
              color: "#22c55e",
              fontSize: "var(--text-sm)",
              marginBottom: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle size={16} /> Neues Update auf dem Kanal '{targetBranch}' verfügbar!
          </div>
        ) : (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              marginBottom: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle size={16} style={{ color: "var(--green)" }} />
            Dein System ist auf dem neuesten Stand für den Kanal '{currentBranch}'.
          </div>
        )}

        {/* Execute button */}
        <button
          className="btn btn-primary"
          onClick={handleDoUpdate}
          disabled={updating || loading}
          style={{ gap: 8 }}
        >
          {updating ? "Update wird durchgeführt..." : "Update / Kanal-Wechsel durchführen"}
        </button>

        {/* Log box */}
        {logs.length > 0 && (
          <div
            style={{
              marginTop: "var(--space-4)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              fontFamily: "monospace",
              fontSize: "12px",
              color: "var(--text-secondary)",
              maxHeight: "180px",
              overflowY: "auto",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Execution Log:</div>
            {logs.map((log, index) => (
              <div key={index}>&gt; {log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type DbFormState = {
  type: "sqlite" | "postgresql" | "mysql";
  url: string;
  host: string;
  port: number | string;
  database: string;
  username: string;
  password: string;
  hasPassword?: boolean;
};

function DbConfigPanel() {
  const [form, setForm] = useState<DbFormState>({
    type: "sqlite",
    url: "",
    host: "",
    port: 5432,
    database: "",
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/system/db-config")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setForm({
            type: data.type || "sqlite",
            url: data.url || "",
            host: data.host || "",
            port: data.port || (data.type === "postgresql" ? 5432 : 3306),
            database: data.database || "",
            username: data.username || "",
            password: "",
            hasPassword: Boolean(data.hasPassword),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleTestConnection = async () => {
    if (form.type !== "sqlite") {
      const host = (form.host || "").trim();
      const database = (form.database || "").trim();
      const username = (form.username || "").trim();
      const url = (form.url || "").trim();

      if (!url && (!host || !database || !username)) {
        setTestResult({
          success: false,
          error: "Bitte fülle Host, Datenbankname und Benutzername aus.",
        });
        return;
      }
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/system/db-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", config: form }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, error: data.error || "Verbindungstest fehlgeschlagen." });
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e?.message || "Netzwerkfehler beim Verbindungstest" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    setLogs([]);
    try {
      const res = await fetch("/api/system/db-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", config: form }),
      });
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
      if (data.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (e: any) {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Lade Datenbank-Konfiguration...</div>;
  }

  return (
    <div className="card">
      <h2 className="settings-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Database size={18} style={{ color: "var(--green)" }} /> Externe Datenbank-Konfiguration (UI)
      </h2>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
        Verbinde deine eigene PostgreSQL-, MySQL- oder SQLite-Datenbank direkt über die App – ohne <code className="code">.env</code>-Dateien bearbeiten zu müssen.
      </p>

      {/* DB Type selector */}
      <div className="input-group" style={{ marginBottom: "var(--space-4)" }}>
        <label className="label">Datenbank-Typ</label>
        <select
          className="input"
          style={{ maxWidth: "320px" }}
          value={form.type}
          onChange={(e) => {
            const newType = e.target.value as "sqlite" | "postgresql" | "mysql";
            setForm({
              ...form,
              type: newType,
              url: newType === "sqlite" ? "file:./cryptotracker.db" : "",
              port: newType === "postgresql" ? 5432 : newType === "mysql" ? 3306 : "",
            });
          }}
        >
          <option value="sqlite">SQLite (Lokale Datei)</option>
          <option value="postgresql">PostgreSQL (Server)</option>
          <option value="mysql">MySQL / MariaDB (Server)</option>
        </select>
      </div>

      {form.type === "sqlite" ? (
        <div style={{ padding: "var(--space-3) var(--space-4)", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: "var(--space-4)" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            <strong>Lokale SQLite-Datenbank aktiv:</strong> <code className="code">./prisma/cryptotracker.db</code>
          </div>
        </div>
      ) : (
        <>
          {/* Connection fields */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div className="input-group">
              <label className="label">Host / Server IP</label>
              <input
                type="text"
                className="input"
                placeholder={form.type === "postgresql" ? "localhost oder 192.168.1.100" : "localhost"}
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="label">Port</label>
              <input
                type="number"
                className="input"
                placeholder={form.type === "postgresql" ? "5432" : "3306"}
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div className="input-group">
              <label className="label">Datenbank-Name</label>
              <input
                type="text"
                className="input"
                placeholder="cryptotracker"
                value={form.database}
                onChange={(e) => setForm({ ...form, database: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="label">Benutzername</label>
              <input
                type="text"
                className="input"
                placeholder={form.type === "postgresql" ? "postgres" : "root"}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="label">
                Passwort {form.hasPassword && <span style={{ color: "var(--green)", fontSize: "11px" }}>(hinterlegt)</span>}
              </label>
              <input
                type="password"
                className="input"
                placeholder={form.hasPassword ? "•••••••• (unverändert)" : "Passwort"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: "var(--space-4)" }}>
            <label className="label">Oder benutzerdefinierter Connection-String URL (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder={form.type === "postgresql" ? "postgresql://user:pass@localhost:5432/db" : "mysql://user:pass@localhost:3306/db"}
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Test feedback */}
      {testResult && (
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
            fontSize: "var(--text-xs)",
            background: testResult.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: testResult.success ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
            color: testResult.success ? "#22c55e" : "#ef4444",
          }}
        >
          {testResult.success ? testResult.message : testResult.error}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
        {form.type !== "sqlite" && (
          <button className="btn btn-secondary" onClick={handleTestConnection} disabled={testing}>
            {testing ? "Verbindung wird geprüft..." : "Verbindung testen"}
          </button>
        )}
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Wird gespeichert..." : "Speichern & Verbinden"}
        </button>
        {saveStatus === "saved" && (
          <span className="save-feedback success">
            <CheckCircle size={14} /> Datenbank-Konfiguration gespeichert
          </span>
        )}
      </div>

      {logs.length > 0 && (
        <div
          style={{
            marginTop: "var(--space-4)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3)",
            fontFamily: "monospace",
            fontSize: "12px",
            color: "var(--text-secondary)",
            maxHeight: "140px",
            overflowY: "auto",
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Sync Log:</div>
          {logs.map((log, i) => (
            <div key={i}>&gt; {log}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EinstellungenPage() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string; currency?: string } | undefined;
  const currency = user?.currency || "EUR";

  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  function handleSave() {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Einstellungen</h1>
        <p className="page-subtitle">Konto, Sicherheit und App-Konfiguration</p>
      </div>

      <div className="settings-layout">
        {/* Sidebar Navigation */}
        <div className="settings-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              id={`settings-tab-${item.id}`}
              className={`settings-nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
              <ChevronRight
                size={14}
                style={{
                  marginLeft: "auto",
                  opacity: activeTab === item.id ? 0.8 : 0.3,
                  transform: activeTab === item.id ? "translateX(2px)" : "none",
                  transition: "all 0.15s ease",
                  color: activeTab === item.id ? "var(--green)" : "inherit",
                }}
              />
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="settings-content">

          {/* ─── Profil ─────────────────────────────── */}
          {activeTab === "profil" && (
            <div className="card fade-in">
              <h2 className="settings-section-title">Profil</h2>
              <div className="settings-form">
                <div className="input-group">
                  <label className="label" htmlFor="s-name">Name</label>
                  <input id="s-name" className="input" defaultValue={user?.name || ""} placeholder="Dein Name" />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="s-email">E-Mail-Adresse</label>
                  <input
                    id="s-email"
                    className="input"
                    defaultValue={user?.email || ""}
                    type="email"
                    disabled
                    style={{ opacity: 0.5, cursor: "not-allowed" }}
                  />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    E-Mail kann derzeit nicht geändert werden.
                  </span>
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="s-currency">Standardwährung</label>
                  <select id="s-currency" className="input" defaultValue={currency}>
                    {WAEHRUNGEN.map((w) => (
                      <option key={w.code} value={w.code}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <button className="btn btn-primary" onClick={handleSave}>
                    Speichern
                  </button>
                  {saveStatus === "saved" && (
                    <span className="save-feedback success">
                      <CheckCircle size={14} /> Gespeichert
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Sicherheit ─────────────────────────── */}
          {activeTab === "sicherheit" && (
            <div className="card fade-in">
              <h2 className="settings-section-title">Passwort ändern</h2>
              <div className="settings-form">
                <div className="input-group">
                  <label className="label" htmlFor="s-curr-pw">Aktuelles Passwort</label>
                  <input id="s-curr-pw" className="input" type="password" placeholder="••••••••" />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="s-new-pw">Neues Passwort</label>
                  <input id="s-new-pw" className="input" type="password" placeholder="Mindestens 8 Zeichen" />
                </div>
                <div className="input-group">
                  <label className="label" htmlFor="s-confirm-pw">Passwort bestätigen</label>
                  <input id="s-confirm-pw" className="input" type="password" placeholder="••••••••" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <button className="btn btn-secondary" onClick={handleSave}>
                    Passwort aktualisieren
                  </button>
                  {saveStatus === "saved" && (
                    <span className="save-feedback success">
                      <CheckCircle size={14} /> Aktualisiert
                    </span>
                  )}
                </div>
              </div>

              <div className="divider" />

              <OidcSettingsPanel />

              <div className="divider" />

              <h2 className="settings-section-title" style={{ marginTop: "var(--space-2)" }}>
                Sitzungen
              </h2>
              <div className="session-card">
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                    Aktuelles Gerät
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                    Zuletzt aktiv: gerade eben · Windows · Chrome
                  </div>
                </div>
                <span className="badge badge-green">Aktiv</span>
              </div>
            </div>
          )}

          {/* ─── Erscheinungsbild ────────────────────── */}
          {activeTab === "erscheinungsbild" && (
            <AppearancePanel />
          )}

          {/* ─── Module & Funktionen ────────────────── */}
          {activeTab === "module" && (
            <ModulePanel />
          )}

          {/* ─── Benachrichtigungen ──────────────────── */}
          {activeTab === "benachrichtigungen" && (
            <NotificationsPanel userEmail={user?.email} />
          )}

          {/* ─── Datenbank & Export ──────────────────── */}
          {activeTab === "datenbank" && (
            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* Interactive External DB Config */}
              <DbConfigPanel />

              {/* DB-Info */}
              <div className="card">
                <h2 className="settings-section-title">Datenbank-Status</h2>
                <div className="db-info">
                  <div className="db-info-row">
                    <span className="db-info-label">Datenbanktyp</span>
                    <span className="badge badge-green">SQLite (Lokal)</span>
                  </div>
                  <div className="db-info-row">
                    <span className="db-info-label">Datei</span>
                    <code className="code">./prisma/cryptotracker.db</code>
                  </div>
                  <div className="db-info-row">
                    <span className="db-info-label">Prisma-Version</span>
                    <code className="code">6.6.0</code>
                  </div>
                </div>

                {/* Migration CTA */}
                <div className="migration-note">
                  <Database size={13} />
                  <div>
                    <strong>PostgreSQL-Migration</strong>
                    <span>
                      Ändere <code className="code">DATABASE_URL</code> in <code className="code">.env</code>{" "}
                      und führe <code className="code">npx prisma migrate deploy</code> aus.
                    </span>
                  </div>
                </div>
              </div>

              {/* Export */}
              <div className="card">
                <h2 className="settings-section-title">Daten exportieren</h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-5)" }}>
                  Exportiere alle deine Portfolio-Daten, Trades und Steuerereignisse.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      downloadJSON(
                        { holdings: MOCK_HOLDINGS, assets: MOCK_ASSETS, defi: MOCK_DEFI_POSITIONS, nfts: MOCK_NFTS, exportedAt: new Date().toISOString() },
                        "CryptoTracker_Portfolio.json"
                      );
                    }}
                  >
                    <Download size={14} /> Portfolio (JSON)
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      downloadCSV(
                        generateMockTrades().map((t) => ({
                          Datum: new Date(t.executedAt).toLocaleDateString("de-DE"),
                          Typ: t.type,
                          Asset: t.asset,
                          Menge: t.amount.toFixed(6),
                          Kurs_EUR: t.price.toFixed(2),
                          Summe_EUR: (t.amount * t.price).toFixed(2),
                          Gebühr_EUR: t.fee.toFixed(2),
                          Börse: t.exchange,
                        })),
                        "CryptoTracker_Trades.csv"
                      );
                    }}
                  >
                    <Download size={14} /> Trades (CSV)
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      downloadCSV(
                        [
                          { Steuerjahr: 2024, Asset: "BTC", Kaufdatum: "15.03.2023", Verkaufsdatum: "20.01.2024", Haltedauer_Tage: 311, Einstandspreis: "2800.00", Erlöse: "8723.00", "G&V": "5923.00", Typ: "Langfristig" },
                          { Steuerjahr: 2024, Asset: "ETH", Kaufdatum: "10.11.2023", Verkaufsdatum: "14.02.2024", Haltedauer_Tage: 96, Einstandspreis: "2850.00", Erlöse: "3472.00", "G&V": "622.00", Typ: "Kurzfristig" },
                        ],
                        "CryptoTracker_Steuerbericht_2024.csv"
                      );
                    }}
                  >
                    <Download size={14} /> Steuern (CSV)
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="card danger-zone">
                <h2 className="settings-section-title" style={{ color: "var(--red)" }}>Gefahrenzone</h2>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-5)" }}>
                  Diese Aktionen sind unwiderruflich. Bitte mit Vorsicht verwenden.
                </p>
                <div style={{ display: "flex", gap: "var(--space-3)" }}>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      if (window.confirm("Möchtest du deinen Account wirklich deaktivieren? Diese Aktion kann nicht rükgängig gemacht werden.")) {
                        alert("Account-Deaktivierung ist im Demo-Modus nicht verfügbar.");
                      }
                    }}
                  >
                    Account deaktivieren
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      const confirmed = window.prompt(
                        'Gib "LÖSCHEN" ein, um alle Daten unwiderruflich zu löschen:'
                      );
                      if (confirmed === "LÖSCHEN") {
                        alert("Daten-Löschung ist im Demo-Modus nicht verfügbar.");
                      } else if (confirmed !== null) {
                        alert("Bestätigung fehlgeschlagen. Keine Daten wurden gelöscht.");
                      }
                    }}
                  >
                    Alle Daten löschen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* System & Updates Panel */}
          {activeTab === "system" && (
            <div className="card settings-panel fade-in">
              <SystemUpdatePanel />
            </div>
          )}

        </div>
      </div>

      <style>{`
        .settings-layout {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: var(--space-6);
          align-items: flex-start;
        }
        .settings-nav {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: var(--space-3);
          display: flex; flex-direction: column; gap: 2px;
          position: sticky; top: var(--space-8);
        }
        .settings-nav-item {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-3); border-radius: var(--radius-md);
          font-size: var(--text-sm); color: var(--text-secondary);
          background: none; border: none; cursor: pointer; width: 100%;
          transition: all var(--transition-fast); font-family: var(--font-sans);
          font-weight: 500; text-align: left;
        }
        .settings-nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
        .settings-nav-item.active {
          background: var(--green-dim); color: var(--green); font-weight: 600;
        }
        .settings-section-title {
          font-size: var(--text-base); font-weight: 600; color: var(--text-primary);
          margin-bottom: var(--space-5);
        }
        .settings-form {
          display: flex; flex-direction: column; gap: var(--space-4); max-width: 440px;
        }
        .save-feedback {
          display: flex; align-items: center; gap: 6px;
          font-size: var(--text-sm); font-weight: 500;
          animation: fadeIn 0.2s ease;
        }
        .save-feedback.success { color: var(--green); }
        .session-card {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--space-4); background: var(--bg-surface);
          border-radius: var(--radius-md); border: 1px solid var(--border);
        }
        /* Theme picker */
        .theme-grid { display: flex; flex-direction: column; gap: var(--space-2); }
        .theme-option {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-3); border-radius: var(--radius-md);
          border: 1px solid var(--border); background: none;
          cursor: pointer; font-family: var(--font-sans);
          font-size: var(--text-sm); color: var(--text-secondary);
          transition: all var(--transition-fast); width: 100%; text-align: left;
        }
        .theme-option:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .theme-option.active { border-color: rgba(34,197,94,0.3); color: var(--text-primary); }
        .theme-preview {
          width: 48px; height: 32px; border-radius: 5px;
          overflow: hidden; position: relative; flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .theme-preview-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 8px;
        }
        .theme-preview-content {
          position: absolute; top: 10px; left: 4px; right: 4px; bottom: 4px;
          border-radius: 2px;
        }
        .theme-preview-accent {
          position: absolute; bottom: 6px; right: 6px;
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
        }
        /* Notifications toggle */
        .notification-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--space-4); border-radius: var(--radius-md);
          border: 1px solid var(--border); background: var(--bg-surface);
          margin-bottom: var(--space-2);
        }
        .toggle { position: relative; display: inline-flex; cursor: pointer; }
        .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-track {
          width: 40px; height: 22px; background: var(--bg-elevated);
          border-radius: 11px; display: flex; align-items: center;
          padding: 2px; transition: background var(--transition-base);
          border: 1px solid var(--border-strong);
        }
        .toggle input:checked + .toggle-track { background: var(--green); border-color: var(--green); }
        .toggle-thumb {
          width: 16px; height: 16px; background: white;
          border-radius: 50%; transition: transform var(--transition-base);
        }
        .toggle input:checked + .toggle-track .toggle-thumb {
          transform: translateX(18px);
        }
        /* DB */
        .db-info {
          display: flex; flex-direction: column; gap: var(--space-3);
          padding: var(--space-4); background: var(--bg-surface);
          border-radius: var(--radius-md); margin-bottom: var(--space-4);
        }
        .db-info-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
        .db-info-label { font-size: var(--text-sm); color: var(--text-secondary); }
        .migration-note {
          display: flex; align-items: flex-start; gap: var(--space-3);
          padding: var(--space-4); background: var(--blue-dim);
          border: 1px solid rgba(59,130,246,0.2); border-radius: var(--radius-md);
          font-size: var(--text-xs); color: var(--text-secondary);
        }
        .migration-note svg { flex-shrink: 0; margin-top: 1px; color: var(--blue); }
        .migration-note strong { color: var(--text-primary); display: block; margin-bottom: 4px; }
        .code {
          background: var(--bg-surface); color: var(--green);
          padding: 1px 5px; border-radius: 3px; font-family: var(--font-mono);
          font-size: 0.85em;
        }
        .danger-zone { border-color: rgba(239,68,68,0.2); }
        select.input { cursor: pointer; }
        @media (max-width: 768px) {
          .settings-layout { grid-template-columns: 1fr; }
          .settings-nav { position: static; }
        }
      `}</style>
    </div>
  );
}

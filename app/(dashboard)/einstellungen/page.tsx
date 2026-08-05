"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User, Shield, Database, Bell, Palette, ChevronRight,
  CheckCircle, Download,
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

type Tab = "profil" | "sicherheit" | "erscheinungsbild" | "benachrichtigungen" | "datenbank";

const NAV_ITEMS: { id: Tab; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: "profil", icon: User, label: "Profil" },
  { id: "sicherheit", icon: Shield, label: "Sicherheit" },
  { id: "erscheinungsbild", icon: Palette, label: "Erscheinungsbild" },
  { id: "benachrichtigungen", icon: Bell, label: "Benachrichtigungen" },
  { id: "datenbank", icon: Database, label: "Datenbank & Export" },
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

          {/* ─── Benachrichtigungen ──────────────────── */}
          {activeTab === "benachrichtigungen" && (
            <NotificationsPanel userEmail={user?.email} />
          )}

          {/* ─── Datenbank & Export ──────────────────── */}
          {activeTab === "datenbank" && (
            <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  TrendingUp, Mail, Lock, User, AlertCircle, Loader2, CheckCircle,
} from "lucide-react";

const WAEHRUNGEN = [
  { code: "EUR", name: "Euro (€)" },
  { code: "USD", name: "US-Dollar ($)" },
  { code: "CHF", name: "Schweizer Franken (CHF)" },
  { code: "GBP", name: "Britisches Pfund (£)" },
  { code: "JPY", name: "Japanischer Yen (¥)" },
];

export default function RegistrierenPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/registrieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, currency }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten.");
        setLoading(false);
        return;
      }

      // Automatisch anmelden
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      router.push("/dashboard");
    } catch {
      setError("Ein unbekannter Fehler ist aufgetreten.");
      setLoading(false);
    }
  }

  const passwordStrength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 8 ? 2
    : password.length < 12 ? 3
    : 4;

  const strengthLabels = ["", "Sehr schwach", "Schwach", "Mittel", "Stark"];
  const strengthColors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  return (
    <div className="auth-card fade-in">
      <div className="auth-logo">
        <div className="auth-logo-icon">
          <TrendingUp size={22} />
        </div>
        <span className="auth-logo-text">CryptoTracker</span>
      </div>

      <div className="auth-header">
        <h1 className="auth-title">Konto erstellen</h1>
        <p className="auth-desc">Starte dein privates Portfolio-Tracking</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="auth-error">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="input-group">
          <label className="label" htmlFor="reg-name">Name</label>
          <div className="input-icon-wrap">
            <User size={15} className="input-icon" />
            <input
              id="reg-name"
              type="text"
              className="input input-with-icon"
              placeholder="Dein Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        </div>

        <div className="input-group">
          <label className="label" htmlFor="reg-email">E-Mail-Adresse</label>
          <div className="input-icon-wrap">
            <Mail size={15} className="input-icon" />
            <input
              id="reg-email"
              type="email"
              className="input input-with-icon"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="input-group">
          <label className="label" htmlFor="reg-password">Passwort</label>
          <div className="input-icon-wrap">
            <Lock size={15} className="input-icon" />
            <input
              id="reg-password"
              type="password"
              className="input input-with-icon"
              placeholder="Mindestens 8 Zeichen"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {password.length > 0 && (
            <div className="password-strength">
              <div className="strength-bars">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="strength-bar"
                    style={{
                      background: passwordStrength >= level
                        ? strengthColors[passwordStrength]
                        : "var(--bg-elevated)",
                    }}
                  />
                ))}
              </div>
              <span style={{ color: strengthColors[passwordStrength] }}>
                {strengthLabels[passwordStrength]}
              </span>
            </div>
          )}
        </div>

        <div className="input-group">
          <label className="label" htmlFor="reg-currency">Standardwährung</label>
          <select
            id="reg-currency"
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {WAEHRUNGEN.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="privacy-note">
          <CheckCircle size={14} style={{ color: "var(--green)", flexShrink: 0, marginTop: 2 }} />
          <span>
            Deine Daten werden lokal gespeichert. Keine Cloud, keine Weitergabe.
          </span>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="spin" />
              Konto wird erstellt...
            </>
          ) : (
            "Konto erstellen"
          )}
        </button>
      </form>

      <p className="auth-footer">
        Bereits registriert?{" "}
        <Link href="/anmelden" className="auth-link">
          Jetzt anmelden
        </Link>
      </p>

      <style>{`
        .auth-card {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-xl);
          padding: var(--space-10);
          box-shadow: var(--shadow-lg);
        }
        .auth-logo {
          display: flex; align-items: center;
          gap: var(--space-3); margin-bottom: var(--space-8);
        }
        .auth-logo-icon {
          width: 42px; height: 42px;
          background: var(--green); border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center; color: #000;
        }
        .auth-logo-text {
          font-size: var(--text-xl); font-weight: 700;
          color: var(--text-primary); letter-spacing: -0.02em;
        }
        .auth-header { margin-bottom: var(--space-8); }
        .auth-title {
          font-size: var(--text-2xl); font-weight: 700;
          color: var(--text-primary); line-height: 1.2;
        }
        .auth-desc { font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-2); }
        .auth-form { display: flex; flex-direction: column; gap: var(--space-5); }
        .input-icon-wrap { position: relative; }
        .input-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); color: var(--text-muted); pointer-events: none;
        }
        .input-with-icon { padding-left: 40px; }
        .auth-error {
          display: flex; align-items: center; gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--red-dim); border: 1px solid rgba(239,68,68,0.2);
          border-radius: var(--radius-md); color: var(--red); font-size: var(--text-sm);
        }
        .password-strength {
          display: flex; align-items: center; gap: var(--space-3);
          margin-top: var(--space-2);
        }
        .strength-bars { display: flex; gap: 4px; flex: 1; }
        .strength-bar {
          height: 3px; flex: 1; border-radius: 2px;
          transition: background var(--transition-base);
        }
        .password-strength span { font-size: var(--text-xs); font-weight: 500; white-space: nowrap; }
        .privacy-note {
          display: flex; align-items: flex-start; gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--green-dim); border: 1px solid rgba(34,197,94,0.15);
          border-radius: var(--radius-md);
          font-size: var(--text-xs); color: var(--text-secondary);
        }
        .auth-footer {
          text-align: center; margin-top: var(--space-6);
          font-size: var(--text-sm); color: var(--text-secondary);
        }
        .auth-link { color: var(--green); font-weight: 500; transition: opacity var(--transition-fast); }
        .auth-link:hover { opacity: 0.8; }
        select.input { appearance: none; cursor: pointer; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

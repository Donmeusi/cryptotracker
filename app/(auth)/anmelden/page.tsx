"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { TrendingUp, Mail, Lock, AlertCircle, Loader2, ShieldCheck } from "lucide-react";

export default function AnmeldenPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oidcConfig, setOidcConfig] = useState<{ enabled: boolean; clientName: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/oidc-config")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && data.enabled) {
          setOidcConfig({ enabled: true, clientName: data.clientName || "Single Sign-On" });
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Ungültige E-Mail-Adresse oder falsches Passwort.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-card fade-in">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo-icon">
          <TrendingUp size={22} />
        </div>
        <span className="auth-logo-text">CryptoTracker</span>
      </div>

      <div className="auth-header">
        <h1 className="auth-title">Willkommen zurück</h1>
        <p className="auth-desc">Melde dich bei deinem Portfolio an</p>
      </div>

      {/* OIDC / SSO Button */}
      {oidcConfig?.enabled && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <button
            type="button"
            className="btn btn-secondary btn-lg"
            style={{
              width: "100%",
              justifyContent: "center",
              gap: 10,
              border: "1px solid var(--border-strong)",
              background: "var(--bg-elevated)",
            }}
            onClick={() => signIn("oidc", { callbackUrl: "/dashboard" })}
          >
            <ShieldCheck size={18} style={{ color: "var(--green)" }} />
            <span>Mit {oidcConfig.clientName} anmelden</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>oder E-Mail</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="auth-error">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="input-group">
          <label className="label" htmlFor="login-email">E-Mail-Adresse</label>
          <div className="input-icon-wrap">
            <Mail size={15} className="input-icon" />
            <input
              id="login-email"
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
          <label className="label" htmlFor="login-password">Passwort</label>
          <div className="input-icon-wrap">
            <Lock size={15} className="input-icon" />
            <input
              id="login-password"
              type="password"
              className="input input-with-icon"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
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
              Wird angemeldet...
            </>
          ) : (
            "Anmelden"
          )}
        </button>
      </form>

      <p className="auth-footer">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className="auth-link">
          Jetzt registrieren
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
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-8);
        }
        .auth-logo-icon {
          width: 42px;
          height: 42px;
          background: var(--green);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
        }
        .auth-logo-text {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .auth-header { margin-bottom: var(--space-8); }
        .auth-title {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .auth-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-top: var(--space-2);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }
        .input-icon-wrap {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .input-with-icon {
          padding-left: 40px;
        }
        .auth-error {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--red-dim);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: var(--radius-md);
          color: var(--red);
          font-size: var(--text-sm);
        }
        .auth-footer {
          text-align: center;
          margin-top: var(--space-6);
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        .auth-link {
          color: var(--green);
          font-weight: 500;
          transition: opacity var(--transition-fast);
        }
        .auth-link:hover { opacity: 0.8; }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

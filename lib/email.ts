import nodemailer from "nodemailer";
import { db } from "@/lib/db";

// ─── Dynamischer Transporter ──────────────────────────────────────────────────

async function getTransporterForUser(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    include: { notificationSettings: true },
  });

  const settings = user?.notificationSettings;

  if (settings && settings.smtpHost && settings.smtpUser) {
    return {
      transporter: nodemailer.createTransport({
        host: settings.smtpHost,
        port: Number(settings.smtpPort) || 587,
        secure: String(settings.smtpPort) === "465",
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass || "",
        },
      }),
      from: settings.smtpFrom || `CryptoTracker <${settings.smtpUser}>`,
    };
  }

  // Fallback auf .env Umgebungsvariablen
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
      from: process.env.SMTP_FROM || "CryptoTracker <noreply@cryptotracker.app>",
    };
  }

  throw new Error("Kein SMTP-Server konfiguriert. Bitte in den Einstellungen hinterlegen.");
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#080a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0f;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0d1117;border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.07);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:20px;font-weight:700;color:#f1f5f9;letter-spacing:-0.3px;">Crypto<span style="color:#22c55e;">Tracker</span></span>
              </td>
              <td align="right">
                <span style="font-size:11px;color:#64748b;font-weight:500;">${title}</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.07);">
          <p style="margin:0;font-size:11px;color:#4a5568;text-align:center;">
            Du erhältst diese E-Mail, weil du Benachrichtigungen in CryptoTracker aktiviert hast.<br />
            <a href="#" style="color:#22c55e;text-decoration:none;">Einstellungen verwalten</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function heading(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f5f9;letter-spacing:-0.3px;">${text}</h1>`;
}

function subtext(text: string) {
  return `<p style="margin:0 0 24px;font-size:14px;color:#64748b;">${text}</p>`;
}

function badge(text: string, color = "#22c55e") {
  return `<span style="display:inline-block;padding:3px 10px;background:${color}22;border:1px solid ${color}44;border-radius:100px;font-size:11px;font-weight:600;color:${color};">${text}</span>`;
}

function statCard(label: string, value: string, sub = "") {
  return `
  <td style="padding:16px;background:#111827;border-radius:10px;text-align:center;">
    <div style="font-size:11px;color:#64748b;margin-bottom:4px;">${label}</div>
    <div style="font-size:20px;font-weight:700;color:#f1f5f9;">${value}</div>
    ${sub ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${sub}</div>` : ""}
  </td>`;
}

function divider() {
  return `<div style="height:1px;background:rgba(255,255,255,0.07);margin:24px 0;"></div>`;
}

// ─── 1. Preisalarm ────────────────────────────────────────────────────────────

export interface PriceAlertData {
  asset: string;
  symbol: string;
  currentPrice: number;
  changePercent: number;
  currency?: string;
}

export async function sendPriceAlert(to: string, data: PriceAlertData) {
  const { asset, symbol, currentPrice, changePercent, currency = "EUR" } = data;
  const isUp = changePercent >= 0;
  const color = isUp ? "#22c55e" : "#ef4444";
  const arrow = isUp ? "▲" : "▼";
  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const body = `
    ${heading(`${arrow} Preisalarm: ${asset}`)}
    ${subtext(`${symbol} hat eine signifikante Kursbewegung verzeichnet.`)}
    <table width="100%" cellpadding="8" cellspacing="8" style="border-collapse:separate;border-spacing:8px;">
      <tr>
        ${statCard("Aktueller Kurs", fmt(currentPrice))}
        ${statCard("Veränderung (24h)", `${isUp ? "+" : ""}${changePercent.toFixed(2)}%`, "", )}
      </tr>
    </table>
    ${divider()}
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      Verwalte deine Preisalarme in den <a href="${process.env.NEXTAUTH_URL}/einstellungen" style="color:#22c55e;text-decoration:none;">Einstellungen</a>.
    </p>
  `;
  // override color on change card
  const html = wrap(`Preisalarm – ${symbol}`, body).replace(
    `${isUp ? "+" : ""}${changePercent.toFixed(2)}%`,
    `<span style="color:${color};font-weight:700;">${isUp ? "+" : ""}${changePercent.toFixed(2)}%</span>`
  );

  const { transporter, from } = await getTransporterForUser(to);
  await transporter.sendMail({ from, to, subject: `${arrow} ${symbol} Preisalarm: ${fmt(currentPrice)}`, html });
}

// ─── 2. Portfolio-Zusammenfassung ─────────────────────────────────────────────

export interface PortfolioSummaryData {
  name: string;
  totalValue: number;
  change24h: number;
  topAssets: Array<{ name: string; symbol: string; value: number; change: number }>;
  currency?: string;
}

export async function sendPortfolioSummary(to: string, data: PortfolioSummaryData) {
  const { name, totalValue, change24h, topAssets, currency = "EUR" } = data;
  const isUp = change24h >= 0;
  const color = isUp ? "#22c55e" : "#ef4444";
  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
  const date = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  const rows = topAssets
    .map(
      (a) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-weight:600;color:#f1f5f9;font-size:13px;">${a.name}</span>
        <span style="font-size:11px;color:#64748b;margin-left:6px;">${a.symbol}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;">
        <span style="font-size:13px;color:#f1f5f9;">${fmt(a.value)}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;">
        <span style="font-size:12px;color:${a.change >= 0 ? "#22c55e" : "#ef4444"};font-weight:600;">
          ${a.change >= 0 ? "+" : ""}${a.change.toFixed(2)}%
        </span>
      </td>
    </tr>`
    )
    .join("");

  const body = `
    ${heading(`Guten Abend, ${name}!`)}
    ${subtext(`Deine Portfolio-Zusammenfassung für ${date}`)}
    <table width="100%" cellpadding="8" cellspacing="8" style="border-collapse:separate;border-spacing:8px;margin-bottom:24px;">
      <tr>
        ${statCard("Gesamtwert", fmt(totalValue))}
        ${statCard("Veränderung (24h)", `${isUp ? "+" : ""}${fmt(Math.abs(change24h))}`)}
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <thead>
        <tr>
          <th style="text-align:left;font-size:11px;color:#64748b;font-weight:600;padding-bottom:8px;">ASSET</th>
          <th style="text-align:right;font-size:11px;color:#64748b;font-weight:600;padding-bottom:8px;">WERT</th>
          <th style="text-align:right;font-size:11px;color:#64748b;font-weight:600;padding-bottom:8px;">24H</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#000;font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;">Dashboard öffnen →</a>
  `;

  const html = wrap("Portfolio-Zusammenfassung", body).replace(
    `${isUp ? "+" : ""}${fmt(Math.abs(change24h))}`,
    `<span style="color:${color};font-weight:700;">${isUp ? "+" : ""}${fmt(Math.abs(change24h))}</span>`
  );

  const { transporter, from } = await getTransporterForUser(to);
  await transporter.sendMail({ from, to, subject: `📊 Portfolio-Zusammenfassung – ${fmt(totalValue)}`, html });
}

// ─── 3. Trade-Bestätigung ─────────────────────────────────────────────────────

export interface TradeConfirmData {
  type: "BUY" | "SELL" | "TRANSFER_IN" | "TRANSFER_OUT" | "STAKING_REWARD" | "AIRDROP" | "MINING";
  asset: string;
  symbol: string;
  amount: number;
  price: number;
  total: number;
  fee: number;
  exchange?: string;
  currency?: string;
}

const TRADE_LABELS: Record<TradeConfirmData["type"], string> = {
  BUY: "Kauf",
  SELL: "Verkauf",
  TRANSFER_IN: "Eingang",
  TRANSFER_OUT: "Ausgang",
  STAKING_REWARD: "Staking-Reward",
  AIRDROP: "Airdrop",
  MINING: "Mining",
};

export async function sendTradeConfirmation(to: string, data: TradeConfirmData) {
  const { type, asset, symbol, amount, price, total, fee, exchange, currency = "EUR" } = data;
  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
  const label = TRADE_LABELS[type];
  const color = ["BUY", "TRANSFER_IN", "STAKING_REWARD", "AIRDROP", "MINING"].includes(type) ? "#22c55e" : "#f59e0b";

  const rows = [
    ["Asset", `${asset} (${symbol})`],
    ["Art", label],
    ["Menge", `${amount.toLocaleString("de-DE", { maximumFractionDigits: 8 })} ${symbol}`],
    ["Kurs", fmt(price)],
    ["Gesamtwert", fmt(total)],
    ["Gebühr", fmt(fee)],
    ...(exchange ? [["Börse", exchange]] : []),
    ["Datum", new Date().toLocaleString("de-DE")],
  ]
    .map(
      ([k, v]) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;color:#64748b;">${k}</td>
      <td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;color:#f1f5f9;text-align:right;font-weight:500;">${v}</td>
    </tr>`
    )
    .join("");

  const body = `
    ${heading(`Trade bestätigt`)}
    ${subtext(`Dein ${label} wurde erfolgreich aufgezeichnet. ${badge(label, color)}`)}
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${divider()}
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      Alle Trades im <a href="${process.env.NEXTAUTH_URL}/trades" style="color:#22c55e;text-decoration:none;">Trade-Verlauf</a> einsehen.
    </p>
  `;

  const { transporter, from } = await getTransporterForUser(to);
  await transporter.sendMail({ from, to, subject: `✅ Trade bestätigt: ${label} ${amount} ${symbol}`, html: wrap("Trade-Bestätigung", body) });
}

// ─── 4. Sicherheitsmeldung ────────────────────────────────────────────────────

export type SecurityEventType = "new_login" | "password_changed" | "settings_changed" | "test";

export interface SecurityAlertData {
  event: SecurityEventType;
  device?: string;
  location?: string;
  ip?: string;
}

const SECURITY_LABELS: Record<SecurityEventType, { title: string; desc: string; color: string }> = {
  new_login: { title: "Neue Anmeldung", desc: "Es wurde eine neue Anmeldung in deinem Konto erkannt.", color: "#f59e0b" },
  password_changed: { title: "Passwort geändert", desc: "Dein Passwort wurde erfolgreich geändert.", color: "#22c55e" },
  settings_changed: { title: "Einstellungen geändert", desc: "Deine Kontoeinstellungen wurden aktualisiert.", color: "#3b82f6" },
  test: { title: "Test-Sicherheitsmeldung", desc: "Dies ist eine Test-Sicherheitsmeldung von CryptoTracker.", color: "#64748b" },
};

export async function sendSecurityAlert(to: string, data: SecurityAlertData) {
  const { event, device, location, ip } = data;
  const meta = SECURITY_LABELS[event];

  const details = [
    ...(device ? [`<strong>Gerät:</strong> ${device}`] : []),
    ...(location ? [`<strong>Ort:</strong> ${location}`] : []),
    ...(ip ? [`<strong>IP:</strong> ${ip}`] : []),
    `<strong>Zeit:</strong> ${new Date().toLocaleString("de-DE")}`,
  ].join("<br />");

  const body = `
    ${heading(meta.title)}
    ${subtext(meta.desc)}
    <div style="padding:16px;background:#111827;border-left:3px solid ${meta.color};border-radius:0 8px 8px 0;margin-bottom:24px;font-size:13px;color:#94a3b8;line-height:1.7;">
      ${details}
    </div>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">
      Falls du diese Aktivität nicht selbst ausgeführt hast, ändere bitte sofort dein Passwort.
    </p>
    <a href="${process.env.NEXTAUTH_URL}/einstellungen" style="display:inline-block;padding:10px 20px;background:#ef444422;border:1px solid #ef444444;color:#ef4444;font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;">Sicherheit prüfen →</a>
  `;

  const { transporter, from } = await getTransporterForUser(to);
  await transporter.sendMail({ from, to, subject: `🔐 ${meta.title} – CryptoTracker`, html: wrap("Sicherheitsmeldung", body) });
}

// ─── 5. Steuer-Erinnerung ─────────────────────────────────────────────────────

export interface TaxReminderData {
  year: number;
  totalGainLoss?: number;
  taxableEvents?: number;
  currency?: string;
}

export async function sendTaxReminder(to: string, data: TaxReminderData) {
  const { year, totalGainLoss, taxableEvents, currency = "EUR" } = data;
  const fmt = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const statsSection =
    totalGainLoss !== undefined
      ? `
    <table width="100%" cellpadding="8" cellspacing="8" style="border-collapse:separate;border-spacing:8px;margin-bottom:24px;">
      <tr>
        ${statCard("Gesamtgewinn/-verlust", fmt(totalGainLoss), `Steuerjahr ${year}`)}
        ${statCard("Steuerpflichtige Ereignisse", String(taxableEvents ?? 0), "Trades & Erträge")}
      </tr>
    </table>`
      : "";

  const body = `
    ${heading(`Steuer-Erinnerung ${year}`)}
    ${subtext(`Die Steuererklärungsfrist für das Jahr ${year} rückt näher.`)}
    ${statsSection}
    <div style="padding:16px;background:#f59e0b11;border:1px solid #f59e0b33;border-radius:10px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#f59e0b;">📅 Wichtige Fristen (Deutschland)</p>
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.7;">
        • <strong>31. Juli ${year + 1}:</strong> Abgabefrist Steuererklärung<br />
        • <strong>Haltefrist:</strong> Krypto nach 1 Jahr steuerfrei<br />
        • <strong>Freigrenze:</strong> 1.000 € Gewinn pro Jahr (§ 23 EStG)
      </p>
    </div>
    <a href="${process.env.NEXTAUTH_URL}/steuern" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#000;font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;">Steuerreport öffnen →</a>
  `;

  const { transporter, from } = await getTransporterForUser(to);
  await transporter.sendMail({ from, to, subject: `🧾 Steuer-Erinnerung: Steuerjahr ${year}`, html: wrap(`Steuer-Erinnerung ${year}`, body) });
}

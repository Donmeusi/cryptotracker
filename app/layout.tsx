import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    default: "CryptoTracker — Portfolio Manager",
    template: "%s | CryptoTracker",
  },
  description:
    "Dein privater Krypto-Portfolio-Manager. Verfolge Assets, Trades, DeFi-Positionen und steuerliche Gewinne – vollständig privat und selbst-gehostet.",
  keywords: ["Krypto", "Portfolio", "Bitcoin", "Ethereum", "DeFi", "NFT", "Steuer"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        {/* Theme restore: runs before paint to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var THEMES = {
                dark: { '--bg-base':'#080a0f','--bg-surface':'#0d1117','--bg-card':'#111827','--bg-elevated':'#1a2235','--text-primary':'#f1f5f9','--text-secondary':'#94a3b8','--text-muted':'#64748b','--border':'rgba(255,255,255,0.07)','--border-strong':'rgba(255,255,255,0.12)' },
                midnight: { '--bg-base':'#050711','--bg-surface':'#080d1a','--bg-card':'#0e1628','--bg-elevated':'#162035','--text-primary':'#e2e8f0','--text-secondary':'#7c93b5','--text-muted':'#4a5d7a','--border':'rgba(100,149,237,0.08)','--border-strong':'rgba(100,149,237,0.15)' },
                light: { '--bg-base':'#f1f5f9','--bg-surface':'#f8fafc','--bg-card':'#ffffff','--bg-elevated':'#e2e8f0','--text-primary':'#0f172a','--text-secondary':'#475569','--text-muted':'#94a3b8','--border':'rgba(0,0,0,0.08)','--border-strong':'rgba(0,0,0,0.15)' },
                forest: { '--bg-base':'#0a1a0e','--bg-surface':'#0f2214','--bg-card':'#162b1b','--bg-elevated':'#1e3a25','--text-primary':'#dcfce7','--text-secondary':'#86efac','--text-muted':'#4ade80','--border':'rgba(34,197,94,0.10)','--border-strong':'rgba(34,197,94,0.20)' }
              };
              var theme = localStorage.getItem('ct-theme') || 'dark';
              var accent = localStorage.getItem('ct-accent') || '#22c55e';
              var fontSize = localStorage.getItem('ct-fontsize') || 'normal';
              var fontMap = { small: '13px', normal: '14px', large: '16px' };
              var vars = THEMES[theme] || THEMES.dark;
              var root = document.documentElement;
              Object.keys(vars).forEach(function(k) { root.style.setProperty(k, vars[k]); });
              root.style.setProperty('--green', accent);
              root.style.setProperty('--green-dim', accent + '22');
              root.style.setProperty('--base-font-size', fontMap[fontSize] || '14px');
              if (localStorage.getItem('ct-animations') === 'false') {
                root.style.setProperty('--transition-base', '0s');
                root.style.setProperty('--transition-fast', '0s');
              }
            } catch(e) {}
          })();
        ` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

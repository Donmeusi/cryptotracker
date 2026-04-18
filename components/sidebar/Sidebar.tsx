"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Coins,
  ArrowLeftRight,
  Layers,
  Image,
  BarChart3,
  Receipt,
  Settings,
  LogOut,
  TrendingUp,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/assets", icon: Coins, label: "Assets" },
  { href: "/boersen", icon: ArrowLeftRight, label: "Börsen" },
  { href: "/defi", icon: Layers, label: "DeFi" },
  { href: "/nfts", icon: Image, label: "NFTs" },
  { href: "/trades", icon: Zap, label: "Trades" },
  { href: "/analytik", icon: BarChart3, label: "Analytik" },
  { href: "/steuern", icon: Receipt, label: "Steuern" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <TrendingUp size={18} />
        </div>
        <span className="sidebar-logo-text">CryptoTracker</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Portfolio</div>
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}

        <div className="nav-section-label">Konnektoren</div>
        {NAV_ITEMS.slice(2, 5).map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}

        <div className="nav-section-label">Berichte</div>
        {NAV_ITEMS.slice(5).map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <Link
          href="/einstellungen"
          className={`nav-item ${pathname === "/einstellungen" ? "active" : ""}`}
        >
          <Settings size={17} />
          <span>Einstellungen</span>
        </Link>
        <button
          className="nav-item nav-item-logout"
          onClick={() => signOut({ callbackUrl: "/anmelden" })}
        >
          <LogOut size={17} />
          <span>Abmelden</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: var(--sidebar-width);
          background: var(--bg-surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 50;
          overflow: hidden;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-5) var(--space-5);
          border-bottom: 1px solid var(--border);
          height: 64px;
        }
        .sidebar-logo-icon {
          width: 34px;
          height: 34px;
          background: var(--green);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          flex-shrink: 0;
        }
        .sidebar-logo-text {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          white-space: nowrap;
        }
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-4) var(--space-3);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .nav-section-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          padding: var(--space-4) var(--space-3) var(--space-2);
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-family: var(--font-sans);
          text-decoration: none;
        }
        .nav-item:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }
        .nav-item.active {
          background: var(--green-dim);
          color: var(--green);
          font-weight: 600;
        }
        .nav-item.active svg {
          color: var(--green);
        }
        .nav-item-logout { color: var(--text-muted); }
        .nav-item-logout:hover {
          background: var(--red-dim);
          color: var(--red);
        }
        .sidebar-bottom {
          padding: var(--space-3);
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
      `}</style>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link href={href} className={`nav-item ${active ? "active" : ""}`}>
      <Icon size={17} />
      <span>{label}</span>
    </Link>
  );
}

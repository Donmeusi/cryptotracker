"use client";

import { useState, useEffect } from "react";
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
  Menu,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="sidebar-logo" style={{ borderBottom: "none", height: "auto", padding: 0 }}>
          <div className="sidebar-logo-icon" style={{ width: 30, height: 30 }}>
            <TrendingUp size={16} />
          </div>
          <span className="sidebar-logo-text" style={{ fontSize: "1rem" }}>CryptoTracker</span>
        </div>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Overlay Backdrop */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <TrendingUp size={18} />
          </div>
          <span className="sidebar-logo-text">CryptoTracker</span>
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
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
          .mobile-header {
            display: none;
          }
          .mobile-overlay {
            display: none;
          }
          .mobile-close-btn {
            display: none;
          }

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
            z-index: 90;
            overflow: hidden;
            transition: transform 0.25s ease;
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

          @media (max-width: 768px) {
            .mobile-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              position: fixed;
              top: 0; left: 0; right: 0;
              height: 56px;
              padding: 0 var(--space-4);
              background: var(--bg-surface);
              border-bottom: 1px solid var(--border);
              z-index: 100;
            }
            .mobile-menu-btn {
              background: var(--bg-elevated);
              border: 1px solid var(--border);
              color: var(--text-primary);
              width: 36px; height: 36px;
              border-radius: var(--radius-sm);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer;
            }
            .mobile-close-btn {
              display: flex;
              align-items: center; justify-content: center;
              margin-left: auto;
              background: none; border: none;
              color: var(--text-muted);
              cursor: pointer; padding: 4px;
            }
            .mobile-overlay {
              display: block;
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.7);
              backdrop-filter: blur(4px);
              z-index: 110;
            }
            .sidebar {
              transform: translateX(-100%);
              z-index: 120;
              width: 260px;
              box-shadow: 0 0 30px rgba(0,0,0,0.5);
            }
            .sidebar.mobile-open {
              transform: translateX(0);
            }
          }
        `}</style>
      </aside>
    </>
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

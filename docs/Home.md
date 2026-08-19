# Willkommen im CryptoTracker Wiki 🚀

> **CryptoTracker** ist ein moderner, selbst-gehosteter Krypto-Portfolio-Manager für Vermögensübersichten, Steuerberechnungen (§ 23 EStG), On-Chain Wallet Scans und Multi-Provider Single Sign-On.

---

## 📚 Wiki-Inhaltsverzeichnis

| Thema | Beschreibung |
|-------|--------------|
| [🐳 Installation & Docker](Installation-und-Docker.md) | Anleitung für Docker Compose, Standalone Builds und manuelle Installation |
| [🔑 OIDC & Single Sign-On](OIDC-und-Single-Sign-On.md) | Einrichtung von Pocket-ID, Keycloak, Authentik, Zitadel & Authelia über die UI |
| [🗄️ Externe Datenbanken](Externe-Datenbank-Konfiguration.md) | Anbindung von PostgreSQL, MySQL / MariaDB und SQLite über die Benutzeroberfläche |
| [🔄 System-Updates & Branches](System-Updates-und-Branch-Wechsel.md) | Kanal-Wechsel (`main` / `beta`) und 1-Klick Updates direkt aus der App |
| [🧮 Steuerlogik & § 23 EStG](Steuerberechnung-und-Haltefristen.md) | Funktionsweise von FIFO, LIFO & HIFO sowie Haltefristen (> 365 Tage steuerfrei) |
| [🎛️ Module & Funktionen](Module-und-Funktionen.md) | Flexibles Ein- und Ausblenden von DeFi- und NFT-Bereichen |
| [🛡️ Systemdokumentation & TOM](SYSTEMDOKUMENTATION_UND_TOM.md) | Technische Systemdokumentation & Technisch-Organisatorische Maßnahmen (Art. 32 DSGVO) |

---

## 🛠️ Schnellstart

Um CryptoTracker lokal mit Docker zu starten:

```bash
git clone https://github.com/Donmeusi/cryptotracker.git
cd cryptotracker
docker compose up -d --build
```

Die Anwendung ist im Browser unter [http://localhost:3000](http://localhost:3000) erreichbar.

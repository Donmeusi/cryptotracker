# Steuerberechnung & Haltefristen (§ 23 EStG)

CryptoTracker berechnet Gewinne und Verluste aus privaten Veräußerungsgeschäften nach dem deutschen Einkommensteuergesetz (§ 23 EStG).

---

## ⚖️ Haltefristen in Deutschland

- **Haltefrist > 365 Tage:** Krypto-Verkäufe nach Ablauf eines Jahres (365 Tage) sind **100 % steuerfrei**.
- **Haltefrist <= 365 Tage:** Krypto-Verkäufe innerhalb eines Jahres sind steuerpflichtig, sofern der jährliche Freibetrag (1.000 € seit 2024) überschritten wird.

---

## 🧮 Verbrauchfolgeverfahren (FIFO, LIFO, HIFO)

Unter [http://localhost:3000/steuern](http://localhost:3000/steuern) stehen drei Berechnungsmethoden zur Auswahl:

| Methode | Beschreibung | Anwendungsfall |
|---------|--------------|----------------|
| **FIFO** *(First In, First Out)* | Die zuerst gekauften Coins werden zuerst verkauft. | **Gesetzlicher Standard in Deutschland.** Optimal für langfristige Halter, um die 1-Jahres-Haltefrist schnell zu erreichen. |
| **LIFO** *(Last In, First Out)* | Die zuletzt gekauften Coins werden zuerst verkauft. | Nützlich in fallenden Märkten, um neu gekaufte Coins mit Verlust zu realisieren. |
| **HIFO** *(Highest In, First Out)* | Die Coins mit den höchsten Anschaffungskosten werden zuerst verkauft. | Nützlich zur direkten Steueroptimierung und Gewinnminimierung. |

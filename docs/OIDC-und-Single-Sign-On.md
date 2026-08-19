# OIDC & Single Sign-On (SSO) Konfigurationsanleitung

CryptoTracker unterstützt universelle OpenID Connect (OIDC) Provider wie **Pocket-ID**, **Keycloak**, **Authentik**, **Authelia**, **Zitadel** oder **Auth0**.

---

## ⚙️ Einrichtung über die Benutzeroberfläche (UI)

Die OIDC-Konfiguration erfolgt vollständig über die App-UI unter **Einstellungen → Sicherheit**:

1. Öffne im Dashboard den Menüpunkt **Einstellungen** ([http://localhost:3000/einstellungen](http://localhost:3000/einstellungen)).
2. Wähle den Reiter **Sicherheit**.
3. Aktiviere den Schalter **OIDC / SSO Login aktivieren**.
4. Fülle folgende Felder aus:
   - **Anzeige-Name:** Der Text auf dem Login-Button (z. B. `Pocket-ID` oder `Keycloak`).
   - **OIDC Issuer URL:** Die Basis-URL deines SSO-Servers (z. B. `https://auth.deine-domain.de` oder `http://localhost:8080`).
   - **Client ID:** Die in deinem SSO-Provider erstellte App-ID (z. B. `cryptotracker`).
   - **Client Secret:** Das zugehörige Secret des SSO-Clients.
5. Klicke auf **OIDC Einstellungen speichern**.

---

## 🔗 Redirect-URIs im SSO-Provider eintragen

Trage in deinem Identity Provider (z. B. Pocket-ID oder Keycloak) folgende Redirect-URI ein:

```
http://localhost:3000/api/auth/callback/oidc
```

*(Bei Verwendung einer eigenen Domain ersetze `http://localhost:3000` durch deine Domain).*

---

## 🔐 Anmeldeablauf

Nach Aktivierung erscheint auf der Anmeldeseite (`/anmelden`) automatisch der Button **„Mit [Provider-Name] anmelden“**.
Bei der ersten Anmeldung über SSO wird der Account automatisch mit der E-Mail-Adresse verknüpft.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";

// Helper to get active OIDC config from DB or env
export async function getOidcConfig() {
  try {
    const dbConfig = await db.oidcSettings.findUnique({
      where: { id: "default" },
    });
    if (dbConfig && dbConfig.enabled && dbConfig.issuer && dbConfig.clientId) {
      return {
        enabled: true,
        issuer: dbConfig.issuer,
        clientId: dbConfig.clientId,
        clientSecret: dbConfig.clientSecret || "",
        clientName: dbConfig.clientName || "Single Sign-On",
      };
    }
  } catch (e) {
    console.error("Error reading OIDC config from DB", e);
  }

  const envIssuer = process.env.OIDC_ISSUER;
  const envClientId = process.env.OIDC_CLIENT_ID;
  if (envIssuer && envClientId) {
    return {
      enabled: true,
      issuer: envIssuer,
      clientId: envClientId,
      clientSecret: process.env.OIDC_CLIENT_SECRET || "",
      clientName: process.env.OIDC_CLIENT_NAME || "Single Sign-On",
    };
  }

  return { enabled: false, issuer: "", clientId: "", clientSecret: "", clientName: "Single Sign-On" };
}

const envIssuer = process.env.OIDC_ISSUER || "";
const envClientId = process.env.OIDC_CLIENT_ID || "";
const envClientSecret = process.env.OIDC_CLIENT_SECRET || "";
const envClientName = process.env.OIDC_CLIENT_NAME || "Single Sign-On (OIDC)";
const envOidcEnabled = Boolean(envIssuer && envClientId);

// Brute-Force-Schutz für den Credentials-Login (pro Prozess, pro E-Mail).
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function loginAllowed(email: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(email);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(email, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= LOGIN_LIMIT) return false;
  entry.count += 1;
  return true;
}

// Vergleichs-Hash für unbekannte Konten: gleicht die Antwortzeit an und
// verhindert, dass sich die Existenz einer E-Mail über die Laufzeit ablesen
// lässt.
const DUMMY_HASH = bcrypt.hashSync("cryptotracker-dummy-password", 12);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Öffentliche URL aus den Proxy-Headern (Host/X-Forwarded-*) ableiten,
  // damit keine host-spezifische AUTH_URL gepflegt werden muss.
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/anmelden",
    newUser: "/registrieren",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        if (!loginAllowed(email)) return null;

        const user = await db.user.findUnique({ where: { email } });

        if (!user || !user.password) {
          // Dummy-Vergleich: gleiche Laufzeit wie bei existierenden Konten.
          await bcrypt.compare(String(credentials.password), DUMMY_HASH);
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          String(credentials.password),
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          currency: user.currency,
        };
      },
    }),
    // OIDC nur registrieren, wenn er wirklich konfiguriert ist. Sonst zeigt
    // NextAuth auf den Default-Issuer und erzeugt einen toten Login-Button.
    ...(envOidcEnabled
      ? [
          {
            id: "oidc",
            name: envClientName,
            type: "oidc" as const,
            issuer: envIssuer,
            clientId: envClientId,
            clientSecret: envClientSecret,
            wellKnown: `${envIssuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
            authorization: { params: { scope: "openid email profile" } },
            profile(profile: Record<string, unknown>) {
              const email =
                typeof profile.email === "string" ? profile.email : "";
              return {
                id: String(profile.sub ?? email),
                name:
                  (profile.name as string) ||
                  (profile.preferred_username as string) ||
                  (profile.nickname as string) ||
                  email.split("@")[0] ||
                  "User",
                email,
                image:
                  (profile.picture as string) ||
                  (profile.avatar_url as string) ||
                  null,
              };
            },
          },
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "oidc") {
        const data = profile as
          | { email?: unknown; email_verified?: unknown }
          | undefined;
        // Ohne E-Mail kann kein Konto angelegt/verknüpft werden.
        if (typeof data?.email !== "string" || !data.email) return false;
        // Ablehnen, wenn der Provider die Adresse ausdrücklich als ungeprüft
        // meldet.
        if (data.email_verified === false) return false;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.currency = (user as { currency?: string }).currency ?? "EUR";
      }
      // Profiländerungen aus der Oberfläche (useSession().update) übernehmen,
      // damit Name und Währung ohne neue Anmeldung stimmen.
      if (trigger === "update" && session) {
        const patch = session as { name?: unknown; currency?: unknown };
        if (typeof patch.name === "string") {
          token.name = patch.name.slice(0, 100);
        }
        if (
          typeof patch.currency === "string" &&
          ["EUR"].includes(patch.currency)
        ) {
          token.currency = patch.currency;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        const user = session.user as {
          currency?: string;
          isAdmin?: boolean;
        };
        user.currency = token.currency as string;
        // Admin-Status bei jedem Session-Zugriff aus der aktuellen
        // ADMIN_EMAILS-Liste ableiten (nicht im Token einfrieren).
        user.isAdmin = isAdminEmail(
          typeof token.email === "string" ? token.email : null
        );
      }
      return session;
    },
  },
});

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

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

const envIssuer = process.env.OIDC_ISSUER || "http://localhost:8080";
const envClientId = process.env.OIDC_CLIENT_ID || "cryptotracker";
const envClientSecret = process.env.OIDC_CLIENT_SECRET || "";
const envClientName = process.env.OIDC_CLIENT_NAME || "Single Sign-On (OIDC)";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
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

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
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
    {
      id: "oidc",
      name: envClientName,
      type: "oidc",
      issuer: envIssuer,
      clientId: envClientId,
      clientSecret: envClientSecret,
      wellKnown: `${envIssuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { scope: "openid email profile" } },
      profile(profile: Record<string, any>) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username || profile.nickname || profile.email?.split("@")[0] || "User",
          email: profile.email,
          image: profile.picture || profile.avatar_url,
        };
      },
    },
    {
      id: "pocket-id",
      name: "Pocket-ID",
      type: "oidc",
      issuer: envIssuer,
      clientId: envClientId,
      clientSecret: envClientSecret,
      wellKnown: `${envIssuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { scope: "openid email profile" } },
      profile(profile: Record<string, any>) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username || profile.nickname || profile.email?.split("@")[0] || "User",
          email: profile.email,
          image: profile.picture || profile.avatar_url,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.currency = (user as { currency?: string }).currency ?? "EUR";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { currency?: string }).currency =
          token.currency as string;
      }
      return session;
    },
  },
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminErrorResponse, getAdminSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

// OIDC wird aus Umgebungsvariablen konfiguriert, weil NextAuth die Provider
// beim Start des Moduls aufbaut. Die frühere UI-Konfiguration schrieb nur in
// die Datenbank und hatte keine Wirkung - sie ist deshalb deaktiviert.

function envConfig() {
  return {
    enabled: Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID),
    issuer: process.env.OIDC_ISSUER || "",
    clientId: process.env.OIDC_CLIENT_ID || "",
    clientName: process.env.OIDC_CLIENT_NAME || "Single Sign-On",
    hasSecret: Boolean(process.env.OIDC_CLIENT_SECRET),
  };
}

// ─── GET: öffentlich nur das Nötigste für die Anmeldeseite ──────────────────

export async function GET() {
  const env = envConfig();
  const admin = await getAdminSession();

  if (admin.status !== 200) {
    return NextResponse.json({
      enabled: env.enabled,
      clientName: env.clientName,
    });
  }

  let stored = null;
  try {
    const config = await db.oidcSettings.findUnique({ where: { id: "default" } });
    stored = config
      ? {
          enabled: config.enabled,
          issuer: config.issuer || "",
          clientId: config.clientId || "",
          clientName: config.clientName || "",
          hasSecret: Boolean(config.clientSecret),
        }
      : null;
  } catch (error) {
    console.error("OIDC-Konfiguration konnte nicht gelesen werden:", error);
  }

  return NextResponse.json({
    ...env,
    activeSource: "env",
    stored,
  });
}

// ─── PUT: bewusst deaktiviert (nur Admin darf es überhaupt versuchen) ───────

export async function PUT() {
  const admin = await getAdminSession();
  if (admin.status !== 200) {
    return NextResponse.json(adminErrorResponse(admin.status), {
      status: admin.status,
    });
  }

  return NextResponse.json(
    {
      error:
        "OIDC wird über Umgebungsvariablen konfiguriert (OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_CLIENT_NAME). Die Oberflächen-Konfiguration ist deaktiviert.",
    },
    { status: 409 }
  );
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/auth/oidc-config
export async function GET() {
  try {
    const config = await db.oidcSettings.findUnique({
      where: { id: "default" },
    });

    // Fallback to process.env if DB not populated yet
    const envIssuer = process.env.OIDC_ISSUER;
    const envClientId = process.env.OIDC_CLIENT_ID;
    const envClientName = process.env.OIDC_CLIENT_NAME || "Pocket-ID";
    const envEnabled = Boolean(envIssuer && envClientId);

    if (!config) {
      return NextResponse.json({
        enabled: envEnabled,
        issuer: envIssuer || "",
        clientId: envClientId || "",
        hasSecret: Boolean(process.env.OIDC_CLIENT_SECRET),
        clientName: envClientName,
      });
    }

    return NextResponse.json({
      enabled: config.enabled ?? envEnabled,
      issuer: config.issuer || envIssuer || "",
      clientId: config.clientId || envClientId || "",
      hasSecret: Boolean(config.clientSecret || process.env.OIDC_CLIENT_SECRET),
      clientName: config.clientName || envClientName,
    });
  } catch (error) {
    console.error("Failed to fetch OIDC config:", error);
    return NextResponse.json({ error: "Failed to fetch OIDC config" }, { status: 500 });
  }
}

// PUT /api/auth/oidc-config
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { enabled, issuer, clientId, clientSecret, clientName } = body;

    const dataToUpdate: any = {
      enabled: Boolean(enabled),
      issuer: issuer ? String(issuer).trim() : null,
      clientId: clientId ? String(clientId).trim() : null,
      clientName: clientName ? String(clientName).trim() : "Single Sign-On",
    };

    if (clientSecret !== undefined && clientSecret !== "") {
      dataToUpdate.clientSecret = String(clientSecret).trim();
    }

    const updated = await db.oidcSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...dataToUpdate,
      },
      update: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      config: {
        enabled: updated.enabled,
        issuer: updated.issuer,
        clientId: updated.clientId,
        clientName: updated.clientName,
        hasSecret: Boolean(updated.clientSecret),
      },
    });
  } catch (error) {
    console.error("Failed to save OIDC config:", error);
    return NextResponse.json({ error: "Failed to save OIDC config" }, { status: 500 });
  }
}

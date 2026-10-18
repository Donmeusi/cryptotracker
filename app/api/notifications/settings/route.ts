import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── GET: Einstellungen laden ─────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const settings = await db.notificationSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings) {
    return NextResponse.json({
      priceAlerts: true,
      portfolioSummary: true,
      tradeConfirm: false,
      security: true,
      taxReminder: false,
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpFrom: "",
      hasSmtpPass: false,
    });
  }

  // Das SMTP-Passwort verlässt den Server nicht. Die UI erfährt nur, ob eins
  // hinterlegt ist.
  const { smtpPass, ...safeSettings } = settings;
  return NextResponse.json({
    ...safeSettings,
    hasSmtpPass: Boolean(smtpPass),
  });
}

// ─── PUT: Einstellungen speichern ─────────────────────────────────────────────

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json() as {
    priceAlerts?: boolean;
    portfolioSummary?: boolean;
    tradeConfirm?: boolean;
    security?: boolean;
    taxReminder?: boolean;
    smtpHost?: string;
    smtpPort?: string;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
  };

  const updateData: Record<string, boolean | string | undefined> = {
    ...(body.priceAlerts !== undefined && { priceAlerts: body.priceAlerts }),
    ...(body.portfolioSummary !== undefined && { portfolioSummary: body.portfolioSummary }),
    ...(body.tradeConfirm !== undefined && { tradeConfirm: body.tradeConfirm }),
    ...(body.security !== undefined && { security: body.security }),
    ...(body.taxReminder !== undefined && { taxReminder: body.taxReminder }),
  };

  if (body.smtpHost !== undefined) updateData.smtpHost = body.smtpHost;
  if (body.smtpPort !== undefined) updateData.smtpPort = body.smtpPort;
  if (body.smtpUser !== undefined) updateData.smtpUser = body.smtpUser;
  // Ein leeres Feld bedeutet "unverändert lassen", damit die UI das Passwort
  // nicht kennen muss.
  if (body.smtpPass !== undefined && body.smtpPass !== "") {
    updateData.smtpPass = body.smtpPass;
  }
  if (body.smtpFrom !== undefined) updateData.smtpFrom = body.smtpFrom;

  const settings = await db.notificationSettings.upsert({
    where: { userId: session.user.id },
    update: updateData,
    create: {
      userId: session.user.id,
      priceAlerts: body.priceAlerts ?? true,
      portfolioSummary: body.portfolioSummary ?? true,
      tradeConfirm: body.tradeConfirm ?? false,
      security: body.security ?? true,
      taxReminder: body.taxReminder ?? false,
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort,
      smtpUser: body.smtpUser,
      smtpPass: body.smtpPass,
      smtpFrom: body.smtpFrom,
    },
  });

  return NextResponse.json({ success: true, settings });
}

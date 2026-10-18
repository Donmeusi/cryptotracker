import { NextResponse } from "next/server";
import {
  loadDbConfig,
  saveDbConfig,
  getActiveDbUrl,
  validateDbConfig,
  DbConfig,
} from "@/lib/dbConfig";
import { createPrismaClient } from "@/lib/db";
import { adminErrorResponse, getAdminSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

// Nur SQLite wird vom Prisma-Schema unterstützt (provider = "sqlite").
// PostgreSQL/MySQL waren in der Oberfläche angeboten, konnten aber nie
// funktionieren. Die API lehnt sie jetzt klar ab, statt die App umzukonfigurieren.

function redactUrl(url: string | undefined, type: DbConfig["type"]): string {
  if (!url) return "";
  if (type === "sqlite") return url;
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "";
    if (parsed.username) parsed.username = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

// ─── GET: aktuellen Datenbankpfad lesen ─────────────────────────────────────

export async function GET() {
  const admin = await getAdminSession();
  if (admin.status !== 200) {
    return NextResponse.json(adminErrorResponse(admin.status), {
      status: admin.status,
    });
  }

  try {
    const config = loadDbConfig();
    return NextResponse.json({
      type: config.type || "sqlite",
      url: redactUrl(config.url, config.type),
      host: config.host || "",
      port:
        config.port ||
        (config.type === "postgresql"
          ? 5432
          : config.type === "mysql"
            ? 3306
            : undefined),
      database: config.database || "",
      username: config.username ? "***" : "",
      hasPassword: Boolean(config.password),
    });
  } catch (error) {
    console.error("GET db-config error:", error);
    return NextResponse.json(
      { error: "Datenbank-Konfiguration konnte nicht geladen werden." },
      { status: 500 }
    );
  }
}

// ─── POST: Verbindung testen oder Konfiguration speichern ───────────────────

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (admin.status !== 200) {
    return NextResponse.json(adminErrorResponse(admin.status), {
      status: admin.status,
    });
  }

  try {
    const body = (await req.json()) as {
      action?: unknown;
      config?: unknown;
    };
    const action = body.action === "save" ? "save" : "test";
    const submittedConfig = (body.config || { type: "sqlite" }) as DbConfig;

    if (submittedConfig.type !== "sqlite") {
      return NextResponse.json(
        {
          success: false,
          error:
            "PostgreSQL und MySQL werden derzeit nicht unterstützt. Das Schema ist auf SQLite festgelegt.",
        },
        { status: 400 }
      );
    }

    const validation = validateDbConfig(submittedConfig);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Ungültige Konfiguration." },
        { status: 400 }
      );
    }

    const connectionUrl = getActiveDbUrl(submittedConfig);
    if (!connectionUrl) {
      return NextResponse.json(
        { success: false, error: "Ungültige SQLite-URL." },
        { status: 400 }
      );
    }

    if (action === "save") {
      saveDbConfig(submittedConfig);
      return NextResponse.json({
        success: true,
        message:
          "Datenbank-Konfiguration gespeichert. Die Änderung wird beim nächsten Neustart aktiv.",
        logs: [
          `SQLite-Datei: ${submittedConfig.url || "Standard"}`,
          "Hinweis: Externe Server-Datenbanken werden nicht unterstützt.",
        ],
      });
    }

    const testClient = createPrismaClient(connectionUrl);
    try {
      await testClient.$connect();
      await testClient.$queryRaw`SELECT 1`;
      await testClient.$disconnect();
      return NextResponse.json({
        success: true,
        message: "Verbindung zur SQLite-Datenbank erfolgreich hergestellt.",
      });
    } catch (testError) {
      await testClient.$disconnect().catch(() => {});
      console.error("DB-Verbindungstest fehlgeschlagen:", testError);
      return NextResponse.json(
        {
          success: false,
          error:
            "Verbindung fehlgeschlagen. Prüfe den Pfad und die Rechte auf die Datei.",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("POST db-config error:", error);
    return NextResponse.json(
      { error: "Datenbank-Konfiguration konnte nicht verarbeitet werden." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { loadDbConfig, saveDbConfig, getActiveDbUrl, validateDbConfig, DbConfig } from "@/lib/dbConfig";
import { createPrismaClient } from "@/lib/db";
import { exec } from "child_process";
import { promisify } from "util";
import net from "net";

const execAsync = promisify(exec);

function testTcpPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!host || host.trim().length === 0) {
      resolve(false);
      return;
    }
    const socket = new net.Socket();
    socket.setTimeout(3000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host.trim());
  });
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// GET /api/system/db-config
export async function GET() {
  try {
    const config = loadDbConfig();
    const cleanUrl = (config.type !== "sqlite" && config.url?.startsWith("file:")) ? "" : config.url || "";
    return NextResponse.json({
      type: config.type || "sqlite",
      url: cleanUrl,
      host: config.host || "",
      port: config.port || (config.type === "postgresql" ? 5432 : config.type === "mysql" ? 3306 : undefined),
      database: config.database || "",
      username: config.username || "",
      hasPassword: Boolean(config.password && config.password.length > 0),
    });
  } catch (error: unknown) {
    console.error("GET db-config error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to load DB config" }, { status: 500 });
  }
}

// POST /api/system/db-config
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "test";
    const submittedConfig: DbConfig = body.config || { type: "sqlite" };

    // Clean URL if type isn't sqlite and URL points to file:
    if (submittedConfig.type !== "sqlite" && submittedConfig.url?.startsWith("file:")) {
      submittedConfig.url = "";
    }

    // Strict input validation
    const validation = validateDbConfig(submittedConfig);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error || "Bitte fülle Host, Datenbankname und Benutzername aus.",
      }, { status: 400 });
    }

    // Preserve existing password if user didn't re-enter it
    const existingConfig = loadDbConfig();
    if (!submittedConfig.password && existingConfig.password && submittedConfig.type === existingConfig.type) {
      submittedConfig.password = existingConfig.password;
    }

    const connectionUrl = getActiveDbUrl(submittedConfig);

    if (!connectionUrl && submittedConfig.type !== "sqlite") {
      return NextResponse.json({
        success: false,
        error: "Ungültige Verbindungsdaten. Bitte fülle Host, Datenbankname und Benutzername aus.",
      }, { status: 400 });
    }

    if (action === "test") {
      if (submittedConfig.type !== "sqlite" && !submittedConfig.url) {
        const host = (submittedConfig.host || "").trim();
        const port = Number(submittedConfig.port) || (submittedConfig.type === "postgresql" ? 5432 : 3306);
        
        if (!host) {
          return NextResponse.json({
            success: false,
            error: "Host / Server-IP ist erforderlich.",
          }, { status: 400 });
        }

        const reachable = await testTcpPort(host, port);
        if (!reachable) {
          return NextResponse.json({
            success: false,
            error: `Der Datenbank-Server '${host}:${port}' konnte nicht erreicht werden. Ist der Server online und der Port freigegeben?`,
          }, { status: 400 });
        }
      }

      const testClient = createPrismaClient(connectionUrl);
      try {
        await testClient.$connect();
        await testClient.$queryRawUnsafe("SELECT 1");
        await testClient.$disconnect();
        return NextResponse.json({
          success: true,
          message: `Verbindung zur ${submittedConfig.type.toUpperCase()}-Datenbank erfolgreich hergestellt!`,
        });
      } catch (testError: unknown) {
        await testClient.$disconnect().catch(() => {});
        return NextResponse.json({
          success: false,
          error: `Authentifizierungs- oder Datenbankfehler: ${getErrorMessage(testError) || "Zugriff verweigert."}`,
        }, { status: 400 });
      }
    }

    if (action === "save") {
      saveDbConfig(submittedConfig);

      const cwd = process.cwd();
      const logs: string[] = ["Datenbank-Konfiguration lokal gespeichert."];

      // Try schema sync if needed
      try {
        const env = { ...process.env, DATABASE_URL: connectionUrl };
        await execAsync("npx prisma db push --skip-generate", { cwd, env });
        logs.push("Datenbank-Schema auf der Ziel-Datenbank synchronisiert.");
      } catch (syncErr: unknown) {
        logs.push(`Schema-Sync Hinweis: ${getErrorMessage(syncErr)}`);
      }

      return NextResponse.json({
        success: true,
        message: "Datenbank-Konfiguration erfolgreich gespeichert!",
        logs,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("POST db-config error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Operation failed" }, { status: 500 });
  }
}

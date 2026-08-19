import { NextResponse } from "next/server";
import { loadDbConfig, saveDbConfig, getActiveDbUrl, DbConfig } from "@/lib/dbConfig";
import { createPrismaClient } from "@/lib/db";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// GET /api/system/db-config
export async function GET() {
  try {
    const config = loadDbConfig();
    return NextResponse.json({
      type: config.type || "sqlite",
      url: config.url || "",
      host: config.host || "",
      port: config.port || (config.type === "postgresql" ? 5432 : config.type === "mysql" ? 3306 : undefined),
      database: config.database || "",
      username: config.username || "",
      hasPassword: Boolean(config.password && config.password.length > 0),
    });
  } catch (error: any) {
    console.error("GET db-config error:", error);
    return NextResponse.json({ error: error?.message || "Failed to load DB config" }, { status: 500 });
  }
}

// POST /api/system/db-config
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "test";
    const submittedConfig: DbConfig = body.config || { type: "sqlite" };

    // Preserve existing password if user didn't re-enter it
    const existingConfig = loadDbConfig();
    if (!submittedConfig.password && existingConfig.password && submittedConfig.type === existingConfig.type) {
      submittedConfig.password = existingConfig.password;
    }

    const connectionUrl = getActiveDbUrl(submittedConfig);

    if (action === "test") {
      const testClient = createPrismaClient(connectionUrl);
      try {
        await testClient.$connect();
        await testClient.$queryRawUnsafe("SELECT 1");
        await testClient.$disconnect();
        return NextResponse.json({
          success: true,
          message: "Verbindung zur Datenbank erfolgreich hergestellt!",
        });
      } catch (testError: any) {
        await testClient.$disconnect().catch(() => {});
        return NextResponse.json({
          success: false,
          error: testError?.message || "Verbindungstest fehlgeschlagen.",
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
      } catch (syncErr: any) {
        logs.push(`Schema-Sync Hinweis: ${syncErr?.message || syncErr}`);
      }

      return NextResponse.json({
        success: true,
        message: "Datenbank-Konfiguration erfolgreich gespeichert!",
        logs,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST db-config error:", error);
    return NextResponse.json({ error: error?.message || "Operation failed" }, { status: 500 });
  }
}

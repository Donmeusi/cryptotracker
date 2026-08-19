export type DbProvider = "sqlite" | "postgresql" | "mysql";

export type DbConfig = {
  type: DbProvider;
  url?: string;
  host?: string;
  port?: number | string;
  database?: string;
  username?: string;
  password?: string;
};

export function validateDbConfig(config: DbConfig): { valid: boolean; error?: string } {
  if (config.type === "sqlite") return { valid: true };

  // Check if custom URL is provided and matches the target database scheme
  if (config.url && config.url.trim().length > 0) {
    const trimmed = config.url.trim();
    if (config.type === "postgresql" && (trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://"))) {
      return { valid: true };
    }
    if (config.type === "mysql" && trimmed.startsWith("mysql://")) {
      return { valid: true };
    }
  }

  const host = config.host ? String(config.host).trim() : "";
  const database = config.database ? String(config.database).trim() : "";
  const username = config.username ? String(config.username).trim() : "";

  if (!host) {
    return { valid: false, error: "Host / Server-IP darf nicht leer sein." };
  }
  if (!database) {
    return { valid: false, error: "Datenbankname darf nicht leer sein." };
  }
  if (!username) {
    return { valid: false, error: "Benutzername darf nicht leer sein." };
  }

  return { valid: true };
}

// Edge-safe helper to read configuration in Node.js runtime
export function loadDbConfig(): DbConfig {
  if (typeof window === "undefined" && process.env.NEXT_RUNTIME !== "edge") {
    try {
      // Dynamic require ensures Next.js Edge runtime bundler doesn't pull in Node.js 'fs' / 'path'
      const fs = require("fs");
      const path = require("path");
      const configFile = path.join(process.cwd(), "prisma", "db-config.json");

      if (fs.existsSync(configFile)) {
        const data = fs.readFileSync(configFile, "utf-8");
        const parsed = JSON.parse(data);
        // Ensure invalid sqlite URL isn't attached to postgresql/mysql
        if (parsed.type !== "sqlite" && parsed.url && parsed.url.startsWith("file:")) {
          parsed.url = "";
        }
        return parsed;
      }
    } catch (e) {
      console.error("Error loading db-config.json", e);
    }
  }

  // Fallback to env or local SQLite
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.startsWith("postgres")) {
    return { type: "postgresql", url: envUrl };
  } else if (envUrl && envUrl.startsWith("mysql")) {
    return { type: "mysql", url: envUrl };
  }

  return { type: "sqlite", url: "file:./cryptotracker.db" };
}

export function saveDbConfig(config: DbConfig): void {
  if (typeof window === "undefined" && process.env.NEXT_RUNTIME !== "edge") {
    const fs = require("fs");
    const path = require("path");
    const configFile = path.join(process.cwd(), "prisma", "db-config.json");
    const dir = path.dirname(configFile);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Clean up url if switching away from sqlite
    const cleanConfig = { ...config };
    if (cleanConfig.type !== "sqlite" && cleanConfig.url && cleanConfig.url.startsWith("file:")) {
      cleanConfig.url = "";
    }

    fs.writeFileSync(configFile, JSON.stringify(cleanConfig, null, 2), "utf-8");
  }
}

export function getActiveDbUrl(config?: DbConfig): string {
  const conf = config || loadDbConfig();

  if (conf.url && conf.url.trim().length > 0) {
    const trimmed = conf.url.trim();
    if (conf.type === "sqlite" && (trimmed.startsWith("file:") || trimmed.startsWith("sqlite:"))) {
      return trimmed;
    }
    if (conf.type === "postgresql" && (trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://"))) {
      return trimmed;
    }
    if (conf.type === "mysql" && trimmed.startsWith("mysql://")) {
      return trimmed;
    }
  }

  if (conf.type === "postgresql") {
    const host = conf.host?.trim() || "";
    const port = conf.port || 5432;
    const dbName = conf.database?.trim() || "";
    const user = conf.username?.trim() || "";
    const pass = conf.password || "";
    if (!host || !dbName || !user) return "";
    return `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}?schema=public`;
  }

  if (conf.type === "mysql") {
    const host = conf.host?.trim() || "";
    const port = conf.port || 3306;
    const dbName = conf.database?.trim() || "";
    const user = conf.username?.trim() || "";
    const pass = conf.password || "";
    if (!host || !dbName || !user) return "";
    return `mysql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}`;
  }

  return process.env.DATABASE_URL || "file:./cryptotracker.db";
}

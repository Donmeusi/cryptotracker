export type DbProvider = "sqlite" | "postgresql" | "mysql";

export type DbConfig = {
  type: DbProvider;
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
};

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
        return JSON.parse(data);
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
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), "utf-8");
  }
}

export function getActiveDbUrl(config?: DbConfig): string {
  const conf = config || loadDbConfig();

  if (conf.url && conf.url.trim().length > 0) {
    return conf.url.trim();
  }

  if (conf.type === "postgresql") {
    const host = conf.host || "localhost";
    const port = conf.port || 5432;
    const dbName = conf.database || "cryptotracker";
    const user = conf.username || "postgres";
    const pass = conf.password || "";
    return `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}?schema=public`;
  }

  if (conf.type === "mysql") {
    const host = conf.host || "localhost";
    const port = conf.port || 3306;
    const dbName = conf.database || "cryptotracker";
    const user = conf.username || "root";
    const pass = conf.password || "";
    return `mysql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}`;
  }

  return process.env.DATABASE_URL || "file:./cryptotracker.db";
}

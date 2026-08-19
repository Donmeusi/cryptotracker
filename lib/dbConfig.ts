import fs from "fs";
import path from "path";

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

const CONFIG_FILE = path.join(process.cwd(), "prisma", "db-config.json");

export function loadDbConfig(): DbConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error loading db-config.json", e);
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
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
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

  return "file:./cryptotracker.db";
}

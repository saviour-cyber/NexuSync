import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

export const isPostgres = false; // Legacy flag, removing or turning false
export const isMysql = true;

// Create a MySQL connection pool using the DATABASE_URL environment variable.
if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  throw new Error("❌ DATABASE_URL is missing in production environment variables!");
}

const dbUri = process.env.DATABASE_URL || "mysql://user:password@localhost:3306/nexasync";

// Parse the URI manually as mysql2 can sometimes have issues merging 'uri' and 'ssl' object
let poolConnection: mysql.Pool;

try {
  const url = new URL(dbUri);
  const host = url.hostname;
  const port = parseInt(url.port || "3306", 10);
  const user = url.username;
  const password = url.password;
  let database = url.pathname.replace("/", "") || "nexasync";

  // SAFETY: TiDB Cloud often defaults to 'sys' or 'test' if the path is wrong.
  // We force 'nexasync' here because that's where our tables were created.
  if (host.includes("tidbcloud.com") && (database === "sys" || database === "test" || !database)) {
    console.log(`[db] Redirecting database from '${database}' to 'nexasync'`);
    database = "nexasync";
  }

  console.log(`[db] Target: ${host}:${port}, User: ${user}, Database: ${database}`);

  poolConnection = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ssl: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
} catch (err: any) {
  console.error("[db] Critical: Failed to parse DATABASE_URL. Check for special characters in password.");
  // Fallback to direct URI for non-standard formats with built-in SSL enforcement
  poolConnection = mysql.createPool({
    uri: dbUri,
    ssl: { rejectUnauthorized: true }
  });
}

export const db = drizzle(poolConnection, { schema, mode: "default" });
export { poolConnection as connection };

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

// Log the host being used (masking credentials)
const maskedUri = dbUri.replace(/\/\/.*:.*@/, "//***:***@");
console.log(`[db] Connecting to database at ${maskedUri}`);

// TiDB Cloud Serverless REQUIRES SSL. We enforce it here to be safe.
const poolConnection = mysql.createPool({
  uri: dbUri,
  ssl: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  }
});

export const db = drizzle(poolConnection, { schema, mode: "default" });

export { poolConnection as connection };

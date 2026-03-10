import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

export const isPostgres = false; // Legacy flag, removing or turning false
export const isMysql = true;

// Create a MySQL connection pool using the DATABASE_URL environment variable.
// Fallback to a local dev string if not provided.
const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL || "mysql://user:password@localhost:3306/nexasync",
});

export const db = drizzle(poolConnection, { schema, mode: "default" });

export { poolConnection as connection };

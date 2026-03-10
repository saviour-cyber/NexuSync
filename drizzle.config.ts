import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || "mysql://user:password@localhost:3306/db";
const cleanDbUrl = dbUrl.replace(/\?ssl=.*/, "");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: cleanDbUrl,
    ssl: {
      rejectUnauthorized: true
    }
  },
});

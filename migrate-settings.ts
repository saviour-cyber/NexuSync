import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Running settings table migration...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      \`value\` TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Migration complete.");
  process.exit(0);
}

migrate().catch(e => { console.error("❌ Migration failed:", e); process.exit(1); });

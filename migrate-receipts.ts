import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Running bank_payment_receipts migration...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bank_payment_receipts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      payment_log_id INT REFERENCES payment_logs(id),
      invoice_id INT NOT NULL REFERENCES invoices(id),
      file_url TEXT NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      uploaded_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ Migration complete.");
  process.exit(0);
}

migrate().catch(e => { console.error("❌ Migration failed:", e); process.exit(1); });

// Seeds the schema and initial data: default admin + sample students.
// Run with: pnpm seed  (from the /server directory)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLE_STUDENTS: Array<[string, string, string]> = [
  ["2021-00123", "Reyes, Juan M.", "3-A"],
  ["2021-00124", "Santos, Maria L.", "3-A"],
  ["2021-00125", "Cruz, Pedro G.", "3-B"],
  ["2021-00126", "Dela Cruz, Ana P.", "2-A"],
  ["2021-00127", "Bautista, Jose R.", "2-B"],
  ["2021-00128", "Garcia, Liza F.", "4-A"],
];

async function run() {
  // Apply schema.
  const schema = fs.readFileSync(path.join(__dirname, "..", "..", "db", "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("✔ Schema applied.");

  // Default admin (username: admin / password: seers123).
  const hash = await bcrypt.hash("seers123", 10);
  await pool.query(
    `INSERT INTO admins (username, password_hash, role) VALUES ($1, $2, 'admin')
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    ["admin", hash],
  );
  console.log("✔ Default admin ready (admin / seers123).");

  // Sample students.
  for (const [id, name, yr] of SAMPLE_STUDENTS) {
    await pool.query(
      `INSERT INTO students (id, name, year_section, status, method)
       VALUES ($1, $2, $3, 'pending', '-') ON CONFLICT (id) DO NOTHING`,
      [id, name, yr],
    );
  }
  console.log(`✔ Seeded ${SAMPLE_STUDENTS.length} sample students.`);

  await pool.end();
  console.log("Done.");
}

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
